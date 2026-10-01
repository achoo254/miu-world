// The whole MVP loop through the real UI on the reference iPad viewport with touch (Master Plan §13,
// §16): Google sign-in (local fake) → PIN → consent → profile → Character Creator (change the hat) →
// Home → Khu rừng bí mật ch1 → parrot → three clues → the letter → three Math challenges (no answer
// layer) → the ancient tree → 100 XP, Level Up 1 → 2, chapter 2 unlocked → the Lá thần in the Backpack.
// Along the way: nothing leaves the origin, CSP is on every page, and no API response except the
// support endpoint carries answer text.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { playAt } from './quest-api';
import { readStats, waitReady } from './stats';
import { tap, touchDrag } from './touch';

test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 820, height: 1180 }, hasTouch: true });

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
// REVIEW_SHOTS=1 saves one picture per screen for the final review page (then `pnpm assets:manifest`).
const REVIEW_SHOTS = process.env.REVIEW_SHOTS === '1';
const SHOT_DIR = path.join(REPO_ROOT, 'assets/generated/review/mvp');
async function shot(page: Page, name: string): Promise<void> {
  if (!REVIEW_SHOTS) return;
  mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), animations: 'disabled' });
}
test.afterAll(() => {
  // New screenshots must be hashed into the manifest or the license gate goes red.
  if (REVIEW_SHOTS) execFileSync('pnpm', ['-s', 'assets:manifest'], { cwd: REPO_ROOT, stdio: 'inherit', shell: true });
});

/** Answer-layer text of every quest: only POST …/support with layer "answer" may carry it. */
function answerTexts(): string[] {
  const dir = path.join(REPO_ROOT, 'content/quests');
  /** Every string a quest shows anyway (its texts, lines, prompts…): everything but its answers and support layers. */
  const publicText = (value: unknown): string[] =>
    typeof value === 'string'
      ? [value]
      : Array.isArray(value)
        ? value.flatMap(publicText)
        : value && typeof value === 'object'
          ? Object.entries(value).flatMap(([k, v]) => (k === 'support' || k === 'answer' ? [] : publicText(v)))
          : [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => {
      const quest = JSON.parse(readFileSync(path.join(dir, f), 'utf8')) as { steps?: Array<{ support?: { answer?: { explanation?: string } } }> };
      const shown = publicText(quest).join('\n');
      // An explanation that only quotes the reading passage (a textbook sentence the child reads anyway) is no secret.
      return (quest.steps ?? []).map((s) => s.support?.answer?.explanation).filter((t): t is string => typeof t === 'string' && !shown.includes(t));
    });
}

/** Plays a dialogue to its end: next lines, then the first choice (and its reply), then done. */
async function finishDialogue(page: Page): Promise<void> {
  const dialogue = page.locator('[data-id="dialogue"]');
  await expect(dialogue).toBeVisible();
  for (let i = 0; i < 10 && (await dialogue.count()) > 0; i += 1) {
    for (const id of ['dialogue-next', 'dialogue-choice-0', 'dialogue-done']) {
      const button = page.locator(`[data-id="${id}"]`);
      if ((await button.count()) > 0 && (await button.isEnabled())) {
        await tap(page, `[data-id="${id}"]`);
        break;
      }
    }
    await page.waitForTimeout(150);
  }
  await expect(dialogue).toHaveCount(0);
}

async function goTo(page: Page, target: string): Promise<void> {
  await page.goto(playAt(target));
  await waitReady(page);
}

