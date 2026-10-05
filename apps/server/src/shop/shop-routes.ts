import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { Router } from 'express';
import { levelFromXp } from '@miu/quest/level';
import { BoosterUseRequest, MAX_BOOSTERS, ShopBuyRequest, keptForever, type ShopBuyResponse, type ShopResponse, type ShopState } from '@miu/schema/shop';
import { activePlayerId, requireParent } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { childProfiles, rewardLedger, shopInventory } from '../db/schema';
import { HttpError, parseInput } from '../http-error';
import type { Tx } from '../reward/reward-ledger';
import type { ShopCatalog } from './shop-catalog';

export interface ShopRouteDeps {
  db: Db;
  content: ContentCatalog;
  clock: () => Date;
  shop: ShopCatalog;
}

/** Ledger source of a purchase and of a booster used up: one row each, so a resend changes nothing. */
const purchaseSource = (purchaseId: string): string => `shop:${purchaseId}`;
const useSource = (useId: string): string => `use:${useId}`;

/** What the child owns from the shop: item id → how many (rows at 0 are boosters all used up). */
export async function ownedItems(db: Db | Tx, childId: string): Promise<Map<string, number>> {
  const rows = await db.select().from(shopInventory).where(eq(shopInventory.childId, childId));
  return new Map(rows.filter((r) => r.qty > 0).map((r) => [r.itemId, r.qty]));
}

/** Coins, level and what she owns, read in the caller's transaction (or straight from the db). */
async function shopState(db: Db | Tx, childId: string, content: ContentCatalog): Promise<ShopState> {
  const [totals] = await db
    .select({ xp: sql<number>`coalesce(sum(${rewardLedger.xp}), 0)::int`, coins: sql<number>`coalesce(sum(${rewardLedger.coins}), 0)::int` })
    .from(rewardLedger)
    .where(eq(rewardLedger.childId, childId));
  return {
    coins: totals?.coins ?? 0,
    level: levelFromXp(totals?.xp ?? 0, content.levelCurve).level,
    owned: Object.fromEntries(await ownedItems(db, childId)),
  };
}

/**
 * Purchases, uses and chest claims of one child run one at a time: her profile row is locked for the
 * transaction, so two taps on two things cannot both spend the same coins.
 */
export async function lockChild(tx: Tx, childId: string): Promise<void> {
  await tx.select({ id: childProfiles.id }).from(childProfiles).where(eq(childProfiles.id, childId)).for('update');
}

async function ledgerRow(tx: Tx, childId: string, source: string): Promise<typeof rewardLedger.$inferSelect | undefined> {
  const [row] = await tx
    .select()
    .from(rewardLedger)
    .where(and(eq(rewardLedger.childId, childId), eq(rewardLedger.source, source)));
  return row;
}

/**
 * The shop of the selected child (mock "Cửa hàng"): `GET /shop` lists what is for sale with her coins, level
 * and what she owns; `POST /shop/buy` buys one thing at the server's price; `POST /shop/use` uses up one
 * booster for a minigame round. Buying is play, done with the signed-in session like the rest of the game.
 */
export function shopRoutes({ db, content, clock, shop }: ShopRouteDeps): Router {
  const router = Router();

  router.get('/shop', requireParent, async (_req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const body: ShopResponse = { ...(await shopState(db, childId, content)), items: [...shop.items] };
    res.json(body);
  });

  /**
   * Spends coins for one listing, in one transaction with its ledger row (negative coins) and what it gives.
   * Refused: unknown item (400), level too low (403), already owned or too many boosters, not enough coins, a
   * purchase id already used for something else (409). The same purchase id again answers as the first time.
   */
  router.post('/shop/buy', requireParent, async (req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const { itemId, purchaseId } = parseInput(ShopBuyRequest, req.body);
    const listing = shop.listings.get(itemId);
    if (!listing) throw new HttpError(400, 'invalid-item');
    const state = await db.transaction(async (tx) => {
      await lockChild(tx, childId);
      const source = purchaseSource(purchaseId);
      const done = await ledgerRow(tx, childId, source);
      if (done) {
        if (!(itemId in done.items)) throw new HttpError(409, 'purchase-id-reused');
        return shopState(tx, childId, content);
      }
      const before = await shopState(tx, childId, content);
      if (listing.level !== undefined && before.level < listing.level) throw new HttpError(403, 'shop-level-locked');
      const parts = listing.kind === 'bundle' ? Object.entries(listing.contains) : [[listing.id, 1] as const];
      for (const [partId, qty] of parts) {
        const part = shop.listings.get(partId);
        const have = before.owned[partId] ?? 0;
        if (part && keptForever(part.kind) && have > 0) throw new HttpError(409, 'already-owned');
        if (have + qty > MAX_BOOSTERS) throw new HttpError(409, 'too-many');
      }
      if (before.coins < listing.price) throw new HttpError(409, 'not-enough-coins');
      await tx.insert(rewardLedger).values({ id: randomUUID(), childId, source, coins: -listing.price, items: { [listing.id]: 1 }, createdAt: clock() });
      // Sorted ids: concurrent changes of the same rows always lock them in the same order.
      for (const [partId, qty] of [...parts].sort(([a], [b]) => a.localeCompare(b))) {
        await tx
          .insert(shopInventory)
          .values({ childId, itemId: partId, qty })
          .onConflictDoUpdate({ target: [shopInventory.childId, shopInventory.itemId], set: { qty: sql`${shopInventory.qty} + ${qty}` } });
      }
      return shopState(tx, childId, content);
    });
    const body: ShopBuyResponse = { ...state, bought: itemId };
    res.json(body);
  });

  /**
   * Uses up one booster the child owns, for the minigame round she is about to play (the game applies it only
   * after this answers). One use id is one booster: sent again it answers as the first time and uses nothing
   * more; a booster she does not have is refused (409 `not-owned`).
   */
  router.post('/shop/use', requireParent, async (req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const { itemId, useId } = parseInput(BoosterUseRequest, req.body);
    if (shop.listings.get(itemId)?.kind !== 'booster') throw new HttpError(400, 'invalid-item');
    const state = await db.transaction(async (tx) => {
      await lockChild(tx, childId);
      const source = useSource(useId);
      const done = await ledgerRow(tx, childId, source);
      if (done) {
        if (!(itemId in done.items)) throw new HttpError(409, 'use-id-reused');
        return shopState(tx, childId, content);
      }
      const [row] = await tx
        .select({ qty: shopInventory.qty })
        .from(shopInventory)
        .where(and(eq(shopInventory.childId, childId), eq(shopInventory.itemId, itemId)));
      if (!row || row.qty < 1) throw new HttpError(409, 'not-owned');
      await tx.insert(rewardLedger).values({ id: randomUUID(), childId, source, items: { [itemId]: -1 }, createdAt: clock() });
      await tx
        .update(shopInventory)
        .set({ qty: sql`${shopInventory.qty} - 1` })
        .where(and(eq(shopInventory.childId, childId), eq(shopInventory.itemId, itemId)));
      return shopState(tx, childId, content);
    });
    res.json(state);
  });

  return router;
}
