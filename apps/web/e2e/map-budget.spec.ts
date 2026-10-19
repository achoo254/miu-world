// Render budget of every map, run by hand (never on CI): at the spawn and at each chapter's starting point of the
// twelve maps the camera turns full circle while the map's life moves (buses, boats, villagers), and the highest
// draw calls, triangles, textures and geometries are kept. High at every point, Mid and Low at the spawn (a lower
// quality draws less of the same view). Writes assets/generated/review/map-budget.json for the review page.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from '@playwright/test';
import { PARENT_STATE } from '../playwright.config';
import { readStats, waitReady } from './stats';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = path.join(ROOT, 'assets/generated/review/map-budget.json');
/** Master Plan §12 at High; Mid keeps the same ceiling (docs/code-standards.md). */
const BUDGET = { maxDrawCalls: 150, maxTriangles: 150_000 };
/** iPad Gen 10, the reference device, without touch so a mouse drag turns the camera. */
const VIEWPORT = { width: 820, height: 1180 };
/** 45° per drag (camera-rig.ts turns 0.005 rad per pixel), eight drags make a full circle. */
const DRAG_PX = Math.round(Math.PI / 4 / 0.005);
const TURNS = 8;
const SETTLE_MS = 1500;
const SAMPLE_MS = 250;
const SAMPLES_PER_TURN = 4;

interface Point {
  name: string;
  position: number[];
}

const regions = (JSON.parse(readFileSync(path.join(ROOT, 'content/world/regions.json'), 'utf8')) as { regions: Array<{ id: string; map: string }> }).regions;

function pointsOf(map: string): Point[] {
  const entities = JSON.parse(readFileSync(path.join(ROOT, `assets/generated/world/${map}/entities.json`), 'utf8')) as {
    spawn: { position: number[] };
    chapterSpawns?: Record<string, { position: number[] }>;
  };
  const chapters = Object.entries(entities.chapterSpawns ?? {}).map(([chapter, spot]) => ({ name: `chapter-${chapter}`, position: spot.position }));
  return [{ name: 'spawn', position: entities.spawn.position }, ...chapters];
}

test('render budget of every map (draw calls, triangles, GPU memory)', async ({ browser }) => {
  test.setTimeout(40 * 60_000); // twelve maps, about sixty loads of ~15 s each
  const runs = [];
  let gpu = '';
  for (const region of regions) {
    for (const point of pointsOf(region.map)) {
      for (const quality of point.name === 'spawn' ? (['low', 'mid', 'high'] as const) : (['high'] as const)) {
        const context = await browser.newContext({ storageState: PARENT_STATE, viewport: VIEWPORT, deviceScaleFactor: 2 });
        const page = await context.newPage();
        await page.goto(`/play?quality=${quality}&region=${region.id}&spawnAt=${point.position.join(',')}&face=0`);
        await waitReady(page);
        gpu ||= await page.evaluate(() => {
          const gl = document.createElement('canvas').getContext('webgl2');
          const ext = gl?.getExtension('WEBGL_debug_renderer_info');
          return gl && ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'unknown';
        });
        await page.waitForTimeout(SETTLE_MS);
        const max = { calls: 0, triangles: 0, textures: 0, geometries: 0, worstYaw: 0 };
        const centre = { x: VIEWPORT.width / 2, y: VIEWPORT.height / 2 };
        for (let turn = 0; turn < TURNS; turn++) {
          for (let s = 0; s < SAMPLES_PER_TURN; s++) {
            await page.waitForTimeout(SAMPLE_MS);
            const stats = await readStats(page);
            if (stats.calls > max.calls) Object.assign(max, { calls: stats.calls, worstYaw: turn * 45 });
            max.triangles = Math.max(max.triangles, stats.triangles);
            max.textures = Math.max(max.textures, stats.textures);
            max.geometries = Math.max(max.geometries, stats.geometries);
          }
          await page.mouse.move(centre.x, centre.y);
          await page.mouse.down();
          await page.mouse.move(centre.x - DRAG_PX, centre.y, { steps: 6 });
          await page.mouse.up();
        }
        const run = { region: region.id, point: point.name, position: point.position, quality, ...max };
        console.log(JSON.stringify(run));
        runs.push(run);
        await context.close();
      }
    }
  }
  const over = runs.filter((r) => r.calls > BUDGET.maxDrawCalls || r.triangles > BUDGET.maxTriangles);
  const report = {
    generatedAt: new Date().toISOString(),
    environment: {
      gpu,
      viewport: 'ipad-gen10 820x1180 @2, mouse',
      note: 'A dev machine GPU counts some 25 more draw calls than CI software GL at the same view; FPS is measured on the iPad (DEVICE-01), not here.',
      route: `spawn and every chapter start; ${TURNS} turns of 45°, ${SAMPLES_PER_TURN} samples every ${SAMPLE_MS} ms after each`,
    },
    budget: BUDGET,
    over: over.map((r) => `${r.region}/${r.point}/${r.quality}`),
    runs,
  };
  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(report, null, 2)}\n`);
  // Served to review.html through the manifest: re-hash so the license gate stays green.
  execFileSync('pnpm', ['-s', 'assets:manifest'], { cwd: ROOT, stdio: 'inherit', shell: true });
});
