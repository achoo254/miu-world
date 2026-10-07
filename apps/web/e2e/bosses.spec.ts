// Every boss on the map (owner, 05/10/2026): the full map marks the big boss and every zone guardian; the big boss's
// "Đi tới đây" takes up its quest and walks her to its next place; talking to a zone guardian opens its fight, which
// is played to its reward: a line after each blow, each question's Hướng dẫn, Gợi ý and Đáp án, each question copied into
// the vở, every question at the end. The fight plays out in the running world (owner, 07/10/2026): the boss stands
// there, each question is answered with a play move (ném bùa, chạm cầu, kéo ngọc, nạp chiêu), the game keeps drawing.
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { answerBoss, copied, freshChild, notebookPage, skipBossBeat } from './quest-api';
import { expectDrawCalls, readStats, waitReady } from './stats';
import { touchDrag } from './touch';

// Its own parent and child: the guardian's fight starts from nothing. A touch screen (iPad, landscape): the moves are
// played with taps and a real drag.
test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 1180, height: 820 }, hasTouch: true });

const REGION = 'nui-tuyet';
const LESSON = 'nui-tuyet-ch1';
const BIG = 'vuot-ai-nui-tuyet';
const GUARDIAN = 'canh-cut-dua-thu';
const FIGHT = 'ward-nui-tuyet-lang';

interface Turn {
  id: string;
  move: string;
  choices: Array<{ id: string }>;
  answer: { choice: string };
}

/** The guardian's questions and the right choice of each, read from the content (tests may; the web app never can). */
const TURNS: readonly Turn[] = (() => {
  const file = fileURLToPath(new URL(`../../../content/quests/${FIGHT}.json`, import.meta.url));
  const quest = JSON.parse(readFileSync(file, 'utf8')) as { steps: Array<{ kind: string; turns?: Turn[] }> };
  return quest.steps.find((s) => s.kind === 'boss')?.turns ?? [];
})();
/** Every boss of the map: its big boss and its zone guardians (content/quests). */
const GUARDIANS = ['ward-nui-tuyet-lang', 'ward-nui-tuyet-truot-tuyet', 'ward-nui-tuyet-ho-bang', 'ward-nui-tuyet-hang-bang'];

// REVIEW_SHOTS=1 keeps pictures of the bosses for the review page.
const REVIEW_SHOTS = process.env.REVIEW_SHOTS === '1';
const SHOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../assets/generated/review/bosses');
const DRAW_CALL_BUDGET = 150;

