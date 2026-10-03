import { expect, test, type Page } from '@playwright/test';
import { freshChild } from './quest-api';
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

  // The spawn point, not wherever an earlier spec left this shared child: the budget is measured there.
  await page.goto('/play?quality=high&spawnAt=spawn');
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
  await expect(page.locator('canvas:not(.minimap-canvas):not(.minimap-sheet-canvas)')).toHaveCount(1);
});

test('walking sideways, the child keeps a straight way while the view swings round behind her', async ({ page }) => {
  await page.goto('/play?quality=low&spawnAt=spawn');
  await waitReady(page);
  const at = async (): Promise<[number, number]> => {
    const { player } = await readStats(page);
    return [player[0] ?? 0, player[2] ?? 0];
  };
  const startYaw = (await readStats(page)).cameraYaw;
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(1200);
  const a = await at();
  await page.waitForTimeout(1500);
  const b = await at();
  await page.waitForTimeout(1500);
  const c = await at();
  const { cameraYaw } = await readStats(page);
  await page.keyboard.up('KeyD');
  const heading = (p: [number, number], q: [number, number]): number => Math.atan2(q[0] - p[0], q[1] - p[1]);
  const turn = (x: number, y: number): number => Math.abs(Math.atan2(Math.sin(x - y), Math.cos(x - y)));
  // A straight way, not a circle, and a quarter turn of the view.
  expect(turn(heading(a, b), heading(b, c))).toBeLessThan(0.35);
  expect(turn(cameraYaw, startYaw)).toBeGreaterThan(1);
  // The camera looks the way she walks (its forward is (-sin yaw, -cos yaw)).
  expect(turn(Math.atan2(-Math.sin(cameraYaw), -Math.cos(cameraYaw)), heading(b, c))).toBeLessThan(0.5);
});

test('walks, runs and stays on the ground', async ({ page }) => {
  await page.goto('/play?quality=low&spawnAt=spawn');
  await waitReady(page);
  const start = (await readStats(page)).player;

  const moved = async (): Promise<number> => {
    const now = (await readStats(page)).player;
    return Math.hypot(now[0] - start[0], now[2] - start[2]);
  };
  // Wait on distance, not wall time: software-GL CI runners render few frames and each step is capped.
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1500);
  await page.keyboard.down('ShiftLeft');
  await expect.poll(moved, { timeout: 20_000 }).toBeGreaterThan(4);
  await page.keyboard.up('ShiftLeft');
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(500);
  const after = await readStats(page);
  expect(after.onGround).toBe(true);
  expect(after.player[1]).toBeGreaterThan(5);
});

/** Holds the movement key that points most along (dx, dz) on the ground, judged from the camera's yaw. */
async function walkToward(page: Page, dx: number, dz: number, ms: number): Promise<void> {
  const yaw = (await readStats(page)).cameraYaw;
  const keys = { KeyW: [-Math.sin(yaw), -Math.cos(yaw)], KeyS: [Math.sin(yaw), Math.cos(yaw)], KeyD: [Math.cos(yaw), -Math.sin(yaw)], KeyA: [-Math.cos(yaw), Math.sin(yaw)] } as const;
  const [key] = Object.entries(keys).sort((p, q) => q[1][0] * dx + q[1][1] * dz - (p[1][0] * dx + p[1][1] * dz))[0] ?? ['KeyW'];
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
  await page.waitForTimeout(300);
}

test('walks off the map onto the land round it without a wall, and the edge of the world holds', async ({ page }) => {
  // On the forest's west edge: the outer land carries on, ground under her feet.
  await page.goto('/play?quality=low&spawnAt=3,32,400');
  await waitReady(page);
  await walkToward(page, -1, 0, 4000);
  const out = await readStats(page);
  expect(out.player[0]).toBeLessThan(-3);
  expect(out.onGround).toBe(true);
  expect(out.player[1]).toBeGreaterThan(5);
  // Near the far edge of the outer land, the invisible wall stops her.
  await page.goto('/play?quality=low&spawnAt=-2424,40,400');
  await waitReady(page);
  await walkToward(page, -1, 0, 4000);
  expect((await readStats(page)).player[0]).toBeGreaterThanOrEqual(-2432);
});

