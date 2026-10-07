// Interacting with a quest target in the running game: standing by the parrot shows its prompt and pressing
// Interact reports it. Every other target of every map is checked in Node by the quest target audit
// (tools/world/quest-target-audit.ts, part of `pnpm content:check`).
import { expect, test } from '@playwright/test';
import { readStats, waitReady } from './stats';

test('standing by the parrot shows its prompt, and interacting reports that target', async ({ page }) => {
  await page.goto('/play?quality=low&spawnAt=parrot-guide');
  await waitReady(page);
  const label = page.locator('.npc-label[data-target="parrot-guide"]');
  await expect(label).toBeVisible();
  await expect(label).toHaveAttribute('data-kind', 'npc');
  await expect(label).toContainText('Vẹt');
  expect((await readStats(page)).nearTarget).toBe('parrot-guide');
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await readStats(page)).lastInteraction).toBe('parrot-guide');
});
