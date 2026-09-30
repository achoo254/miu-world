// Speaking step on the production build with Chromium's fake microphone: record two seconds, play the
// recording back (the CSP allows blob: media, nothing is blocked), and "Mình nói xong rồi" completes
// the step on the server. The recording itself never leaves the page.
import { expect, test } from '@playwright/test';
import { freshChild } from './quest-api';
import { waitReady } from './stats';

test.use({ storageState: { cookies: [], origins: [] }, permissions: ['microphone'] });

/** The E2E fixture quest's steps before the speaking one, with their answers. */
const BEFORE_TALK: ReadonlyArray<[string, object]> = [
  ['hello', {}],
  ['read-text', { answer: { choice: 'toi' } }],
  ['sort-words', { answer: { assignment: { sach: 'su-vat', doc: 'hoat-dong', but: 'su-vat' } } }],
  ['fill', { answer: { fills: { b1: 'lon' } } }],
  ['pick-even', { answer: { choices: ['p1', 'p3'] } }],
  ['read-clock', { answer: { hour: 3, minute: 0 } }],
  ['calendar', { answer: { weekday: 'thu-sau' } }],
  ['draw', { answer: { edges: [['a', 'b'], ['b', 'c']] } }],
  ['order-pictures', { answer: { order: ['t1', 't2'] } }],
];

test('records on the device, plays it back under the CSP, and finishes the step', async ({ page, baseURL }) => {
  const violations: string[] = [];
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      (window as unknown as { cspViolations: string[] }).cspViolations ??= [];
      (window as unknown as { cspViolations: string[] }).cspViolations.push(`${e.violatedDirective} ${e.blockedURI} ${e.sourceFile}:${e.lineNumber}:${e.columnNumber}`);
    });
  });
  await freshChild(page, baseURL ?? '');
  const headers = { Origin: new URL(baseURL ?? '').origin };
  for (const [step, body] of BEFORE_TALK) {
    const res = await page.context().request.post(`/api/quests/e2e-sgk-mechanics/steps/${step}/complete`, { headers, data: body });
    expect(res.status(), `${step}: ${await res.text()}`).toBe(200);
  }

  await page.goto('/play?quality=low&region=khu-rung-bi-mat&quest=e2e-sgk-mechanics');
  await waitReady(page);
  const dialog = page.getByRole('dialog', { name: 'Kể chuyện' });
  await expect(dialog).toBeVisible();

  await page.locator('[data-id="speak-record"]').click();
  await expect(page.locator('[data-id="speak-stop"]')).toBeVisible();
  await page.waitForTimeout(2000);
  await page.locator('[data-id="speak-stop"]').click();
  const audio = page.locator('[data-id="speak-audio"]');
  await expect(audio).toHaveAttribute('src', /^blob:/);

  // Play back and wait for the element to actually start playing.
  const playing = audio.evaluate((el) => new Promise<boolean>((resolve) => {
    const media = el as HTMLAudioElement;
    media.addEventListener('playing', () => resolve(true), { once: true });
    media.addEventListener('error', () => resolve(false), { once: true });
  }));
  await page.locator('[data-id="speak-playback"]').click();
  expect(await playing).toBe(true);

  await page.locator('[data-id="speak-done"]').click();
  await expect(dialog).toHaveCount(0);
  const progress = (await (await page.context().request.get('/api/progress')).json()) as { quests: Array<{ questId: string; completedSteps: string[] }> };
  expect(progress.quests.find((q) => q.questId === 'e2e-sgk-mechanics')?.completedSteps).toContain('talk');
  violations.push(...(await page.evaluate(() => (window as unknown as { cspViolations?: string[] }).cspViolations ?? [])));
  expect(violations).toEqual([]);
});
