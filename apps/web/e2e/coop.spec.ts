// Co-op challenges: two players form a party, the leader opens the forest's leaf-map challenge at its host, the other
// says she is in, and after the countdown each shares her clues and answers her turns; both are paid once by the
// server. A player alone with her bot switch on gets companion bots in the free places, who play their part.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import { freshChild, playAt } from './quest-api';
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

test('a player alone gets companion bots in the free places, and they play their part', async ({ browser, baseURL }) => {
  // The bots think like players over their clues and turns (a few seconds each, now and then a wrong try).
  test.setTimeout(120_000);
  const page = await player(browser, baseURL ?? '', 'Mochi', true);
  const before = await standing(page);
  await page.goto(`/play?quality=low&spawnAt=${HOST}`);
  await waitReady(page);
  await page.keyboard.press('KeyE');
  await expect(page.locator('[data-id="coop-lobby-bots"]')).toBeVisible({ timeout: 10_000 });
  await page.locator('[data-id="coop-lobby-start"]').click();
  await expect(page.locator('[data-id="coop-play"]')).toBeVisible({ timeout: 10_000 });
  // Three places: hers and two bots, always labelled.
  await expect(page.locator('[data-id^="coop-seat-"]')).toHaveCount(3);
  await expect(page.locator('[data-id^="coop-seat-"] [aria-label="Bạn máy"]')).toHaveCount(2);
  await playToTheEnd([page], Date.now() + 120_000);
  const after = await standing(page);
  expect(after).toMatchObject({ done: true, run: 1 });
  expect(after.coins - before.coins).toBeGreaterThanOrEqual(25);
  await page.context().close();
});

test('the party plays a lesson together: the leader asks, the other joins, a talk of one moves both on', async ({ browser, baseURL }) => {
  // Two game loads, a reload of the leader at the parrot, and the round trips of the party's quest.
  test.setTimeout(90_000);
  const [a, b] = await partyOfTwo(browser, baseURL ?? '');
  await b.locator('[data-id="party-quest-start"]').click();
  await a.locator('[data-id="party-quest-join"]').click({ timeout: 10_000 });
  for (const page of [a, b]) await expect(page.locator('[data-id="party-quest"]')).toBeVisible({ timeout: 10_000 });
  // B talks to the parrot: A's own progress on the lesson moves too, from the server.
  await b.goto(playAt('parrot-guide'));
  await waitReady(b);
  await b.keyboard.press('KeyE');
  await b.getByRole('button', { name: 'Tiếp' }).click();
  await b.getByRole('button', { name: 'Tiếp' }).click();
  await b.getByRole('button', { name: 'Tớ sẽ giúp!' }).click();
  await b.getByRole('button', { name: 'Tiếp tục' }).click();
  await expect
    .poll(async () => ((await (await a.context().request.get('/api/quests/forest-ch1')).json()) as { progress: { completedSteps: string[] } }).progress.completedSteps, { timeout: 10_000 })
    .toContain('meet-parrot');
  await a.context().close();
  await b.context().close();
});

test("the party fights a zone guardian: each member has every question's Hướng dẫn, Gợi ý and Đáp án on her own screen", async ({ browser, baseURL }) => {
  // Two game loads, both at the guardian again for its quest, then the party's shared talk and the fight opening.
  test.setTimeout(90_000);
  const [a, b] = await partyOfTwo(browser, baseURL ?? '');
  const atGuardian = '/play?quality=low&region=khu-rung-bi-mat&quest=ward-khu-rung-trang-tay-bac&spawnAt=nai-gac-dong-co';
  await b.goto(atGuardian);
  await waitReady(b);
  await b.locator('[data-id="party-quest-start"]').click();
  await a.locator('[data-id="party-quest-join"]').click({ timeout: 10_000 });
  await a.goto(atGuardian);
  await waitReady(a);
  // B greets the guardian for both; her fight opens by itself.
  await b.keyboard.press('KeyE');
  await b.locator('[data-id="dialogue-next"]').click({ timeout: 15_000 });
  await b.locator('[data-id="dialogue-choice-0"]').click();
  await expect(b.locator('[data-id="boss-battle"]')).toBeVisible({ timeout: 10_000 });
  // A's talk was done with B's: her fight opens by itself or when she turns to the guardian.
  await expect
    .poll(async () => ((await (await a.context().request.get('/api/quests/ward-khu-rung-trang-tay-bac')).json()) as { progress: { completedSteps: string[] } }).progress.completedSteps, { timeout: 10_000 })
    .toContain('gap');
  const fightA = a.locator('[data-id="boss-battle"]');
  await fightA.waitFor({ timeout: 5_000 }).catch(() => a.keyboard.press('KeyE'));
  await expect(fightA).toBeVisible({ timeout: 10_000 });
  // Whoever's blow it is, each member reads the question's guide on her own screen, from the server.
  for (const page of [a, b]) {
    await page.locator('[data-id="boss-bar"] [data-id="support-guide"]').click();
    await expect(page.locator('[data-id="support-guide-steps"] li').first()).not.toBeEmpty();
  }
  await a.context().close();
  await b.context().close();
});
