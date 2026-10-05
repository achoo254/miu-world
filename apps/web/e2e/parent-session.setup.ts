// Creates one fake account through the API; accepting the policy makes and selects its primary player.
// Saves the session cookie for the play/perf projects (`/play` needs an active player).
import { expect, test as setup } from '@playwright/test';
import { PARENT_STATE } from '../playwright.config';

setup('account with its primary player selected', { tag: '@smoke' }, async ({ request, baseURL }) => {
  const headers = { Origin: new URL(baseURL ?? '').origin };
  const email = `e2e-${Date.now()}@example.vn`;
  const register = await request.post('/api/auth/register', { headers, data: { email, ['password']: 'test-password-e2e', pin: '2468' } });
  expect(register.status()).toBe(201);
  const { version } = (await (await request.get('/api/consents/policy')).json()) as { version: string };
  expect((await request.post('/api/consents', { headers, data: { policyVersion: version } })).status()).toBe(201);
  const outfit = { name: 'Miu', equipped: ['hat-witch-pink', 'backpack-brown'] };
  expect((await request.put('/api/character', { headers, data: outfit })).status()).toBe(200);
  await request.storageState({ path: PARENT_STATE });
});
