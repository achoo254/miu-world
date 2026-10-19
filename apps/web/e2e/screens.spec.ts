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
/**
 * A puzzle step that shows its clues (`elements`), with the steps before it as the API takes them (content/quests):
 * the dialogue, the three things found, the poster read.
 */
const PUZZLE = {
  quest: 'vuot-ai-trung-tam',
  region: 'trung-tam',
  target: 'trum-tt-koala',
  before: [
    ['gap-bo-cau', {}],
    ['tim-do-dien', { target: 'trum-tt-mu-ao-thuat' }],
    ['tim-do-dien', { target: 'trum-tt-bo-bai' }],
    ['tim-do-dien', { target: 'trum-tt-khan-lua' }],
    ['doc-ap-phich', { answer: { choice: 'b' } }],
  ] as ReadonlyArray<[string, object]>,
};
/** The fake moderator: the E2E server lists this email in MODERATOR_ACCOUNTS (playwright.config.ts). */
const MODERATOR = 'moderator-e2e@example.vn';
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

type Viewport = { width: number; height: number };

/** A signed-out browser at this size, by touch. */
async function newScreen(browser: Browser, baseURL: string, viewport: Viewport): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ baseURL, viewport, deviceScaleFactor: 1, hasTouch: true, storageState: { cookies: [], origins: [] } });
  // Every wait is bounded, so a screen that does not come up is noted as missing instead of stalling the run.
  context.setDefaultTimeout(20_000);
  context.setDefaultNavigationTimeout(30_000);
  return { context, page: await context.newPage() };
}

async function newPlayer(browser: Browser, baseURL: string, viewport: Viewport, name = 'Mochi'): Promise<{ context: BrowserContext; page: Page }> {
  const { context, page } = await newScreen(browser, baseURL, viewport);
  await freshChild(page, baseURL, name);
  // Companion bots stay out of the pictures (her own setting).
  const headers = { Origin: new URL(baseURL).origin };
  expect((await page.context().request.put('/api/player-settings', { headers, data: { botsEnabled: false } })).status()).toBe(200);
  return { context, page };
}

/** The moderator signed in: signed up (and the policy accepted) on the first size, signed in again on the next. */
async function newModerator(browser: Browser, baseURL: string, viewport: Viewport): Promise<{ context: BrowserContext; page: Page }> {
  const { context, page } = await newScreen(browser, baseURL, viewport);
  const headers = { Origin: new URL(baseURL).origin };
  const credentials = { email: MODERATOR, ['password']: 'test-password-e2e' };
  const signUp = await context.request.post('/api/auth/register', { headers, data: { ...credentials, pin: '2468' } });
  if (signUp.status() === 201) {
    const { version } = (await (await context.request.get('/api/consents/policy')).json()) as { version: string };
    expect((await context.request.post('/api/consents', { headers, data: { policyVersion: version } })).status()).toBe(201);
  } else {
    expect(signUp.status(), await signUp.text()).toBe(409);
    const signIn = await context.request.post('/api/auth/login', { headers, data: credentials });
    expect(signIn.status(), await signIn.text()).toBe(200);
  }
  return { context, page };
}

