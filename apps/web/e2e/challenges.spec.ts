// The three Math challenges and the riddle on the reference iPad viewport with touch: real touch drags
// (CDP touch events, since page.touchscreen only taps), tap-to-select, wrong-then-right with the kind
// line from the server, and the answer layer that still lets the child finish (XP 100 → 90).
import { expect, test } from '@playwright/test';
import { copied, freshChild, notebookPage, playAt, playUntil } from './quest-api';
import { waitReady } from './stats';
import { tap, touchDrag } from './touch';

test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: false });

test('drag ten apples by touch, a wrong candy answer then the right one, and the stones by tap-to-select', async ({ page, baseURL }) => {
  await freshChild(page, baseURL ?? '');
  await playUntil(page, baseURL ?? '', 'apples-for-beaver');
  await page.goto(playAt('animal-beaver'));
  await waitReady(page);
  await tap(page, '[data-id="hud-interact"]');
  await expect(page.getByRole('dialog', { name: 'Hái 10 quả táo' })).toBeVisible();
  const scrollBefore = await page.evaluate(() => window.scrollY);
  // The apples waiting in the tree bob (what is drawn inside them; the tile itself stays put for the finger).
  const animationOf = (selector: string) => page.locator(selector).evaluate((el) => getComputedStyle(el).animationName);
  expect(await animationOf('[data-id="piece-apple-1"] > *')).toBe('object-idle');
  expect(await animationOf('[data-id="piece-apple-1"]')).toBe('none');
  await touchDrag(page, '[data-id="piece-apple-1"]', '[data-id="drag-container"]');
  // It pops into the basket, and the basket gulps it.
  await expect(page.locator('[data-id="drag-container"] [data-id="piece-apple-1"]')).toHaveClass(/object-landed/);
  await expect(page.locator('[data-id="drag-container"]')).toHaveClass(/zone-gulp/);
  for (let i = 2; i <= 10; i += 1) await touchDrag(page, `[data-id="piece-apple-${i}"]`, '[data-id="drag-container"]');
  await expect(page.locator('[data-id="drag-count"]')).toHaveText('10');
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore); // dragging never scrolls the page
  // One too many by tap-to-select (tap the apple, then the basket), then back out the same way.
  await tap(page, '[data-id="piece-apple-11"]');
  await tap(page, '[data-id="drag-container"] .drag-container-label');
  await expect(page.locator('[data-id="drag-count"]')).toHaveText('11');
  await tap(page, '[data-id="drag-container"] [data-id="piece-apple-11"]');
  await tap(page, '[data-id="drag-source"]', { x: 0.9, y: 0.9 }); // an empty corner, not another apple
  await expect(page.locator('[data-id="drag-count"]')).toHaveText('10');
  // And once more by touch drag, out and back.
  await touchDrag(page, '[data-id="drag-container"] [data-id="piece-apple-10"]', '[data-id="drag-source"]');
  await expect(page.locator('[data-id="drag-count"]')).toHaveText('9');
  await touchDrag(page, '[data-id="piece-apple-10"]', '[data-id="drag-container"]');
  await expect(page.locator('[data-id="drag-count"]')).toHaveText('10');
  await tap(page, '[data-id="challenge-check"]');
  await expect(page.getByRole('dialog', { name: 'Hái 10 quả táo' })).toHaveCount(0);
  await copied(page);

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
  await copied(page);

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
  await copied(page);
  await expect(page.locator('[data-id="hud-tracker-step"]')).toContainText('cây cổ thụ');
});

test('the riddle with the Answer layer still finishes the chapter, for 90 XP instead of 100', async ({ page, baseURL }) => {
  await freshChild(page, baseURL ?? '');
  await playUntil(page, baseURL ?? '', 'tree-riddle');
  await page.goto(playAt('ancient-tree'));
  await waitReady(page);
  await tap(page, '[data-id="hud-interact"]');
  await expect(page.getByRole('dialog', { name: 'Giải câu đố của cây' })).toBeVisible();
  // The child tries first: the hint opens after one wrong answer, the answer after two.
  await expect(page.locator('[data-id="support-answer"]')).toHaveCount(0);
  await page.getByRole('button', { name: '7', exact: true }).tap();
  for (let i = 0; i < 2; i++) {
    await tap(page, '[data-id="challenge-check"]');
    await expect(page.locator('[data-id="challenge-try-again"]')).toBeVisible();
  }
  for (const layer of ['guide', 'hint', 'answer']) await tap(page, `[data-id="support-${layer}"]`);
  await expect(page.locator('[data-id="support-answer-text"]')).toContainText('13');
  await tap(page, '[data-id="challenge-reset"]');
  for (const digit of ['1', '3']) await page.getByRole('button', { name: digit, exact: true }).tap();
  await tap(page, '[data-id="challenge-check"]');
  await expect(page.getByRole('dialog', { name: 'Giải câu đố của cây' })).toHaveCount(0);
  await copied(page);

  // Open the chest: the gate opens by itself and the server pays the chapter, 10% less for the answer.
  await page.goto(playAt('chest'));
  await waitReady(page);
  await tap(page, '[data-id="hud-interact"]');
  // Every question of the chapter to copy, from the server: the four played through the API here too.
  await notebookPage(page, 5);
  await expect(page.getByRole('dialog', { name: 'Hoàn thành nhiệm vụ!' })).toBeVisible();
  await expect(page.locator('[data-id="reward-xp"] .visually-hidden')).toHaveText('+90 XP');
  await expect(page.locator('[data-id="reward-stars"]')).toHaveAttribute('data-stars', '2');
  await expect(page.locator('[data-id="reward-encourage"]')).toBeVisible();
  // No Level Up (90 XP stays below the 100 XP of level 2); the skills that went up a level come next and close
  // the sequence (nothing is ever unlocked).
  await page.locator('[data-id="completion-next"]').click();
  await expect(page.locator('[data-id="skill-up"]')).toBeVisible();
  await expect(page.locator('[data-id="completion-next"]')).toHaveCount(0);
  await expect(page.locator('[data-id="completion-map"]')).toBeVisible();
  expect(((await (await page.context().request.get('/api/progress')).json()) as { xp: number; level: number })).toMatchObject({ xp: 90, level: 1 });
});
