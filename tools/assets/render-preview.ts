/// <reference lib="dom" />
// Renders review PNGs (character turnaround + one frame per clip, accessories, map) by driving the
// web app's preview.html in headless Chromium. Output: assets/generated/review/<group>/*.png
import { mkdir, readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, type Browser } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import { ASSETS_DIR, REPO_ROOT } from './asset-lib';
import { writeManifest } from './build-manifest';
import { readCharacterSpecs, rigAnimationNames } from './kitbash-character';
import { HUB_OFFSET } from '../world/generate-school-map';
import { buildAccessoryCatalog, type AccessoryItem } from '../../packages/voxel/src/accessory-schema';

const APP_DIR = path.join(REPO_ROOT, 'apps/web');
const PORT = 5199; // fixed so a stale server is easy to find (lsof -i :5199)
const REVIEW_DIR = path.join(ASSETS_DIR, 'generated/review');

export interface Shot {
  /** Output path relative to the review dir. */
  file: string;
  query: Record<string, string | number>;
  viewport?: { width: number; height: number };
  /** Keep the canvas alpha (a background layered over the UI). */
  transparent?: boolean;
}

/** Time inside each authored clip where the pose reads clearly. */
const SHOW_TIME: Record<string, number> = { wave: 0.8, jump: 0.45, yawn: 1.2, cheer: 0.3 };

/** `head:1.3,torso:0.8` — accessory fit of a character variant, for preview.html. */
export function accessoryScaleParam(scale: Record<string, number>): string {
  return Object.entries(scale)
    .map(([node, value]) => `${node}:${value}`)
    .join(',');
}

/** The character the review page shows clip by clip; the others get turns and the clips the UI uses. */
const REVIEW_CHARACTER = 'miu-cat';
/** Portraits the React UI shows for every species (see ui-art.ts). */
const UI_CLIPS = ['idle', 'wave', 'cheer'];

async function characterShots(): Promise<Shot[]> {
  const shots: Shot[] = [];
  for (const [id, spec] of Object.entries(await readCharacterSpecs())) {
    if (spec.role === 'npc') continue; // quest characters need no portraits or turnarounds
    for (const yaw of [0, 90, 180, 315]) {
      shots.push({ file: `${id}-turn-${yaw}.png`, query: { model: spec.output, anim: 'idle', t: 0, yaw } });
    }
    // Third-person gameplay angle: checks the head does not hide the character from the camera.
    shots.push({ file: `${id}-gameplay-camera.png`, query: { model: spec.output, anim: 'walk', t: 0.17, yaw: 180, pitch: 28 } });
    const clips = id === REVIEW_CHARACTER ? [...(await rigAnimationNames(spec)), ...spec.extraAnimations] : UI_CLIPS;
    for (const anim of clips) {
      shots.push({
        file: `${id}-anim-${anim}.png`,
        query: { model: spec.output, anim, t: SHOW_TIME[anim] ?? 0.3, yaw: 25, size: 256 },
      });
    }
  }
  return shots;
}

/** Every wearable item of content/accessories/. */
export async function readAccessoryCatalog(): Promise<Map<string, AccessoryItem>> {
  const dir = path.join(REPO_ROOT, 'content/accessories');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
  return buildAccessoryCatalog(await Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), 'utf8')) as unknown)));
}

async function accessoryShots(): Promise<Shot[]> {
  const miu = (await readCharacterSpecs())['miu-cat'];
  if (!miu) throw new Error('miu-cat spec missing');
  // Accessories are sized by the character's accessoryScale, exactly as the game attaches them.
  const base = { model: miu.output, accScale: accessoryScaleParam(miu.accessoryScale) };
  const outfit = 'hat-witch-pink,backpack-brown';
  const shots: Shot[] = [0, 150, 210, 300].map((yaw) => ({
    file: `miu-outfit-turn-${yaw}.png`,
    query: { ...base, anim: 'idle', t: 0, yaw, acc: outfit },
  }));
  for (const [anim, t] of [['walk', 0.17], ['sprint', 0.2], ['cheer', 0.3], ['jump', 0.45]] as const) {
    shots.push({ file: `miu-outfit-${anim}.png`, query: { ...base, anim, t, yaw: 35, acc: outfit, size: 256 } });
  }
  // One shot per item shape (colour variants share it), worn on Miu from the side that shows it best.
  for (const item of (await readAccessoryCatalog()).values()) {
    if (item.variant) continue;
    const yaw = item.slot === 'back' || item.slot === 'wings' ? 200 : 35;
    shots.push({ file: `item-${item.id}.png`, query: { ...base, anim: 'idle', t: 0, yaw, acc: item.id, size: 256 } });
  }
  for (const [hat, pack] of [['night', 'red'], ['mint', 'green']] as const) {
    shots.push({
      file: `miu-variant-${hat}-${pack}.png`,
      query: { ...base, anim: 'idle', t: 0, yaw: 35, acc: `hat-witch-pink:${hat},backpack-brown:${pack}`, size: 256 },
    });
  }
  return shots;
}

