// Her pet comes alive (owner, 05/10/2026: the pet "còn đơn giản, không có thu hút"): its care board over the live
// game, each care button a scene in the world, its bond growing on the server, a trick from the menu, a name from
// the list. The scenes' content (props, particles, every trick, the reactions) is checked in Node
// (src/game/pet/pet-life.test.ts); here one care loop end to end, and the other scenes played once.
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { freshChild, playAt, playUntil } from './quest-api';
import { expectDrawCalls, readStats, waitReady } from './stats';

test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 1180, height: 820 } });

const HOME = '/play?region=nha-cua-be&quest=nha-cua-be-ch1&spawnAt=spawn';
/** Upstairs in her bedroom, by her bed and her pet's (the decor slot `pet-bed`, generate-nha-cua-be-map.ts). */
const BEDROOM = '/play?region=nha-cua-be&quest=nha-cua-be-ch1&spawnAt=92.5,20,62.6';
const PET_BED: readonly [number, number] = [93.8, 60.8];
// REVIEW_SHOTS=1 keeps a picture of each scene for the review page.
const REVIEW_SHOTS = process.env.REVIEW_SHOTS === '1';
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SHOT_DIR = path.join(REPO_ROOT, 'assets/generated/review/pet-scenes');
const DRAW_CALL_BUDGET = 150;

