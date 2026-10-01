// Everyday life in Khu rừng bí mật on the production build: villagers at their chores and animals
// going about their day are drawn near the child (only the nearest few, within the draw-call
// budget), a villager stops, greets and chats when tapped, and quest targets keep the prompt. Shots
// and a short video of each place go to the review folder for the owner.
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import type { WorldEntities } from '@miu/voxel/world-entities';
import { freshChild } from './quest-api';
import { readStats, waitReady } from './stats';

const SHOTS = fileURLToPath(new URL('../../../.data/life/review-shots/', import.meta.url));
mkdirSync(SHOTS, { recursive: true });
const entities = JSON.parse(readFileSync(new URL('../../../assets/generated/world/forest-ch1/entities.json', import.meta.url), 'utf8')) as WorldEntities;
const DRAW_CALL_BUDGET = 150;

/** A spot `back` blocks behind a character along the spawn heading (45°), so the follow camera frames it. */
function behind(id: string, back = 5): string {
  const ambient = (entities.ambients ?? []).find((a) => a.id === id);
  if (!ambient) throw new Error(`no ambient ${id}`);
  const [x, y, z] = ambient.position;
  return `${(x - back * Math.SQRT1_2).toFixed(2)},${(y + 1).toFixed(2)},${(z - back * Math.SQRT1_2).toFixed(2)}`;
}
const play = (spawnAt: string, quality = 'mid') => `/play?quality=${quality}&region=khu-rung-bi-mat&quest=forest-ch1&spawnAt=${spawnAt}`;

test.use({ viewport: { width: 1180, height: 820 } });

// Shots on the default quality (what an iPad shows); the budget is checked on every quality.
test('the camp, the woods, the garden, the stream and the meadow are alive, within the draw-call budget', async ({ page, baseURL }) => {
  await freshChild(page, baseURL ?? '');
  for (const [place, id] of [
    ['camp', 'bac-nau-an'],
    ['woodcutter', 'bac-tieu-phu'],
    ['garden', 'co-lam-vuon'],
    ['stream', 'chu-cau-ca'],
    ['meadow', 'nai-me'],
    ['fox', 'cao-ngu-ngay'],
    ['bunny', 'tho-trang'],
  ] as const) {
    // A fixed camera on the place (`shot=life:`), the child a few steps away so they keep working.
    await page.goto(`${play(behind(id, 7))}&shot=life:${id}`);
    await waitReady(page);
    // Let them get on with their chores for a while.
    await page.waitForTimeout(7_000);
    const stats = await readStats(page);
    expect(stats.ambientVisible, place).toBeGreaterThan(0);
    expect(stats.ambientVisible, place).toBeLessThanOrEqual(9);
    expect(stats.calls, place).toBeLessThanOrEqual(DRAW_CALL_BUDGET);
    await page.screenshot({ path: `${SHOTS}life-${place}.png` });
  }
});

test('villagers and animals add only a few draw calls each (one skinned mesh per character)', async ({ page, baseURL }) => {
  await freshChild(page, baseURL ?? '');
  const calls = async (url: string): Promise<{ calls: number; visible: number }> => {
    await page.goto(url);
    await waitReady(page);
    await page.waitForTimeout(2_000);
    const stats = await readStats(page);
    return { calls: stats.calls, visible: stats.ambientVisible };
  };
  const at = behind('bac-nau-an', 3);
  const without = await calls(`${play(at)}&life=0`);
  const withLife = await calls(play(at));
  // High quality (shadows, the whole map in view) leaves little room: the cast shrinks to fit.
  const high = await calls(play(at, 'high'));
  expect(high.calls, `${high.visible} characters drawn on high quality`).toBeLessThanOrEqual(DRAW_CALL_BUDGET);
  expect(withLife.visible).toBeGreaterThan(0);
  // A character is one draw call, one more for its shadow on high quality, plus what it holds.
  expect(withLife.calls - without.calls).toBeLessThanOrEqual(withLife.visible * 3);
  expect(withLife.calls, `${without.calls} calls without life, ${withLife.visible} characters drawn`).toBeLessThanOrEqual(DRAW_CALL_BUDGET);
});

test('low quality draws at most six of them, within the draw-call budget', async ({ page, baseURL }) => {
  await freshChild(page, baseURL ?? '');
  await page.goto(play(behind('bac-nau-an', 3), 'low'));
  await waitReady(page);
  await expect.poll(async () => (await readStats(page)).ambientVisible).toBeGreaterThan(0);
  const stats = await readStats(page);
  expect(stats.ambientVisible).toBeLessThanOrEqual(6);
  expect(stats.calls).toBeLessThanOrEqual(DRAW_CALL_BUDGET);
});

test('stays quiet while a quest prompt is up', async ({ page, baseURL }) => {
  await freshChild(page, baseURL ?? '');
  // Next to the parrot guide: villagers and parrots are around, but the quest owns the moment.
  await page.goto(play('npc'));
  await waitReady(page);
  await expect.poll(async () => (await readStats(page)).nearTarget).toBe('parrot-guide');
  await page.waitForTimeout(8_000);
  const stats = await readStats(page);
  expect(stats.nearTarget).toBe('parrot-guide');
  expect(stats.ambientVisible).toBeGreaterThan(0);
  expect(stats.ambientLine).toBeNull();
});

test('the woodcutter stops, greets the child by name, and chats when tapped', async ({ page, baseURL }) => {
  await freshChild(page, baseURL ?? '', 'Mochi');
  // The fixed review camera on him (the follow camera would sit in the tree he chops).
  await page.goto(`${play(behind('bac-tieu-phu', 1.8))}&shot=life:bac-tieu-phu`);
  await waitReady(page);
  const prompt = page.locator('[data-id="play-prompt-bac-tieu-phu"]');
  await expect(prompt).toHaveText('Bác Tiều phu · Trò chuyện');
  // The greeting names the child's character.
  await expect.poll(async () => (await readStats(page)).ambientLine ?? '').toContain('Mochi');
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await readStats(page)).ambientReactions).toBe(1);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}life-woodcutter-chat.png` });
  // Chatting never touches the quest: no quest interaction was sent.
  expect((await readStats(page)).lastInteraction).toBeNull();
});

test('records short videos of the camp, the woodcutter and the stream for the owner', async ({ browser, baseURL }) => {
  test.setTimeout(180_000);
  const size = { width: 960, height: 668 };
  for (const [place, id] of [
    ['camp', 'be-ganh-cui'],
    ['woodcutter', 'bac-tieu-phu'],
    ['stream', 'chu-cau-ca'],
  ] as const) {
    const context = await browser.newContext({ baseURL, viewport: size, recordVideo: { dir: `${SHOTS}video-tmp`, size } });
    const page = await context.newPage();
    await freshChild(page, baseURL ?? '');
    await page.goto(`${play(behind(id, 7))}&shot=life:${id}`);
    await waitReady(page);
    await page.waitForTimeout(18_000);
    const video = page.video();
    await context.close();
    await video?.saveAs(`${SHOTS}life-${place}.webm`);
  }
});
