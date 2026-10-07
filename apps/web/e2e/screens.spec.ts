// The main screens before a release (docs/screen-review.md): each one pictured on an upright phone (360 × 740) and an
// upright iPad (820 × 1180), with facts read from its DOM, for an agent to look at and for the review page. Not a
// test of the game: a screen that cannot be reached is noted as missing with its reason, and the run goes on. Run by
// hand (`pnpm --filter @miu/web screens`), never on CI. Fake accounts in the in-memory database only.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { layoutFacts, type LayoutFacts } from './layout';
import { freshChild, notebookPage, playAt, playUntil } from './quest-api';
import { readStats, waitReady } from './stats';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SHOT_DIR = path.join(REPO_ROOT, 'assets/generated/review/screens');
const VIEWPORTS = [
  { width: 360, height: 740 },
  { width: 820, height: 1180 },
] as const;

interface Shot {
  shot: string;
  screen: string;
  status: 'ok' | 'missing';
  reason?: string;
  facts?: LayoutFacts;
}

/** The fight with the longest question a zone guardian asks, at that question (content/quests). */
const LONG_FIGHT = { quest: 'ward-lau-dai-cau-treo', region: 'lau-dai', target: 'cho-bac-canh-hao', turn: 4 };
const OLYMPIC = 'olympic-math-2026';
/** A terminal colour code in an error message (ESC [ … m). */
const TERMINAL_COLOUR = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

const git = (...args: string[]): string => execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
/**
 * The commit pictured. A clean tree exported from a commit (`git archive`, no .git: the way to picture a commit while
 * another session has work in progress in the working tree) names it in MIU_SCREENS_COMMIT.
 */
const EXPORTED_FROM = process.env.MIU_SCREENS_COMMIT;
const picturedCommit = (): string => EXPORTED_FROM ?? git('rev-parse', 'HEAD');
/** Tracked files changed since the last commit when the pictures were taken (they are in the pictures, not in the commit). */
const uncommittedFiles = (): string[] => (EXPORTED_FROM ? [] : git('diff', '--name-only', 'HEAD').split('\n').filter(Boolean));
/** Now as an ISO time in Asia/Saigon (+07:00). */
const saigonNow = (): string => `${new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 19)}+07:00`;

async function newPlayer(browser: Browser, baseURL: string, viewport: { width: number; height: number }, name = 'Mochi'): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ baseURL, viewport, deviceScaleFactor: 1, hasTouch: true, storageState: { cookies: [], origins: [] } });
  // Every wait is bounded, so a screen that does not come up is noted as missing instead of stalling the run.
  context.setDefaultTimeout(20_000);
  context.setDefaultNavigationTimeout(30_000);
  const page = await context.newPage();
  await freshChild(page, baseURL, name);
  // Companion bots stay out of the pictures (her own setting).
  const headers = { Origin: new URL(baseURL).origin };
  expect((await page.context().request.put('/api/player-settings', { headers, data: { botsEnabled: false } })).status()).toBe(200);
  return { context, page };
}

/** The game drawn and settled: ready, and a few frames drawn since. */
async function gameSettled(page: Page): Promise<void> {
  await waitReady(page);
  const frames = (await readStats(page)).frames;
  await expect.poll(async () => (await readStats(page)).frames, { timeout: 15_000 }).toBeGreaterThan(frames + 10);
}

const turnsOf = (quest: string): Array<{ id: string; answer: { choice: string } }> => {
  const def = JSON.parse(readFileSync(path.join(REPO_ROOT, 'content/quests', `${quest}.json`), 'utf8')) as { steps: Array<{ kind: string; turns?: Array<{ id: string; answer: { choice: string } }> }> };
  return def.steps.find((s) => s.kind === 'boss')?.turns ?? [];
};

test.afterAll(() => {
  // The pictures are hashed into the manifest, or the license gate goes red.
  execFileSync('pnpm', ['-s', 'assets:manifest'], { cwd: REPO_ROOT, stdio: 'inherit', shell: true });
});

