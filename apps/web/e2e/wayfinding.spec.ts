// Wayfinding on the river village map, with the first Tiếng Việt lesson (tv2-t01-b01): the tracker says where to
// walk (the step's goTo line), the arrow points at that place, and standing there offers the step; once
// done, the tracker and the arrow move on to the next place. The review shot shows the tracker next to
// the lesson's first character at the village gate. Characters and lines are read from the lesson, so a
// rewritten story keeps the test.
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { freshChild } from './quest-api';
import { readStats, waitReady } from './stats';

test.use({ storageState: { cookies: [], origins: [] } });

const SHOTS = fileURLToPath(new URL('../../../.data/sgk/review-shots/', import.meta.url));
mkdirSync(SHOTS, { recursive: true });
const QUEST = '/play?quality=low&region=lang-ven-song&quest=tv2-t01-b01';
/** The lesson's own wayfinding lines and targets (read as data, not imported: quest files hold answers). */
const lesson = JSON.parse(readFileSync(fileURLToPath(new URL('../../../content/quests/tv2-t01-b01.json', import.meta.url)), 'utf8')) as {
  steps: Array<{ id: string; goTo?: string; target?: string; targets?: string[]; lines?: Array<{ speaker: string }> }>;
};
const catalogue = JSON.parse(readFileSync(fileURLToPath(new URL('../../../content/world/targets.json', import.meta.url)), 'utf8')) as {
  targets: Record<string, { name: string }>;
};
/** A goTo line as the tracker shows it: `{name}` becomes the child's character name. */
const shown = (line: string): RegExp => new RegExp(`^${line.split('{name}').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.+')}$`);
const [meet, search] = lesson.steps;
const meetGoTo = meet?.goTo;
const meetTarget = meet?.target;
const searchGoTo = search?.goTo;
const searchTargets = search?.targets;
const firstSpeaker = meet?.lines?.[0]?.speaker;
if (!meetGoTo || !meetTarget || !searchGoTo || !searchTargets || !firstSpeaker) throw new Error('tv2-t01-b01 starts with a dialogue, then a search');
const tracker = '[data-id="hud-tracker-step"]';

test('the tracker says where to go, the arrow points there, and both move on when the step is done', async ({ page, baseURL }) => {
  await freshChild(page, baseURL ?? '');
  await page.goto(QUEST);
  await waitReady(page);
  await expect(page.locator(tracker)).toHaveText(shown(meetGoTo));
  await expect.poll(async () => (await readStats(page)).hintTarget).toBe(meetTarget);

  await page.goto(`${QUEST}&spawnAt=${meetTarget}`);
  await waitReady(page);
  const label = page.locator(`.npc-label[data-target="${meetTarget}"]`);
  await expect(label).toContainText(catalogue.targets[meetTarget]?.name ?? meetTarget);
  await page.screenshot({ path: `${SHOTS}wayfinding-first-character.png`, animations: 'disabled' });
  await page.keyboard.press('KeyE');
  const dialog = page.getByRole('dialog', { name: firstSpeaker });
  await expect(dialog).toBeVisible();
  // Through the lines (answering a choice when one comes) to the end of the talk.
  const done = page.locator('[data-id="dialogue-done"]');
  for (let i = 0; i < 20 && !(await done.isVisible()); i++) {
    const choice = page.locator('[data-id="dialogue-choice-0"]');
    if (await choice.isVisible()) await choice.click();
    else await page.locator('[data-id="dialogue-next"]').click();
  }
  await done.click();
  await expect(dialog).toHaveCount(0);

  await expect(page.locator(tracker)).toContainText(searchGoTo.split('{name}')[0] ?? searchGoTo); // followed by the count found so far
  await expect.poll(async () => (await readStats(page)).hintTarget).toMatch(new RegExp(`^(${searchTargets.join('|')})$`));
});

test('the region list names each lesson with its printed pages, and every lesson is open from the start', { tag: '@smoke' }, async ({ page, baseURL }) => {
  await freshChild(page, baseURL ?? '');
  await page.goto('/region/lang-ven-song');
  const row = page.locator('[data-id="region-quest-tv2-t01-b01"]');
  await expect(row.locator('[data-id="region-quest-textbook-tv2-t01-b01"]')).toHaveText('Tiếng Việt 2, tập một · Bài 1. Tôi là học sinh lớp 2Trang 10–12');
  await expect(row).toHaveAttribute('data-state', 'open');
  await expect(page.locator('[data-id="region-play-tv2-t01-b01"]')).toBeAttached();
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}region-list-pages.png` });
});

test('on a phone, the lesson line stays inside the tracker and its pages stay readable', async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await freshChild(page, baseURL ?? '');
  await page.goto(QUEST);
  await waitReady(page);
  const box = await page.locator('[data-id="hud-tracker"]').boundingBox();
  const line = await page.locator('[data-id="hud-tracker-textbook"]').boundingBox();
  const pages = await page.locator('[data-id="hud-tracker-textbook"] .textbook-ref-pages').boundingBox();
  if (!box || !line || !pages) throw new Error('tracker, lesson line and pages are all shown');
  expect(line.x + line.width).toBeLessThanOrEqual(box.x + box.width);
  expect(pages.x + pages.width).toBeLessThanOrEqual(box.x + box.width);
  await expect(page.locator('[data-id="hud-tracker-textbook"] .textbook-ref-pages')).toHaveText('Trang 10–12');
  await page.screenshot({ path: `${SHOTS}hud-tracker-pages-phone.png` });
});
