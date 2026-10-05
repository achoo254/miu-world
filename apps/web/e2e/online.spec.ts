// Two players on one map, each in her own browser context (two accounts): each sees the other as she saved
// herself (clothes, pet), new clothes show without a reload, an invite makes a party both see, and a block hides
// them from each other.
import { expect, test, type Browser, type Page } from '@playwright/test';
import { freshChild } from './quest-api';
import { readStats, waitReady } from './stats';

async function player(browser: Browser, baseURL: string, name: string, look: { equipped: string[]; pet?: string }): Promise<Page> {
  const context = await browser.newContext({ baseURL });
  // Companion bots stay out of these screens: only the two players are near the spawn.
  await context.addInitScript(() => window.localStorage.setItem('miu.bots.enabled', 'false'));
  const page = await context.newPage();
  await freshChild(page, baseURL, name);
  const headers = { Origin: new URL(baseURL).origin };
  expect((await page.context().request.put('/api/character', { headers, data: { name, ...look } })).status()).toBe(200);
  return page;
}

/** What `page` sees of the player named `name` (undefined: not drawn). */
async function seen(page: Page, name: string) {
  return (await readStats(page)).remotePlayers.find((p) => p.name === name);
}

test('two players see each other as saved, live; party up; a block hides them from each other', async ({ browser, baseURL }) => {
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
