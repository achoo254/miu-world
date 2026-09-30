// Every textbook mechanic on the reference iPad viewport with touch, against the real server: the
// E2E-only fixture quest (e2e/fixtures/quests, loaded through EXTRA_QUEST_DIR) runs its steps by
// itself, one screen after another. Each answer goes to the server, which grades it; a wrong try
// shows the step's own feedback line. A screenshot of every screen goes to the review folder.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { freshChild } from './quest-api';
import { waitReady } from './stats';
import { tap, touchDrag } from './touch';

test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: false });

const SHOTS = fileURLToPath(new URL('../../../.data/sgk/review-shots/', import.meta.url));
mkdirSync(SHOTS, { recursive: true });
// Animations off: the shot shows the screen as it rests, never mid-transition.
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}${name}.png`, animations: 'disabled' });
const dialog = (page: Page, name: string) => page.getByRole('dialog', { name });
const check = (page: Page) => tap(page, '[data-id="challenge-check"]');

test('plays classify, fill-blank, multi-select, clock, calendar, connect, pictures, speaking and the worksheet by touch', async ({ page, baseURL }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  await freshChild(page, baseURL ?? '');
  await page.goto('/play?quality=low&region=khu-rung-bi-mat&quest=e2e-sgk-mechanics');
  await waitReady(page);

  await expect(dialog(page, 'Vẹt')).toBeVisible();
  await tap(page, '[data-id="dialogue-done"]');

  // Reading: the passage with its word box, then the question.
  await expect(dialog(page, 'Đọc bài')).toBeVisible();
  await expect(page.locator('[data-id="read-glossary"]')).toContainText('Khai trường');
  await shot(page, 'read');
  await tap(page, '[data-id="choice-toi"]');
  await check(page);

  // Classify: two cards by touch drag, one by tap-then-group.
  await expect(dialog(page, 'Phân loại từ')).toBeVisible();
  await touchDrag(page, '[data-id="card-sach"]', '[data-id="group-su-vat"]');
  await touchDrag(page, '[data-id="card-doc"]', '[data-id="group-hoat-dong"]');
  await tap(page, '[data-id="card-but"]');
  await tap(page, '[data-id="group-title-su-vat"]');
  await shot(page, 'classify');
  await check(page);

  // Fill-blank: a wrong sign first (the step's own line), then the right one.
  await expect(dialog(page, 'Điền dấu')).toBeVisible();
  await tap(page, '[data-id="option-b1-be"]');
  await check(page);
  await expect(page.locator('[data-id="challenge-try-again"]')).toHaveText('Nhìn lại hai số nhé.');
  await tap(page, '[data-id="blank-b1"]');
  await tap(page, '[data-id="option-b1-lon"]');
  await shot(page, 'fill-blank');
  await check(page);

  await expect(dialog(page, 'Chọn phép tính đúng')).toBeVisible();
  await tap(page, '[data-id="choice-p1"]');
  await tap(page, '[data-id="choice-p3"]');
  await shot(page, 'multi-select');
  await check(page);

  // Clock: the face shows 3 o'clock; set 3:00 with the + button.
  await expect(dialog(page, 'Xem đồng hồ')).toBeVisible();
  await expect(page.locator('[data-id="clock-face"]')).toBeVisible();
  for (let i = 0; i < 3; i += 1) await tap(page, '[data-id="clock-hour-up"]');
  await shot(page, 'clock');
  await check(page);

  await expect(dialog(page, 'Xem lịch')).toBeVisible();
  await tap(page, '[data-id="weekday-thu-sau"]');
  await shot(page, 'calendar');
  await check(page);

  await expect(dialog(page, 'Vẽ đường gấp khúc')).toBeVisible();
  for (const p of ['a', 'b', 'b', 'c']) await tap(page, `[data-id="point-${p}"]`);
  await expect(page.locator('[data-id="connect-board"] text')).toHaveText(['4 cm', '3 cm']);
  await shot(page, 'connect');
  await check(page);

  // Pictures in order, by touch drag onto the slots.
  await expect(dialog(page, 'Xếp tranh')).toBeVisible();
  await touchDrag(page, '[data-id="stone-t1"]', '[data-id="slot-0"]');
  await touchDrag(page, '[data-id="stone-t2"]', '[data-id="slot-1"]');
  await shot(page, 'sort-pictures');
  await check(page);

  await expect(dialog(page, 'Kể chuyện')).toBeVisible();
  await expect(page.locator('[data-id="speak-hints"]')).toContainText('Em đi đâu?');
  await shot(page, 'speak');
  await tap(page, '[data-id="speak-done"]');

  await expect(dialog(page, 'Phiếu viết')).toBeVisible();
  await shot(page, 'worksheet');
  await tap(page, '[data-id="worksheet-done"]');
  // The quest is done: the completion screen shows the reward the server paid.
  await expect(dialog(page, 'Hoàn thành nhiệm vụ!')).toBeVisible({ timeout: 15_000 });
  await expect(dialog(page, 'Hoàn thành nhiệm vụ!')).toContainText('+20 XP');
  await shot(page, 'completion');

  const progress = await (await page.context().request.get('/api/progress')).json();
  expect(progress.quests.find((q: { questId: string }) => q.questId === 'e2e-sgk-mechanics')).toMatchObject({ completed: true });
  expect(pageErrors).toEqual([]);
});
