// The wide maps (800 x 800, loaded region by region) on the production build: the hub, Trung tâm, opens next to
// its guide within the draw-call budget (every theme map on the nightly run), and a gate of the hub carries the
// child onto the mystery island and back. Guides, lessons and gates are read from the content and the maps'
// entities as data. Gates, stops and quest places of every map are checked in Node (reach-audit.ts and the quest
// target audit in `pnpm content:check`).
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
  .map((f) => JSON.parse(readFileSync(`${questDir}${f}`, 'utf8')) as { id: string; region: string; status: string; category?: string; steps?: Array<{ target?: string }> })
  // Minigame side quests are offered by their characters, never the lesson a map opens beside.
  .filter((q) => q.category !== 'side');
/** A lesson of the region in which its guide plays (the guide stands in that lesson's chapter). */
const lessonWithGuide = (region: string, guide: string) => quests.find((q) => q.region === region && q.status === 'active' && q.steps?.some((s) => s.target === guide));
const firstLesson = (region: string) => quests.find((q) => q.region === region && q.status === 'active');

const THEME_MAPS = ['lang-ven-song', 'xom-mai-am', 'cho-phien', 'nong-trai', 'thu-vien', 'lau-dai', 'trung-tam', 'nui-tuyet', 'dao-bi-an', 'nha-cua-be'];
/**
 * E2E samples the maps (docs/code-standards.md: checks that grow with content live in Node): the hub, where the
 * players meet, on every run; every map with E2E_ALL_MAPS=1 (the nightly CI run).
 */
const ALL_MAPS = process.env.E2E_ALL_MAPS === '1';
const SAMPLE_MAPS = new Set(['trung-tam']);

for (const id of THEME_MAPS.filter((m) => ALL_MAPS || SAMPLE_MAPS.has(m))) {
  test(`${id} opens beside its guide (or its first character) within the draw-call budget`, async ({ page, baseURL }) => {
    // The guide where a lesson has the child meet it (on the farm Bò Sữa Mơ only speaks: its first lesson's first character).
    const guide = regions.find((r) => r.id === id)?.guide;
    const withGuide = guide ? lessonWithGuide(id, guide) : undefined;
    const lesson = withGuide ?? firstLesson(id);
    const meet = withGuide ? guide : lesson?.steps?.find((s) => s.target)?.target;
    if (!lesson || !meet) throw new Error(`${id} has no lesson with a character to meet`);
    await freshChild(page, baseURL ?? '');
    await page.goto(`/play?quality=low&region=${id}&quest=${lesson.id}&spawnAt=${meet}`);
    await waitReady(page);
    // Standing there offers a lesson target (the character, or a thing of its place right beside it).
    await expect.poll(async () => (await readStats(page)).nearTarget).not.toBeNull();
    if (withGuide && guide) await expect(page.locator(`.npc-label[data-target="${guide}"]`)).toContainText(targets[guide]?.name ?? guide);
    expect((await readStats(page)).calls).toBeLessThanOrEqual(DRAW_CALL_BUDGET);
  });
}

test('a gate of the hub, Trung tâm, leads onto the mystery island, and the island gate leads back', async ({ page, baseURL }) => {
  const hubLesson = firstLesson('trung-tam');
  const island = firstLesson('dao-bi-an');
  if (!hubLesson || !island) throw new Error('no quest in the hub or on the island');
  await freshChild(page, baseURL ?? '');
  await page.goto(`/play?quality=low&region=trung-tam&quest=${hubLesson.id}&spawnAt=cong-dao-bi-an`);
  await waitReady(page);
  // Every portal of the hub swirls with sparks (one draw for all of them).
  const hubPortals = read<{ props: Array<{ model: string }> }>('assets/generated/world/trung-tam/entities.json').props.filter((p) => /\/tt-portal-/.test(p.model)).length;
  expect(hubPortals).toBeGreaterThan(0);
  expect((await readStats(page)).portals).toBe(hubPortals);
  await page.screenshot({ path: fileURLToPath(new URL('../../../.data/sgk/review-shots/portal-sparks.png', import.meta.url)) });
  await page.keyboard.press('KeyE');
  await expect(page).toHaveURL(new RegExp(`region=dao-bi-an&quest=${island.id}`));
  // The trip through the portal shows (owner, 03/10/2026), then she stands at the island's starting point for
  // the lesson's chapter, and the quest card walks her to the lesson (the new map gets the step's target).
  await expect(page.locator('[data-id="play-loading"][data-via="portal"]')).toBeVisible();
  await page.screenshot({ path: fileURLToPath(new URL('../../../.data/sgk/review-shots/portal-trip.png', import.meta.url)) });
  await waitReady(page);
  const islandMap = read<{ spawn: { position: number[] }; chapterSpawns?: Record<string, { position: number[] }> }>('assets/generated/world/dao-bi-an/entities.json');
  const chapter = (read<{ chapter?: number }>(`content/quests/${island.id}.json`).chapter ?? 1).toString();
  const [sx = 0, , sz = 0] = (islandMap.chapterSpawns?.[chapter] ?? islandMap.spawn).position;
  const [px = 0, , pz = 0] = (await readStats(page)).player;
  expect(Math.hypot(px - sx, pz - sz)).toBeLessThan(3);
  await expect(page.locator('[data-id="hud-autowalk"]')).toHaveText('Chạm để tự đi tới');
  await page.goto(`/play?quality=low&region=dao-bi-an&quest=${island.id}&spawnAt=cong-trung-tam`);
  await waitReady(page);
  await page.keyboard.press('KeyE');
  await expect(page).toHaveURL(/region=trung-tam/);
});
