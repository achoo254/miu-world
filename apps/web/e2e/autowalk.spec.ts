// Tapping the quest card walks the character to the quest's target along the ways (owner, 02/10/2026), on
// the Trường học map with the first Toán lesson: from the schoolyard's edge to Sư Tử Vàng at the flagpole,
// round the steps and corners on the way, and there she talks to him at once. Tapping the card again
// stops her where she is.
import { expect, test, type Page } from '@playwright/test';
import { freshChild } from './quest-api';
import { readStats, waitReady } from './stats';

test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 1180, height: 820 }, hasTouch: true });

/** About fifty blocks of the way from the gate to the flagpole, two steps and three corners included. */
const QUEST = '/play?quality=low&region=truong-hoc&quest=toan2-cd1-b01&spawnAt=375.5,13,385.5';
const card = '[data-id="hud-tracker"]';
const walkLine = '[data-id="hud-autowalk"]';

/**
 * Taps the quest card. It folds itself after twelve quiet seconds (TRACKER_FOLD_MS in hud.tsx), and with CI's software
 * rendering a test reaches its first tap about that long after the map opened, so the tap could land on a card that folds
 * under it. Open it again if it has folded, and press on it first: a press without a tap restarts the countdown without
 * starting the walk, so the card stays open through the tap.
 */
async function tapCard(page: Page): Promise<void> {
  const pill = page.locator('[data-id="hud-tracker-pill"]');
  await expect(async () => {
    if (await pill.isVisible()) await pill.click({ timeout: 5_000 });
    await page.locator(card).dispatchEvent('pointerdown', undefined, { timeout: 5_000 });
  }).toPass({ timeout: 30_000 });
  await page.locator(card).click();
}

test('tapping the quest card walks to Sư Tử Vàng, and tapping it again stops the walk', async ({ page, baseURL }) => {
  // The walk itself takes some 10 s of game time; software rendering on CI runs the game slower than that.
  test.setTimeout(90_000);
  await freshChild(page, baseURL ?? '');
  await page.goto(QUEST);
  await waitReady(page);
  await expect.poll(async () => (await readStats(page)).hintTarget).toBe('su-tu-vang');
  await expect(page.locator(walkLine)).toHaveText('Chạm để tự đi tới');

  await tapCard(page);
  await expect(page.locator(walkLine)).toHaveText('Đang đi tới · chạm để dừng');
  await tapCard(page);
  await expect.poll(async () => (await readStats(page)).autowalk).toBe('idle');
  await page.waitForTimeout(400); // she eases to a halt
  const [sx, , sz] = (await readStats(page)).player;
  await page.waitForTimeout(600);
  const [ax, , az] = (await readStats(page)).player;
  expect(Math.hypot(ax - sx, az - sz)).toBeLessThan(0.05);

  await tapCard(page);
  await expect.poll(async () => (await readStats(page)).nearTarget, { timeout: 60_000 }).toBe('su-tu-vang');
  await expect.poll(async () => (await readStats(page)).autowalk).toBe('arrived');
  // Arrived, she talks to him without another tap: his dialogue opens (the name labels give way to it).
  await expect(page.getByRole('dialog', { name: 'Sư Tử Vàng' })).toBeVisible();
  await expect(page.locator('[data-id="dialogue"]')).toBeVisible();
});

test('on a vehicle, tapping the quest card drives her to Sư Tử Vàng', async ({ page, baseURL }) => {
  test.setTimeout(90_000);
  await freshChild(page, baseURL ?? '');
  const headers = { Origin: new URL(baseURL ?? '').origin };
  const equip = await page.context().request.put('/api/character', { headers, data: { name: 'Mochi', equipped: ['vehicle-toy-car-red'] } });
  expect(equip.status()).toBe(200);
  await page.goto(QUEST);
  await waitReady(page);
  await page.getByRole('button', { name: 'Lái xe' }).click();
  await expect.poll(async () => (await readStats(page)).riding).toBe(true);
  await expect.poll(async () => (await readStats(page)).hintTarget).toBe('su-tu-vang');
  await tapCard(page);
  await expect.poll(async () => (await readStats(page)).nearTarget, { timeout: 60_000 }).toBe('su-tu-vang');
  await expect.poll(async () => (await readStats(page)).autowalk).toBe('arrived');
  expect((await readStats(page)).riding).toBe(true);
});
