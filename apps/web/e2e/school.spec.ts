// The Trường học map on the production build, with the E2E-only quest e2e-school-walk (region
// truong-hoc, topic 1): the school loads within the draw-call budget, the tracker and the arrow send
// the child from the gate to Sư Tử Vàng at the flagpole, and standing there offers the talk. A shot
// of the schoolyard goes to the review folder.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { freshChild } from './quest-api';
import { readStats, waitReady } from './stats';

test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 1180, height: 820 }, hasTouch: true });

const SHOTS = fileURLToPath(new URL('../../../.data/sgk/review-shots/', import.meta.url));
mkdirSync(SHOTS, { recursive: true });
const QUEST = '/play?quality=low&region=truong-hoc&quest=e2e-school-walk';
const DRAW_CALL_BUDGET = 150;

test('the school map loads and the way leads from the gate to Sư Tử Vàng at the flagpole', async ({ page, baseURL }) => {
  await freshChild(page, baseURL ?? '');
  await page.goto(QUEST);
  await waitReady(page);
  await expect(page.locator('[data-id="hud-tracker-step"]')).toHaveText('Đến cột cờ gặp Sư Tử Vàng');
  await expect.poll(async () => (await readStats(page)).hintTarget).toBe('su-tu-vang');
  expect((await readStats(page)).calls).toBeLessThanOrEqual(DRAW_CALL_BUDGET);
  await page.screenshot({ path: `${SHOTS}school-gate.png`, animations: 'disabled' });

  await page.goto(`${QUEST}&spawnAt=su-tu-vang`);
  await waitReady(page);
  await expect(page.locator('.npc-label[data-target="su-tu-vang"]')).toContainText('Sư Tử Vàng');
  await page.screenshot({ path: `${SHOTS}school-flagpole.png`, animations: 'disabled' });
  await page.keyboard.press('KeyE');
  await expect(page.getByRole('dialog', { name: 'Sư Tử Vàng' })).toBeVisible();
});
