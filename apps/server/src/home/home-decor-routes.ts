import path from 'node:path';
import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { HomeDecor, HomeDecorCatalog, decorIssues, resolveDecor } from '@miu/schema/home-decor';
import { activeChildId, requireParent } from '../auth/auth-context';
import { CONTENT_DIR } from '../content/content-dir';
import { readContentJson, type ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { homeDecor } from '../db/schema';
import { HttpError, parseInput } from '../http-error';
import type { ShopCatalog } from '../shop/shop-catalog';
import { ownedItems } from '../shop/shop-routes';

export interface HomeDecorRouteDeps {
  db: Db;
  content: ContentCatalog;
  clock: () => Date;
  /** The styles the child may pick (content/home/decor.json); read and checked when the app is built. */
  catalog?: HomeDecorCatalog;
  /** The shop: the styles it sells are picked only once bought. */
  shop: Pick<ShopCatalog, 'paidDecor'>;
}

/** The decor catalogue under `dir` (the repo's content by default); a broken file fails the boot, not a request. */
export function loadDecorCatalog(dir: string = CONTENT_DIR): HomeDecorCatalog {
  return readContentJson(HomeDecorCatalog, path.join(dir, 'home/decor.json'));
}

/**
 * The selected child's home decor (mock panels 11 and 12): which style of each piece she picked. Picking is
 * play, done in the game with the same signed-in session, not behind the parent PIN. Only ids the catalogue
 * lists are kept, and a style sold in the shop only once she owns it (a style already saved stays hers); the
 * answer always names every slot (her pick, or the house's own style).
 */
export function homeDecorRoutes({ db, content, clock, catalog = loadDecorCatalog(), shop }: HomeDecorRouteDeps): Router {
  const router = Router();

  router.get('/home-decor', requireParent, async (_req, res) => {
    const childId = await activeChildId(db, res, content.consent.version);
    const [row] = await db.select().from(homeDecor).where(eq(homeDecor.childId, childId));
    const body: HomeDecor = { choices: resolveDecor(catalog, row?.choices) };
    res.json(body);
  });

  /** Takes the picks for any slots (the others keep what was saved); answers with every slot as stored. */
  router.put('/home-decor', requireParent, async (req, res) => {
    const childId = await activeChildId(db, res, content.consent.version);
    const { choices } = parseInput(HomeDecor, req.body);
    if (decorIssues(catalog, choices).length > 0) throw new HttpError(400, 'invalid-input');
    const [row] = await db.select().from(homeDecor).where(eq(homeDecor.childId, childId));
    const paid = Object.entries(choices).filter(([slot, option]) => shop.paidDecor.has(option) && row?.choices[slot] !== option);
    if (paid.length > 0) {
      const owned = await ownedItems(db, childId);
      if (paid.some(([, option]) => !owned.has(option))) throw new HttpError(403, 'decor-locked');
    }
    const merged = resolveDecor(catalog, { ...row?.choices, ...choices });
    const saved = { choices: merged, updatedAt: clock() };
    await db
      .insert(homeDecor)
      .values({ childId, ...saved })
      .onConflictDoUpdate({ target: homeDecor.childId, set: saved });
    const body: HomeDecor = { choices: merged };
    res.json(body);
  });

  return router;
}
