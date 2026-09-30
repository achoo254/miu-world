/// <reference lib="dom" />
// Renders review PNGs (character turnaround + one frame per clip, accessories, map) by driving the
// web app's preview.html in headless Chromium. Output: assets/generated/review/<group>/*.png
import { mkdir, readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, type Browser } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import { buildAccessoryCatalog } from '../../packages/voxel/src/accessory-schema';
import { ASSETS_DIR, REPO_ROOT } from './asset-lib';
import { writeManifest } from './build-manifest';
import { readCharacterSpecs, rigAnimationNames } from './kitbash-character';

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

async function characterShots(): Promise<Shot[]> {
  const shots: Shot[] = [];
  for (const [id, spec] of Object.entries(await readCharacterSpecs())) {
    for (const yaw of [0, 90, 180, 315]) {
      shots.push({ file: `${id}-turn-${yaw}.png`, query: { model: spec.output, anim: 'idle', t: 0, yaw } });
    }
    // Third-person gameplay angle: checks the head does not hide the character from the camera.
    shots.push({ file: `${id}-gameplay-camera.png`, query: { model: spec.output, anim: 'walk', t: 0.17, yaw: 180, pitch: 28 } });
    for (const anim of [...(await rigAnimationNames(spec)), ...spec.extraAnimations]) {
      shots.push({
        file: `${id}-anim-${anim}.png`,
        query: { model: spec.output, anim, t: SHOW_TIME[anim] ?? 0.3, yaw: 25, size: 256 },
      });
    }
  }
  return shots;
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
  // One shot per wearable item (colour variants included), from the side that shows it best.
  const dir = path.join(REPO_ROOT, 'content/accessories');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
  const catalog = buildAccessoryCatalog(await Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), 'utf8')) as unknown)));
  for (const item of catalog.values()) {
    shots.push({ file: `item-${item.id}.png`, query: { ...base, anim: 'idle', t: 0, yaw: item.slot === 'back' ? 200 : 35, acc: item.id, size: 256 } });
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
  return shots;
}

export const SHOT_GROUPS: Record<string, () => Promise<Shot[]>> = {
  character: characterShots,
  accessories: accessoryShots,
  map: mapShots,
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
