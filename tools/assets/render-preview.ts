/// <reference lib="dom" />
// Renders review PNGs (character turnaround + one frame per clip, accessories, map) by driving the
// POC app's preview.html in headless Chromium. Output: assets/generated/review/<group>/*.png
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, type Browser } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import { ASSETS_DIR, REPO_ROOT } from './asset-lib';
import { writeManifest } from './build-manifest';
import { readCharacterSpecs, rigAnimationNames } from './kitbash-character';

const APP_DIR = path.join(REPO_ROOT, 'apps/poc-voxel');
const PORT = 5199; // fixed so a stale server is easy to find (lsof -i :5199)
const REVIEW_DIR = path.join(ASSETS_DIR, 'generated/review');

export interface Shot {
  /** Output path relative to the review dir. */
  file: string;
  query: Record<string, string | number>;
  /** Defaults to preview.html (single model); index.html renders the playable POC. */
  page?: 'preview.html' | 'index.html';
  viewport?: { width: number; height: number };
}

/** Time inside each authored clip where the pose reads clearly. */
const SHOW_TIME: Record<string, number> = { wave: 0.8, jump: 0.45, yawn: 1.2, cheer: 0.3 };

async function characterShots(): Promise<Shot[]> {
  const shots: Shot[] = [];
  for (const [id, spec] of Object.entries(await readCharacterSpecs())) {
    for (const yaw of [0, 90, 180, 315]) {
      shots.push({ file: `character/${id}-turn-${yaw}.png`, query: { model: spec.output, anim: 'idle', t: 0, yaw } });
    }
    for (const anim of [...(await rigAnimationNames(spec)), ...spec.extraAnimations]) {
      shots.push({
        file: `character/${id}-anim-${anim}.png`,
        query: { model: spec.output, anim, t: SHOW_TIME[anim] ?? 0.3, yaw: 25, size: 256 },
      });
    }
  }
  return shots;
}

async function accessoryShots(): Promise<Shot[]> {
  const model = (await readCharacterSpecs())['miu-cat']?.output;
  if (!model) throw new Error('miu-cat spec missing');
  const outfit = 'hat-witch-pink,backpack-brown';
  const shots: Shot[] = [0, 150, 210, 300].map((yaw) => ({
    file: `accessories/miu-outfit-turn-${yaw}.png`,
    query: { model, anim: 'idle', t: 0, yaw, acc: outfit },
  }));
  for (const [anim, t] of [['walk', 0.17], ['sprint', 0.2], ['cheer', 0.3], ['jump', 0.45]] as const) {
    shots.push({ file: `accessories/miu-outfit-${anim}.png`, query: { model, anim, t, yaw: 35, acc: outfit, size: 256 } });
  }
  for (const [hat, pack] of [['night', 'red'], ['mint', 'green']] as const) {
    shots.push({
      file: `accessories/miu-variant-${hat}-${pack}.png`,
      query: { model, anim: 'idle', t: 0, yaw: 35, acc: `hat-witch-pink:${hat},backpack-brown:${pack}`, size: 256 },
    });
  }
  return shots;
}

async function mapShots(): Promise<Shot[]> {
  const wide = { width: 1280, height: 800 };
  const shots: Shot[] = ['top', 'iso', 'bridge', 'tree', 'npc'].map((shot) => ({
    file: `map/forest-ch1-${shot}.png`,
    page: 'index.html',
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

async function capture(browser: Browser, shots: Shot[]): Promise<void> {
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  for (const shot of shots) {
    const query = new URLSearchParams(Object.entries(shot.query).map(([k, v]) => [k, String(v)]));
    await page.setViewportSize(shot.viewport ?? { width: 1024, height: 1024 });
    await page.goto(`http://127.0.0.1:${PORT}/${shot.page ?? 'preview.html'}?${query.toString()}`);
    await page.waitForFunction(() => document.body.dataset.ready === '1' || document.body.dataset.error !== undefined, null, {
      timeout: 60_000,
    });
    const failure = await page.evaluate(() => document.body.dataset.error);
    if (failure) throw new Error(`${shot.file}: ${failure}`);
    const target = path.join(REVIEW_DIR, shot.file);
    await mkdir(path.dirname(target), { recursive: true });
    await page.locator('canvas').first().screenshot({ path: target });
  }
  await page.close();
  if (errors.length > 0) throw new Error(`page errors: ${errors.join('; ')}`);
}

async function main(): Promise<void> {
  const requested = process.argv.slice(2);
  const selected = requested.length > 0 ? requested : Object.keys(SHOT_GROUPS);
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
    for (const group of selected) {
      const buildShots = SHOT_GROUPS[group];
      if (!buildShots) throw new Error(`unknown shot group ${group}`);
      await rm(path.join(REVIEW_DIR, group), { recursive: true, force: true });
      const shots = await buildShots();
      await capture(browser, shots);
      console.log(`render-preview ${group}: ${shots.length} images`);
    }
  } finally {
    await browser?.close();
    await server?.close();
  }
  await writeManifest(); // new screenshots must be re-hashed or the license gate goes red
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
