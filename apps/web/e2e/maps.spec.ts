// The wide maps (800 x 800, loaded region by region) on the production build: each theme map opens next to
// its guide within the draw-call budget, and the gates carry the child from the school hub into a theme map
// and back. Guides, lessons and gates are read from the content and the maps' entities as data.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { freshChild } from './quest-api';
import { readStats, waitReady } from './stats';

test.use({ storageState: { cookies: [], origins: [] } });

const DRAW_CALL_BUDGET = 150;
const read = <T>(rel: string): T => JSON.parse(readFileSync(fileURLToPath(new URL(`../../../${rel}`, import.meta.url)), 'utf8')) as T;
const regions = read<{ regions: Array<{ id: string; status: string; guide?: string }> }>('content/world/regions.json').regions;
const targets = read<{ targets: Record<string, { name: string }> }>('content/world/targets.json').targets;
const questDir = fileURLToPath(new URL('../../../content/quests/', import.meta.url));
const quests = readdirSync(questDir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(`${questDir}${f}`, 'utf8')) as { id: string; region: string; status: string; steps?: Array<{ target?: string }> });
/** A lesson of the region in which its guide plays (the guide stands in that lesson's chapter). */
const lessonWithGuide = (region: string, guide: string) => quests.find((q) => q.region === region && q.status === 'active' && q.steps?.some((s) => s.target === guide));
const firstLesson = (region: string) => quests.find((q) => q.region === region && q.status === 'active');

const THEME_MAPS = ['lang-ven-song', 'xom-mai-am', 'cho-phien', 'nong-trai', 'thu-vien', 'lau-dai'];

for (const id of THEME_MAPS) {
  test(`${id} opens beside its guide within the draw-call budget`, async ({ page, baseURL }) => {
    const guide = regions.find((r) => r.id === id)?.guide;
    const lesson = guide ? lessonWithGuide(id, guide) : undefined;
    if (!guide || !lesson) throw new Error(`${id} has no guide met in a lesson`);
    await freshChild(page, baseURL ?? '');
    await page.goto(`/play?quality=low&region=${id}&quest=${lesson.id}&spawnAt=${guide}`);
    await waitReady(page);
    await expect(page.locator(`.npc-label[data-target="${guide}"]`)).toContainText(targets[guide]?.name ?? guide);
    expect((await readStats(page)).calls).toBeLessThanOrEqual(DRAW_CALL_BUDGET);
  });
}

test('a gate of the school hub leads into the market, and the market gate leads back', async ({ page, baseURL }) => {
  const hubLesson = firstLesson('truong-hoc');
  const market = firstLesson('cho-phien');
  if (!hubLesson || !market) throw new Error('no lesson in the hub or the market');
  await freshChild(page, baseURL ?? '');
  await page.goto(`/play?quality=low&region=truong-hoc&quest=${hubLesson.id}&spawnAt=cong-cho-phien`);
  await waitReady(page);
  await page.keyboard.press('KeyE');
  await expect(page).toHaveURL(new RegExp(`region=cho-phien&quest=${market.id}`));
  await waitReady(page);
  await page.goto(`/play?quality=low&region=cho-phien&quest=${market.id}&spawnAt=cong-truong-hoc`);
  await waitReady(page);
  await page.keyboard.press('KeyE');
  await expect(page).toHaveURL(/region=truong-hoc/);
});
