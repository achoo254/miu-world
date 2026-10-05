// Every boss on the map (owner, 05/10/2026): the full map marks the big boss and every zone guardian; the big boss's
// "Đi tới đây" takes up its quest and walks her to its next place; talking to a zone guardian opens its fight, which
// is played to its reward: a line after each blow, each question copied into the vở, every question at the end.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { copied, freshChild, notebookPage } from './quest-api';
import { readStats, waitReady } from './stats';

// Its own parent and child: the guardian's fight starts from nothing.
test.use({ storageState: { cookies: [], origins: [] } });

const REGION = 'nui-tuyet';
const LESSON = 'nui-tuyet-ch1';
const BIG = 'vuot-ai-nui-tuyet';
const GUARDIAN = 'canh-cut-dua-thu';
const FIGHT = 'ward-nui-tuyet-lang';

interface Turn {
  id: string;
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
  await page.locator('[data-id="dialogue-next"]').click();
  await page.locator('[data-id="dialogue-choice-0"]').click();

  // The fight opens by itself: each blow lands, the guardian answers, and the question goes into the vở.
  const fight = page.locator('[data-id="boss-battle"]');
  await expect(fight).toBeVisible();
  await expect(page.locator('[data-id="boss-hp"]')).toHaveText(`${TURNS.length * 100} / ${TURNS.length * 100} HP`);
  for (const [i, turn] of TURNS.entries()) {
    await expect(page.locator(`[data-id="turn-${turn.id}"]`)).toBeVisible();
    await page.locator(`[data-id="choice-${turn.answer.choice}"]`).click();
    await page.locator('[data-id="boss-attack-btn"]').click();
    await copied(page);
    if (i < TURNS.length - 1) {
      // The fight opens again by itself, the guardian's HP down by one blow and its line said.
      await expect(page.locator('[data-id="boss-hp"]')).toHaveText(`${(TURNS.length - i - 1) * 100} / ${TURNS.length * 100} HP`);
      await expect(page.locator('[data-id="boss-dialogue"]')).not.toBeEmpty();
    }
  }
  // The last blow wins: every question of the fight to copy, then what the server paid.
  await notebookPage(page, TURNS.length);
  await expect(page.locator('[data-id="completion-explore"], [data-id="completion-next"]').first()).toBeVisible();
  const progress = (await (await page.context().request.get(`/api/quests/${FIGHT}`)).json()) as { state: string; progress: { run?: number } };
  expect(progress.state).toBe('completed');
  expect(pageErrors).toEqual([]);
});
