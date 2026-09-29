// Creates one fake parent with consent and a selected child profile through the API, then saves the
// session cookie for the play/perf projects (`/play` needs an active profile).
import { expect, test as setup } from '@playwright/test';
import { PARENT_STATE } from '../playwright.config';

setup('parent with a selected child profile', async ({ request, baseURL }) => {
  const headers = { Origin: new URL(baseURL ?? '').origin };
  const email = `e2e-${Date.now()}@example.vn`;
  const register = await request.post('/api/auth/register', { headers, data: { email, ['password']: 'test-password-e2e', pin: '2468' } });
  expect(register.status()).toBe(201);
  expect((await request.post('/api/consents', { headers, data: { policyVersion: 'draft-1' } })).status()).toBe(201);
  const child = await request.post('/api/children', { headers, data: { displayName: 'Mèo Mây' } });
  expect(child.status()).toBe(201);
  const { id } = (await child.json()) as { id: string };
  expect((await request.post(`/api/children/${id}/select`, { headers })).status()).toBe(200);
  const outfit = { name: 'Miu', equipped: ['hat-witch-pink', 'backpack-brown'] };
  expect((await request.put('/api/character', { headers, data: outfit })).status()).toBe(200);
  await request.storageState({ path: PARENT_STATE });
});
