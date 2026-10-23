// The App Store and Google Play screenshots: six screens of the game (Home, the world map, play in the 3D world, a
// lesson question, the reward, pet care) in Vietnamese, at the exact pixel sizes the stores take, with the game drawn
// at high quality. Run by hand, never on CI: `pnpm --filter @miu/web store:screens` writes docs/store/screenshots/
// (docs/store/README.md). Unlike screens.spec.ts a screen that does not come up fails the run: a store set must be
// whole. Fake accounts in the in-memory database only; the player is the made-up "Mochi".
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { notebookPage, playAt, playUntil } from './quest-api';
import { gameSettled, newPlayer, type ScreenSize } from './screen-session';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT_DIR = path.join(REPO_ROOT, 'docs/store/screenshots');

/** Store slots: CSS viewport × device scale = the store's pixel size. */
const DEVICES: ReadonlyArray<{ dir: string; size: Required<ScreenSize> }> = [
  // App Store iPhone 6.9" (1320 × 2868), the size App Store Connect requires.
  { dir: 'ios-iphone-6.9', size: { width: 440, height: 956, scale: 3 } },
  // App Store iPhone 6.5" (1284 × 2778).
  { dir: 'ios-iphone-6.5', size: { width: 428, height: 926, scale: 3 } },
  // App Store iPad 13" (2064 × 2752): required because the app runs on iPad.
  { dir: 'ios-ipad-13', size: { width: 1032, height: 1376, scale: 2 } },
  // Google Play phone, 9:16 (1080 × 1920).
  { dir: 'play-phone', size: { width: 360, height: 640, scale: 3 } },
];

/** The 3D scenes drawn at the game's best preset (view distance, shadows, far horizon) for the store pictures. */
const QUALITY = 'high';

for (const { dir, size } of DEVICES) {
  test(`store screenshots for ${dir}`, async ({ browser, baseURL }) => {
    // Four game loads at high quality and up to 3x pixels: a few minutes on a dev machine.
    test.setTimeout(10 * 60_000);
    const base = baseURL ?? '';
    const headers = { Origin: new URL(base).origin };
    const out = path.join(OUT_DIR, dir);
    // A screen renamed or dropped must not leave its old picture behind.
    rmSync(out, { recursive: true, force: true });
    mkdirSync(out, { recursive: true });
    const { context, page } = await newPlayer(browser, base, size);
    const shoot = async (screen: Page, file: string): Promise<void> => {
      await screen.screenshot({ path: path.join(out, `${file}.png`), animations: 'disabled' });
    };

    await page.goto('/home');
    await expect(page.locator('[data-id="home-nav-shop"]')).toBeVisible();
    await shoot(page, '01-home');

    await page.goto('/map');
    await expect(page.locator('[data-id="map-books"]')).toBeAttached();
    await shoot(page, '02-world-map');

    await page.goto(`/play?quality=${QUALITY}&spawnAt=spawn`);
    await gameSettled(page);
    await expect(page.locator('[data-id="hud-tracker"]')).toBeVisible();
    await shoot(page, '03-play');

    await playUntil(page, base, 'tree-riddle');
    await page.goto(playAt('ancient-tree', QUALITY));
    await gameSettled(page);
    await page.locator('[data-id="hud-interact"]').click();
    await expect(page.locator('[data-id="challenge"]')).toBeVisible();
    await shoot(page, '04-question');

    await page.goto('/home');
    await playUntil(page, base, 'open-chest');
    await page.goto(playAt('chest', QUALITY));
    await gameSettled(page);
    await page.locator('[data-id="hud-interact"]').click();
    await notebookPage(page, 5);
    await expect(page.getByRole('dialog', { name: 'Hoàn thành nhiệm vụ!' })).toBeVisible();
    // The XP counts up on screen: pictured once it reaches what the server paid.
    const xp = page.locator('[data-id="reward-xp"]');
    await expect(xp.locator('span[aria-hidden="true"]')).toHaveText(`+${(await xp.getAttribute('data-value')) ?? ''} XP`);
    // The card scrolls on short phones and opens scrolled to its buttons: the picture shows its top (stars, XP).
    await page.getByRole('dialog', { name: 'Hoàn thành nhiệm vụ!' }).evaluate((dialog) => {
      for (const el of [dialog, ...dialog.querySelectorAll('*')]) el.scrollTop = 0;
    });
    await shoot(page, '05-reward');

    expect((await page.context().request.put('/api/character', { headers, data: { name: 'Mochi', equipped: [], pet: 'meo-xam' } })).status()).toBe(200);
    await page.goto(`/play?quality=${QUALITY}&region=nha-cua-be&quest=nha-cua-be-ch1&spawnAt=spawn`);
    await gameSettled(page);
    await page.locator('[data-id="hud-pet"]').click();
    await expect(page.locator('[data-id="play-pet-care"]')).toBeVisible();
    await expect(page.locator('[data-id="pet-care-name"]')).toBeVisible();
    await shoot(page, '06-pet-care');

    await context.close();
  });
}