test('one child plays the whole MVP loop by touch, from Google sign-in to the Lá thần in the backpack', async ({ page, baseURL }) => {
  test.setTimeout(240_000);
  const origin = new URL(baseURL ?? '').origin;
  const foreign: string[] = [];
  const leaks: string[] = [];
  const pageErrors: string[] = [];
  const secrets = answerTexts();
  expect(secrets.length).toBeGreaterThan(0);
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('request', (req) => {
    const url = new URL(req.url());
    // The fake Google sign-in runs on its own local port; everything else must stay on the origin.
    if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== origin && url.hostname !== '127.0.0.1') foreign.push(req.url());
  });
  page.on('response', async (res) => {
    if (!res.url().includes('/api/') || res.url().endsWith('/support')) return;
    const body = await res.text().catch(() => '');
    for (const s of secrets) if (body.includes(s)) leaks.push(`${res.url()} carries "${s.slice(0, 30)}…"`);
  });
  const checkCsp = async (): Promise<void> => {
    expect(await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')).toContain("default-src 'self'");
  };

  // Parent: Google sign-in (local fake), PIN, consent, a profile, then hand the device over.
  await page.goto('/');
  await checkCsp();
  await page.getByRole('link', { name: 'Đăng nhập bằng Google' }).tap();
  await page.locator('[data-id="set-pin-pin"]').fill('2468');
  await page.locator('[data-id="set-pin-again"]').fill('2468');
  await page.getByRole('button', { name: 'Lưu mã PIN' }).tap();
  await page.getByRole('button', { name: 'Tôi là phụ huynh và đồng ý' }).tap();
  await page.locator('[data-id="parent-create-name"]').selectOption('Gấu Mật');
  await page.getByRole('button', { name: 'Tạo hồ sơ' }).tap();
  await page.getByRole('button', { name: 'Xong, khóa khu phụ huynh' }).tap();
  await page.getByRole('button', { name: 'Gấu Mật' }).tap();

  // Character Creator: the cat, a new hat seen on the voxel preview, a name.
  await expect(page).toHaveURL(/\/create$/);
  await checkCsp();
  await page.getByRole('button', { name: /Mèo/ }).tap();
  await page.waitForFunction(() => window.__miuPreview?.ready === true, null, { timeout: 60_000 });
  await tap(page, '[data-id="creator-item-hat-cap-yellow"]');
  await expect.poll(() => page.evaluate(() => window.__miuPreview?.outfit ?? null)).toEqual(['hat-cap-yellow']);
  await page.getByLabel('Tên nhân vật').selectOption('Bông');
  await shot(page, '01-creator');
  await tap(page, '[data-id="creator-save"]');

  // Home → the forest → chapter 1.
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.locator('[data-id="player-level"]')).toHaveText('Lv.1');
  await shot(page, '02-home');
  await tap(page, '[data-id="home-region-khu-rung-bi-mat"]');
  await expect(page.locator('.region-chest')).toHaveJSProperty('complete', true);
  await shot(page, '03-region');
  await tap(page, '[data-id="region-play-forest-ch1"]');
  await expect(page).toHaveURL(/\/play\?/);
  await waitReady(page);
  await checkCsp();
  expect((await readStats(page)).outfit).toEqual(['hat-cap-yellow']);

  // The parrot gives the quest; the three clues; the letter opens by itself.
  await goTo(page, 'parrot-guide');
  await tap(page, '[data-id="hud-interact"]');
  await expect(page.locator('[data-id="dialogue-line"]')).toContainText('Chào Bông!');
  await shot(page, '04-dialogue');
  await finishDialogue(page);
  for (const [i, clue] of ['clue-box', 'clue-letter', 'clue-mushroom'].entries()) {
    await goTo(page, clue);
    await tap(page, '[data-id="hud-interact"]');
    // Wait for the server's answer before leaving the page (a reload would cancel the call).
    if (i < 2) await expect(page.locator('[data-id="hud-tracker-count"]')).toHaveText(new RegExp(`${i + 1}/3`));
  }
  await expect(page.locator('[data-id="read-passage"]')).toBeVisible();
  await shot(page, '05-letter');
  await tap(page, '[data-id="choice-b"]');
  await tap(page, '[data-id="challenge-check"]');
  await expect(page.locator('[data-id="challenge"]')).toHaveCount(0);

  // The beaver: talk, ten apples by touch drag, the candy question.
  await goTo(page, 'animal-beaver');
  await tap(page, '[data-id="hud-interact"]');
  await finishDialogue(page);
  await tap(page, '[data-id="hud-interact"]');
  for (let i = 1; i <= 10; i += 1) await touchDrag(page, `[data-id="piece-apple-${i}"]`, '[data-id="drag-container"]');
  await expect(page.locator('[data-id="drag-count"]')).toHaveText('10');
  await shot(page, '06-drag-drop');
  await tap(page, '[data-id="challenge-check"]');
  await expect(page.locator('[data-id="challenge"]')).toHaveCount(0);
  await tap(page, '[data-id="hud-interact"]');
  await tap(page, '[data-id="choice-b"]');
  await shot(page, '07-quiz');
  await tap(page, '[data-id="challenge-check"]');
  await expect(page.locator('[data-id="challenge"]')).toHaveCount(0);

  // The stepping stones, small to large.
  await goTo(page, 'stream-stones');
  await tap(page, '[data-id="hud-interact"]');
  for (const [i, stone] of ['stone-9', 'stone-15', 'stone-27', 'stone-34'].entries()) {
    await tap(page, `[data-id="stone-${stone}"]`);
    await tap(page, `[data-id="slot-${i}"]`);
  }
  await shot(page, '08-sort');
  await tap(page, '[data-id="challenge-check"]');
  await expect(page.locator('[data-id="challenge"]')).toHaveCount(0);

  // The ancient tree: talk, then its riddle (8 + 5) on the number pad; no support layer opened.
  await goTo(page, 'ancient-tree');
  await tap(page, '[data-id="hud-interact"]');
  await finishDialogue(page);
  await tap(page, '[data-id="hud-interact"]');
  for (const digit of ['1', '3']) await page.getByRole('button', { name: digit, exact: true }).tap();
  await shot(page, '09-riddle');
  await tap(page, '[data-id="challenge-check"]');
  await expect(page.locator('[data-id="challenge"]')).toHaveCount(0);

  // The chest: the gate opens by itself and the server pays the chapter.
  await goTo(page, 'chest');
  await tap(page, '[data-id="hud-interact"]');
  await expect(page.locator('[data-id="reward-stars"]')).toHaveAttribute('data-stars', '3');
  await expect(page.locator('[data-id="reward-xp"] .visually-hidden')).toHaveText('+100 XP');
  // The counters count up (script, not CSS, so `animations: 'disabled'` does not settle them).
  await expect(page.locator('[data-id="reward-xp"] [aria-hidden="true"]')).toHaveText('+100 XP');
  await shot(page, '10-reward');
  await tap(page, '[data-id="completion-next"]');
  await expect(page.locator('[data-id="level-up"]')).toContainText('Lv.1 → Lv.2');
  await shot(page, '11-level-up');
  // Level Up is the last screen: chapter 1 opens no other quest (the textbook lessons are open from the start).
  await tap(page, '[data-id="completion-map"]');
  await expect(page.locator('[data-id="region-quest-forest-ch1"]')).toHaveAttribute('data-state', 'completed');

  // Home shows level 2; the backpack holds the Lá thần.
  await page.goto('/home');
  await expect(page.locator('[data-id="player-level"]')).toHaveText('Lv.2');
  await expect(page.locator('body')).not.toContainText('Kim cương'); // no diamonds in the MVP (§15 #6)
  await tap(page, '[data-id="home-nav-backpack"]');
  await expect(page.locator('[data-id="backpack-item-la-than"]')).toBeVisible();
  await shot(page, '12-backpack');

  // The review page keeps the same rules.
  await page.goto('/review.html');
  await checkCsp();

  expect(foreign).toEqual([]);
  expect(leaks).toEqual([]);
  expect(pageErrors).toEqual([]);
});
