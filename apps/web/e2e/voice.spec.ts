// Voice between two players, each in her own browser context, with Chromium's fake microphone (a made-up voice,
// `fake-voice.ts`) and no permission prompt. Party members connect once both tap the microphone, and the sound flows
// both ways; the voice rings the talker on the other's screen; leaving the party ends the voice and releases the
// microphone. Two friends call each other from the friends list. With a TURN key in the env, the same connection is
// forced through the relay.
import { expect, test, type Browser, type Page } from '@playwright/test';
import { freshChild } from './quest-api';
import { readStats, waitReady } from './stats';

test.use({ storageState: { cookies: [], origins: [] } });

interface PeerStats {
  id: string;
  state: string;
  bytesReceived: number;
  bytesSent: number;
  relay: boolean;
}

async function player(browser: Browser, baseURL: string, name: string): Promise<Page> {
  const context = await browser.newContext({ baseURL, permissions: ['microphone'] });
  const page = await context.newPage();
  await freshChild(page, baseURL, name);
  // Companion bots stay out: only the two players are near the spawn.
  const headers = { Origin: new URL(baseURL).origin };
  expect((await page.context().request.put('/api/player-settings', { headers, data: { botsEnabled: false } })).status()).toBe(200);
  return page;
}

const peers = (page: Page): Promise<PeerStats[]> => page.evaluate(() => window.__miuVoice?.stats() ?? Promise.resolve([]));
/** Sound arrives from another player over a connected link (a few kB within seconds). */
const hearing = async (page: Page, relay = false): Promise<boolean> => (await peers(page)).some((p) => p.state === 'connected' && p.bytesReceived > 2_000 && (!relay || p.relay));

/** Two players at the spawn, `b` invites `a` into a party. */
async function partyAt(browser: Browser, origin: string, query = ''): Promise<[Page, Page]> {
  const a = await player(browser, origin, 'Mochi');
  const b = await player(browser, origin, 'Bông');
  await a.goto(`/play?quality=low&spawnAt=spawn${query}`);
  await b.goto(`/play?quality=low&spawnAt=spawn${query}`);
  await waitReady(a);
  await waitReady(b);
  const label = b.locator('[data-kind="player"]');
  await expect(label).toBeVisible({ timeout: 15_000 });
  await label.click();
  await b.locator('[data-id="online-menu-invite"]').click();
  await a.locator('[data-id="online-invite-accept"]').click({ timeout: 10_000 });
  for (const page of [a, b]) await expect(page.locator('[data-id="online-party"]')).toContainText('(2/4)', { timeout: 10_000 });
  return [a, b];
}

test('two party members talk by voice; the talker rings; leaving the party ends it; friends call each other', async ({ browser, baseURL }) => {
  // Two game loads in two contexts, two WebRTC setups and the round trips between the players: a few seconds on a
  // GPU, far longer on CI's software GL.
  test.setTimeout(90_000);
  const [a, b] = await partyAt(browser, baseURL ?? '');

  // The microphone stays off until she taps it.
  expect(await a.evaluate(() => window.__miuVoice?.snapshot().mic)).toBe(false);
  for (const page of [a, b]) await page.locator('[data-id="voice-join"]').click();
  for (const page of [a, b]) await expect.poll(() => hearing(page), { timeout: 30_000 }).toBe(true);

  // A's voice rings her on B's screen: the mark beside her name, and her portrait in B's party frame.
  await expect.poll(async () => (await readStats(b)).remotePlayers.some((p) => p.name === 'Mochi' && p.speaking), { timeout: 20_000 }).toBe(true);

  // A turns her microphone off: B sees it on A's row.
  await a.locator('[data-id="voice-mic"]').click();
  await expect(b.locator('[data-id^="voice-mark-"][data-mic="false"]')).toHaveCount(1, { timeout: 10_000 });

  // B leaves the party (two make no party): the voice ends for both and B's microphone is released.
  await b.locator('[data-id="online-party-leave"]').click();
  await expect.poll(() => peers(a), { timeout: 10_000 }).toEqual([]);
  await expect.poll(() => b.evaluate(() => window.__miuVoice?.snapshot().joined)).toBe(false);

  // Friends: B asks, A accepts; then B calls A from the friends list and A answers.
  const label = b.locator('[data-kind="player"]');
  await label.click();
  await b.locator('[data-id="online-menu-befriend"]').click();
  await a.locator('[data-id="friend-ask-accept"]').click({ timeout: 10_000 });
  await b.locator('[data-id="hud-friends"]').click();
  const call = b.locator('[data-id^="friend-call-"]');
  await expect(call).toBeVisible({ timeout: 10_000 });
  await call.click();
  await expect(b.locator('[data-id="voice-ringing"]')).toBeVisible({ timeout: 10_000 });
  await a.locator('[data-id="voice-invite-accept"]').click({ timeout: 10_000 });
  for (const page of [a, b]) await expect(page.locator('[data-id="voice-call"]')).toBeVisible({ timeout: 10_000 });
  for (const page of [a, b]) await expect.poll(() => hearing(page), { timeout: 30_000 }).toBe(true);
  await b.locator('[data-id="voice-leave"]').click();
  await expect(a.locator('[data-id="voice-call"]')).toHaveCount(0, { timeout: 10_000 });
  await expect.poll(() => peers(a), { timeout: 10_000 }).toEqual([]);

  await a.context().close();
  await b.context().close();
});

test('voice goes through the TURN relay when every path but the relay is ruled out', async ({ browser, baseURL }) => {
  test.skip(!process.env.CF_TURN_KEY_ID, 'needs a voice relay key in the env (docs/deployment-guide.md, never in the repo)');
  // Two game loads, then a connection set up through Cloudflare's relay over the internet.
  test.setTimeout(90_000);
  const [a, b] = await partyAt(browser, baseURL ?? '', '&voiceRelay');
  for (const page of [a, b]) await page.locator('[data-id="voice-join"]').click();
  for (const page of [a, b]) await expect.poll(() => hearing(page, true), { timeout: 45_000 }).toBe(true);
  await a.context().close();
  await b.context().close();
});
