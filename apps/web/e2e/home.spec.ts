// Home (M1.1) → region (M1.4/M2.1) → chapter 1 → /play with the HUD (M3.2); every chapter is open.
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
  // The child's own home is open under the child's name, and "Về nhà" goes straight in, to its front gate.
  await expect(page.locator('[data-id="home-region-nha-cua-be"]')).toContainText(/Nhà của .+/);
  await expect(page.locator('[data-id="home-nav-home"]')).toHaveAttribute('href', '/play?region=nha-cua-be&quest=nha-cua-be-ch1');
  await expect(page.locator('[data-id="home-today"]')).toContainText('Hoàn thành');

  await page.locator('[data-id="home-region-khu-rung-bi-mat"]').click();
  await expect(page).toHaveURL(/\/region\/khu-rung-bi-mat$/);
  await expect(page.getByRole('heading', { name: 'Chương 1', exact: true })).toBeAttached();
  // Every textbook lesson of the forest is open from the start, with its book and pages.
  await expect(page.locator('[data-id="region-play-tv2-t10-b17"]')).toBeAttached();
  await expect(page.locator('[data-id="region-quest-textbook-tv2-t10-b17"]')).toContainText('Trang');

  await page.locator('[data-id="region-play-forest-ch1"]').click();
  await expect(page).toHaveURL(/\/play\?region=khu-rung-bi-mat&quest=forest-ch1$/);
  await waitReady(page);
  await expect(page.locator('[data-id="hud-tracker-quest"]')).toBeVisible();
  await expect(page.locator('[data-id="player-badge"]')).toBeVisible();
  for (const id of ['hud-quests', 'hud-map', 'hud-backpack', 'hud-menu']) await expect(page.locator(`[data-id="${id}"]`)).toBeVisible();
  await expect(page.locator('[data-id="hud-interact"]')).toHaveCount(0);
  await expect(page.locator('#stats')).toBeHidden(); // the developer overlay stays off for children
  // The backpack closes with its corner ✕ and its Đóng button, not only with Esc.
  await page.locator('[data-id="hud-backpack"]').click();
  await page.locator('[data-id="play-backpack-close"]').click();
  await expect(page.locator('[data-id="play-backpack"]')).toHaveCount(0);
  await page.locator('[data-id="hud-backpack"]').click();
  await page.locator('[data-id="play-backpack-done"]').click();
  await expect(page.locator('[data-id="play-backpack"]')).toHaveCount(0);
  // Nhiệm vụ opens this map's board over the game: every quest is open, and picking one switches to it here.
  await page.locator('[data-id="hud-quests"]').click();
  await expect(page.locator('[data-id="region-quest-current-forest-ch1"]')).toBeVisible();
  await page.locator('[data-id="region-play-tv2-t10-b17"]').click();
  await expect(page.locator('[data-id="play-quests"]')).toHaveCount(0);
  await expect(page).toHaveURL(/\/play\?region=khu-rung-bi-mat&quest=tv2-t10-b17$/);
  await waitReady(page);
  await expect(page.locator('[data-id="hud-tracker-textbook"]')).toBeVisible();

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

  test('every region pin on the Home island can be tapped (nothing covers it) and opens its region', { tag: '@smoke' }, async ({ page }) => {
    await page.goto('/home');
    await expect(page.locator('.world-island-image')).toBeVisible();
    // Twelve regions, all open now that the child's home is built: no locked pin is left.
    await expect(page.locator('.world-marker--locked')).toHaveCount(0);
    // tap() refuses when another element sits on top of the pin's centre.
    for (const id of ['nha-cua-be', 'truong-hoc', 'dao-bi-an', 'khu-rung-bi-mat']) {
      await page.locator(`[data-id="home-region-${id}"]`).tap();
      await expect(page).toHaveURL(new RegExp(`/region/${id}$`));
      await page.goBack();
      await expect(page.locator('.world-island-image')).toBeVisible();
    }
  });

  for (const [path, prefix] of [
    ['/home', 'home-region'],
    ['/map', 'map-region'],
  ] as const) {
    test(`${path}: no region marker overlaps another, even in part`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('.world-island-image')).toBeVisible();
      const markers = page.locator(`[data-id^="${prefix}-"].world-marker`);
      await expect(markers).toHaveCount(12);
      const boxes = (await markers.evaluateAll((els) => els.map((el) => ({ ...el.getBoundingClientRect().toJSON(), id: el.getAttribute('data-id') ?? '' })))) as Array<Box & { id: string }>;
      expect(boxes.flatMap((a, i) => boxes.slice(i + 1).filter((b) => overlaps(a, b)).map((b) => `${a.id} × ${b.id}`))).toEqual([]);
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
        await expect(markers).toHaveCount(12);
        const boxes = (await markers.evaluateAll((els) => els.map((el) => ({ ...el.getBoundingClientRect().toJSON(), id: el.getAttribute('data-id') ?? '' })))) as Array<Box & { id: string }>;
        // Cards with their names (the child's home under the child's name).
        await expect(page.locator(`[data-id="${prefix}-nui-tuyet"]`)).toContainText('Núi tuyết');
        await expect(page.locator(`[data-id="${prefix}-nha-cua-be"]`)).toContainText('Nhà của');
        // Home only: the child's portrait in the stage corner.
        const heroLocator = page.locator('.home-hero .miu-portrait');
        const hero = (await heroLocator.count()) > 0 ? await heroLocator.boundingBox() : null;
        expect(hero !== null).toBe(path === '/home');
        for (const a of boxes) expect(a.x >= 0 && a.x + a.width <= viewport.width, `${a.id} off the screen`).toBe(true);
        expect(boxes.flatMap((a, i) => boxes.slice(i + 1).filter((b) => overlaps(a, b)).map((b) => `${a.id} × ${b.id}`))).toEqual([]);
        if (hero) expect(boxes.filter((a) => overlaps(a, hero)).map((a) => a.id), 'cards over the portrait').toEqual([]);
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
