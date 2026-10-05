// Two players on one map, each in her own browser context (two accounts): each sees the other as she saved
// herself (clothes, pet), new clothes show without a reload, an invite makes a party both see, a friend request
// accepted puts each in the other's friends list, and a block hides them from each other.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import { freshChild } from './quest-api';
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

/**
 * The party frame and the friends list on a phone and on an iPad: folded the frame is one row of faces, open or
 * folded it stays on screen clear of the menu buttons and the touch controls, and the friends list never shows over
 * it (the frame steps aside while the list is open). A shot of each goes to the review folder.
 */
async function checkPartyLayout(page: Page, name: string, size: { width: number; height: number }): Promise<void> {
  await page.setViewportSize(size);
  const screen: Box = { x: 0, y: 0, ...size };
  const frame = page.locator('[data-id="online-party"]');
  const onScreen = (b: Box, what: string) => expect(b.x >= 0 && b.y >= 0 && b.x + b.width <= screen.width && b.y + b.height <= screen.height, `${name}: ${what} on screen`).toBe(true);
  const others = async (): Promise<Box[]> =>
    Promise.all(['hud-quests', 'hud-map', 'hud-backpack', 'hud-menu', 'game-btn-run', 'game-btn-jump'].map((id) => box(page.locator(`[data-id="${id}"]`)))).then(async (list) => [...list, await box(page.locator('#joystick'))]);
  for (const folded of [true, false]) {
    const toggle = page.locator(folded ? '[data-id="online-party-fold"]' : '[data-id="online-party-expand"]');
    if ((await frame.getAttribute('data-folded')) !== String(folded)) await toggle.click();
    await expect(frame).toHaveAttribute('data-folded', String(folded));
    const at = await box(frame);
    onScreen(at, `the ${folded ? 'folded' : 'open'} party`);
    for (const other of await others()) expect(overlap(at, other), `${name}: the party frame covers a button`).toBe(false);
    const handle = await box(page.locator(folded ? '[data-id="online-party-expand"]' : '[data-id="online-party-fold"]'));
    expect(Math.min(handle.width, handle.height), `${name}: fold touch target`).toBeGreaterThanOrEqual(48);
    await page.screenshot({ path: `${SHOTS}party-${name}-${folded ? 'folded' : 'open'}.png`, animations: 'disabled' });
  }
  await page.locator('[data-id="hud-friends"]').click();
  const dialog = page.locator('[data-id="play-friends"]');
  await expect(dialog).toBeVisible();
  await expect(frame).toHaveCount(0);
  onScreen(await box(dialog), 'the friends list');
  const close = await box(page.locator('[data-id="play-friends-close"]'));
  expect(Math.min(close.width, close.height), `${name}: close touch target`).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: `${SHOTS}party-${name}-friends.png`, animations: 'disabled' });
  await page.locator('[data-id="play-friends-close"]').click();
  await expect(frame).toBeVisible();
}

async function player(browser: Browser, baseURL: string, name: string, look: { equipped: string[]; pet?: string }): Promise<Page> {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await freshChild(page, baseURL, name);
  const headers = { Origin: new URL(baseURL).origin };
  expect((await page.context().request.put('/api/character', { headers, data: { name, ...look } })).status()).toBe(200);
  // Companion bots stay out of these screens (her own setting): only the two players are near the spawn.
  expect((await page.context().request.put('/api/player-settings', { headers, data: { botsEnabled: false } })).status()).toBe(200);
  return page;
}

/** What `page` sees of the player named `name` (undefined: not drawn). */
async function seen(page: Page, name: string) {
  return (await readStats(page)).remotePlayers.find((p) => p.name === name);
}

test('two players see each other as saved, live; party up; become friends; a block hides them from each other', async ({ browser, baseURL }) => {
  // Two game loads in two contexts, then the round trips between them: a few seconds on a GPU, far longer on
  // CI's software GL.
  test.setTimeout(90_000);
  const origin = baseURL ?? '';
  const a = await player(browser, origin, 'Mochi', { equipped: ['hat-witch-pink', 'backpack-brown'], pet: 'cun-con' });
  const b = await player(browser, origin, 'Bông', { equipped: [] });
  await a.goto('/play?quality=low&spawnAt=spawn');
  await b.goto('/play?quality=low&spawnAt=spawn');
  await waitReady(a);
  await waitReady(b);

  // B sees A in her saved clothes and with her pet; the name is the one A chose.
  await expect.poll(async () => (await seen(b, 'Mochi'))?.outfit, { timeout: 20_000 }).toEqual(['hat-witch-pink', 'backpack-brown']);
  expect((await seen(b, 'Mochi'))?.pet).toBe('cun-con');
  expect((await seen(b, 'Mochi'))?.isBot).toBe(false);

  // A changes clothes: B sees it without a reload.
  const headers = { Origin: new URL(origin).origin };
  expect((await a.context().request.put('/api/character', { headers, data: { name: 'Mochi', equipped: ['hat-witch-mint'], pet: 'cun-con' } })).status()).toBe(200);
  await expect.poll(async () => (await seen(b, 'Mochi'))?.outfit, { timeout: 10_000 }).toEqual(['hat-witch-mint']);

  // B, next to A, opens the interaction menu on her and invites her; A joins.
  const label = b.locator('[data-kind="player"]');
  await expect(label).toBeVisible({ timeout: 10_000 });
  await label.click();
  await b.locator('[data-id="online-menu-invite"]').click();
  await a.locator('[data-id="online-invite-accept"]').click({ timeout: 10_000 });
  for (const page of [a, b]) await expect(page.locator('[data-id="online-party"]')).toContainText('(2/4)', { timeout: 10_000 });
  await expect.poll(async () => (await seen(b, 'Mochi'))?.partyMate).toBe(true);
  // On a phone and on an iPad the party frame and the friends list never overlap anything.
  const desktop = a.viewportSize();
  await checkPartyLayout(a, 'phone', { width: 390, height: 844 });
  await checkPartyLayout(a, 'ipad', { width: 1180, height: 820 });
  if (desktop) await a.setViewportSize(desktop);

  // B asks A to be friends; A accepts on the card; both lists show the other.
  await label.click();
  await b.locator('[data-id="online-menu-befriend"]').click();
  await a.locator('[data-id="friend-ask-accept"]').click({ timeout: 10_000 });
  for (const [page, other] of [
    [a, 'Bông'],
    [b, 'Mochi'],
  ] as const) {
    await page.locator('[data-id="hud-friends"]').click();
    await expect(page.locator('[data-id="play-friends"]')).toContainText(other, { timeout: 10_000 });
    await page.locator('[data-id="play-friends-close"]').click();
  }

  // B blocks A: the party ends for B and neither sees the other any more.
  await label.click();
  await b.locator('[data-id="online-menu-block"]').click();
  await b.locator('[data-id="online-menu-block-yes"]').click();
  await expect.poll(async () => await seen(b, 'Mochi'), { timeout: 10_000 }).toBeUndefined();
  await expect.poll(async () => await seen(a, 'Bông'), { timeout: 10_000 }).toBeUndefined();
  await expect(b.locator('[data-id="online-party"]')).toHaveCount(0);

  await a.context().close();
  await b.context().close();
});