/** The first line of an error, without the terminal's colour codes. */
const firstLine = (err: unknown): string => ((err instanceof Error ? err.message : String(err)).split('\n')[0] ?? 'unknown').replace(TERMINAL_COLOUR, '');

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
    // Twenty-seven screens, ten game loads, a second player and a moderator: several minutes on a dev machine.
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
        shots.push({ shot, screen, status: 'missing', reason: firstLine(err) });
        // What the screen showed instead, outside the repo, for whoever looks into it.
        await page.screenshot({ path: test.info().outputPath(`${size}-${screen}-missing.png`) }).catch(() => undefined);
      }
    }

    // Signed out: the sign-in screen, the introduction and a lesson page.
    const { context: out, page: outPage } = await newScreen(browser, base, viewport);
    await capture(outPage, '01-login', async () => {
      await outPage.goto('/login');
      await expect(outPage.locator('main')).toBeVisible();
    });
    // The introduction at `/` and a static lesson page, the two ways in for someone who has not signed in.
    await capture(outPage, '20-landing', async () => {
      await outPage.goto('/');
      await expect(outPage.getByRole('heading', { level: 1, name: /Phiêu lưu trong thế giới khối/ })).toBeVisible();
      await expect(outPage.locator('[data-id="landing-play"]')).toBeVisible();
      // The island picture is drawn before the screen is pictured.
      await expect.poll(() => outPage.locator('.landing-image').evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    });
    await capture(outPage, '21-lesson-page', async () => {
      await outPage.goto('/bai/toan-2-bai-1-on-tap-cac-so-den-100/');
      await expect(outPage.getByRole('heading', { level: 1, name: /Trò chơi ôn Bài 1/ })).toBeVisible();
      await expect(outPage.locator('[data-id="lesson-play"]')).toBeVisible();
    });
    // An invite link's page: the same for any code of the right shape (the server is asked only after sign-in).
    await capture(outPage, '23-invite-page', async () => {
      await outPage.goto('/moi/AbCdEfGhIjKlMnOpQrStUv');
      await expect(outPage.getByRole('heading', { level: 1, name: 'Bạn được mời chơi Miu World' })).toBeVisible();
      await expect(outPage.locator('[data-id="invite-play"]')).toBeVisible();
    });
    await out.close();

    const { context, page } = await newPlayer(browser, base, viewport);
    await capture(page, '02-players', async () => {
      await page.goto('/profiles');
      // The page shows before its players are read: the picture waits for her card and "Thêm người chơi".
      await expect(page.locator('[data-id^="profiles-pick-"]').first()).toBeVisible();
      await expect(page.locator('[data-id="profiles-add"]')).toBeVisible();
      await expect.poll(() => page.locator('[data-id^="profiles-pick-"] img').first().evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
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
      // Under the stars, the quiet second button: the vở page came first, this one only offers to show the result off.
      await expect(page.locator('[data-id="share-result-button"]')).toBeVisible();
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
    // The friend reports her (made up: reason "other"), so the moderator's queue has something in it. A report that
    // could not be sent leaves the queue's screen missing, with this reason.
    const notReported = await (async (): Promise<string | null> => {
      try {
        // Her menu through the Interact button while the prompt is hers: the name over her head moves with every frame
        // drawn under the party bar, too restless for a tap on the phone.
        await expect(friend.page.locator('[data-kind="player"]')).toBeAttached();
        await friend.page.locator('[data-id="hud-interact"]').click();
        await friend.page.locator('[data-id="online-menu-report"]').click();
        await friend.page.locator('[data-id="online-menu-reason-other"]').check();
        await friend.page.locator('[data-id="online-menu-report-send"]').click();
        await expect(friend.page.locator('[data-id="online-menu"]')).toHaveCount(0);
        return null;
      } catch (err) {
        await friend.page.screenshot({ path: test.info().outputPath(`${size}-report-missing.png`) }).catch(() => undefined);
        return firstLine(err);
      }
    })();
    await friend.context.close();
    await capture(page, '19-worksheets', async () => {
      // Signing up leaves the parents' area open for a while: lock it, then open it with the account PIN.
      expect((await page.context().request.post('/api/parent-gate/lock', { headers })).status()).toBe(200);
      await page.goto('/parent/worksheets');
      await page.getByLabel('Nhập mã PIN tài khoản').fill('2468');
      await page.getByLabel('Nhập mã PIN tài khoản').press('Enter');
      await expect(page.getByRole('heading', { name: 'Tiếng Việt 2, tập một' })).toBeVisible();
    });
    await capture(page, '22-friends-invite', async () => {
      await page.goto('/friends');
      await page.getByRole('tab', { name: 'Mời bạn' }).click();
      await page.locator('[data-id="invite-create"]').click();
      // The link just made, in its field, with the way to send it.
      await expect(page.locator('[data-id^="invite-link-"]')).toBeVisible();
      await expect(page.locator('[data-id^="invite-share-"]')).toBeVisible();
    });
    await capture(page, '24-weekly-share', async () => {
      // The parents' area is still open from the worksheets (the PIN window); the card is the player's week.
      const me = (await (await page.context().request.get('/api/auth/me')).json()) as { activePlayerId: string };
      await page.goto('/parent');
      await page.locator(`[data-id="player-care-toggle-${me.activePlayerId}"]`).click();
      await page.locator('[data-id="weekly-share-open"]').click();
      await expect(page.locator('[data-id="weekly-share-card"]')).toBeVisible();
      // The card is drawn before the screen is pictured.
      await expect.poll(() => page.locator('[data-id="weekly-share-card"]').evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    });
    // The moderator's emergency switch turns online play off: the game says so in a friendly line. Online is back on
    // before anything else is pictured, whatever happened.
    const moderator = await newModerator(browser, base, viewport);
    const switchOnline = async (mode: 'on' | 'off'): Promise<void> => {
      const res = await moderator.context.request.put('/api/moderation/online-mode', { headers, data: { mode } });
      expect(res.status(), await res.text()).toBe(200);
    };
    try {
      await capture(page, '25-online-off', async () => {
        await switchOnline('off');
        await page.goto(playAt('spawn'));
        await gameSettled(page);
        await expect(page.locator('[data-id="online-pause"]')).toBeVisible();
      });
    } finally {
      await switchOnline('on');
    }
    await capture(moderator.page, '26-moderation', async () => {
      if (notReported) throw new Error(`no report in the queue: ${notReported}`);
      await moderator.page.goto('/kiem-duyet');
      await expect(moderator.page.locator('[data-id^="moderation-report-"]').first()).toBeVisible();
    });
    await moderator.context.close();
    await capture(page, '27-puzzle-clues', async () => {
      for (const [step, body] of PUZZLE.before) {
        const res = await page.context().request.post(`/api/quests/${PUZZLE.quest}/steps/${step}/complete`, { headers, data: body });
        expect(res.status(), `${step}: ${await res.text()}`).toBe(200);
      }
      await page.goto(`/play?quality=low&region=${PUZZLE.region}&quest=${PUZZLE.quest}&spawnAt=${PUZZLE.target}`);
      await gameSettled(page);
      await page.locator('[data-id="hud-interact"]').click();
      await expect(page.locator('[data-id="logic-challenge-clues"]')).toBeVisible();
    });
    await context.close();

    writeFileSync(
      path.join(dir, 'shots.json'),
      `${JSON.stringify({ viewport: size, capturedFrom: picturedCommit(), uncommitted: uncommittedFiles(), capturedAt: saigonNow(), shots }, null, 2)}\n`,
    );
    test.info().annotations.push({ type: 'screens', description: `${shots.filter((s) => s.status === 'ok').length} of ${shots.length} pictured on ${size}` });
  });
}
