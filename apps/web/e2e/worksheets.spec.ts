// Parent area → Phiếu viết on the production build: the parent opens the PIN gate in the page, finds
// the sheets by book, opens one Tiếng Việt and one Toán sheet, and each prints to A4 with the app's
// buttons left off the page. The PDFs and a shot of the list go to the review folder.
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { freshChild } from './quest-api';

test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 1180, height: 820 } });

const SHOTS = fileURLToPath(new URL('../../../.data/sgk/review-shots/', import.meta.url));
mkdirSync(SHOTS, { recursive: true });
// The model handwriting font is not in git; a machine that has it in .data/fonts also checks the model.
const MODEL_HAND = existsSync(fileURLToPath(new URL('../../../.data/fonts/chu-mau-tieu-hoc-dam.woff2', import.meta.url)));

async function printSheet(page: Page, lessonId: string, file: string): Promise<void> {
  await page.locator(`[data-id="worksheet-link-${lessonId}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/parent/worksheets/${lessonId}$`));
  await expect(page.locator('.worksheet-sheet')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('[data-id="worksheet-print"]')).toBeHidden();
  await page.pdf({ path: `${SHOTS}${file}.pdf`, format: 'A4', printBackground: true, preferCSSPageSize: true });
  await page.emulateMedia({ media: 'screen' });
  await page.screenshot({ path: `${SHOTS}${file}.png`, fullPage: true, animations: 'disabled' });
  await page.getByRole('link', { name: 'Danh sách phiếu' }).click();
}

test('the parent unlocks the gate, lists the sheets by book and prints one of each to A4', async ({ page, baseURL }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  await freshChild(page, baseURL ?? '');

  await page.goto('/parent/worksheets');
  await page.getByLabel('Nhập mã PIN tài khoản').fill('2468');
  await page.getByLabel('Nhập mã PIN tài khoản').press('Enter');
  await expect(page.getByRole('heading', { name: 'Tiếng Việt 2, tập một' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Toán 2, tập một' })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}worksheets-list.png`, fullPage: true, animations: 'disabled' });

  await printSheet(page, 'tv2-t1-b01', 'worksheet-tv2-t1-b01');
  if (MODEL_HAND) {
    await page.goto('/parent/worksheets/tv2-t1-b01');
    await expect(page.locator('[data-id="block-letter"] .oli-model')).toHaveCount(2);
    await expect(page.locator('[data-id="block-copy-line"] .oli-model').first()).toHaveText('Ánh nắng tràn ngập sân trường.');
    expect(await page.evaluate(() => document.fonts.check('700 10px "Chu Mau Tieu Hoc"'))).toBe(true);
    await page.getByRole('link', { name: 'Danh sách phiếu' }).click();
  }
  await printSheet(page, 'toan2-t1-b15', 'worksheet-toan2-t1-b15');

  // From the parent area itself.
  await page.goto('/parent');
  await page.locator('[data-id="parent-worksheets"]').click();
  await expect(page).toHaveURL(/\/parent\/worksheets$/);
  expect(pageErrors).toEqual([]);
});
