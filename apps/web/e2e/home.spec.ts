// Home (M1.1) → region (M1.4/M2.1) → chapter 1 → /play with the HUD (M3.2); chapter 2 stays locked.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { readStats, waitReady } from './stats';

type Box = { x: number; y: number; width: number; height: number };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test('Home shows the child and the island, the forest lists its chapters, and chapter 1 opens the game with the HUD', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('pageerror', (err) => consoleErrors.push(err.message));
  await page.goto('/home');
  await expect(page.locator('[data-id="player-level"]')).toHaveText(/^Lv\.\d+$/);
  await expect(page.locator('.world-island-image')).toBeVisible();
  // The island image is shipped with the build and actually loads.
  expect(await page.locator('.world-island-image').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  // A locked region only names itself (its card on a wide island); it does not open.
  await expect(page.locator('[data-id="home-region-lau-dai"]')).toHaveText(/Lâu đài\s*Sắp có/);
  await page.locator('[data-id="home-region-lau-dai"]').click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.locator('[data-id="home-today"]')).toContainText('Hoàn thành');

  await page.locator('[data-id="home-region-khu-rung-bi-mat"]').click();
  await expect(page).toHaveURL(/\/region\/khu-rung-bi-mat$/);
  await expect(page.getByRole('heading', { name: 'Chương 1', exact: true })).toBeAttached();
  // Every textbook lesson of the forest is open from the start, with its book and pages.
  await expect(page.locator('[data-id="region-play-tv2-t01-b01"]')).toBeAttached();
  await expect(page.locator('[data-id="region-quest-textbook-tv2-t01-b01"]')).toContainText('Trang');

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

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('every locked region pin on the Home island can be tapped (nothing covers it) and names its region', async ({ page }) => {
    await page.goto('/home');
    await expect(page.locator('.world-island-image')).toBeVisible();
    const pins = page.locator('.world-marker--locked');
    // Seven regions, two of them open (the forest and the school).
    await expect(pins).toHaveCount(5);
    for (const id of await pins.evaluateAll((els) => els.map((el) => el.getAttribute('data-id')?.replace('home-region-', '') ?? ''))) {
      // tap() refuses when another element sits on top of the pin's centre.
      await page.locator(`[data-id="home-region-${id}"]`).tap();
      const bubble = page.locator(`[data-id="home-region-bubble-${id}"]`);
      await expect(bubble).toBeVisible();
      // The bubble stays inside the screen, even for pins at the island's edges.
      const box = await bubble.boundingBox();
      expect(box && box.x >= 0 && box.x + box.width <= 390 && box.y >= 0).toBe(true);
    }
    await page.locator('[data-id="home-region-khu-rung-bi-mat"]').tap();
    await expect(page).toHaveURL(/\/region\/khu-rung-bi-mat$/);
  });

  for (const [path, prefix] of [
    ['/home', 'home-region'],
    ['/map', 'map-region'],
  ] as const) {
    test(`${path}: no region marker overlaps another, even in part`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('.world-island-image')).toBeVisible();
      const markers = page.locator(`[data-id^="${prefix}-"].world-marker`);
      await expect(markers).toHaveCount(7);
      const boxes = (await markers.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()))) as Box[];
      boxes.forEach((a, i) => boxes.slice(i + 1).forEach((b) => expect(overlaps(a, b)).toBe(false)));
    });
  }
});


// iPad Gen 10 is the reference device: in both orientations every region is a readable card, as in the
// mock, and no card covers another, the child's portrait or the edge of the screen.
for (const viewport of [
  { width: 820, height: 1180 },
  { width: 1180, height: 820 },
]) {
  test.describe(`on an iPad ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, hasTouch: true });

    for (const [path, prefix] of [
      ['/home', 'home-region'],
      ['/map', 'map-region'],
    ] as const) {
      test(`${path} shows every region as a card with nothing overlapping`, async ({ page }) => {
        await page.goto(path);
        await expect(page.locator('.world-island-image')).toBeVisible();
        const markers = page.locator(`[data-id^="${prefix}-"].world-marker`);
        await expect(markers).toHaveCount(7);
        const boxes = (await markers.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()))) as Box[];
        // Cards, not pins: a locked region shows its name next to the lock.
        await expect(page.locator(`[data-id="${prefix}-lau-dai"]`)).toContainText('Lâu đài');
        // Home only: the child's portrait in the stage corner.
        const heroLocator = page.locator('.home-hero .miu-portrait');
        const hero = (await heroLocator.count()) > 0 ? await heroLocator.boundingBox() : null;
        expect(hero !== null).toBe(path === '/home');
        boxes.forEach((a, i) => {
          expect(a.x >= 0 && a.x + a.width <= viewport.width).toBe(true);
          boxes.slice(i + 1).forEach((b) => expect(overlaps(a, b)).toBe(false));
          if (hero) expect(overlaps(a, hero)).toBe(false);
        });
      });
    }
  });
}

// Region detail (M2.1) on the reference iPad both ways and on a phone: the region's map behind, every part
// of the mock on screen, nothing wider than the screen, and (held sideways) the board beside the sign.
const REGION_SHOTS = fileURLToPath(new URL('../../../.data/region/review-shots/', import.meta.url));
for (const [name, viewport] of [
  ['ipad-ngang', { width: 1180, height: 820 }],
  ['ipad-doc', { width: 820, height: 1180 }],
  ['phone', { width: 390, height: 844 }],
] as const) {
  test.describe(`region detail on ${name}`, () => {
    test.use({ viewport, hasTouch: true });

    test('shows the sign, words, progress, button and quest board over the region map', async ({ page }) => {
      await page.goto('/region/khu-rung-bi-mat');
      for (const id of ['region-backdrop', 'region-description', 'region-progress', 'region-explore', 'region-board']) {
        await expect(page.locator(`[data-id="${id}"]`)).toBeVisible();
      }
      await expect(page.locator('#region-title')).toContainText('Khu rừng bí mật');
      await expect(page.locator('.region-chest')).toHaveJSProperty('complete', true);
      expect(await page.locator('.region-chest').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      if (viewport.width > viewport.height) {
        const intro = await page.locator('.region-intro').boundingBox();
        const board = await page.locator('[data-id="region-board"]').boundingBox();
        expect(intro && board && intro.x + intro.width <= board.x).toBe(true);
      }
      mkdirSync(REGION_SHOTS, { recursive: true });
      await page.screenshot({ path: `${REGION_SHOTS}region-${name}.png`, animations: 'disabled' });
    });
  });
}