test.describe('a child of its own', () => {
  // Signing up a fresh parent in the shared session would sign that session out for the specs after this one.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('comes back where the child left off, and `spawnAt=spawn` still starts at the spawn point', async ({ page, baseURL }) => {
    await freshChild(page, baseURL ?? '');
    await page.goto('/play?quality=low');
    await waitReady(page);
    const spawn = (await readStats(page)).player;
    const from = (a: readonly number[], b: readonly number[]): number => Math.hypot((a[0] ?? 0) - (b[0] ?? 0), (a[2] ?? 0) - (b[2] ?? 0));
    await page.keyboard.down('KeyW');
    await expect.poll(async () => from((await readStats(page)).player, spawn), { timeout: 20_000 }).toBeGreaterThan(5);
    await page.keyboard.up('KeyW');
    await page.waitForTimeout(500);
    const left = (await readStats(page)).player;

    // Leaving /play saves the spot; the next visit starts there.
    const saved = page.waitForResponse((r) => r.url().endsWith('/api/player-positions') && r.request().method() === 'PUT');
    await page.getByRole('button', { name: /Menu/ }).click();
    await page.getByRole('link', { name: /Về trang chủ/ }).click();
    expect((await saved).status()).toBe(204);
    await page.goto('/play?quality=low');
    await waitReady(page);
    expect(from((await readStats(page)).player, left)).toBeLessThan(1.5);

    await page.goto('/play?quality=low&spawnAt=spawn');
    await waitReady(page);
    expect(from((await readStats(page)).player, spawn)).toBeLessThan(0.5);
  });

  test('drives an equipped vehicle: on with "Lái xe", faster than running, off with "Xuống xe"', async ({ page, baseURL }) => {
    await freshChild(page, baseURL ?? '');
    const headers = { Origin: new URL(baseURL ?? '').origin };
    const equip = await page.context().request.put('/api/character', { headers, data: { name: 'Mochi', equipped: ['vehicle-skateboard-red'] } });
    expect(equip.status()).toBe(200);
    await page.goto('/play?quality=low&spawnAt=spawn');
    await waitReady(page);
    await page.getByRole('button', { name: 'Lái xe' }).click();
    await expect.poll(async () => (await readStats(page)).riding).toBe(true);
    // Wait on speed, not wall time: software GL renders few frames.
    await page.keyboard.down('KeyW');
    await expect.poll(async () => (await readStats(page)).speed, { timeout: 20_000 }).toBeGreaterThan(7.5);
    await page.keyboard.up('KeyW');
    await page.getByRole('button', { name: 'Xuống xe' }).click();
    await expect.poll(async () => (await readStats(page)).riding).toBe(false);
    await expect(page.getByRole('button', { name: 'Lái xe' })).toBeVisible();
  });
});

test('dragging on the scene orbits the camera (mouse and touch share the pointer path)', async ({ page }) => {
  await page.goto('/play?quality=low');
  await waitReady(page);
  const before = (await readStats(page)).cameraYaw;
  const box = await page.locator('canvas:not(.minimap-canvas):not(.minimap-sheet-canvas)').first().boundingBox();
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
  const label = page.locator('.npc-label[data-target="parrot-guide"]');
  await expect(label).toBeVisible();
  await expect(label).toContainText('Vẹt');
  // The game positions the React label every frame through the registered anchor.
  expect(await label.evaluate((el) => el.style.transform)).toContain('translate(');
  expect((await readStats(page)).nearTarget).toBe('parrot-guide');

  await page.keyboard.down('KeyS');
  await page.waitForTimeout(2500);
  await page.keyboard.up('KeyS');
  await expect(label).toBeHidden();
});

// Quest targets placed on the chapter 1 map (world entities v2): two NPCs and at least three objects.
const TARGETS = [
  { id: 'parrot-guide', kind: 'npc', text: 'Vẹt' },
  { id: 'animal-beaver', kind: 'npc', text: 'Hải ly' },
  { id: 'clue-box', kind: 'object', text: 'Chiếc hộp' },
  { id: 'clue-letter', kind: 'object', text: 'Lá thư' },
  { id: 'clue-mushroom', kind: 'object', text: 'Cây nấm đỏ' },
  { id: 'stream-stones', kind: 'object', text: 'Đá qua suối' },
  { id: 'ancient-tree', kind: 'riddle', text: 'Cây cổ thụ' },
  { id: 'chest', kind: 'chest', text: 'Rương' },
  { id: 'gate-ch2', kind: 'gate', text: 'Cổng đá' },
] as const;

for (const target of TARGETS) {
  test(`standing by ${target.id} shows its prompt, and interacting reports that target`, async ({ page }) => {
    await page.goto(`/play?quality=low&spawnAt=${target.id}`);
    await waitReady(page);
    const label = page.locator(`.npc-label[data-target="${target.id}"]`);
    await expect(label).toBeVisible();
    await expect(label).toHaveAttribute('data-kind', target.kind);
    await expect(label).toContainText(target.text);
    expect((await readStats(page)).nearTarget).toBe(target.id);
    await page.keyboard.press('KeyE');
    await expect.poll(async () => (await readStats(page)).lastInteraction).toBe(target.id);
  });
}

