// Character Creator (M1.2, M1.3): a new profile goes through /create before playing; outfit changes
// show at once on the voxel preview; what the child saves is what they wear in the world.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

mkdirSync(fileURLToPath(new URL('../../../.data/creator/', import.meta.url)), { recursive: true });
import { freshChild } from './quest-api';
import { readStats, waitReady } from './stats';

// Its own parent, so selecting a new profile never changes the shared session other projects use.
test.use({ storageState: { cookies: [], origins: [] } });

async function freshParentWithNewProfile(page: Page, baseURL: string): Promise<void> {
  const headers = { Origin: new URL(baseURL).origin };
  const request = page.context().request;
  const register = await request.post('/api/auth/register', {
    headers,
    data: { email: `creator-${Date.now()}@example.vn`, ['password']: 'test-password-e2e', pin: '2468' },
  });
  expect(register.status()).toBe(201);
  const { version } = (await (await request.get('/api/consents/policy')).json()) as { version: string };
  expect((await request.post('/api/consents', { headers, data: { policyVersion: version } })).status()).toBe(201);
  expect((await request.post('/api/children', { headers, data: { displayName: 'Thỏ Bông' } })).status()).toBe(201);
}

const previewOutfit = (page: Page) => page.evaluate(() => window.__miuPreview?.outfit ?? null);

test('a new profile creates its character first, sees outfit changes live, then plays wearing them', async ({ page, baseURL }) => {
  await freshParentWithNewProfile(page, baseURL ?? '');
  await page.goto('/profiles');
  await page.getByRole('button', { name: 'Thỏ Bông' }).click();
  await expect(page).toHaveURL(/\/create$/);

  // Every species is open; this child picks the fox, so the whole path runs with a species other than Miu's.
  await expect(page.locator('[data-id="creator-species-cat"]')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /Cáo/ }).click();
  await page.waitForFunction(() => window.__miuPreview?.ready === true, null, { timeout: 60_000 });
  await expect(page.locator('canvas')).toHaveCount(1);
  expect(await previewOutfit(page)).toEqual([]);

  // Swapping gear updates the same preview (no second canvas).
  await page.getByRole('button', { name: /Mũ lưỡi trai vàng/ }).click();
  await expect.poll(() => previewOutfit(page)).toEqual(['hat-cap-yellow']);
  await page.getByRole('tab', { name: 'Balo' }).click();
  await page.getByRole('button', { name: /Balo đỏ/ }).click();
  await expect.poll(() => previewOutfit(page)).toEqual(['hat-cap-yellow', 'backpack-red']);
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Balo chiếc lá/ })).toBeDisabled();
  // Shoes are a pair: one item, worn on both feet. Every tile shows the item's picture from the build.
  await page.getByRole('tab', { name: 'Giày' }).click();
  const shoe = page.locator('[data-id="creator-item-shoes-sneaker-blue"]');
  await expect.poll(() => shoe.locator('img.item-art').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await shoe.click();
  await expect.poll(() => previewOutfit(page)).toEqual(['hat-cap-yellow', 'backpack-red', 'shoes-sneaker-blue']);

  // A pet: it stands beside the character in the same preview (the last pick wins when tapped quickly).
  await page.getByRole('tab', { name: 'Thú cưng' }).click();
  await page.locator('[data-id="creator-pet-gau-truc"]').click();
  await page.locator('[data-id="creator-pet-cun-con"]').click();
  await expect(page.locator('[data-id="creator-pet-cun-con"]')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => window.__miuPreview?.pet ?? null)).toBe('cun-con');
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.screenshot({ path: fileURLToPath(new URL('../../../.data/creator/pet-preview.png', import.meta.url)) });

  for (const [label, emote] of [['Vẫy tay', 'wave'], ['Nhảy', 'jump'], ['Ngáp', 'yawn'], ['Vui mừng', 'cheer']] as const) {
    await page.getByRole('button', { name: label }).click();
    await expect.poll(() => page.evaluate(() => window.__miuPreview?.emote ?? null)).toBe(emote);
  }

  // Dragging turns the character.
  const view = page.locator('[data-id="creator-preview"] canvas');
  const box = await view.boundingBox();
  if (!box) throw new Error('preview not visible');
  const yaw = await page.evaluate(() => window.__miuPreview?.yaw ?? 0);
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  expect(Math.abs((await page.evaluate(() => window.__miuPreview?.yaw ?? 0)) - yaw)).toBeGreaterThan(0.5);

  await page.getByLabel('Tên nhân vật').selectOption('Mochi');
  await page.getByRole('button', { name: /Vào thế giới/ }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.locator('[data-id="player-name"]')).toHaveText('Mochi');
  // The server kept the species: the HUD shows the fox.
  await expect(page.locator('[data-id="player-badge"] .miu-art').first()).toHaveAttribute('src', /\/fox-anim-idle\.png(\?v=[0-9a-f]+)?$/);
  await page.locator('[data-id="home-today-play"]').click();
  await expect(page).toHaveURL(/\/play\?/);
  await waitReady(page);
  expect((await readStats(page)).outfit).toEqual(['hat-cap-yellow', 'backpack-red', 'shoes-sneaker-blue']);
  // The puppy came along: it trots after the character when she walks.
  expect((await readStats(page)).pet).toBe('cun-con');
  await page.keyboard.down('KeyW');
  await expect.poll(async () => (await readStats(page)).petClip).toMatch(/walk|run/);
  await page.keyboard.up('KeyW');
  await expect.poll(async () => (await readStats(page)).petClip, { timeout: 8_000 }).toBe('idle');
  await page.screenshot({ path: fileURLToPath(new URL('../../../.data/creator/pet-play.png', import.meta.url)) });
  // The preview was disposed on leaving /create: only the game's canvas remains.
  await expect(page.locator('canvas')).toHaveCount(1);
  expect(await page.evaluate(() => window.__miuPreview)).toBeUndefined();

  // Back on the picker, the profile shows its fox and now goes straight Home.
  await page.goto('/profiles');
  await expect(page.getByRole('button', { name: 'Thỏ Bông' }).locator('.miu-art')).toHaveAttribute('src', /\/fox-anim-idle\.png(\?v=[0-9a-f]+)?$/);
  await page.getByRole('button', { name: 'Thỏ Bông' }).click();
  await expect(page).toHaveURL(/\/home$/);
});

// A new item in every slot, the clothes and a vehicle included (owner, 03/10/2026: "các phụ kiện mới được thêm
// khi bé chọn xong thì vào màn không thấy hiển thị"): the server keeps all nine and the game wears them.
test('one new item in each of the nine slots is kept and worn in the game', async ({ page, baseURL }) => {
  await freshChild(page, baseURL ?? '');
  // Items open from level 1 (a fresh child is level 1).
  const outfit = ['hat-bunny-white', 'glasses-3d', 'scarf-bell-red', 'back-bunny-white', 'wings-cloud-white', 'shoes-ballet-pink', 'hand-banh-mi', 'clothes-dress', 'vehicle-duck-car-yellow'];
  const saved = await page.request.put('/api/character', { headers: { Origin: new URL(baseURL ?? '').origin }, data: { name: 'Mochi', equipped: outfit } });
  expect(saved.status(), await saved.text()).toBe(200);
  await page.goto('/play?quality=low');
  await waitReady(page);
  // Worn on her: every item but the vehicle, which waits under the HUD's Lái xe.
  expect([...(await readStats(page)).outfit].sort()).toEqual(outfit.filter((id) => !id.startsWith('vehicle-')).sort());
});
