// Co-op challenges: two players form a party, the leader opens the forest's leaf-map challenge at its host, the other
// says she is in, and after the countdown each shares her clues and answers her turns; both are paid once by the
// server. Bots, lessons played as a party and party fights are checked on the server (apps/server/src/coop/*.test.ts,
// apps/server/src/multiplayer/bot-coop.test.ts).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import { freshChild } from './quest-api';
import { waitReady } from './stats';

const QUEST = 'with-ban-do-la-rung';
const HOST = 'cu-meo-gac-rung';

/** The right choice of each question, read from the content (tests may; the web app never can). */
const ANSWERS: ReadonlyMap<string, string> = (() => {
  const file = fileURLToPath(new URL(`../../../content/quests/${QUEST}.json`, import.meta.url));
  const quest = JSON.parse(readFileSync(file, 'utf8')) as { steps: Array<{ kind: string; rounds?: Array<{ task: { id: string; answer: { choice: string } } }> }> };
  const rounds = quest.steps.find((s) => s.kind === 'coop')?.rounds ?? [];
  return new Map(rounds.map((r) => [r.task.id, r.task.answer.choice]));
})();

async function player(browser: Browser, baseURL: string, name: string, bots: boolean): Promise<Page> {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await freshChild(page, baseURL, name);
  const headers = { Origin: new URL(baseURL).origin };
  expect((await page.context().request.put('/api/player-settings', { headers, data: { botsEnabled: bots } })).status()).toBe(200);
  return page;
}

/** Two players in one party (B leads), both on the forest map by its spawn. */
async function partyOfTwo(browser: Browser, origin: string): Promise<[Page, Page]> {
  const a = await player(browser, origin, 'Mochi', false);
  const b = await player(browser, origin, 'Bông', false);
  await a.goto('/play?quality=low&spawnAt=spawn');
  await b.goto('/play?quality=low&spawnAt=spawn');
  await waitReady(a);
  await waitReady(b);
  const label = b.locator('[data-kind="player"]');
  await expect(label).toBeVisible({ timeout: 10_000 });
  await label.click();
  await b.locator('[data-id="online-menu-invite"]').click();
  await a.locator('[data-id="online-invite-accept"]').click({ timeout: 10_000 });
  for (const page of [a, b]) await expect(page.locator('[data-id="online-party"]')).toBeVisible({ timeout: 10_000 });
  return [a, b];
}

/** Her coins and the challenge's progress, from the server. */
async function standing(page: Page): Promise<{ coins: number; done: boolean; run: number }> {
  const progress = (await (await page.context().request.get('/api/progress')).json()) as { coins: number };
  const list = (await (await page.context().request.get('/api/quests?category=coop')).json()) as { quests: Array<{ quest: { id: string }; progress: { completed: boolean; run: number } }> };
  const mine = list.quests.find((q) => q.quest.id === QUEST);
  return { coins: progress.coins, done: mine?.progress.completed ?? false, run: mine?.progress.run ?? 0 };
}

/** Clicks it if it is there now; a button gone meanwhile (the server moved the team on) is no move. */
const tap = async (locator: Locator): Promise<boolean> => (await locator.count()) > 0 && (await locator.click({ timeout: 2_000 }).then(() => true, () => false));

/** One move of hers, if she has one: show her clues, then answer when it is her turn. True when she did something. */
async function move(page: Page): Promise<boolean> {
  if (await tap(page.locator('[data-id^="coop-share-"]:enabled').first())) return true;
  for (const [task, choice] of ANSWERS) if (await tap(page.locator(`[data-id="coop-choice-${task}-${choice}"]:enabled`))) return true;
  return false;
}

/** Plays until the challenge ends for every page (each page's reward screens show). */
async function playToTheEnd(pages: Page[], deadline: number): Promise<void> {
  const ended = (page: Page) => page.locator('[data-id="completion-notebook-page"], [data-id="coop-end"]').count();
  while (Date.now() < deadline) {
    if ((await Promise.all(pages.map(ended))).every((n) => n > 0)) return;
    let moved = false;
    for (const page of pages) moved = (await move(page)) || moved;
    if (!moved) await pages[0]?.waitForTimeout(250); // the others' turns, the server's push
  }
  throw new Error('the challenge did not end in time');
}

test('two players in a party play a co-op challenge together and are each paid once', async ({ browser, baseURL }) => {
  // Two game loads in two contexts, a reload of one, the countdown and three rounds of moves between them.
  test.setTimeout(90_000);
  // B invites A into her party (B leads).
  const [a, b] = await partyOfTwo(browser, baseURL ?? '');
  const before = await Promise.all([standing(a), standing(b)]);

  // B goes to the challenge's host and talks to it: the party's lobby opens for both.
  await b.goto(`/play?quality=low&spawnAt=${HOST}`);
  await waitReady(b);
  await b.keyboard.press('KeyE');
  for (const page of [a, b]) await expect(page.locator('[data-id="coop-lobby"]')).toBeVisible({ timeout: 10_000 });
  await a.locator('[data-id="coop-lobby-ready"]').click();
  await expect(b.locator(`[data-id^="coop-lobby-member-"][data-ready="false"]`)).toHaveCount(0);
  await b.locator('[data-id="coop-lobby-start"]').click();
  await expect(a.locator('[data-id="coop-countdown"]')).toBeVisible();
  for (const page of [a, b]) await expect(page.locator('[data-id="coop-play"]')).toBeVisible({ timeout: 10_000 });
  // Each sees her own clue and not the other's until it is shown.
  await expect(a.locator('[data-id^="coop-share-"]')).toHaveCount(1);
  await expect(b.locator('[data-id^="coop-share-"]')).toHaveCount(1);

  await playToTheEnd([a, b], Date.now() + 60_000);
  const after = await Promise.all([standing(a), standing(b)]);
  for (const [i, now] of after.entries()) {
    expect(now).toMatchObject({ done: true, run: 1 });
    // One paid run (a second payment would make it run 2), with the challenge's coins (and any skill gift on top).
    expect(now.coins - (before[i]?.coins ?? 0)).toBeGreaterThanOrEqual(25);
  }
  await a.context().close();
  await b.context().close();
});