async function shot(page: Page, name: string): Promise<void> {
  if (!REVIEW_SHOTS) return;
  mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`) });
}

/** Talks to the guardian she stands by (its fight is the quest played): its lines, then the fight opens by itself. */
async function openFight(page: Page): Promise<void> {
  await page.keyboard.press('KeyE');
  await page.locator('[data-id="dialogue-next"]').click({ timeout: 15_000 });
  await page.locator('[data-id="dialogue-choice-0"]').click();
  await expect(page.locator('[data-id="boss-battle"]')).toBeVisible();
}

async function openMapList(page: Page): Promise<void> {
  await page.locator('[data-id="game-minimap-open"]').click();
  await expect(page.locator('[data-id="game-minimap-sheet"]')).toBeVisible();
  await page.locator('[data-id="game-map-list-toggle"]').click();
}

test('the full map marks every boss, and the big boss walks her into its quest', { tag: '@smoke' }, async ({ page, baseURL }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  await freshChild(page, baseURL ?? '');
  await page.goto(`/play?quality=low&region=${REGION}&quest=${LESSON}&spawnAt=spawn`);
  await waitReady(page);

  await openMapList(page);
  await expect(page.locator('[data-id="game-map-chip-boss"]')).toContainText(String(GUARDIANS.length + 1));
  for (const id of [BIG, ...GUARDIANS]) await expect(page.locator(`[data-id="game-map-place-boss-${id}"]`)).toBeVisible();
  await expect(page.locator(`[data-id="game-map-place-boss-${BIG}"]`)).toContainText('Trùm lớn');
  await expect(page.locator(`[data-id="game-map-place-boss-${FIGHT}"]`)).toContainText('Trùm canh khu');
  await shot(page, '1-ban-do-cac-trum');

  // The big boss: its quest is taken up (the map is built again for it) and she walks to its next place.
  await page.locator(`[data-id="game-map-place-boss-${BIG}"]`).click();
  await page.locator('[data-id="game-map-go"]').click();
  await expect(page).toHaveURL(new RegExp(`quest=${BIG}`));
  await waitReady(page);
  await expect.poll(async () => (await readStats(page)).autowalk, { timeout: 15_000 }).toMatch(/finding|walking|arrived/);
  expect(pageErrors).toEqual([]);
});

// A fight in the world keeps the game drawing, and each round trip to the page waits for a frame: on a CI runner drawing
// with a software GPU (2 to 5 frames a second) a step takes about a second, a tap or a click up to four. The fight is
// played in three tests of some 25 to 35 such steps each, with room for that: its opening and a right blow, the support
// layers of a question, the questions after the first to the reward.
const FIGHT_TIMEOUT_MS = 90_000;

/** The guardian's fight, its talk and its first `answered` questions done through the API, opened by the guardian. */
async function fightUnderWay(page: Page, baseURL: string, answered: number): Promise<void> {
  await freshChild(page, baseURL);
  const headers = { Origin: new URL(baseURL).origin };
  expect((await page.context().request.post(`/api/quests/${FIGHT}/steps/gap/complete`, { headers, data: {} })).status()).toBe(200);
  for (const turn of TURNS.slice(0, answered)) {
    const res = await page.context().request.post(`/api/quests/${FIGHT}/steps/dau/complete`, { headers, data: { answer: { turnId: turn.id, choice: turn.answer.choice } } });
    expect(res.status(), await res.text()).toBe(200);
  }
  await page.goto(`/play?quality=low&region=${REGION}&quest=${FIGHT}&spawnAt=${GUARDIAN}`);
  await waitReady(page);
  await expect(page.locator(`[data-id="turn-${TURNS[answered]?.id ?? ''}"]`)).toBeVisible({ timeout: 15_000 });
  await expect.poll(async () => (await readStats(page)).duel, { timeout: 10_000 }).toBe('staged');
}

test('a zone guardian fought from a chat: the fight opens in the running world and a right blow lands', async ({ page, baseURL }) => {
  // About 30 steps with the game drawing on (see FIGHT_TIMEOUT_MS).
  test.setTimeout(FIGHT_TIMEOUT_MS);
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  await freshChild(page, baseURL ?? '');
  await page.goto(`/play?quality=low&region=${REGION}&quest=${LESSON}&spawnAt=${GUARDIAN}`);
  await waitReady(page);

  // Talking to the guardian during the lesson takes up its fight, which opens with its lines.
  await page.keyboard.press('KeyE');
  await expect(page).toHaveURL(new RegExp(`quest=${FIGHT}`));
  await waitReady(page);
  const line = page.locator('[data-id="dialogue-line"]');
  await expect(line).toContainText('Cánh Cụt Đưa Thư', { timeout: 15_000 });
  await shot(page, '2-gap-trum-canh-khu');
  await page.locator('[data-id="dialogue-next"]').click();
  await page.locator('[data-id="dialogue-choice-0"]').click();

  // The fight opens by itself in the running world: the boss there, the game drawing on, the HUD and stick put away.
  const fight = page.locator('[data-id="boss-battle"]');
  await expect(fight).toBeVisible();
  await expect.poll(async () => (await readStats(page)).duel, { timeout: 10_000 }).toBe('staged');
  await expect(fight).toHaveAttribute('data-mode', 'stage');
  const frames = (await readStats(page)).frames;
  await expect.poll(async () => (await readStats(page)).frames, { timeout: 10_000 }).toBeGreaterThan(frames + 10);
  await expect(page.locator('[data-id="hud-menu"]')).toBeHidden();
  await expect(page.locator('.joystick')).toBeHidden();
  // The arrow keys move nothing meanwhile.
  const stood = (await readStats(page)).player;
  await page.keyboard.down('KeyW');
  await expect.poll(async () => (await readStats(page)).frames, { timeout: 5_000 }).toBeGreaterThan(frames + 30);
  await page.keyboard.up('KeyW');
  const now = (await readStats(page)).player;
  expect(Math.hypot(now[0] - stood[0], now[2] - stood[2])).toBeLessThan(0.05);
  await expect(page.locator('[data-id="boss-hp"]')).toHaveText(`${TURNS.length * 100} / ${TURNS.length * 100} HP`);
  await shot(page, '3-dau-tri');

  const [first] = TURNS;
  if (!first) throw new Error('no question');
  await expect(page.locator(`[data-id="turn-${first.id}"]`)).toBeVisible();
  await expect(page.locator('[data-id="boss-move"]')).toHaveAttribute('data-move', first.move);

  // The right answer lands: its vở card, then the fight opens again by itself, one blow down and the guardian's line said.
  await answerBoss(page, first.answer.choice);
  await skipBossBeat(page);
  await copied(page);
  await expect(page.locator('[data-id="boss-hp"]')).toHaveText(`${(TURNS.length - 1) * 100} / ${TURNS.length * 100} HP`);
  await expect(page.locator('[data-id="boss-dialogue"]')).not.toBeEmpty();
  await shot(page, '4-sau-mot-don');
  expect(pageErrors).toEqual([]);
});

test('a question of a zone guardian in the world has its three support layers, and a miss bounces off', async ({ page, baseURL }) => {
  // About 25 steps with the game drawing on (see FIGHT_TIMEOUT_MS).
  test.setTimeout(FIGHT_TIMEOUT_MS);
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  await fightUnderWay(page, baseURL ?? '', 0);
  const [first] = TURNS;
  if (!first) throw new Error('no question');
  // Every question has the three support layers: the guide from the start, the hint after a miss, the explained answer
  // after two; seeing the answer never stops the fight.
  const support = page.locator('[data-id="boss-bar"]');
  await support.locator('[data-id="support-guide"]').click();
  await expect(page.locator('[data-id="support-guide-steps"] li').first()).not.toBeEmpty();
  await page.locator('[data-id="support-close"]').click();
  const wrong = first.choices.find((c) => c.id !== first.answer.choice)?.id ?? '';
  for (const tab of ['support-hint', 'support-answer']) {
    await answerBoss(page, wrong);
    await expect(support.locator(`[data-id="${tab}"]`)).toBeVisible();
  }
  // A miss bounces off: the HP stays as the server has it.
  await expect(page.locator('[data-id="boss-hp"]')).toHaveText(`${TURNS.length * 100} / ${TURNS.length * 100} HP`);
  await support.locator('[data-id="support-hint"]').click();
  await expect(page.locator('[data-id="support-hint-text"]')).not.toBeEmpty();
  await page.locator('[data-id="support-close"]').click();
  await support.locator('[data-id="support-answer"]').click();
  await expect(page.locator('[data-id="support-answer-text"]')).not.toBeEmpty();
  await shot(page, '3b-ho-tro-dap-an');
  await page.locator('[data-id="support-close"]').click();
  expect(pageErrors).toEqual([]);
});

test('a zone guardian is fought to its reward, each question with its own play move', async ({ page, baseURL }) => {
  // About 35 steps with the game drawing on (see FIGHT_TIMEOUT_MS).
  test.setTimeout(FIGHT_TIMEOUT_MS);
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  // Its first question is played in the first test.
  await fightUnderWay(page, baseURL ?? '', 1);
  const rest = TURNS.slice(1);

  // Each question its move, as the content says (the content check holds every fight to a new move each question).
  let dragged = false;
  for (const [i, turn] of rest.entries()) {
    await expect(page.locator(`[data-id="turn-${turn.id}"]`)).toBeVisible();
    await expect(page.locator('[data-id="boss-move"]')).toHaveAttribute('data-move', turn.move);
    const piece = turn.move === 'fling' ? 'boss-charm' : turn.move === 'gem' ? 'boss-gem' : null;
    if (piece && !dragged) {
      // A real drag of the charm or the gem onto the answer, by touch.
      await touchDrag(page, `[data-id="${piece}"]`, `[data-id="boss-move"] [data-id="choice-${turn.answer.choice}"]`);
      dragged = true;
    } else {
      await answerBoss(page, turn.answer.choice);
    }
    await skipBossBeat(page);
    await copied(page);
    if (i < rest.length - 1) {
      // The fight opens again by itself, the guardian's HP down by one blow.
      await expect(page.locator('[data-id="boss-hp"]')).toHaveText(`${(rest.length - i - 1) * 100} / ${TURNS.length * 100} HP`);
    }
  }
  expect(dragged).toBe(true);
  // The last blow wins: every question of the fight to copy, then what the server paid.
  await expect(page.getByRole('dialog', { name: 'Chép vào vở nhé!' })).toBeVisible({ timeout: 15_000 });
  await shot(page, '5-chep-vao-vo');
  await notebookPage(page, TURNS.length);
  await expect(page.locator('[data-id="completion-explore"], [data-id="completion-next"]').first()).toBeVisible();
  const progress = (await (await page.context().request.get(`/api/quests/${FIGHT}`)).json()) as { state: string; progress: { run?: number } };
  expect(progress.state).toBe('completed');
  expect(pageErrors).toEqual([]);
});

test('a zone guardian standing beside her keeps the scene in the draw-call budget at high quality', async ({ page, baseURL }) => {
  await freshChild(page, baseURL ?? '');
  await page.goto(`/play?quality=high&region=${REGION}&quest=${LESSON}&spawnAt=${GUARDIAN}`);
  await waitReady(page);
  await expect.poll(async () => (await readStats(page)).nearTarget, { timeout: 10_000 }).toBe(GUARDIAN);
  // Some frames drawn with the guardian in view (by the frame count, not a timer), then the frame's calls.
  const from = (await readStats(page)).frames;
  await expect.poll(async () => (await readStats(page)).frames, { timeout: 10_000 }).toBeGreaterThan(from + 20);
  expectDrawCalls((await readStats(page)).calls, DRAW_CALL_BUDGET, 'draw calls beside a zone guardian at quality=high');
  await shot(page, '0-trum-canh-khu-tren-map');
});

test('a fight in the world keeps the scene in the draw-call budget at high quality', async ({ page, baseURL }) => {
  await freshChild(page, baseURL ?? '');
  await page.goto(`/play?quality=high&region=${REGION}&quest=${FIGHT}&spawnAt=${GUARDIAN}`);
  await waitReady(page);
  // Beside the guardian before the fight: the scene's calls as they are.
  const from = (await readStats(page)).frames;
  await expect.poll(async () => (await readStats(page)).frames, { timeout: 10_000 }).toBeGreaterThan(from + 20);
  const before = (await readStats(page)).calls;
  await openFight(page);
  await expect.poll(async () => (await readStats(page)).duel, { timeout: 10_000 }).toBe('staged');
  // A miss bounces off (bubbles back at her) and the camera has flown over: the fight's frame, sparks and all.
  const first = TURNS[0];
  const wrong = first?.choices.find((c) => c.id !== first.answer.choice)?.id ?? '';
  await answerBoss(page, wrong);
  await expect.poll(async () => (await readStats(page)).duelView, { timeout: 10_000 }).toBe(1);
  const during = (await readStats(page)).calls;
  test.info().annotations.push({ type: 'draw calls', description: `beside the guardian ${before}, in the fight ${during}` });
  expectDrawCalls(during, DRAW_CALL_BUDGET, 'draw calls in a fight with a zone guardian at quality=high');
});

test('a fight with less motion: the camera jumps, the orbs stand still, and it plays the same', async ({ page, baseURL }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await freshChild(page, baseURL ?? '');
  await page.goto(`/play?quality=mid&region=${REGION}&quest=${FIGHT}&spawnAt=${GUARDIAN}`);
  await waitReady(page);
  await openFight(page);
  await expect.poll(async () => (await readStats(page)).duel, { timeout: 10_000 }).toBe('staged');
  // No flight over: two frames after the fight is staged the camera already stands at its view (a flight would be a
  // few hundredths of the way there).
  const staged = (await readStats(page)).frames;
  await expect.poll(async () => (await readStats(page)).frames, { timeout: 5_000 }).toBeGreaterThan(staged + 2);
  expect((await readStats(page)).duelView).toBe(1);
  await expect(page.locator('[data-id="boss-move"]')).toHaveAttribute('data-calm', '1');
  const first = TURNS[0];
  if (!first) throw new Error('no question');
  await answerBoss(page, first.answer.choice);
  await copied(page);
  await expect(page.locator('[data-id="boss-hp"]')).toHaveText(`${(TURNS.length - 1) * 100} / ${TURNS.length * 100} HP`);
});

/** The fights with the longest questions and answers a zone guardian asks (content/quests), at that question. */
const LONG_QUESTIONS = [
  { quest: 'ward-lau-dai-cau-treo', region: 'lau-dai', target: 'cho-bac-canh-hao', turn: 4 },
  { quest: 'ward-dao-rung-nhiet-doi', region: 'dao-bi-an', target: 'bao-dom-rung-mua', turn: 2 },
];

for (const viewport of [{ width: 360, height: 740 }, { width: 820, height: 1180 }]) {
  test(`review pictures: a long question and long answers in the world on an upright ${viewport.width} × ${viewport.height} screen`, async ({ browser, baseURL }) => {
    test.skip(!REVIEW_SHOTS, 'pictures for the review page only (REVIEW_SHOTS=1)');
    // Two maps loaded at high quality on a small screen, for the review page only.
    test.setTimeout(150_000);
    const context = await browser.newContext({ baseURL, viewport, hasTouch: true, storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await freshChild(page, baseURL ?? '');
    const headers = { Origin: new URL(baseURL ?? '').origin };
    for (const fight of LONG_QUESTIONS) {
      const file = fileURLToPath(new URL(`../../../content/quests/${fight.quest}.json`, import.meta.url));
      const turns = (JSON.parse(readFileSync(file, 'utf8')) as { steps: Array<{ kind: string; turns?: Turn[] }> }).steps.find((s) => s.kind === 'boss')?.turns ?? [];
      // Its talk and the questions before the long one, through the API.
      expect((await page.context().request.post(`/api/quests/${fight.quest}/steps/gap/complete`, { headers, data: {} })).status()).toBe(200);
      for (const turn of turns.slice(0, fight.turn)) {
        const res = await page.context().request.post(`/api/quests/${fight.quest}/steps/dau/complete`, { headers, data: { answer: { turnId: turn.id, choice: turn.answer.choice } } });
        expect(res.status(), await res.text()).toBe(200);
      }
      await page.goto(`/play?quality=high&region=${fight.region}&quest=${fight.quest}&spawnAt=${fight.target}`);
      await waitReady(page);
      await expect(page.locator(`[data-id="turn-${turns[fight.turn]?.id ?? ''}"]`)).toBeVisible({ timeout: 15_000 });
      await expect.poll(async () => (await readStats(page)).duel, { timeout: 10_000 }).not.toBeNull();
      const stats = await readStats(page);
      const frames = stats.frames;
      await expect.poll(async () => (await readStats(page)).frames, { timeout: 10_000 }).toBeGreaterThan(frames + 40);
      test.info().annotations.push({ type: 'fight', description: `${fight.quest} at ${viewport.width}×${viewport.height}: ${stats.duel}, ${(await readStats(page)).calls} draw calls` });
      // Every answer whole on screen and big enough to touch.
      for (const box of await page.locator('[data-id="boss-move"] .duel-target').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON() as DOMRect))) {
        expect(box.width).toBeGreaterThanOrEqual(48);
        expect(box.height).toBeGreaterThanOrEqual(48);
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(viewport.width);
        expect(box.top).toBeGreaterThanOrEqual(0);
        expect(box.bottom).toBeLessThanOrEqual(viewport.height);
      }
      await shot(page, `6-cau-dai-${fight.region}-${viewport.width}x${viewport.height}`);
    }
    await context.close();
  });
}
