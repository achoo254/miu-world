// Home (M1.1) → region (M1.4/M2.1) → chapter 1 → /play with the HUD (M3.2); chapter 2 stays locked.
import { expect, test } from '@playwright/test';
import { readStats, waitReady } from './stats';

test('Home shows the child and the island, the forest lists its chapters, and chapter 1 opens the game with the HUD', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('pageerror', (err) => consoleErrors.push(err.message));
  await page.goto('/home');
  await expect(page.locator('[data-id="player-level"]')).toHaveText(/^Lv\.\d+$/);
  await expect(page.locator('.home-island-image')).toBeVisible();
  // The island image is shipped with the build and actually loads.
  expect(await page.locator('.home-island-image').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('[data-id="home-region-lau-dai"]')).toBeDisabled();
  await expect(page.locator('[data-id="home-today"]')).toContainText('Hoàn thành');

  await page.locator('[data-id="home-region-khu-rung-bi-mat"]').click();
  await expect(page).toHaveURL(/\/region\/khu-rung-bi-mat$/);
  await expect(page.getByRole('heading', { name: 'Chương 1' })).toBeVisible();
  await expect(page.locator('[data-id="region-quest-forest-ch2"]')).toContainText(/Sắp có|Hoàn thành chương trước/);
  await expect(page.locator('[data-id="region-play-forest-ch2"]')).toHaveCount(0);

  await page.locator('[data-id="region-play-forest-ch1"]').click();
  await expect(page).toHaveURL(/\/play\?region=khu-rung-bi-mat&quest=forest-ch1$/);
  await waitReady(page);
  await expect(page.locator('[data-id="hud-tracker-quest"]')).toBeVisible();
  await expect(page.locator('[data-id="player-badge"]')).toBeVisible();
  for (const id of ['hud-quests', 'hud-map', 'hud-backpack', 'hud-menu']) await expect(page.locator(`[data-id="${id}"]`)).toBeVisible();
  await expect(page.locator('[data-id="hud-interact"]')).toHaveCount(0);
  await expect(page.locator('#stats')).toBeHidden(); // the developer overlay stays off for children

  // The Interact button appears by a target and triggers it, like E and a tap on the label.
  await page.goto('/play?quality=low&spawnAt=clue-box');
  await waitReady(page);
  await page.locator('[data-id="hud-interact"]').click();
  await expect.poll(async () => (await readStats(page)).lastInteraction).toBe('clue-box');

  await page.locator('[data-id="hud-map"]').click();
  await expect(page.locator('[data-id="map"]')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});
