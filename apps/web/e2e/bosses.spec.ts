// Every boss on the map (owner, 05/10/2026): the full map marks the big boss and every zone guardian; the big boss's
// "Đi tới đây" takes up its quest and walks her to its next place; talking to a zone guardian opens its fight, which
// is played to its reward: a line after each blow, each question's Hướng dẫn, Gợi ý and Đáp án, each question copied into
// the vở, every question at the end.
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { copied, freshChild, notebookPage } from './quest-api';
import { expectDrawCalls, readStats, waitReady } from './stats';

// Its own parent and child: the guardian's fight starts from nothing.
test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 1180, height: 820 } });

const REGION = 'nui-tuyet';
const LESSON = 'nui-tuyet-ch1';
const BIG = 'vuot-ai-nui-tuyet';
const GUARDIAN = 'canh-cut-dua-thu';
const FIGHT = 'ward-nui-tuyet-lang';

interface Turn {
  id: string;
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

test('a zone guardian is fought from a chat to its reward', async ({ page, baseURL }) => {
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

  // The fight opens by itself: each blow lands, the guardian answers, and the question goes into the vở.
  const fight = page.locator('[data-id="boss-battle"]');
  await expect(fight).toBeVisible();
  await expect(page.locator('[data-id="boss-hp"]')).toHaveText(`${TURNS.length * 100} / ${TURNS.length * 100} HP`);
  await shot(page, '3-dau-tri');
  for (const [i, turn] of TURNS.entries()) {
    await expect(page.locator(`[data-id="turn-${turn.id}"]`)).toBeVisible();
    if (i === 0) {
      // Every question has the three support layers: the guide from the start, the hint after a miss, the explained
      // answer after two; seeing the answer never stops the fight.
      const support = page.locator('[data-id="boss-bar"]');
      await support.locator('[data-id="support-guide"]').click();
      await expect(page.locator('[data-id="support-guide-steps"] li').first()).not.toBeEmpty();
      await page.locator('[data-id="support-close"]').click();
      const wrong = turn.choices.find((c) => c.id !== turn.answer.choice)?.id ?? '';
      for (const tab of ['support-hint', 'support-answer']) {
        await page.locator(`[data-id="choice-${wrong}"]`).click();
        await page.locator('[data-id="boss-attack-btn"]').click();
        await expect(support.locator(`[data-id="${tab}"]`)).toBeVisible();
      }
      await support.locator('[data-id="support-hint"]').click();
      await expect(page.locator('[data-id="support-hint-text"]')).not.toBeEmpty();
      await page.locator('[data-id="support-close"]').click();
      await support.locator('[data-id="support-answer"]').click();
      await expect(page.locator('[data-id="support-answer-text"]')).not.toBeEmpty();
      await shot(page, '3b-ho-tro-dap-an');
      await page.locator('[data-id="support-close"]').click();
    }
    await page.locator(`[data-id="choice-${turn.answer.choice}"]`).click();
    await page.locator('[data-id="boss-attack-btn"]').click();
    await copied(page);
    if (i < TURNS.length - 1) {
      // The fight opens again by itself, the guardian's HP down by one blow and its line said.
      await expect(page.locator('[data-id="boss-hp"]')).toHaveText(`${(TURNS.length - i - 1) * 100} / ${TURNS.length * 100} HP`);
      await expect(page.locator('[data-id="boss-dialogue"]')).not.toBeEmpty();
      if (i === 0) await shot(page, '4-sau-mot-don');
    }
  }
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
