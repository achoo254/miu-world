// Wayfinding on the forest map, with the E2E-only quest e2e-sgk-walk (loaded through EXTRA_QUEST_DIR):
// the tracker says where to walk (the step's goTo line), the arrow points at that place, and standing
// there offers the step; once done, the tracker and the arrow move on to the next place. The review
// shot shows the tracker next to Sâu Xanh at the forest gate.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { freshChild } from './quest-api';
import { readStats, waitReady } from './stats';

test.use({ storageState: { cookies: [], origins: [] } });

const SHOTS = fileURLToPath(new URL('../../../.data/sgk/review-shots/', import.meta.url));
mkdirSync(SHOTS, { recursive: true });
const QUEST = '/play?quality=low&region=khu-rung-bi-mat&quest=e2e-sgk-walk';
const tracker = '[data-id="hud-tracker-step"]';

test('the tracker says where to go, the arrow points there, and both move on when the step is done', async ({ page, baseURL }) => {
  await freshChild(page, baseURL ?? '');
  await page.goto(QUEST);
  await waitReady(page);
  await expect(page.locator(tracker)).toHaveText('Ra cổng rừng gặp Sâu Xanh');
  await expect.poll(async () => (await readStats(page)).hintTarget).toBe('sau-xanh');

  await page.goto(`${QUEST}&spawnAt=sau-xanh`);
  await waitReady(page);
  const label = page.locator('.npc-label[data-target="sau-xanh"]');
  await expect(label).toContainText('Sâu Xanh');
  await page.screenshot({ path: `${SHOTS}wayfinding-sau-xanh.png`, animations: 'disabled' });
  await page.keyboard.press('KeyE');
  const dialog = page.getByRole('dialog', { name: 'Sâu Xanh' });
  await expect(dialog).toBeVisible();
  await page.locator('[data-id="dialogue-done"]').click();
  await expect(dialog).toHaveCount(0);

  await expect(page.locator(tracker)).toHaveText('Sang bảng gỗ lớp Hai xem bài');
  await expect.poll(async () => (await readStats(page)).hintTarget).toBe('bang-go-lop-hai');
});

test('the region list names each lesson with its printed pages, and every lesson is open from the start', async ({ page, baseURL }) => {
  await freshChild(page, baseURL ?? '');
  await page.goto('/region/khu-rung-bi-mat');
  const row = page.locator('[data-id="region-quest-e2e-sgk-walk"]');
  await expect(row.locator('[data-id="region-quest-textbook-e2e-sgk-walk"]')).toHaveText('Tiếng Việt 2, tập một · Bài 1. Tôi là học sinh lớp 2Trang 10–12');
  await expect(row).toHaveAttribute('data-state', 'open');
  await expect(page.locator('[data-id="region-play-e2e-sgk-walk"]')).toBeVisible();
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
