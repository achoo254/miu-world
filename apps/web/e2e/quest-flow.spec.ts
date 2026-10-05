// Chapter 1 against the real server and content: meet the parrot (M3.3) → take the quest → the arrow
// points at a clue → find the three clues in reverse order → tracker 3/3 from the server → the letter
// opens by itself → read it and answer → on to the beaver. The Math challenges: challenges.spec.ts.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { copied, freshChild, notebookPage, playAt, playUntil } from './quest-api';
import { readStats, waitReady } from './stats';

/** The background music's mood and whether it really plays (music-player.ts). */
const music = (page: Page) => page.evaluate(() => (window.__miuMusic ? { mood: window.__miuMusic.mood, playing: window.__miuMusic.playing } : null));

/** The world's cheer for a finished quest, for the review (outside git). */
const SHOTS = fileURLToPath(new URL('../../../.data/celebration/', import.meta.url));

// Its own parent and child: quest progress must start empty and never leak into other projects.
test.use({ storageState: { cookies: [], origins: [] } });

test('meet the parrot, follow the arrow, find the three clues, and the letter opens by itself', { tag: '@smoke' }, async ({ page, baseURL }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  await freshChild(page, baseURL ?? '');

  await page.goto(playAt('parrot-guide'));
  await waitReady(page);
  await page.keyboard.press('KeyE');
  // The forest's walking music plays (the key press is the gesture browsers wait for).
  await expect.poll(() => music(page)).toEqual({ mood: 'forest', playing: true });
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
  // The quest is under way: adventure music.
  await expect.poll(() => music(page)).toMatchObject({ mood: 'quest' });
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
  // A learning step: lighter music to think by.
  await expect.poll(() => music(page)).toMatchObject({ mood: 'puzzle' });

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
  await copied(page);
  await expect(page.locator('[data-id="hud-tracker-step"]')).toContainText('Hải ly');
  await expect.poll(async () => (await readStats(page)).hintTarget).toBe('animal-beaver');
  expect(pageErrors).toEqual([]);
});

test('a target whose turn has not come says so, and never the same line twice in a row', async ({ page, baseURL }) => {
  await freshChild(page, baseURL ?? '');
  // The beaver and the parrot offer a minigame instead of this line; the chest (kind `chest`) gives the same kind of line.
  await page.goto(playAt('chest'));
  await waitReady(page);
  const said: string[] = [];
  const toast = page.locator('[data-id="toast"]');
  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.press('KeyE');
    // Wait for the new line to replace the previous one before reading it.
    const previous = said.at(-1) ?? '';
    await expect.poll(async () => (await toast.textContent()) ?? '').not.toBe(previous);
    await expect(toast).toContainText('Rương');
    said.push((await toast.textContent()) ?? '');
  }
  for (let i = 1; i < said.length; i += 1) expect(said[i]).not.toBe(said[i - 1]);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('finishing chapter 1 without seeing an answer: 100 XP, Level Up to 2, the Lá thần in the backpack', async ({ page, baseURL }) => {
  await freshChild(page, baseURL ?? '');
  await playUntil(page, baseURL ?? '', 'open-chest');
  await page.goto(playAt('chest'));
  await waitReady(page);
  await page.locator('[data-id="hud-interact"]').click();

  // The world cheers first: villagers and animals around join in and confetti flies, before any screen covers it.
  const reward = page.getByRole('dialog', { name: 'Hoàn thành nhiệm vụ!' });
  await expect.poll(async () => (await readStats(page)).confetti).toBe(true);
  expect((await readStats(page)).ambientCelebrations).toBeGreaterThan(0);
  await page.waitForTimeout(700);
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: `${SHOTS}celebration.png` });
  await expect(reward).toHaveCount(0);
  // The gate opens by itself after the chest; the server pays: first the chapter's five questions to copy
  // into the vở (from the server, though they were played through the API), then the reward screens.
  await notebookPage(page, 5);
  await expect(reward).toBeVisible();
  await expect(page.locator('[data-id="reward-stars"]')).toHaveAttribute('data-stars', '3');
  await expect(page.locator('[data-id="reward-xp"] .visually-hidden')).toHaveText('+100 XP');
  await expect(page.locator('[data-id="reward-item-la-than"]')).toContainText('Lá thần');
  await page.locator('[data-id="completion-next"]').click();
  await expect(page.getByRole('dialog', { name: 'Lên cấp!' })).toContainText('Lv.1 → Lv.2');
  // Chapter 1 opens no other quest (every textbook lesson is open from the start): Level Up is the last screen.
  await expect(page.locator('[data-id="completion-next"]')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('Kim cương');
  await page.locator('[data-id="completion-map"]').click();

  await expect(page).toHaveURL(/\/region\/khu-rung-bi-mat$/);
  await expect(page.locator('[data-id="region-quest-forest-ch1"]')).toHaveAttribute('data-state', 'completed');
  await expect(page.locator('[data-id="player-level"]')).toHaveText('Lv.2');

  await page.goto('/backpack');
  await page.locator('[data-id="backpack-item-la-than"]').click();
  await expect(page.locator('[data-id="backpack-detail"]')).toContainText('phát sáng');
  await page.goto('/profile');
  await expect(page.locator('[data-id="collection-la-than"]')).toHaveAttribute('data-owned', 'true');
});
