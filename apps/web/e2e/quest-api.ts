// E2E helpers: a fresh parent with one child, and chapter 1 steps played through the API to reach a
// later step quickly. Answers are the chapter 1 content's; tests that check a screen play it in the UI.
import { expect, type Page } from '@playwright/test';

export async function freshChild(page: Page, baseURL: string, name = 'Mochi'): Promise<void> {
  const headers = { Origin: new URL(baseURL).origin };
  const request = page.context().request;
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.vn`;
  expect((await request.post('/api/auth/register', { headers, data: { email, ['password']: 'test-password-e2e', pin: '2468' } })).status()).toBe(201);
  const { version } = (await (await request.get('/api/consents/policy')).json()) as { version: string };
  expect((await request.post('/api/consents', { headers, data: { policyVersion: version } })).status()).toBe(201);
  const child = await request.post('/api/children', { headers, data: { displayName: 'Cáo Nhỏ' } });
  const { id } = (await child.json()) as { id: string };
  expect((await request.post(`/api/children/${id}/select`, { headers })).status()).toBe(200);
  expect((await request.put('/api/character', { headers, data: { name, equipped: [] } })).status()).toBe(200);
}

/** Chapter 1 in order: step id and the body the child would send. */
export const CH1_PLAY: ReadonlyArray<[string, object]> = [
  ['meet-parrot', {}],
  ['find-clues', { target: 'clue-box' }],
  ['find-clues', { target: 'clue-letter' }],
  ['find-clues', { target: 'clue-mushroom' }],
  ['read-letter', { answer: { choice: 'b' } }],
  ['meet-beaver', {}],
  ['apples-for-beaver', { answer: { placed: Array.from({ length: 10 }, (_, i) => `apple-${i + 1}`) } }],
  ['candy-quiz', { answer: { choice: 'b' } }],
  ['cross-stream', { answer: { order: ['stone-9', 'stone-15', 'stone-27', 'stone-34'] } }],
  ['tree-decision', {}],
  ['tree-riddle', { answer: { value: 13 } }],
  ['open-chest', {}],
  ['open-gate', {}],
];

/** Plays chapter 1 through the API up to (not including) `stopAt`. */
export async function playUntil(page: Page, baseURL: string, stopAt: string): Promise<void> {
  const headers = { Origin: new URL(baseURL).origin };
  for (const [step, body] of CH1_PLAY) {
    if (step === stopAt) return;
    const res = await page.context().request.post(`/api/quests/forest-ch1/steps/${step}/complete`, { headers, data: body });
    expect(res.status(), `${step}: ${await res.text()}`).toBe(200);
  }
}

export const playAt = (target: string, quality = 'low') => `/play?quality=${quality}&region=khu-rung-bi-mat&quest=forest-ch1&spawnAt=${target}`;
