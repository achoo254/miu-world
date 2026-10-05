// A character with a story of its own (content/npcs): talking to it opens its card with the friendship's hearts (the
// day's first chat counts on the server), it offers its first chapter, and the chapter is in the quest list under
// "Chuyện của <tên>", from where it opens in place. The hearts show again on the "Bạn bè trong làng" page.
import { expect, test } from '@playwright/test';
import { freshChild } from './quest-api';
import { waitReady } from './stats';

// Its own parent and child: friendships and quest progress start empty.
test.use({ storageState: { cookies: [], origins: [] } });

const TELLER = 'gau-bac-cuc-cau-ca';
const FIRST = 'yarn-ho-bang-biet-hat-1';

test('talk to a storyteller, see the hearts, and open the first chapter from the quest list', { tag: '@smoke' }, async ({ page, baseURL }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  await freshChild(page, baseURL ?? '');

  await page.goto(`/play?quality=low&region=nui-tuyet&quest=nui-tuyet-ch1&spawnAt=${TELLER}`);
  await waitReady(page);
  await page.keyboard.press('KeyE');
  const card = page.locator('[data-id="npc-card"]');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Gấu Bắc Cực Câu Cá');
  await expect(page.locator('[data-id="npc-card-hearts"]')).toHaveAttribute('data-hearts', '0');
  await expect(page.locator('[data-id="npc-card-line"]')).not.toBeEmpty();
  // The day's first chat raises the friendship (counted by the server).
  await expect(page.locator('[data-id="npc-card-raised"]')).toBeVisible();
  await expect(page.locator('[data-id="npc-card-story"]')).toBeVisible();
  await page.locator('[data-id="npc-card-bye"]').click();
  await expect(card).toHaveCount(0);

  // The quest list has the story under the character's name; its first chapter opens in place.
  await page.locator('[data-id="hud-quests"]').click();
  const board = page.locator('[data-id="region-board"]');
  await expect(board).toContainText('Chuyện của Gấu Bắc Cực Câu Cá');
  await page.locator(`[data-id="region-play-${FIRST}"]`).click();
  await expect(page).toHaveURL(new RegExp(`quest=${FIRST}`));
  await waitReady(page);
  await expect(page.locator('[data-id="hud-tracker-quest"]')).toContainText('Chuyện của Gấu Bắc Cực Câu Cá');

  // The village page shows the same friendship.
  await page.goto('/village');
  const friend = page.locator(`[data-id="village-npc-${TELLER}"]`);
  await expect(friend).toBeVisible();
  await expect(page.locator(`[data-id="village-hearts-${TELLER}"]`)).toHaveAttribute('data-hearts', '0');
  await expect(page.locator(`[data-id="village-points-${TELLER}"]`)).toContainText('1');
  await expect(page.locator(`[data-id="village-chapter-${FIRST}"]`)).toBeVisible();
  expect(pageErrors).toEqual([]);
});