test('the camera never ends up inside a block, pressed against the ancient tree', async ({ page }) => {
  await page.goto('/play?quality=low&spawnAt=ancient-tree');
  await waitReady(page);
  // Walk into the trunk while orbiting the camera all the way round.
  await page.keyboard.down('KeyW');
  const box = await page.locator('canvas:not(.minimap-canvas):not(.minimap-sheet-canvas)').first().boundingBox();
  if (!box) throw new Error('canvas not visible');
  for (let i = 0; i < 6; i++) {
    const y = box.y + box.height * 0.4;
    await page.mouse.move(box.x + box.width * 0.3, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.7, y, { steps: 5 });
    await page.mouse.up();
    expect((await readStats(page)).cameraInsideBlock).toBe(false);
  }
  await page.keyboard.up('KeyW');
});

test('leaving /play disposes the game: no canvas, no stats handle', async ({ page }) => {
  await page.goto('/play?quality=low');
  await waitReady(page);
  await page.getByRole('button', { name: /Menu/ }).click();
  await page.getByRole('link', { name: /Về trang chủ/ }).click();
  await expect(page.locator('[data-id="home"]')).toBeVisible();
  await expect(page.locator('canvas:not(.minimap-canvas):not(.minimap-sheet-canvas)')).toHaveCount(0);
  expect(await page.evaluate(() => window.__miuStats)).toBeUndefined();
});

test('Pause stops rendering (no new frames) and Resume starts it again; Esc opens it', async ({ page }) => {
  await page.goto('/play?quality=low');
  await waitReady(page);
  await page.getByRole('button', { name: /Menu/ }).click();
  await expect(page.getByRole('dialog', { name: 'Tạm dừng' })).toBeVisible();
  await page.waitForTimeout(200); // the frame already queued may still land
  const frozen = (await readStats(page)).frames;
  await page.waitForTimeout(700);
  expect((await readStats(page)).frames).toBe(frozen);

  await page.getByRole('button', { name: /Tiếp tục chơi/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(async () => (await readStats(page)).frames).toBeGreaterThan(frozen + 5);

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Tạm dừng' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('canvas:not(.minimap-canvas):not(.minimap-sheet-canvas)')).toHaveCount(1);
});

test('a lost WebGL context stops the game and offers a reload instead of breaking', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  await page.goto('/play?quality=low');
  await waitReady(page);
  // What iPad Safari does under memory pressure, triggered through the standard debug extension.
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  });
  await expect(page.locator('[data-id="play-context-lost"]')).toBeVisible();
  const frames = (await readStats(page)).frames;
  await page.waitForTimeout(500);
  expect((await readStats(page)).frames).toBe(frames);

  await page.locator('[data-id="play-context-lost-reload"]').click();
  await waitReady(page);
  await expect(page.locator('canvas:not(.minimap-canvas):not(.minimap-sheet-canvas)')).toHaveCount(1);
  await expect(page.locator('[data-id="play-context-lost"]')).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test('the build serves only runtime assets and nothing outside the manifest', async ({ request }) => {
  expect((await request.get('/game-assets/manifest.json')).ok()).toBe(true);
  expect((await request.get('/game-assets/packs/kenney-cube-pets/2.0/animal-parrot.glb')).ok()).toBe(true);
  // URLs carry a content version (?v=…, src/asset-versions.ts): the file is served all the same.
  expect((await request.get('/game-assets/packs/kenney-cube-pets/2.0/animal-parrot.glb?v=0123456789ab')).ok()).toBe(true);
  expect((await request.get('/game-assets/packs/kenney-cube-pets/2.0/not-a-file.glb')).status()).toBe(404);
  // Licensed but not used at runtime: not copied into dist/, so the preview (production build) refuses it.
  expect((await request.get('/game-assets/packs/kenney-castle-kit/2.0/siege-catapult.glb')).status()).toBe(404);
  // Clients normalise "..", so also make sure no traversal form ever returns the package manifest.
  for (const probe of ['/game-assets/%2e%2e/package.json', '/game-assets/..%2fpackage.json', '/game-assets/%2e%2e%2f%2e%2e%2fpackage.json']) {
    expect(await (await request.get(probe)).text()).not.toContain('"name": "@miu/web"');
  }
});
