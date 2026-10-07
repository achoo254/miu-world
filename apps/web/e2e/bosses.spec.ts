// A zone guardian's fight played to its reward by touch (owner, 05/10/2026): each question answered with its own play
// move (ném bùa, chạm cầu, kéo ngọc, nạp chiêu) in the running world (owner, 07/10/2026), each copied into the vở,
// every question at the end, the quest finished on the server. That every map has its bosses is checked in Node
// (`checkBossCoverage` in tools/content/check-content.ts); a long question on a phone is in the screens before a release.
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { answerBoss, copied, freshChild, notebookPage, skipBossBeat } from './quest-api';
import { readStats, waitReady } from './stats';
import { touchDrag } from './touch';

// Its own parent and child: the guardian's fight starts from nothing. A touch screen (iPad, landscape): the moves are
// played with taps and a real drag.
test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 1180, height: 820 }, hasTouch: true });

const REGION = 'nui-tuyet';
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

// REVIEW_SHOTS=1 keeps pictures of the bosses for the review page.
const REVIEW_SHOTS = process.env.REVIEW_SHOTS === '1';
const SHOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../assets/generated/review/bosses');

async function shot(page: Page, name: string): Promise<void> {
  if (!REVIEW_SHOTS) return;
  mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`) });
}

// A fight in the world keeps the game drawing, and each round trip to the page waits for a frame: on a CI runner drawing
// with a software GPU (2 to 5 frames a second) a step takes about a second, a tap or a click up to four. The fight is
// played in some 35 such steps, with room for that.
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

test('a zone guardian is fought to its reward, each question with its own play move', async ({ page, baseURL }) => {
  // About 35 steps with the game drawing on (see FIGHT_TIMEOUT_MS).
  test.setTimeout(FIGHT_TIMEOUT_MS);
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  // Its talk and first question through the API: the test plays the rest.
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
