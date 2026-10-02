// Tapping the quest card walks the character to the quest's target along the ways (owner, 02/10/2026), on
// the Trường học map with the first Toán lesson: from the schoolyard's edge to Sư Tử Vàng at the flagpole,
// round the steps and corners on the way, until the flagpole offers the talk. Tapping the card again
// stops her where she is.
import { expect, test } from '@playwright/test';
import { freshChild } from './quest-api';
import { readStats, waitReady } from './stats';

test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 1180, height: 820 }, hasTouch: true });

/** About fifty blocks of the way from the gate to the flagpole, two steps and three corners included. */
const QUEST = '/play?quality=low&region=truong-hoc&quest=toan2-cd1-b01&spawnAt=375.5,13,385.5';
const card = '[data-id="hud-tracker"]';
const walkLine = '[data-id="hud-autowalk"]';

test('tapping the quest card walks to Sư Tử Vàng, and tapping it again stops the walk', async ({ page, baseURL }) => {
  // The walk itself takes some 10 s of game time; software rendering on CI runs the game slower than that.
  test.setTimeout(90_000);
  await freshChild(page, baseURL ?? '');
  await page.goto(QUEST);
  await waitReady(page);
  await expect.poll(async () => (await readStats(page)).hintTarget).toBe('su-tu-vang');
  await expect(page.locator(walkLine)).toHaveText('Chạm để tự đi tới');

  await page.locator(card).click();
  await expect(page.locator(walkLine)).toHaveText('Đang đi tới · chạm để dừng');
  await page.locator(card).click();
  await expect.poll(async () => (await readStats(page)).autowalk).toBe('idle');
  await page.waitForTimeout(400); // she eases to a halt
  const [sx, , sz] = (await readStats(page)).player;
  await page.waitForTimeout(600);
  const [ax, , az] = (await readStats(page)).player;
  expect(Math.hypot(ax - sx, az - sz)).toBeLessThan(0.05);

  await page.locator(card).click();
  await expect.poll(async () => (await readStats(page)).nearTarget, { timeout: 60_000 }).toBe('su-tu-vang');
  await expect.poll(async () => (await readStats(page)).autowalk).toBe('arrived');
  await expect(page.locator('.npc-label[data-target="su-tu-vang"]')).toContainText('Sư Tử Vàng');
});
