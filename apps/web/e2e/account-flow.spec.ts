// Whole parent → child journey through the real UI: Google sign-in (local fake), PIN, consent, create a profile, hand the
// device to the child, create the character, Home, the world map, the forest, play, meet the parrot. Fake data only
// (in-memory database).
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import type { WorldEntities } from '@miu/voxel/world-entities';
import { waitReady } from './stats';

// REVIEW_SHOTS=1 saves each step for the final review page (iPad Gen 10 viewport, the reference device).
const REVIEW_SHOTS = process.env.REVIEW_SHOTS === '1';
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SHOT_DIR = path.join(REPO_ROOT, 'assets/generated/review/ui');
const entities = JSON.parse(readFileSync(path.join(REPO_ROOT, 'assets/generated/world/forest-ch1/entities.json'), 'utf8')) as WorldEntities;

if (REVIEW_SHOTS) test.use({ viewport: { width: 820, height: 1180 }, deviceScaleFactor: 1, hasTouch: true });

async function shot(page: Page, name: string): Promise<void> {
  if (REVIEW_SHOTS) mkdirSync(SHOT_DIR, { recursive: true });
  if (REVIEW_SHOTS) await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), animations: 'disabled' });
}

test.beforeAll(() => {
  // A step renamed or dropped must not leave its old picture on the review page.
  if (REVIEW_SHOTS) rmSync(SHOT_DIR, { recursive: true, force: true });
});

test.afterAll(() => {
  // New screenshots must be hashed into the manifest or the license gate goes red.
  if (REVIEW_SHOTS) execFileSync('pnpm', ['-s', 'assets:manifest'], { cwd: REPO_ROOT, stdio: 'inherit', shell: true });
});

test('Google sign-in → consent → create profile → pick profile → create character → Home → map → forest → play → meet the parrot', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  // The privacy page is public: a parent can read it before signing in.
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Quyền riêng tư của Miu World' })).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0); // no password sign-in in the UI
  await shot(page, '01-login');
  await page.getByRole('link', { name: 'Đăng nhập bằng Google' }).click();

  // Fake Google signs in a new account and redirects back; no PIN is asked: the parent area is open.
  await expect(page.locator('[data-id="consent-text"]')).toBeVisible();
  await expect(page.locator('[data-id="consent-draft"]')).toHaveCount(0); // the shipped consent is final
  await expect(page.locator('[data-id="consent-privacy"]')).toBeVisible();
  await shot(page, '03-consent');
  await page.getByRole('button', { name: 'Tôi đồng ý' }).click();

  await expect(page.getByRole('heading', { name: 'Tạo hồ sơ người chơi' })).toBeVisible();
  await page.locator('[data-id="parent-create-name"]').selectOption('Thỏ Bông');
  await page.getByRole('button', { name: 'Tạo hồ sơ' }).click();
  await expect(page.locator('[data-id^="parent-profile-"] .profile-row-name')).toHaveText(['Thỏ Bông']);
  await shot(page, '04-parent-area');
  await page.getByRole('button', { name: 'Xong, vào chơi' }).click();

  await expect(page.getByRole('heading', { name: 'Ai đang chơi?' })).toBeVisible();
  await shot(page, '05-profiles');
  await page.getByRole('button', { name: 'Thỏ Bông' }).click();
  // A new profile creates its character before playing (details in creator.spec.ts).
  await expect(page).toHaveURL(/\/create$/);
  await page.getByRole('button', { name: /Mèo/ }).click();
  await page.getByLabel('Tên nhân vật').selectOption('Bông');
  await shot(page, '06-creator');
  await page.getByRole('button', { name: /Vào thế giới/ }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.locator('.world-island-image')).toBeVisible();
  await expect(page.locator('[data-id="home-today-play"]')).toBeVisible();
  await shot(page, '07-home');

  // Home → the world map → the forest → "Khám phá ngay".
  await page.locator('[data-id="home-nav-map"]').click();
  await expect(page).toHaveURL(/\/map$/);
  await expect(page.locator('.world-island-image')).toBeVisible();
  await shot(page, '08-world-map');
  await page.locator('[data-id="map-region-khu-rung-bi-mat"]').click();
  await expect(page).toHaveURL(/\/region\/khu-rung-bi-mat$/);
  await expect(page.locator('[data-id="region-board"]')).toBeVisible();
  await expect(page.locator('.region-chest')).toHaveJSProperty('complete', true);
  await shot(page, '09-region');
  await page.locator('[data-id="region-explore"]').click();
  await expect(page).toHaveURL(/\/play\?region=khu-rung-bi-mat&quest=forest-ch1$/);
  await waitReady(page);
  await expect(page.locator('canvas:not(.minimap-canvas):not(.minimap-sheet-canvas)')).toHaveCount(1);

  // Same session, a couple of steps from the parrot and a step to its side (the spawn heading is 45°), so the
  // camera behind the child shows the parrot beside her rather than behind her: the React label appears.
  const parrot = entities.interactables.find((t) => t.id === 'parrot-guide');
  if (!parrot) throw new Error('parrot-guide missing from the forest');
  const [px, py, pz] = parrot.position;
  const [back, side] = [2, 1.5];
  await page.goto(`/play?quality=low&spawnAt=${px - (back - side) * Math.SQRT1_2},${py + 1},${pz - (back + side) * Math.SQRT1_2}`);
  await waitReady(page);
  await expect(page.locator('.npc-label[data-target="parrot-guide"]')).toBeVisible();
  await shot(page, '10-play-parrot');

  // The child cannot reach the parent area without the PIN.
  await page.goto('/parent');
  await expect(page.getByLabel('Nhập mã PIN tài khoản')).toBeVisible();
  await shot(page, '11-parent-gate');
  await expect(page.getByRole('heading', { name: 'Tạo hồ sơ người chơi' })).toHaveCount(0);

  // The parent downloads what the server keeps, then deletes the account.
  await page.getByLabel('Nhập mã PIN tài khoản').fill('2468');
  await page.getByRole('button', { name: 'Mở khóa' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Tải dữ liệu của tôi' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^miu-world-du-lieu-\d{4}-\d{2}-\d{2}\.json$/);
  const exported = JSON.parse(readFileSync(await file.path(), 'utf8')) as { parent: { signIn: string }; children: Array<{ displayName: string; character: { name: string } }> };
  expect(exported.parent.signIn).toBe('google');
  expect(exported.children.map((c) => [c.displayName, c.character.name])).toEqual([['Thỏ Bông', 'Bông']]);
  await page.getByRole('button', { name: 'Xóa tài khoản' }).click();
  await page.getByRole('button', { name: 'Xóa hẳn tài khoản' }).scrollIntoViewIfNeeded();
  await shot(page, '12-delete-account');
  await page.getByRole('button', { name: 'Xóa hẳn tài khoản' }).click();
  await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();
  expect((await page.request.get('/api/auth/me')).status()).toBe(401);

  expect(consoleErrors).toEqual([]);
});
