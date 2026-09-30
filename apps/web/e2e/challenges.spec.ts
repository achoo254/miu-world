// The three Math challenges and the riddle on the reference iPad viewport with touch: real touch drags
// (CDP touch events, since page.touchscreen only taps), tap-to-select, wrong-then-right with the kind
// line from the server, and the answer layer that still lets the child finish (XP 100 → 90).
import { expect, test, type Page } from '@playwright/test';
import { freshChild, playAt, playUntil } from './quest-api';
import { waitReady } from './stats';

test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: false });

async function touchDrag(page: Page, from: string, to: string): Promise<void> {
  const a = await page.locator(from).boundingBox();
  const b = await page.locator(to).boundingBox();
  if (!a || !b) throw new Error(`cannot drag ${from} → ${to}`);
  const cdp = await page.context().newCDPSession(page);
  const start = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
  const end = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
  for (let i = 1; i <= 6; i += 1) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + ((end.x - start.x) * i) / 6, y: start.y + ((end.y - start.y) * i) / 6 }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

const tap = async (page: Page, selector: string): Promise<void> => {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`${selector} not visible`);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
};

test('drag ten apples by touch, a wrong candy answer then the right one, and the stones by tap-to-select', async ({ page, baseURL }) => {
  await freshChild(page, baseURL ?? '');
  await playUntil(page, baseURL ?? '', 'apples-for-beaver');
  await page.goto(playAt('animal-beaver'));
  await waitReady(page);
  await tap(page, '[data-id="hud-interact"]');
  await expect(page.getByRole('dialog', { name: 'Hái 10 quả táo' })).toBeVisible();
  const scrollBefore = await page.evaluate(() => window.scrollY);
  for (let i = 1; i <= 10; i += 1) await touchDrag(page, `[data-id="piece-apple-${i}"]`, '[data-id="drag-container"]');
  await expect(page.locator('[data-id="drag-count"]')).toHaveText('10');
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore); // dragging never scrolls the page
  // One too many, then back out by touch.
  await touchDrag(page, '[data-id="piece-apple-11"]', '[data-id="drag-container"]');
  await expect(page.locator('[data-id="drag-count"]')).toHaveText('11');
  await touchDrag(page, '[data-id="drag-container"] [data-id="piece-apple-11"]', '[data-id="drag-source"]');
  await expect(page.locator('[data-id="drag-count"]')).toHaveText('10');
  await tap(page, '[data-id="challenge-check"]');
  await expect(page.getByRole('dialog', { name: 'Hái 10 quả táo' })).toHaveCount(0);

  // Quiz: wrong first (a kind line, never harsh), then right.
  await tap(page, '[data-id="hud-interact"]');
  await expect(page.getByRole('dialog', { name: 'Chia kẹo với Hải ly' })).toBeVisible();
  await expect(page.locator('[data-id="challenge-prompt"]')).toContainText('tặng Mochi 3 viên');
  await tap(page, '[data-id="choice-d"]');
  await tap(page, '[data-id="challenge-check"]');
  await expect(page.locator('[data-id="challenge-try-again"]')).toBeVisible();
  await tap(page, '[data-id="choice-b"]');
  await tap(page, '[data-id="challenge-check"]');
  await expect(page.getByRole('dialog', { name: 'Chia kẹo với Hải ly' })).toHaveCount(0);

  // Stones: tap a stone, then its slot.
  await page.goto(playAt('stream-stones'));
  await waitReady(page);
  await tap(page, '[data-id="hud-interact"]');
  await expect(page.getByRole('dialog', { name: 'Qua suối' })).toBeVisible();
  for (const [i, stone] of ['stone-9', 'stone-15', 'stone-27', 'stone-34'].entries()) {
    await tap(page, `[data-id="stone-${stone}"]`);
    await tap(page, `[data-id="slot-${i}"]`);
  }
  await tap(page, '[data-id="challenge-check"]');
  await expect(page.getByRole('dialog', { name: 'Qua suối' })).toHaveCount(0);
  await expect(page.locator('[data-id="hud-tracker-step"]')).toContainText('cây cổ thụ');
});

test('the riddle with the Answer layer still finishes the chapter, for 90 XP instead of 100', async ({ page, baseURL }) => {
  await freshChild(page, baseURL ?? '');
  await playUntil(page, baseURL ?? '', 'tree-riddle');
  await page.goto(playAt('ancient-tree'));
  await waitReady(page);
  await tap(page, '[data-id="hud-interact"]');
  await expect(page.getByRole('dialog', { name: 'Giải câu đố của cây' })).toBeVisible();
  for (const layer of ['guide', 'hint', 'answer']) await tap(page, `[data-id="support-${layer}"]`);
  await expect(page.locator('[data-id="support-answer-text"]')).toContainText('13');
  await tap(page, '[data-id="challenge-reset"]');
  for (const digit of ['1', '3']) await page.getByRole('button', { name: digit, exact: true }).tap();
  await tap(page, '[data-id="challenge-check"]');
  await expect(page.getByRole('dialog', { name: 'Giải câu đố của cây' })).toHaveCount(0);

  // Open the chest: the gate opens by itself and the server pays the chapter, 10% less for the answer.
  await page.goto(playAt('chest'));
  await waitReady(page);
  await tap(page, '[data-id="hud-interact"]');
  await expect
    .poll(async () => ((await (await page.context().request.get('/api/progress')).json()) as { xp: number }).xp, { timeout: 15_000 })
    .toBe(90);
});
