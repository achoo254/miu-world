// Whole parent → child journey through the real UI: Google sign-in (local fake), PIN, consent, create a profile, hand the
// device to the child, play, meet the parrot. Fake data only (in-memory database).
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { waitReady } from './stats';

// REVIEW_SHOTS=1 saves each step for the final review page (iPad Gen 10 viewport, the reference device).
const REVIEW_SHOTS = process.env.REVIEW_SHOTS === '1';
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SHOT_DIR = path.join(REPO_ROOT, 'assets/generated/review/ui');

if (REVIEW_SHOTS) test.use({ viewport: { width: 820, height: 1180 }, deviceScaleFactor: 1, hasTouch: true });

async function shot(page: Page, name: string): Promise<void> {
  if (REVIEW_SHOTS) await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), animations: 'disabled' });
}

test.afterAll(() => {
  // New screenshots must be hashed into the manifest or the license gate goes red.
  if (REVIEW_SHOTS) execFileSync('pnpm', ['-s', 'assets:manifest'], { cwd: REPO_ROOT, stdio: 'inherit', shell: true });
});

test('Google sign-in → set PIN → consent → create profile → pick profile → play → meet the parrot', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Đăng nhập phụ huynh' })).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0); // no password sign-in in the UI
  await shot(page, '01-login');
  await page.getByRole('link', { name: 'Đăng nhập bằng Google' }).click();

  // Fake Google signs in a new account and redirects back; the first sign-in asks for the PIN.
  await expect(page.getByRole('heading', { name: 'Đặt mã PIN phụ huynh' })).toBeVisible();
  await page.locator('[data-id="set-pin-pin"]').fill('2468');
  await page.locator('[data-id="set-pin-again"]').fill('2468');
  await shot(page, '02-set-pin');
  await page.getByRole('button', { name: 'Lưu mã PIN' }).click();

  await expect(page.locator('[data-id="consent-draft"]')).toBeVisible();
  await shot(page, '03-consent');
  await page.getByRole('button', { name: 'Tôi là phụ huynh và đồng ý' }).click();

  await expect(page.getByRole('heading', { name: 'Tạo hồ sơ cho bé' })).toBeVisible();
  await page.locator('[data-id="parent-create-name"]').selectOption('Thỏ Bông');
  await page.getByRole('button', { name: 'Tạo hồ sơ' }).click();
  await expect(page.locator('[data-id^="parent-profile-"] select').first()).toHaveValue('Thỏ Bông');
  await shot(page, '04-parent-area');
  await page.getByRole('button', { name: 'Xong, khóa khu phụ huynh' }).click();

  await expect(page.getByRole('heading', { name: 'Ai đang chơi?' })).toBeVisible();
  await shot(page, '05-profiles');
  await page.getByRole('button', { name: 'Thỏ Bông' }).click();
  await expect(page).toHaveURL(/\/play$/);
  await waitReady(page);
  await expect(page.locator('canvas')).toHaveCount(1);

  // Same session, spawn next to the parrot: the React label appears.
  await page.goto('/play?quality=low&spawnAt=npc');
  await waitReady(page);
  await expect(page.locator('.npc-label[data-target="parrot-guide"]')).toBeVisible();
  await shot(page, '06-play-parrot');

  // The child cannot reach the parent area without the PIN.
  await page.goto('/parent');
  await expect(page.getByLabel('Nhập mã PIN phụ huynh')).toBeVisible();
  await shot(page, '07-parent-gate');
  await expect(page.getByRole('heading', { name: 'Tạo hồ sơ cho bé' })).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});