for (const viewport of VIEWPORTS) {
  const size = `${viewport.width}x${viewport.height}`;
  test(`the main screens on ${size}`, async ({ browser, baseURL }) => {
    // Nineteen screens, eight game loads and a second player: several minutes on a dev machine.
    test.setTimeout(15 * 60_000);
    const base = baseURL ?? '';
    const headers = { Origin: new URL(base).origin };
    const dir = path.join(SHOT_DIR, size);
    // A screen renamed or dropped must not leave its old picture behind.
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const shots: Shot[] = [];

    async function capture(page: Page, screen: string, open: () => Promise<void>): Promise<void> {
      const shot = `${size}/${screen}.png`;
      try {
        await open();
        await page.screenshot({ path: path.join(dir, `${screen}.png`), animations: 'disabled' });
        shots.push({ shot, screen, status: 'ok', facts: await layoutFacts(page) });
      } catch (err) {
        // The first line of the error, without the terminal's colour codes.
        const reason = ((err instanceof Error ? err.message : String(err)).split('\n')[0] ?? 'unknown').replace(TERMINAL_COLOUR, '');
        shots.push({ shot, screen, status: 'missing', reason });
        // What the screen showed instead, outside the repo, for whoever looks into it.
        await page.screenshot({ path: test.info().outputPath(`${size}-${screen}-missing.png`) }).catch(() => undefined);
      }
    }

    // Signed out: the sign-in screen.
    const out = await browser.newContext({ baseURL: base, viewport, deviceScaleFactor: 1, hasTouch: true, storageState: { cookies: [], origins: [] } });
    const outPage = await out.newPage();
    await capture(outPage, '01-login', async () => {
      await outPage.goto('/login');
      await expect(outPage.locator('main')).toBeVisible();
    });
    await out.close();

    const { context, page } = await newPlayer(browser, base, viewport);
    await capture(page, '02-players', async () => {
      await page.goto('/profiles');
      await expect(page.locator('[data-id="profiles"], [data-id="play-start"]').first()).toBeVisible();
    });
    await capture(page, '03-creator', async () => {
      await page.goto('/create');
      // The creator opens on the choice of a species.
      await expect(page.getByRole('heading', { name: 'Chọn nhân vật của bé' })).toBeVisible();
    });
    await capture(page, '04-home', async () => {
      await page.goto('/home');
      await expect(page.locator('[data-id="home-nav-shop"]')).toBeVisible();
    });
    await capture(page, '05-world-map', async () => {
      await page.goto('/map');
      await expect(page.locator('[data-id="map-books"]')).toBeAttached();
    });
    await capture(page, '06-region', async () => {
      await page.goto('/region/khu-rung-bi-mat');
      await expect(page.locator('[data-id="region-quest-forest-ch1"]')).toBeVisible();
    });
    await capture(page, '07-play-hud', async () => {
      await page.goto('/play?quality=low&spawnAt=spawn');
      await gameSettled(page);
      await expect(page.locator('[data-id="hud-tracker"]')).toBeVisible();
    });
    await capture(page, '08-play-prompt', async () => {
      await page.goto(playAt('parrot-guide'));
      await gameSettled(page);
      await expect(page.locator('[data-id="hud-interact"]')).toBeVisible();
    });
    await capture(page, '09-dialogue', async () => {
      await page.locator('[data-id="hud-interact"]').click();
      await expect(page.getByRole('dialog', { name: 'Vẹt' })).toBeVisible();
    });
    await capture(page, '10-question', async () => {
      await playUntil(page, base, 'tree-riddle');
      await page.goto(playAt('ancient-tree'));
      await gameSettled(page);
      await page.locator('[data-id="hud-interact"]').click();
      await expect(page.locator('[data-id="challenge"]')).toBeVisible();
    });
    await capture(page, '11-reward', async () => {
      await page.goto('/home');
      await playUntil(page, base, 'open-chest');
      await page.goto(playAt('chest'));
      await gameSettled(page);
      await page.locator('[data-id="hud-interact"]').click();
      await notebookPage(page, 5);
      await expect(page.getByRole('dialog', { name: 'Hoàn thành nhiệm vụ!' })).toBeVisible();
      // The XP counts up on screen: pictured once it reaches what the server paid.
      const xp = page.locator('[data-id="reward-xp"]');
      await expect(xp.locator('span[aria-hidden="true"]')).toHaveText(`+${(await xp.getAttribute('data-value')) ?? ''} XP`);
    });
    await capture(page, '12-event-panel', async () => {
      await page.goto('/home');
      await page.locator(`[data-id="home-event-open-${OLYMPIC}"]`).click();
      await expect(page.locator('[data-id="event-panel"]')).toBeVisible();
    });
    await capture(page, '13-olympiad-practice', async () => {
      await page.locator('[data-id="event-practice"]').click();
      await page.locator('[data-id^="olympiad-practice-"]').first().click();
      await expect(page.locator('[data-id="olympiad-prompt"]')).toBeVisible();
    });
    await capture(page, '14-boss', async () => {
      const turns = turnsOf(LONG_FIGHT.quest);
      expect((await page.context().request.post(`/api/quests/${LONG_FIGHT.quest}/steps/gap/complete`, { headers, data: {} })).status()).toBe(200);
      for (const turn of turns.slice(0, LONG_FIGHT.turn)) {
        const res = await page.context().request.post(`/api/quests/${LONG_FIGHT.quest}/steps/dau/complete`, { headers, data: { answer: { turnId: turn.id, choice: turn.answer.choice } } });
        expect(res.status(), await res.text()).toBe(200);
      }
      await page.goto(`/play?quality=low&region=${LONG_FIGHT.region}&quest=${LONG_FIGHT.quest}&spawnAt=${LONG_FIGHT.target}`);
      await waitReady(page);
      await expect(page.locator(`[data-id="turn-${turns[LONG_FIGHT.turn]?.id ?? ''}"]`)).toBeVisible();
      await expect.poll(async () => (await readStats(page)).duel, { timeout: 15_000 }).not.toBeNull();
    });
    await capture(page, '15-shop', async () => {
      await page.goto('/home');
      await page.locator('[data-id="home-nav-shop"]').click();
      await expect(page.locator('[data-id="shop-grid"]')).toBeVisible();
    });
    await capture(page, '16-backpack', async () => {
      await page.goto('/backpack');
      await expect(page.locator('[data-id="backpack-item-la-than"]')).toBeVisible();
    });
    await capture(page, '17-pet-care', async () => {
      expect((await page.context().request.put('/api/character', { headers, data: { name: 'Mochi', equipped: [], pet: 'meo-xam' } })).status()).toBe(200);
      await page.goto('/play?quality=low&region=nha-cua-be&quest=nha-cua-be-ch1&spawnAt=spawn');
      await gameSettled(page);
      await page.locator('[data-id="hud-pet"]').click();
      await expect(page.locator('[data-id="play-pet-care"]')).toBeVisible();
      // The board, not its "calling the pet" line.
      await expect(page.locator('[data-id="pet-care-name"]')).toBeVisible();
    });
    // A second player invites her into a party by the forest's spawn.
    const friend = await newPlayer(browser, base, viewport, 'Bông');
    await capture(page, '18-party', async () => {
      // Both in the forest by its spawn (she was last at home with her pet).
      await page.goto(playAt('spawn'));
      await friend.page.goto(playAt('spawn'));
      await waitReady(page);
      await waitReady(friend.page);
      await friend.page.locator('[data-kind="player"]').click();
      await friend.page.locator('[data-id="online-menu-invite"]').click();
      await page.locator('[data-id="online-invite-accept"]').click();
      await expect(page.locator('[data-id="online-party"]')).toBeVisible();
    });
    await friend.context.close();
    await capture(page, '19-worksheets', async () => {
      // Signing up leaves the parents' area open for a while: lock it, then open it with the account PIN.
      expect((await page.context().request.post('/api/parent-gate/lock', { headers })).status()).toBe(200);
      await page.goto('/parent/worksheets');
      await page.getByLabel('Nhập mã PIN tài khoản').fill('2468');
      await page.getByLabel('Nhập mã PIN tài khoản').press('Enter');
      await expect(page.getByRole('heading', { name: 'Tiếng Việt 2, tập một' })).toBeVisible();
    });
    await context.close();

    writeFileSync(
      path.join(dir, 'shots.json'),
      `${JSON.stringify({ viewport: size, capturedFrom: picturedCommit(), uncommitted: uncommittedFiles(), capturedAt: saigonNow(), shots }, null, 2)}\n`,
    );
    test.info().annotations.push({ type: 'screens', description: `${shots.filter((s) => s.status === 'ok').length} of ${shots.length} pictured on ${size}` });
  });
}