async function mapShots(): Promise<Shot[]> {
  const wide = { width: 1280, height: 800 };
  const shots: Shot[] = ['top', 'iso', 'bridge', 'tree', 'npc'].map((shot) => ({
    file: `forest-ch1-${shot}.png`,
    query: { shot, quality: 'high' },
    viewport: shot === 'top' ? { width: 1000, height: 1000 } : wide,
  }));
  // The whole 192-block forest from the south, chapter 1's corner to the meadows beyond.
  shots.push({ file: 'forest-ch1-overview.png', query: { shot: 'view:96,150,-60:96,12,100:55', quality: 'high' }, viewport: wide });
  return shots;
}

/**
 * The school map from the angle of each frame of the owner's mocks (designs/truong-hoc/, named after them),
 * for the review page to set beside the mock: eye, target, field of view.
 */
export const SCHOOL_VIEWS: Record<string, [eye: [number, number, number], target: [number, number, number], fov: number]> = {
  'khu-01-toan-canh': [[96, 95, -45], [96, 12, 85], 55],
  'khu-02-cong-truong': [[96, 17, 4], [96, 15, 40], 60],
  'khu-03-san-truong-loi-vao': [[96, 17, 22], [96, 17, 68], 60],
  'khu-04-nha-da-nang-san-bong-ro': [[149, 21, 82], [149, 15, 130], 62],
  'khu-05-san-choi': [[56, 18, 20], [34, 13, 36], 62],
  'khu-06-vuon-khoa-hoc': [[58, 19, 90], [36, 14, 132], 62],
  'khu-07-duong-truoc-truong': [[150, 16, 5], [110, 14, 13], 60],
  'khu-08-goc-nhin-phia-sau': [[96, 62, 186], [96, 12, 70], 60],
  'lop-01-mat-truoc': [[96, 18, 48], [96, 20, 70], 62],
  'lop-02-goc-nhin-cheo': [[122, 18, 50], [92, 18, 72], 62],
  'lop-03-mat-sau-hanh-lang': [[96, 18, 100], [96, 18, 78], 62],
  'lop-04-trong-lop-nhin-bang': [[91.5, 15.8, 73.5], [79, 15.2, 73.5], 72],
  'lop-05-trong-lop-goc-cheo': [[81, 16.2, 69.6], [92, 14.6, 77.5], 72],
  'lop-06-hanh-lang-trong': [[56, 15.8, 67.5], [92, 15, 67.5], 70],
  'lop-07-cau-thang-tang-2': [[102.5, 15.8, 69.4], [102.5, 17.5, 76], 72],
  'nha-03-cheo-truoc-trai': [[70, 18, 50], [100, 18, 72], 62],
  'nha-05-ben-phai-loi-hong': [[152, 17, 74], [130, 16, 72], 62],
};

async function schoolShots(): Promise<Shot[]> {
  // The views were framed on the 192-block school; the campus now sits at HUB_OFFSET in the 800-block hub.
  const at = ([x, y, z]: [number, number, number]): string => [x + HUB_OFFSET.x, y, z + HUB_OFFSET.z].join(',');
  return Object.entries(SCHOOL_VIEWS).map(([name, [eye, target, fov]]) => ({
    file: `${name}.png`,
    query: { shot: `view:${at(eye)}:${at(target)}:${fov}`, quality: 'high', region: 'truong-hoc', view: 200 },
    viewport: { width: 1280, height: 720 },
  }));
}

/** Maps built zone by zone (tools/world/zone-map.ts): their region, for `pnpm assets:preview <map>`. */
export const ZONE_MAPS: Record<string, string> = Object.fromEntries(['lang-ven-song', 'xom-mai-am', 'cho-phien', 'nong-trai', 'thu-vien', 'lau-dai', 'truong-hoc'].map((m) => [m, m]));

/**
 * A zone map for the owner to judge: the whole map from the south and from above, then each zone (its
 * landmark is at the zone's centre) from its south-west, high enough to see the zone's places.
 */
