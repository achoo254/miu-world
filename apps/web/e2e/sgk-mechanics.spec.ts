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
/** After a right answer: the question and the book's answer (the step's author text) to copy into the vở, then on. */
async function copied(page: Page, answer: string, name?: string): Promise<void> {
  await expect(dialog(page, 'Chép vào vở')).toBeVisible();
  await expect(page.locator('[data-id="notebook-lines"]')).toContainText(`Đáp án: ${answer}`);
  if (name) await shot(page, name);
  await tap(page, '[data-id="notebook-done"]');
}

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
  await copied(page, 'Tôi', 'notebook-card');

  // Classify: two cards by touch drag, one by tap-then-group.
  await expect(dialog(page, 'Phân loại từ')).toBeVisible();
  await touchDrag(page, '[data-id="card-sach"]', '[data-id="group-su-vat"]');
  await touchDrag(page, '[data-id="card-doc"]', '[data-id="group-hoat-dong"]');
  await tap(page, '[data-id="card-but"]');
  await tap(page, '[data-id="group-title-su-vat"]');
  await shot(page, 'classify');
  await check(page);
  await copied(page, 'sách, bút: sự vật; đọc: hoạt động');

  // Fill-blank: a wrong sign first (the step's own line), then the right one.
  await expect(dialog(page, 'Điền dấu')).toBeVisible();
  await tap(page, '[data-id="option-b1-be"]');
  await check(page);
  await expect(page.locator('[data-id="challenge-try-again"]')).toHaveText('Nhìn lại hai số nhé.');
  await tap(page, '[data-id="blank-b1"]');
  await tap(page, '[data-id="option-b1-lon"]');
  await shot(page, 'fill-blank');
  await check(page);
  await copied(page, '>');

  await expect(dialog(page, 'Chọn phép tính đúng')).toBeVisible();
  await tap(page, '[data-id="choice-p1"]');
  await tap(page, '[data-id="choice-p3"]');
  await shot(page, 'multi-select');
  await check(page);
  await copied(page, '4 + 6 và 8 + 2');

  // Clock: the face shows 3 o'clock; set 3:00 with the + button.
  await expect(dialog(page, 'Xem đồng hồ')).toBeVisible();
  await expect(page.locator('[data-id="clock-face"]')).toBeVisible();
  for (let i = 0; i < 3; i += 1) await tap(page, '[data-id="clock-hour-up"]');
  await shot(page, 'clock');
  await check(page);
  await copied(page, '15 giờ');

  await expect(dialog(page, 'Xem lịch')).toBeVisible();
  await tap(page, '[data-id="weekday-thu-sau"]');
  await shot(page, 'calendar');
  await check(page);
  await copied(page, 'Thứ Sáu');

  await expect(dialog(page, 'Vẽ đường gấp khúc')).toBeVisible();
  for (const p of ['a', 'b', 'b', 'c']) await tap(page, `[data-id="point-${p}"]`);
  await expect(page.locator('[data-id="connect-board"] text')).toHaveText(['4 cm', '3 cm']);
  await shot(page, 'connect');
  await check(page);
  await copied(page, 'AB, BC');

  // Pictures in order, by touch drag onto the slots.
  await expect(dialog(page, 'Xếp tranh')).toBeVisible();
  await touchDrag(page, '[data-id="stone-t1"]', '[data-id="slot-0"]');
  await touchDrag(page, '[data-id="stone-t2"]', '[data-id="slot-1"]');
  await shot(page, 'sort-pictures');
  await check(page);
  await copied(page, 'Tranh 1, tranh 2');

  await expect(dialog(page, 'Kể chuyện')).toBeVisible();
  await expect(page.locator('[data-id="speak-hints"]')).toContainText('Em đi đâu?');
  await shot(page, 'speak');
  await tap(page, '[data-id="speak-done"]');

  await expect(dialog(page, 'Phiếu viết')).toBeVisible();
  await shot(page, 'worksheet');
  await tap(page, '[data-id="worksheet-done"]');
  // The quest is done: first every question and answer to copy into the vở, then the reward the server paid.
  await expect(dialog(page, 'Chép vào vở nhé!')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[data-id="notebook-lines"] li')).toHaveCount(8);
  await shot(page, 'completion-notebook');
  await tap(page, '[data-id="completion-next"]');
  await expect(dialog(page, 'Hoàn thành nhiệm vụ!')).toBeVisible({ timeout: 15_000 });
  await expect(dialog(page, 'Hoàn thành nhiệm vụ!')).toContainText('+20 XP');
  await shot(page, 'completion');

  const progress = await (await page.context().request.get('/api/progress')).json();
  expect(progress.quests.find((q: { questId: string }) => q.questId === 'e2e-sgk-mechanics')).toMatchObject({ completed: true });
  expect(pageErrors).toEqual([]);
});

