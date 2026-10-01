// Chapter 1 against the real server and content: meet the parrot (M3.3) → take the quest → the arrow
// points at a clue → find the three clues in reverse order → tracker 3/3 from the server → the letter
// opens by itself → read it and answer → on to the beaver. The Math challenges: challenges.spec.ts.
import { expect, test } from '@playwright/test';
import { freshChild, playAt, playUntil } from './quest-api';
import { readStats, waitReady } from './stats';

// Its own parent and child: quest progress must start empty and never leak into other projects.
test.use({ storageState: { cookies: [], origins: [] } });

test('meet the parrot, follow the arrow, find the three clues, and the letter opens by itself', async ({ page, baseURL }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  await freshChild(page, baseURL ?? '');

  await page.goto(playAt('parrot-guide'));
  await waitReady(page);
  await page.keyboard.press('KeyE');
  const dialogue = page.getByRole('dialog', { name: 'Vẹt' });
  await expect(dialogue).toBeVisible();
  await expect(dialogue).toContainText('Chào Mochi!'); // the character's name, never "Miu"
  await expect(page.locator('body')).not.toContainText('Chào Miu');
  // The in-world label and Interact are hidden while the dialogue covers the paused game.
  await expect(page.locator('.npc-label')).toHaveCount(0);
  await expect(page.locator('[data-id="hud-interact"]')).toHaveCount(0);
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
    await page.goto(playAt(clue));
    await waitReady(page);
    await page.locator('[data-id="hud-interact"]').click();
    found += 1;
    if (found < 3) await expect(page.locator('[data-id="hud-tracker-count"]')).toHaveText(new RegExp(`${found}/3`));
  }
  // All three found: the letter step starts without another touch.
  const letter = page.getByRole('dialog', { name: 'Đọc lá thư' });
  await expect(letter).toBeVisible();

  // Touching a clue again after it was found changes nothing: the letter is still the step on.
  await page.goto(playAt('clue-box'));
  await waitReady(page);
  await expect(letter).toBeVisible();

  // Read it and answer (reading comprehension, skill doc-hieu): the next step is the beaver.
  await expect(page.locator('[data-id="read-passage"]')).toContainText('Hải ly sẽ chỉ đường');
  await expect(page.locator('[data-id="challenge-prompt"]')).toContainText('Mochi');
  await page.locator('[data-id="choice-b"]').click();
  await page.locator('[data-id="challenge-check"]').click();
  await expect(letter).toHaveCount(0);
  await expect(page.locator('[data-id="hud-tracker-step"]')).toContainText('Hải ly');
  await expect.poll(async () => (await readStats(page)).hintTarget).toBe('animal-beaver');
  expect(pageErrors).toEqual([]);
});

test('an NPC whose turn has not come says so, and never the same line twice in a row', async ({ page, baseURL }) => {
  await freshChild(page, baseURL ?? '');
  await page.goto(playAt('animal-beaver'));
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

test('finishing chapter 1 without seeing an answer: 100 XP, Level Up to 2, chapter 2 unlocked, the Lá thần in the backpack', async ({ page, baseURL }) => {
  await freshChild(page, baseURL ?? '');
  await playUntil(page, baseURL ?? '', 'open-chest');
  await page.goto(playAt('chest'));
  await waitReady(page);
  await page.locator('[data-id="hud-interact"]').click();

  // The gate opens by itself after the chest; the server pays and the reward screens follow.
  const reward = page.getByRole('dialog', { name: 'Hoàn thành nhiệm vụ!' });
  await expect(reward).toBeVisible();
  await expect(page.locator('[data-id="reward-stars"]')).toHaveAttribute('data-stars', '3');
  await expect(page.locator('[data-id="reward-xp"] .visually-hidden')).toHaveText('+100 XP');
  await expect(page.locator('[data-id="reward-item-la-than"]')).toContainText('Lá thần');
  await page.locator('[data-id="completion-next"]').click();
  await expect(page.getByRole('dialog', { name: 'Lên cấp!' })).toContainText('Lv.1 → Lv.2');
  await page.locator('[data-id="completion-next"]').click();
  await expect(page.locator('[data-id="unlock-forest-ch2"]')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Kim cương');
  await page.locator('[data-id="completion-map"]').click();

  await expect(page).toHaveURL(/\/region\/khu-rung-bi-mat$/);
  await expect(page.locator('[data-id="region-quest-forest-ch1"]')).toHaveAttribute('data-state', 'completed');
  await expect(page.locator('[data-id="region-quest-forest-ch2"]')).toContainText('Sắp có');
  await expect(page.locator('[data-id="player-level"]')).toHaveText('Lv.2');

  await page.goto('/backpack');
  await page.locator('[data-id="backpack-item-la-than"]').click();
  await expect(page.locator('[data-id="backpack-detail"]')).toContainText('phát sáng');
  await page.goto('/profile');
  await expect(page.locator('[data-id="collection-la-than"]')).toHaveAttribute('data-owned', 'true');
});
