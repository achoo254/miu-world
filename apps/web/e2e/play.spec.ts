import { expect, test } from '@playwright/test';
import { readStats, waitReady } from './stats';

const DRAW_CALL_BUDGET = 150;
const TRIANGLE_BUDGET = 150_000;

test('loads /play cleanly within the desktop budget and only talks to its own origin', async ({ page, baseURL }) => {
  const consoleErrors: string[] = [];
  const foreign: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== new URL(baseURL ?? '').origin) foreign.push(req.url());
  });

  await page.goto('/play?quality=high');
  await waitReady(page);
  await page.waitForTimeout(3000);
  const stats = await readStats(page);

  expect(consoleErrors).toEqual([]);
  expect(foreign).toEqual([]);
  expect(stats.calls).toBeLessThanOrEqual(DRAW_CALL_BUDGET);
  expect(stats.triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET);
  expect(stats.worker).toBe(true);
  // Equipment comes from GET /api/character (set in the setup project).
  expect(stats.outfit).toEqual(['hat-witch-pink', 'backpack-brown']);
  // React StrictMode mounts the game twice in dev; production must end with exactly one canvas.
  await expect(page.locator('canvas')).toHaveCount(1);
});

test('walks, runs and stays on the ground; the rim keeps the player inside the map', async ({ page }) => {
  await page.goto('/play?quality=low');
  await waitReady(page);
  const start = (await readStats(page)).player;

  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1500);
  await page.keyboard.down('ShiftLeft');
  await page.waitForTimeout(1500);
  await page.keyboard.up('ShiftLeft');
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(500);
  const after = await readStats(page);

  const moved = Math.hypot(after.player[0] - start[0], after.player[2] - start[2]);
  expect(moved).toBeGreaterThan(4);
  expect(after.onGround).toBe(true);
  expect(after.player[1]).toBeGreaterThan(5);

  // Hold "back" long enough to reach the map edge: the invisible wall must stop the player.
  await page.keyboard.down('KeyS');
  await page.waitForTimeout(6000);
  await page.keyboard.up('KeyS');
  const edge = await readStats(page);
  for (const axis of [0, 2] as const) {
    expect(edge.player[axis]).toBeGreaterThanOrEqual(0);
    expect(edge.player[axis]).toBeLessThanOrEqual(96);
  }
});

test('dragging on the scene orbits the camera (mouse and touch share the pointer path)', async ({ page }) => {
  await page.goto('/play?quality=low');
  await waitReady(page);
  const before = (await readStats(page)).cameraYaw;
  const box = await page.locator('canvas').first().boundingBox();
  if (!box) throw new Error('canvas not visible');
  const y = box.y + box.height * 0.4;
  await page.mouse.move(box.x + box.width * 0.5, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, y, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  expect(Math.abs((await readStats(page)).cameraYaw - before)).toBeGreaterThan(0.3);
});

test('shows the parrot interaction label (React) when the player is close, and hides it when leaving', async ({ page }) => {
  await page.goto('/play?quality=low&spawnAt=npc');
  await waitReady(page);
  const label = page.locator('.npc-label[data-npc="parrot-guide"]');
  await expect(label).toBeVisible();
  await expect(label).toContainText('Vẹt');
  // The game positions the React label every frame through the registered anchor.
  expect(await label.evaluate((el) => el.style.transform)).toContain('translate(');
  expect((await readStats(page)).nearNpc).toBe(true);

  await page.keyboard.down('KeyS');
  await page.waitForTimeout(2500);
  await page.keyboard.up('KeyS');
  await expect(label).toBeHidden();
});

test('leaving /play disposes the game: no canvas, no stats handle', async ({ page }) => {
  await page.goto('/play?quality=low');
  await waitReady(page);
  await page.getByRole('link', { name: 'Thoát' }).click();
  await expect(page.getByRole('heading', { name: 'Ai đang chơi?' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(await page.evaluate(() => window.__miuStats)).toBeUndefined();
});

test('the build serves only runtime assets and nothing outside the manifest', async ({ request }) => {
  expect((await request.get('/game-assets/manifest.json')).ok()).toBe(true);
  expect((await request.get('/game-assets/packs/kenney-cube-pets/2.0/animal-parrot.glb')).ok()).toBe(true);
  expect((await request.get('/game-assets/packs/kenney-cube-pets/2.0/not-a-file.glb')).status()).toBe(404);
  // Licensed but not used at runtime: not copied into dist/, so the preview (production build) refuses it.
  expect((await request.get('/game-assets/packs/kenney-cube-pets/2.0/animal-bunny.glb')).status()).toBe(404);
  // Clients normalise "..", so also make sure no traversal form ever returns the package manifest.
  for (const probe of ['/game-assets/%2e%2e/package.json', '/game-assets/..%2fpackage.json', '/game-assets/%2e%2e%2f%2e%2e%2fpackage.json']) {
    expect(await (await request.get(probe)).text()).not.toContain('"name": "@miu/web"');
  }
});
