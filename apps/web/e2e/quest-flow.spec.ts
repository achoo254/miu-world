// Chapter 1 against the real server and content: meet the parrot (M3.3) → take the quest → the arrow
// points at a clue → find the three clues in reverse order → tracker 3/3 from the server → the letter
// opens by itself. Reading the letter and the riddle tree are learning steps (their own E2E).
import { expect, test, type Page } from '@playwright/test';
import { readStats, waitReady } from './stats';

// Its own parent and child: quest progress must start empty and never leak into other projects.
test.use({ storageState: { cookies: [], origins: [] } });

async function newChild(page: Page, baseURL: string): Promise<void> {
  const headers = { Origin: new URL(baseURL).origin };
  const request = page.context().request;
  expect((await request.post('/api/auth/register', { headers, data: { email: `quest-${Date.now()}@example.vn`, ['password']: 'test-password-e2e', pin: '2468' } })).status()).toBe(201);
  const { version } = (await (await request.get('/api/consents/policy')).json()) as { version: string };
  expect((await request.post('/api/consents', { headers, data: { policyVersion: version } })).status()).toBe(201);
  const child = await request.post('/api/children', { headers, data: { displayName: 'Cáo Nhỏ' } });
  const { id } = (await child.json()) as { id: string };
  expect((await request.post(`/api/children/${id}/select`, { headers })).status()).toBe(200);
  expect((await request.put('/api/character', { headers, data: { name: 'Mochi', equipped: [] } })).status()).toBe(200);
}

const at = (target: string) => `/play?quality=low&region=khu-rung-bi-mat&quest=forest-ch1&spawnAt=${target}`;

test('meet the parrot, follow the arrow, find the three clues, and the letter opens by itself', async ({ page, baseURL }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  await newChild(page, baseURL ?? '');

  await page.goto(at('parrot-guide'));
  await waitReady(page);
  await page.keyboard.press('KeyE');
  const dialogue = page.getByRole('dialog', { name: 'Vẹt' });
  await expect(dialogue).toBeVisible();
  await expect(dialogue).toContainText('Chào Mochi!'); // the character's name, never "Miu"
  await expect(page.locator('body')).not.toContainText('Chào Miu');
  await page.getByRole('button', { name: 'Tiếp' }).click();
  await page.getByRole('button', { name: 'Tiếp' }).click();
  await page.getByRole('button', { name: 'Tớ sẽ giúp!' }).click();
  await expect(dialogue).toContainText('Tuyệt quá! Mình đi thôi!'); // the parrot answers the choice
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await expect(dialogue).toHaveCount(0);
  await expect(page.locator('[data-id="hud-tracker-count"]')).toHaveText(/0\/3/);
  // The arrow now points at the first clue still to find.
  await expect.poll(async () => (await readStats(page)).hintTarget).toBe('clue-box');

  let found = 0;
  for (const clue of ['clue-mushroom', 'clue-letter', 'clue-box']) {
    await page.goto(at(clue));
    await waitReady(page);
    await page.locator('[data-id="hud-interact"]').click();
    found += 1;
    if (found < 3) await expect(page.locator('[data-id="hud-tracker-count"]')).toHaveText(new RegExp(`${found}/3`));
  }
  // All three found: the letter step starts without another touch.
  await expect(page.getByRole('dialog', { name: 'Đọc lá thư' })).toBeVisible();

  // Touching a clue again after it was found changes nothing.
  await page.goto(at('clue-box'));
  await waitReady(page);
  await expect(page.getByRole('dialog', { name: 'Đọc lá thư' })).toBeVisible(); // still the step on
  expect(pageErrors).toEqual([]);
});

test('an NPC whose turn has not come says so, and never the same line twice in a row', async ({ page, baseURL }) => {
  await newChild(page, baseURL ?? '');
  await page.goto(at('animal-beaver'));
  await waitReady(page);
  const said: string[] = [];
  const toast = page.locator('[data-id="toast"]');
  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.press('KeyE');
    // Wait for the new line to replace the previous one before reading it.
    const previous = said.at(-1) ?? '';
    await expect.poll(async () => (await toast.textContent()) ?? '').not.toBe(previous);
    await expect(toast).toContainText('Hải ly');
    said.push((await toast.textContent()) ?? '');
  }
  for (let i = 1; i < said.length; i += 1) expect(said[i]).not.toBe(said[i - 1]);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
