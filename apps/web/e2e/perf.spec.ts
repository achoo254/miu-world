// Perf matrix: device viewport (phone, iPad Gen 10) × CPU throttled 4x and 6x (CDP) × quality
// low/mid/high, 60 s on the scripted autopilot route each. Writes assets/generated/review/perf.json for the final review.
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { test } from '@playwright/test';
import { PARENT_STATE } from '../playwright.config';
import { readStats, waitReady } from './stats';

const RATES = [4, 6];
/** iPad Gen 10 (the reference device, 2026-09-29) and the POC phone viewport. */
const DEVICES = [
  { name: 'ipad-gen10', viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2 },
  { name: 'phone', viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625 },
] as const;
const QUALITIES = ['low', 'mid', 'high'] as const;
const SECONDS = Number(process.env.PERF_SECONDS ?? 60);
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../assets/generated/review/perf.json');
const BUDGET = { minFps: 30, maxDrawCalls: 150, maxTriangles: 150_000, maxFirstAreaBytes: 8 * 1024 * 1024 };

const mean = (xs: number[]): number => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const percentile = (xs: number[], p: number): number => {
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;
};
const round = (x: number): number => Math.round(x * 10) / 10;

test('perf matrix (CPU throttle × quality)', async ({ browser }) => {
  const runs = [];
  let gpu = '';
  for (const device of DEVICES) for (const rate of RATES) {
    for (const quality of QUALITIES) {
      // /play needs the parent session with a selected profile (setup project).
      const context = await browser.newContext({
        storageState: PARENT_STATE,
        viewport: device.viewport,
        deviceScaleFactor: device.deviceScaleFactor,
        isMobile: true,
        hasTouch: true,
      });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      let rawBytes = 0;
      let gzipBytes = 0;
      page.on('response', (res) => {
        void res
          .body()
          .then((body) => {
            rawBytes += body.byteLength;
            gzipBytes += gzipSync(body).byteLength;
          })
          .catch(() => undefined);
      });

      const started = Date.now();
      await page.goto(`/play?quality=${quality}&autopilot=1`);
      await waitReady(page);
      const loadMs = Date.now() - started;
      gpu ||= await page.evaluate(() => {
        const gl = document.createElement('canvas').getContext('webgl2');
        const ext = gl?.getExtension('WEBGL_debug_renderer_info');
        return gl && ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'unknown';
      });
      const firstArea = { rawBytes, gzipBytes };

      const fps: number[] = [];
      const p5: number[] = [];
      const calls: number[] = [];
      const tris: number[] = [];
      await page.waitForTimeout(1500); // let the first 1 s window settle
      for (let s = 0; s < SECONDS; s++) {
        await page.waitForTimeout(1000);
        const stats = await readStats(page);
        fps.push(stats.fpsAvg);
        p5.push(stats.fpsP5);
        calls.push(stats.calls);
        tris.push(stats.triangles);
      }
      const final = await readStats(page);
      runs.push({
        device: device.name,
        cpuThrottle: rate,
        quality,
        seconds: SECONDS,
        loadMs,
        fpsAvg: round(mean(fps)),
        fpsMin1s: round(Math.min(...fps)),
        fpsP5Median: round(percentile(p5, 0.5)),
        fpsP5Worst: round(Math.min(...p5)),
        drawCallsMax: Math.max(...calls),
        trianglesMax: Math.max(...tris),
        meshMs: final.meshMs,
        firstAreaRawBytes: firstArea.rawBytes,
        firstAreaGzipBytes: firstArea.gzipBytes,
      });
      console.log(JSON.stringify(runs[runs.length - 1]));
      await context.close();
    }
  }
  const report = {
    generatedAt: new Date().toISOString(),
    environment: {
      gpu,
      note: 'CPU throttling emulates a slower phone CPU only; GPU, thermals and battery are not emulated.',
      viewport: 'ipad-gen10 820x1180 @2 và phone 412x915 @2.625 (mobile, touch)',
      route: 'autopilot: spawn → bridge → parrot → ancient tree → back, alternating walk/run every 8 s',
    },
    budget: BUDGET,
    runs,
  };
  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(report, null, 2)}\n`);
  // perf.json is served to review.html through the manifest: re-hash so the license gate stays green.
  execFileSync('pnpm', ['-s', 'assets:manifest'], { cwd: path.resolve(path.dirname(OUT), '../../..'), stdio: 'inherit', shell: true });
});