async function zoneMapShots(map: string, region: string): Promise<Shot[]> {
  const entities = JSON.parse(await readFile(path.join(ASSETS_DIR, 'generated/world', map, 'entities.json'), 'utf8')) as {
    size: [number, number, number];
    landmarks: Array<{ id: string; position: [number, number, number] }>;
  };
  const [sx, , sz] = entities.size;
  const view = (eye: readonly number[], target: readonly number[], fov: number): string => `view:${eye.map(Math.round).join(',')}:${target.map(Math.round).join(',')}:${fov}`;
  const wide = { width: 1280, height: 720 };
  const shots: Shot[] = [
    { file: `${map}-toan-canh.png`, query: { shot: view([sx / 2, sx * 0.62, -sz * 0.3], [sx / 2, 12, sz * 0.55], 55), quality: 'high', region }, viewport: wide },
    { file: `${map}-tren-cao.png`, query: { shot: view([sx / 2, sx * 1.25, sz / 2 + 1], [sx / 2, 12, sz / 2], 55), quality: 'high', region }, viewport: { width: 1000, height: 1000 } },
  ];
  for (const landmark of entities.landmarks) {
    const [x, y, z] = landmark.position;
    // A close view loads only the map round its landmark: meshing all of a wide map for each picture is slow.
    shots.push({ file: `${map}-${landmark.id}.png`, query: { shot: view([x - 22, y + 20, z - 30], [x, y, z], 60), quality: 'high', region, view: 140 }, viewport: wide });
  }
  return shots;
}

export const SHOT_GROUPS: Record<string, () => Promise<Shot[]>> = {
  character: characterShots,
  accessories: accessoryShots,
  map: mapShots,
  school: schoolShots,
  ...Object.fromEntries(Object.entries(ZONE_MAPS).map(([map, region]) => [map, () => zoneMapShots(map, region)])),
};

async function capture(browser: Browser, shots: Shot[], outDir: string): Promise<void> {
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  for (const shot of shots) {
    const query = new URLSearchParams(Object.entries(shot.query).map(([k, v]) => [k, String(v)]));
    await page.setViewportSize(shot.viewport ?? { width: 1024, height: 1024 });
    await page.goto(`http://127.0.0.1:${PORT}/preview.html?${query.toString()}`);
    await page.waitForFunction(() => document.body.dataset.ready === '1' || document.body.dataset.error !== undefined, null, {
      timeout: 60_000,
    });
    const failure = await page.evaluate(() => document.body.dataset.error);
    if (failure) throw new Error(`${shot.file}: ${failure}`);
    const target = path.join(outDir, shot.file);
    await mkdir(path.dirname(target), { recursive: true });
    await page.locator('canvas').first().screenshot({ path: target, omitBackground: shot.transparent ?? false });
  }
  await page.close();
  if (errors.length > 0) throw new Error(`page errors: ${errors.join('; ')}`);
}

/**
 * Serves the web app's preview.html on the fixed port and screenshots each batch into its folder
 * (the folder is emptied first), then re-hashes the manifest. Shared with render-home-island.ts.
 */
export async function renderShots(batches: Array<{ outDir: string; label: string; shots: () => Promise<Shot[]> }>): Promise<void> {
  let server: ViteDevServer | undefined;
  let browser: Browser | undefined;
  try {
    server = await createServer({
      root: APP_DIR,
      configFile: path.join(APP_DIR, 'vite.config.ts'),
      server: { port: PORT, strictPort: true, host: '127.0.0.1' },
      logLevel: 'warn',
    });
    await server.listen();
    browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    for (const batch of batches) {
      await rm(batch.outDir, { recursive: true, force: true });
      const shots = await batch.shots();
      await capture(browser, shots, batch.outDir);
      console.log(`${batch.label}: ${shots.length} images`);
    }
  } finally {
    await browser?.close();
    await server?.close();
  }
  await writeManifest(); // new screenshots must be re-hashed or the license gate goes red
}

async function main(): Promise<void> {
  const requested = process.argv.slice(2);
  const selected = requested.length > 0 ? requested : Object.keys(SHOT_GROUPS);
  await renderShots(
    selected.map((group) => {
      const shots = SHOT_GROUPS[group];
      if (!shots) throw new Error(`unknown shot group ${group}`);
      return { outDir: path.join(REVIEW_DIR, group), label: `render-preview ${group}`, shots };
    }),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
