// An invite link, end to end through the real UI: a player makes a link, someone who has never been here opens it, signs
// in (the E2E-only password route stands in for the account service, whose screens account-flow.spec.ts covers), accepts the policy,
// makes a character, and the game uses the link: the two are friends, each seen by the other's character name only.
// Fake data only (in-memory database).
import { expect, test } from '@playwright/test';
import { freshChild } from './quest-api';

test.use({ storageState: { cookies: [], origins: [] } });

interface Friends {
  friends: Array<{ displayName: string }>;
}

test('invite link → sign-in → consent → character → both are friends', async ({ browser, page, baseURL }) => {
  const base = baseURL ?? '';
  const headers = { Origin: new URL(base).origin };

  // The one who invites has her own browser.
  const inviterContext = await browser.newContext({ baseURL: base, storageState: { cookies: [], origins: [] } });
  const inviter = await inviterContext.newPage();
  await freshChild(inviter, base, 'Mochi');
  const made = await inviter.context().request.post('/api/invites', { headers });
  expect(made.status()).toBe(201);
  const { code } = (await made.json()) as { code: string };

  // The visitor opens the link: one panel, one button, nothing about who sent it.
  await page.goto(`/moi/${code}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Bạn được mời chơi Miu World' })).toBeVisible();
  await expect(page.locator('[data-id="invite-page"]')).not.toContainText('Mochi');
  await page.getByRole('button', { name: 'Chơi cùng bạn' }).click();
  await expect(page).toHaveURL(/\/login$/);

  // Signing in (the sign-in screen offers the account service only; the password route is for tests), then the way into the game.
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.vn`;
  expect((await page.context().request.post('/api/auth/register', { headers, data: { email, ['password']: 'test-password-e2e', pin: '2468' } })).status()).toBe(201);
  await page.goto('/');
  await expect(page).toHaveURL(/\/consent$/);
  await page.getByRole('button', { name: 'Tôi đồng ý' }).click();
  await expect(page).toHaveURL(/\/create$/);
  await page.getByRole('button', { name: /Mèo/ }).click();
  await page.getByLabel('Tên nhân vật').selectOption('Bông');
  await page.getByRole('button', { name: /Vào thế giới/ }).click();

  // Home is reached: the link is used and the game says who the new friend is.
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.locator('[data-id="invite-result-done"]')).toContainText('Bạn và Mochi đã là bạn bè trong Miu World!');
  await page.getByRole('button', { name: 'Xem bạn bè' }).click();
  await expect(page).toHaveURL(/\/friends$/);
  await expect(page.locator('[data-id="friends-list"]')).toContainText('Mochi');

  // Both sides, from the server: friends by character name, and the link is spent.
  const mine = (await (await page.context().request.get('/api/friends')).json()) as Friends;
  expect(mine.friends.map((f) => f.displayName)).toEqual(['Mochi']);
  const theirs = (await (await inviter.context().request.get('/api/friends')).json()) as Friends;
  expect(theirs.friends.map((f) => f.displayName)).toEqual(['Bông']);
  expect(((await (await inviter.context().request.get('/api/invites')).json()) as { invites: unknown[] }).invites).toEqual([]);
  expect((await page.context().request.post(`/api/invites/${code}/accept`, { headers })).status()).toBe(200);

  await inviterContext.close();
});
