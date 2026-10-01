// The textbook lessons (Tiếng Việt 2 and Toán 2, volume 1) in the real game: every lesson is open from the
// start, its places stand on its region's map for its chapter and quest, and a lesson plays through to its
// reward. Two lessons are played whole (one per book); every chapter of both regions shows its first
// target in the world.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { QuestDefinition, stepTargets, type ActiveQuest } from '@miu/schema/content';
import { solution } from '../../server/test/quest-solution';
import { freshChild } from './quest-api';
import { readStats, waitReady } from './stats';

const QUEST_DIR = fileURLToPath(new URL('../../../content/quests/', import.meta.url));
const textbook = readdirSync(QUEST_DIR)
  .filter((f) => /^(tv2|toan2)-.+\.json$/.test(f))
  .sort()
  .map((f) => QuestDefinition.parse(JSON.parse(readFileSync(`${QUEST_DIR}${f}`, 'utf8'))))
  .filter((q): q is ActiveQuest => q.status === 'active');
const firstTarget = (quest: ActiveQuest): string | undefined => quest.steps.flatMap((s) => stepTargets(s))[0];
const playAt = (quest: ActiveQuest, target: string) => `/play?quality=low&region=${quest.region}&quest=${quest.id}&spawnAt=${target}`;

/** Stands the child next to `target` in `quest`'s world: its prompt must come up. */
async function meets(page: Page, quest: ActiveQuest, target: string): Promise<void> {
  await page.goto(playAt(quest, target));
  await waitReady(page);
  await expect.poll(async () => (await readStats(page)).nearTarget, { message: `${quest.id}: ${target}` }).toBe(target);
}

test('all 70 lessons are live, open from the start', () => {
  expect(textbook.filter((q) => q.id.startsWith('tv2-'))).toHaveLength(34);
  expect(textbook.filter((q) => q.id.startsWith('toan2-'))).toHaveLength(36);
});

for (const id of ['tv2-t01-b01', 'toan2-cd1-b01']) {
  test(`${id} plays through: its places are in the world, and it ends with its reward`, async ({ page, baseURL }) => {
    // Meets every place of the lesson in the world (one page load each), then plays it through.
    test.setTimeout(90_000);
    const quest = textbook.find((q) => q.id === id);
    if (!quest) throw new Error(`${id} is not an active quest`);
    await freshChild(page, baseURL ?? '');
    const request = page.context().request;
    const headers = { Origin: new URL(baseURL ?? '').origin };
    expect((await (await request.get(`/api/quests/${id}`)).json()) as { state: string }).toMatchObject({ state: 'open' });
    // Every place of the lesson is on the map while it is played.
    for (const target of [...new Set(quest.steps.flatMap((s) => stepTargets(s)))]) await meets(page, quest, target);
    for (const [step, body] of solution(quest)) {
      const res = await request.post(`/api/quests/${id}/steps/${step}/complete`, { headers, data: body });
      expect(res.status(), `${id} ${step}: ${await res.text()}`).toBe(200);
    }
    expect((await (await request.get(`/api/quests/${id}`)).json()) as { state: string }).toMatchObject({ state: 'completed' });
    await page.goto(`/region/${quest.region}`);
    await expect(page.locator(`[data-id="region-quest-${id}"]`)).toHaveAttribute('data-state', 'completed');
    await expect(page.locator(`[data-id="region-quest-stars-${id}"]`)).toHaveAttribute('data-stars', /[123]/);
  });
}

// A sample, not every chapter: `pnpm content:check` already proves every target of every quest is on its
// map and shown for its chapter and quest (the same `entitiesForChapter` the game runs). This checks the
// game draws them, at the first and the last chapter of each region, so the run does not grow with content.
test('the first and the last chapter of each region show their lesson\'s first place in the world', async ({ page, baseURL }) => {
  await freshChild(page, baseURL ?? '');
  const sample = new Map<string, ActiveQuest>();
  for (const region of [...new Set(textbook.map((q) => q.region))]) {
    const inRegion = textbook.filter((q) => q.region === region).sort((a, b) => a.chapter - b.chapter);
    for (const q of [inRegion[0], inRegion.at(-1)]) if (q) sample.set(`${q.region}:${q.chapter}`, q);
  }
  expect(sample.size).toBe(4);
  for (const quest of sample.values()) {
    const target = firstTarget(quest);
    if (!target) throw new Error(`${quest.id} names no target`);
    await meets(page, quest, target);
    // Within the draw-call budget with the chapter's places in the world.
    expect((await readStats(page)).calls, quest.id).toBeLessThanOrEqual(150);
  }
});
