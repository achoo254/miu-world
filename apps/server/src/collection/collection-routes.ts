import { randomUUID } from 'node:crypto';
import { and, asc, eq, like } from 'drizzle-orm';
import { Router } from 'express';
import {
  CollectionClaimRequest,
  collectionOfSource,
  collectionSource,
  type CollectibleSet,
  type CollectionClaimResponse,
  type CollectionResponse,
  type CollectionSetDto,
} from '@miu/schema/collectible';
import { activeChildId, requireParent } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { inventoryItems, rewardLedger } from '../db/schema';
import { HttpError, parseInput } from '../http-error';
import { progressSummary, type Tx } from '../reward/reward-ledger';
import { lockChild } from '../shop/shop-routes';

export interface CollectionRouteDeps {
  db: Db;
  content: ContentCatalog;
  clock: () => Date;
}

/** What the server knows of one child's collection: her things, and the sets she claimed (first first). */
interface ChildCollection {
  owned: ReadonlyMap<string, number>;
  claimed: readonly string[];
}

async function childCollection(db: Db | Tx, childId: string): Promise<ChildCollection> {
  const items = await db.select({ itemId: inventoryItems.itemId, qty: inventoryItems.qty }).from(inventoryItems).where(eq(inventoryItems.childId, childId));
  const claims = await db
    .select({ source: rewardLedger.source })
    .from(rewardLedger)
    .where(and(eq(rewardLedger.childId, childId), like(rewardLedger.source, 'collection:%')))
    .orderBy(asc(rewardLedger.createdAt), asc(rewardLedger.source));
  return {
    owned: new Map(items.filter((i) => i.qty > 0).map((i) => [i.itemId, i.qty])),
    claimed: claims.flatMap(({ source }) => collectionOfSource(source) ?? []),
  };
}

function setDto(set: CollectibleSet, record: ChildCollection): CollectionSetDto {
  const owned = Object.fromEntries(set.items.flatMap(({ id }) => (record.owned.has(id) ? [[id, record.owned.get(id) ?? 0] as const] : [])));
  const found = Object.keys(owned).length;
  return {
    mapId: set.mapId,
    owned,
    found,
    total: set.items.length,
    complete: found === set.items.length,
    claimed: record.claimed.includes(set.mapId),
    reward: set.reward,
  };
}

/**
 * The Sổ sưu tập of the selected child. `GET /collection` lists every region's set with what she owns of it and
 * the titles of the sets she completed; `POST /collection/claim {mapId}` pays a full set's reward (coins and
 * title) once, computed here from what she owns (the client names the set only).
 */
export function collectionRoutes({ db, content, clock }: CollectionRouteDeps): Router {
  const router = Router();

  function titles(record: ChildCollection): string[] {
    return record.claimed.flatMap((mapId) => content.collectibles.get(mapId)?.reward.title ?? []);
  }

  router.get('/collection', requireParent, async (_req, res) => {
    const childId = await activeChildId(db, res, content.consent.version);
    const record = await childCollection(db, childId);
    const body: CollectionResponse = { sets: [...content.collectibles.values()].map((set) => setDto(set, record)), titles: titles(record) };
    res.json(body);
  });

  /**
   * A ledger row `collection:<mapId>` with the set's coins, under her profile lock; the (child, source) key pays a
   * set once, so a second claim answers `granted: false` and pays nothing. Refused: an unknown set (404), a set not
   * complete yet (409 `set-not-complete`).
   */
  router.post('/collection/claim', requireParent, async (req, res) => {
    const childId = await activeChildId(db, res, content.consent.version);
    const { mapId } = parseInput(CollectionClaimRequest, req.body);
    const set = content.collectibles.get(mapId);
    if (!set) throw new HttpError(404, 'collection-not-found');
    const granted = await db.transaction(async (tx) => {
      await lockChild(tx, childId);
      const state = setDto(set, await childCollection(tx, childId));
      if (state.claimed) return false;
      if (!state.complete) throw new HttpError(409, 'set-not-complete');
      const inserted = await tx
        .insert(rewardLedger)
        .values({ id: randomUUID(), childId, source: collectionSource(set.mapId), coins: set.reward.coins, createdAt: clock() })
        .onConflictDoNothing()
        .returning({ id: rewardLedger.id });
      return inserted.length > 0;
    });
    const body: CollectionClaimResponse = {
      set: setDto(set, await childCollection(db, childId)),
      granted,
      coins: granted ? set.reward.coins : 0,
      title: set.reward.title,
      progress: await progressSummary(db, childId, content),
    };
    res.json(body);
  });

  return router;
}