// A long reading on the iPad, upright and on its side (owner, 03/10/2026: a quest screen taller than the
// screen must scroll easily): the passage scrolls inside the scene with a swipe, and the bar with Kiểm tra
// stays on screen all the while. "Một giờ học" (Tiếng Việt 2, bài 6) is the longest passage of the book.
for (const viewport of [{ width: 820, height: 1180 }, { width: 1180, height: 820 }]) {
  test(`a long reading scrolls by swipe and keeps Kiểm tra on screen (${viewport.width}×${viewport.height})`, async ({ page, baseURL }) => {
    await page.setViewportSize(viewport);
    await freshChild(page, baseURL ?? '');
    const headers = { Origin: new URL(baseURL ?? '').origin };
    const done = async (step: string, data: object) => {
      const res = await page.context().request.post(`/api/quests/tv2-t03-b06/steps/${step}/complete`, { headers, data });
      expect(res.status(), `${step}: ${await res.text()}`).toBe(200);
    };
    await done('meo-mun-run-rau', {});
    for (const target of ['tv2-t03-ban-chai-meo', 'tv2-t03-khan-mat-meo', 'tv2-t03-cap-la-meo']) await done('tim-do-meo-mun-giau', { target });
    await done('khoe-loi-khen', {});
    await page.goto('/play?quality=low&region=lang-ven-song&quest=tv2-t03-b06&spawnAt=tv2-t03-bang-xanh');
    await waitReady(page);
    await page.keyboard.press('KeyE');
    const scene = page.locator('[data-id="challenge"]');
    await expect(scene).toBeVisible();
    const checkButton = page.locator('[data-id="challenge-check"]');
    const inView = async () => {
      const box = await checkButton.boundingBox();
      return box !== null && box.y >= 0 && box.y + box.height <= viewport.height;
    };
    await shot(page, `read-long-${viewport.width}`);
    expect(await scene.locator('.challenge-area').evaluate((el: Element) => el.scrollTop), 'the reading opens at its first line').toBe(0);
    expect(await inView(), 'Kiểm tra on screen as the reading opens').toBe(true);
    // A swipe up over the passage scrolls the play area (the question and Kiểm tra stay put).
    const area = scene.locator('.challenge-area');
    const room = await area.evaluate((el: Element) => el.scrollHeight - el.clientHeight);
    expect(room, 'the long passage is taller than its room').toBeGreaterThan(0);
    const text = await area.boundingBox();
    if (!text) throw new Error('no play area');
    const x = Math.round(text.x + text.width / 2);
    const y = Math.round(text.y + text.height * 0.6);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.synthesizeScrollGesture', { x, y, yDistance: -400, speed: 1200, gestureSourceType: 'touch' });
    const scrolled = await area.evaluate((el: Element) => el.scrollTop);
    await expect(page.locator('[data-id="challenge-prompt"]')).toBeInViewport();
    expect(scrolled, 'a swipe scrolls the play area').toBeGreaterThan(0);
    expect(await inView(), 'Kiểm tra still on screen after the swipe').toBe(true);
    await shot(page, `read-long-${viewport.width}-scrolled`);
  });
}