async function shot(page: Page, name: string): Promise<void> {
  if (!REVIEW_SHOTS) return;
  mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`) });
}

async function withPet(page: Page, baseURL: string, at = HOME): Promise<void> {
  await freshChild(page, baseURL);
  const headers = { Origin: new URL(baseURL).origin };
  expect((await page.context().request.put('/api/character', { headers, data: { name: 'Mochi', equipped: [], pet: 'meo-xam' } })).status()).toBe(200);
  await page.goto(at);
  await waitReady(page);
}

/** Opens the care board from the HUD's pet button. */
async function openBoard(page: Page): Promise<void> {
  await page.locator('[data-id="hud-pet"]').click();
  await expect(page.locator('[data-id="play-pet-care"]')).toBeVisible();
}

/** Presses a care button and waits for its scene to play in the world and the board to open again. */
async function careScene(page: Page, action: string): Promise<void> {
  await page.locator(`[data-id="pet-action-${action}"]`).click();
  await expect(page.locator('[data-id="pet-care-caption"]')).toBeVisible();
  await expect.poll(async () => (await readStats(page)).petScene).toBe(`care:${action}`);
  // Midway through the scene: its props and effects are in the world.
  await page.waitForTimeout(1_800);
  await shot(page, `care-${action}`);
  await expect(page.locator('[data-id="play-pet-care"]')).toBeVisible({ timeout: 15_000 });
  expect((await readStats(page)).petScene).toBeNull();
}

test('a care loop: the board, a scene in the world, the bond from the server, a trick and a name @smoke', async ({ page, baseURL }) => {
  await withPet(page, baseURL ?? '');
  // It came running to greet her as she arrived.
  expect((await readStats(page)).petScenes).toContain('greet');
  await openBoard(page);
  await shot(page, 'board');
  await expect(page.locator('[data-id="pet-care-name"]')).toHaveText('Mèo xám');
  await expect(page.locator('[data-id="pet-care-level"]')).toContainText('Cấp 1');
  await careScene(page, 'feed');
  await expect(page.locator('[data-id="pet-care-news"]')).toContainText('+10 thân thiết');
  await expect(page.locator('[data-id="pet-care-stat-fullness"]')).toHaveText('100%');
  // The first trick is open from level 1.
  await page.locator('[data-id="pet-care-tab-tricks"]').click();
  await expect(page.locator('[data-id="pet-trick-spin"]')).toBeDisabled();
  await page.locator('[data-id="pet-trick-sit"]').click();
  await expect.poll(async () => (await readStats(page)).petScenes).toContain('trick:sit');
  await expect(page.locator('[data-id="play-pet-care"]')).toBeVisible({ timeout: 10_000 });
  // A name from the list: on the board, and over the pet in the world.
  await page.locator('[data-id="pet-care-tab-name"]').click();
  await page.locator('[data-id="pet-name-Mochi"]').click();
  await expect(page.locator('[data-id="pet-care-name"]')).toHaveText('Mochi');
  await page.locator('[data-id="play-pet-care-close"]').click();
  await expect(page.locator('[data-id="hud-pet"]')).toContainText('Mochi');
  // A care scene stays in the frame's draw-call budget (props and effects share what the map already draws).
  expectDrawCalls((await readStats(page)).calls, DRAW_CALL_BUDGET);
});

test('every other care button plays its own scene in the world', async ({ page, baseURL }) => {
  // Four scenes of up to seven seconds each, played in turn after the map loads.
  test.setTimeout(75_000);
  await withPet(page, baseURL ?? '');
  await openBoard(page);
  for (const action of ['pet', 'bath', 'play', 'nap']) await careScene(page, action);
  const stats = await readStats(page);
  expect(stats.petScenes).toEqual(expect.arrayContaining(['care:pet', 'care:bath', 'care:play', 'care:nap']));
  expectDrawCalls(stats.calls, DRAW_CALL_BUDGET);
});

test('naps in its own bed at home', async ({ page, baseURL }) => {
  await withPet(page, baseURL ?? '', BEDROOM);
  await openBoard(page);
  await page.locator('[data-id="pet-action-nap"]').click();
  await expect.poll(async () => (await readStats(page)).petScene).toBe('care:nap');
  await expect
    .poll(async () => {
      const at = (await readStats(page)).petAt;
      return at ? Math.hypot(at[0] - PET_BED[0], at[2] - PET_BED[1]) : Infinity;
    })
    .toBeLessThan(0.4);
  await expect.poll(async () => (await readStats(page)).petMotion).toBe('nap');
  await shot(page, 'care-nap-bed');
  await expect(page.locator('[data-id="play-pet-care"]')).toBeVisible({ timeout: 15_000 });
});

test('sniffs a few steps toward a clue still to find, then waits before the next', async ({ page, baseURL }) => {
  const base = baseURL ?? '';
  await freshChild(page, base);
  const headers = { Origin: new URL(base).origin };
  expect((await page.context().request.put('/api/character', { headers, data: { name: 'Mochi', equipped: [], pet: 'cun-con' } })).status()).toBe(200);
  // On the forest's search for clues: the HUD offers "Đánh hơi".
  await playUntil(page, base, 'find-clues');
  await page.goto(playAt('spawn'));
  await waitReady(page);
  const sniff = page.locator('[data-id="hud-pet-sniff"]');
  await expect(sniff).toBeVisible();
  await sniff.click();
  await expect.poll(async () => (await readStats(page)).petScenes).toContain('sniff');
  // A nudge, not the way: the button waits before the pet may sniff again.
  await expect(sniff).toBeDisabled();
  await expect(sniff).toContainText('Chờ');
});

test('a care scene at the high quality stays in the draw-call budget', async ({ page, baseURL }) => {
  await withPet(page, baseURL ?? '', `${HOME}&quality=high`);
  // Settled at the spawn after its greeting: the frame without a scene.
  await expect.poll(async () => (await readStats(page)).petScene, { timeout: 10_000 }).toBeNull();
  const idle = (await readStats(page)).calls;
  await openBoard(page);
  await page.locator('[data-id="pet-action-bath"]').click();
  await expect.poll(async () => (await readStats(page)).petScene).toBe('care:bath');
  await page.waitForTimeout(2_000);
  const scene = (await readStats(page)).calls;
  console.log(`pet draw calls at high: ${idle} without a scene, ${scene} during the bath`);
  expectDrawCalls(scene, DRAW_CALL_BUDGET, 'draw calls during a care scene');
});
