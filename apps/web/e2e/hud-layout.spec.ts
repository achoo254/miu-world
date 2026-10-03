// The in-game HUD fits an iPad (landscape and portrait) and a phone: the menu buttons never cover the
// player badge or the quest tracker, nothing leaves the screen, and the touch controls (stick, Run,
// Jump, Interact) never overlap. A shot of each goes to the review folder.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { readStats, waitReady } from './stats';

const SHOTS = fileURLToPath(new URL('../../../.data/sgk/review-shots/', import.meta.url));
mkdirSync(SHOTS, { recursive: true });

type Box = { x: number; y: number; width: number; height: number };
const overlap = (a: Box, b: Box): boolean => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function box(locator: Locator): Promise<Box> {
  const b = await locator.boundingBox();
  if (!b) throw new Error('element is not laid out');
  return b;
}

async function checkLayout(page: Page, name: string): Promise<void> {
  // Next to the parrot: the tracker, Interact and the target hint all show.
  await page.goto('/play?quality=low&spawnAt=npc');
  await waitReady(page);
  await expect(page.locator('[data-id="hud-interact"]')).toBeVisible();
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('no viewport');
  const screen: Box = { x: 0, y: 0, width: viewport.width, height: viewport.height };

  const menu = await Promise.all(['hud-quests', 'hud-map', 'hud-backpack', 'hud-menu'].map((id) => box(page.locator(`[data-id="${id}"]`))));
  const left = [await box(page.locator('[data-id="player-badge"]')), await box(page.locator('[data-id="hud-tracker"]'))];
  const controls = [
    await box(page.locator('#joystick')),
    await box(page.locator('[data-id="game-btn-run"]')),
    await box(page.locator('[data-id="game-btn-jump"]')),
    await box(page.locator('[data-id="hud-interact"]')),
  ];
  for (const b of [...menu, ...left, ...controls]) {
    expect(b.x >= 0 && b.y >= 0 && b.x + b.width <= screen.width && b.y + b.height <= screen.height, `${name}: ${JSON.stringify(b)} on screen`).toBe(true);
  }
  for (const m of menu) for (const l of left) expect(overlap(m, l), `${name}: a menu button covers the badge or tracker`).toBe(false);
  controls.forEach((a, i) => controls.slice(i + 1).forEach((b) => expect(overlap(a, b), `${name}: touch controls overlap`).toBe(false)));
  // Touch targets stay large enough for small fingers.
  for (const b of [...menu, ...controls]) expect(Math.min(b.width, b.height), `${name}: touch target`).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: `${SHOTS}hud-${name}.png`, animations: 'disabled' });
  await checkMapSheet(page, name, screen);
}

/**
 * The full map from the minimap: it covers the whole screen, the HUD and the ride button included; its own
 * buttons and legend stay on screen, apart and large enough to tap. A shot of the map and of a picked place.
 */
async function checkMapSheet(page: Page, name: string, screen: Box): Promise<void> {
  await page.locator('[data-id="game-minimap-open"]').click();
  const sheet = page.locator('[data-id="game-minimap-sheet"]');
  await expect(sheet).toBeVisible();
  expect(await box(sheet), `${name}: the map fills the screen`).toEqual(screen);
  const ids = ['game-minimap-close', 'game-map-recenter', 'game-map-zoom-out', 'game-map-zoom-in', 'game-map-legend'];
  const controls = await Promise.all(ids.map((id) => box(page.locator(`[data-id="${id}"]`))));
  for (const b of controls) {
    expect(b.x >= 0 && b.y >= 0 && b.x + b.width <= screen.width && b.y + b.height <= screen.height, `${name}: map control ${JSON.stringify(b)} on screen`).toBe(true);
    expect(Math.min(b.width, b.height), `${name}: map touch target`).toBeGreaterThanOrEqual(44);
  }
  controls.forEach((a, i) => controls.slice(i + 1).forEach((b) => expect(overlap(a, b), `${name}: map controls overlap`).toBe(false)));
  // Nothing of the HUD shows over the map: what lies under each control and under the HUD's buttons is the map's.
  const hud = await Promise.all(['hud-menu', 'hud-tracker', 'player-badge'].map((id) => box(page.locator(`[data-id="${id}"]`))));
  const points = [...controls, ...hud].map((b) => [b.x + b.width / 2, b.y + b.height / 2] as const);
  const onSheet = await page.evaluate((list) => list.map(([x, y]) => document.querySelector('[data-id="game-minimap-sheet"]')?.contains(document.elementFromPoint(x, y)) ?? false), points);
  expect(onSheet, `${name}: the map covers the HUD`).toEqual(points.map(() => true));
  await page.screenshot({ path: `${SHOTS}map-${name}.png`, animations: 'disabled' });

  // A ride station picked from the list: its card offers the walk there.
  await page.locator('[data-id="game-map-list-toggle"]').click();
  await page.locator('.map-sheet-list-item:has(.map-sheet-swatch--stop)').first().click();
  const card = page.locator('[data-id="game-map-card"]');
  await expect(card).toBeVisible();
  await expect(page.locator('[data-id="game-map-go"]')).toBeVisible();
  const cardBox = await box(card);
  expect(cardBox.y + cardBox.height <= screen.height && cardBox.x >= 0 && cardBox.x + cardBox.width <= screen.width, `${name}: the card on screen`).toBe(true);
  await page.waitForTimeout(400); // the view glides to the place
  await page.screenshot({ path: `${SHOTS}map-card-${name}.png`, animations: 'disabled' });
  // "Đi tới đây": the map closes and she sets off along the ways.
  await page.locator('[data-id="game-map-go"]').click();
  await expect(sheet).toBeHidden();
  await expect.poll(async () => (await readStats(page)).autowalk, { timeout: 30_000 }).toMatch(/walking|arrived/);
}

test.describe('iPad landscape', () => {
  test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true });
  test('fits', async ({ page }) => checkLayout(page, 'ipad-landscape'));

  test('shows the way: the ground arrow from afar, the gem over the target up close', async ({ page }) => {
    await page.goto('/play?quality=low&spawnAt=spawn');
    await waitReady(page);
    await expect.poll(async () => (await readStats(page)).hintTarget).toBe('parrot-guide');
    await page.screenshot({ path: `${SHOTS}hint-arrow.png`, animations: 'disabled' });
    // A few steps from the parrot: the gem hangs over it.
    await page.goto('/play?quality=low&spawnAt=clue-box');
    await waitReady(page);
    await expect.poll(async () => (await readStats(page)).hintTarget).toBe('parrot-guide');
    await page.screenshot({ path: `${SHOTS}hint-gem.png`, animations: 'disabled' });
  });
});

test.describe('iPad portrait', () => {
  test.use({ viewport: { width: 820, height: 1180 }, hasTouch: true });
  test('fits', async ({ page }) => checkLayout(page, 'ipad-portrait'));
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('fits', async ({ page }) => checkLayout(page, 'phone'));
});
