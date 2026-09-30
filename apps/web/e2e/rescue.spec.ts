// A child stuck in the forest stream (the banks are two blocks high): after a few seconds in the water
// the HUD offers "Quay lại", and pressing it puts Miu back on dry ground; the pause menu offers the
// same at any time. A shot of the button goes to the review folder.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { readStats, waitReady } from './stats';

const SHOTS = fileURLToPath(new URL('../../../.data/sgk/review-shots/', import.meta.url));
mkdirSync(SHOTS, { recursive: true });
// The bed of the stream at x = 40 (its centre is near z = 54), one block of water above the feet.
const IN_STREAM = '40.5,8,54.5';
/** Standing on the banks puts the feet at 11 or higher; the stream bed is at 8. */
const ON_DRY_GROUND = 10.5;

test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true });

test('offers "Quay lại" to a Miu stuck in the stream, and it brings her back to dry ground', async ({ page }) => {
  await page.goto(`/play?quality=low&spawnAt=${IN_STREAM}`);
  await waitReady(page);
  const rescue = page.locator('[data-id="hud-rescue"]');
  await expect(rescue).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: `${SHOTS}rescue-button.png`, animations: 'disabled' });
  await rescue.click();
  await expect.poll(async () => (await readStats(page)).player[1]).toBeGreaterThan(ON_DRY_GROUND);
  await expect(rescue).toHaveCount(0);
});

test('the pause menu puts a stuck Miu back on dry ground too', async ({ page }) => {
  await page.goto(`/play?quality=low&spawnAt=${IN_STREAM}`);
  await waitReady(page);
  await page.locator('[data-id="hud-menu"]').click();
  await page.locator('[data-id="pause-rescue"]').click();
  await expect(page.getByRole('dialog', { name: 'Tạm dừng' })).toHaveCount(0);
  await expect.poll(async () => (await readStats(page)).player[1]).toBeGreaterThan(ON_DRY_GROUND);
});
