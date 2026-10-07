// E2E helpers: a fresh account with its primary player, and chapter 1 steps played through the API to reach a
// later step quickly. Answers are the chapter 1 content's; tests that check a screen play it in the UI.
import { expect, type Page } from '@playwright/test';
import { tap } from './touch';

export async function freshChild(page: Page, baseURL: string, name = 'Mochi'): Promise<void> {
  const headers = { Origin: new URL(baseURL).origin };
  const request = page.context().request;
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.vn`;
  expect((await request.post('/api/auth/register', { headers, data: { email, ['password']: 'test-password-e2e', pin: '2468' } })).status()).toBe(201);
  const { version } = (await (await request.get('/api/consents/policy')).json()) as { version: string };
  expect((await request.post('/api/consents', { headers, data: { policyVersion: version } })).status()).toBe(201);
  // Accepting the policy made the primary player and selected it.
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

/** After a right answer: the card with the question and the answer to copy into the vở; she has copied it. */
export async function copied(page: Page): Promise<void> {
  await expect(page.getByRole('dialog', { name: 'Chép vào vở' })).toBeVisible();
  await page.locator('[data-id="notebook-done"]').click();
  await expect(page.getByRole('dialog', { name: 'Chép vào vở' })).toHaveCount(0);
}

/** The quest's end opens on every question and answer to copy (`count` of them); she has copied them. */
export async function notebookPage(page: Page, count: number): Promise<void> {
  await expect(page.getByRole('dialog', { name: 'Chép vào vở nhé!' })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[data-id="notebook-lines"] li')).toHaveCount(count);
  await page.locator('[data-id="completion-next"]').click();
}

/**
 * Answers the boss question on screen with its play move: taps the target carrying `choiceId` (a shield, an orb, a
 * slot), three times for a rune to charge. A blow that lands in the world plays a moment before its vở card: the tap
 * that skips it is left to the caller (`skipBossBeat`).
 */
export async function answerBoss(page: Page, choiceId: string): Promise<void> {
  const move = await page.locator('[data-id="boss-move"]').getAttribute('data-move');
  const target = `[data-id="boss-move"] [data-id="choice-${choiceId}"]`;
  await expect(page.locator(target)).toBeEnabled();
  // A touch screen taps; a mouse clicks where the target is now (an orb drifts: no wait for it to stand still).
  const touch = await page.evaluate(() => navigator.maxTouchPoints > 0);
  for (let i = 0; i < (move === 'charge' ? 3 : 1); i += 1) {
    if (touch) {
      await tap(page, target);
      continue;
    }
    const box = await page.locator(target).boundingBox();
    if (!box) throw new Error(`${target} not visible`);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }
}

/**
 * After a right blow: skips the moment it plays in the world before its vở card (a tap anywhere). On the card, or with
 * less motion, there is no such moment and nothing is waited for.
 */
export async function skipBossBeat(page: Page): Promise<void> {
  const field = page.locator('[data-id="boss-move"]');
  if ((await field.count()) === 0 || (await field.getAttribute('data-mode')) !== 'stage' || (await field.getAttribute('data-calm')) === '1') return;
  const skip = page.locator('[data-id="boss-beat-skip"]');
  await skip.waitFor({ state: 'visible', timeout: 5_000 });
  await skip.click();
}
