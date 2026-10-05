import { randomUUID } from 'node:crypto';
import { and, asc, eq, like } from 'drizzle-orm';
import { Router } from 'express';
import { levelFromXp } from '@miu/quest/level';
import { regionTiers, tierReward, type RegionFacts } from '@miu/quest/region-reward';
import { ContentId } from '@miu/schema/content';
import {
  RegionRewardClaimRequest,
  regionRewardOfSource,
  regionRewardSource,
  type RegionRewardClaimResponse,
  type RegionRewardEntry,
  type RegionRewardTier,
  type RegionRewardsDto,
  type RegionRewardsList,
} from '@miu/schema/region-reward';
import { activePlayerId, requireParent } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { questProgress, rewardLedger, shopInventory } from '../db/schema';
import { HttpError, parseInput } from '../http-error';
import { paidRunsByQuest, progressSummary, totalXp, type Tx } from '../reward/reward-ledger';
import { lockChild } from '../shop/shop-routes';
import { questsByRegion, type RegionRewards } from './region-reward-catalog';

export interface RegionRewardRouteDeps {
  db: Db;
  content: ContentCatalog;
  clock: () => Date;
  rewards: RegionRewards;
}

/** What the server knows of one child for every region's chest: her lessons, side-quest runs and claims. */
interface ChildRecord {
  done: ReadonlySet<string>;
  threeStar: ReadonlySet<string>;
  runs: ReadonlyMap<string, number>;
  /** Region → tiers claimed. */
  claimed: ReadonlyMap<string, ReadonlySet<RegionRewardTier>>;
  /** Regions whose full chest she claimed, first claimed first (her titles). */
  chests: readonly string[];
}

async function childRecord(db: Db | Tx, childId: string): Promise<ChildRecord> {
  const rows = await db.select({ questId: questProgress.questId, completedAt: questProgress.completedAt, stars: questProgress.stars }).from(questProgress).where(eq(questProgress.childId, childId));
  const claims = await db
    .select({ source: rewardLedger.source })
    .from(rewardLedger)
    .where(and(eq(rewardLedger.childId, childId), like(rewardLedger.source, 'region:%')))
    .orderBy(asc(rewardLedger.createdAt), asc(rewardLedger.source));
  const claimed = new Map<string, Set<RegionRewardTier>>();
  const chests: string[] = [];
  for (const { source } of claims) {
    const claim = regionRewardOfSource(source);
    if (!claim) continue;
    claimed.set(claim.region, new Set([...(claimed.get(claim.region) ?? []), claim.tier]));
    if (claim.tier === 'full') chests.push(claim.region);
  }
  return {
    done: new Set(rows.filter((r) => r.completedAt !== null).map((r) => r.questId)),
    threeStar: new Set(rows.filter((r) => r.completedAt !== null && (r.stars ?? 0) >= 3).map((r) => r.questId)),
    runs: await paidRunsByQuest(db, childId),
    claimed,
    chests,
  };
}

/**
 * A region's chest of the selected child (owner, 03/10/2026: finishing a region should pay something special).
 * `GET /region-rewards` lists every region (Home and the world map mark the ones to claim) with her titles;
 * `GET /regions/:regionId/rewards` one region; `POST /regions/:regionId/rewards/claim {tier}` pays a reached
 * tier once, computed here from her progress (the client names the tier only).
 */
export function regionRewardRoutes({ db, content, clock, rewards }: RegionRewardRouteDeps): Router {
  const router = Router();
  const lessons = questsByRegion(content.quests.values(), 'main');
  const sideQuests = questsByRegion(content.quests.values(), 'side');

  function facts(region: string, record: ChildRecord): RegionFacts {
    const ids = lessons.get(region) ?? [];
    return {
      lessons: ids.length,
      lessonsDone: ids.filter((id) => record.done.has(id)).length,
      lessonsThreeStar: ids.filter((id) => record.threeStar.has(id)).length,
      sideRuns: (sideQuests.get(region) ?? []).reduce((sum, id) => sum + (record.runs.get(id) ?? 0), 0),
    };
  }

  function regionDto(entry: RegionRewardEntry, record: ChildRecord): RegionRewardsDto {
    const known = facts(entry.region, record);
    const tiers = regionTiers(known, rewards.minigameGoal, record.claimed.get(entry.region) ?? new Set()).map((state) => {
      const reward = tierReward(entry, state.tier);
      const item = reward.item ? content.accessories.get(reward.item) : undefined;
      return { ...state, coin: reward.coin, xp: reward.xp, item: item ? { id: item.id, name: item.name, slot: item.slot } : null, title: reward.title };
    });
    return { region: entry.region, title: entry.title, ...known, tiers };
  }

  function entryOf(raw: unknown): RegionRewardEntry {
    const id = ContentId.safeParse(raw);
    const entry = id.success ? rewards.entries.get(id.data) : undefined;
    if (!entry) throw new HttpError(404, 'region-not-found');
    return entry;
  }

  router.get('/region-rewards', requireParent, async (_req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const record = await childRecord(db, childId);
    const body: RegionRewardsList = {
      regions: [...rewards.entries.values()].map((entry) => regionDto(entry, record)),
      titles: record.chests.flatMap((region) => rewards.entries.get(region)?.title ?? []),
    };
    res.json(body);
  });

  router.get('/regions/:regionId/rewards', requireParent, async (req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const entry = entryOf(req.params.regionId);
    res.json(regionDto(entry, await childRecord(db, childId)));
  });

  /**
   * Pays one reached tier: a ledger row `region:<id>:<tier>` (coins, XP, the item) and, for an item, the
   * wearable into her cupboard, in one transaction under her profile lock. The (child, source) key pays a
   * tier once: claiming it again answers with `granted: false` and pays nothing. Refused: unknown region
   * (404), a tier not reached yet (409 `tier-not-reached`).
   */
  router.post('/regions/:regionId/rewards/claim', requireParent, async (req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const entry = entryOf(req.params.regionId);
    const { tier } = parseInput(RegionRewardClaimRequest, req.body);
    const outcome = await db.transaction(async (tx) => {
      await lockChild(tx, childId);
      const state = regionDto(entry, await childRecord(tx, childId)).tiers.find((t) => t.tier === tier);
      const xpBefore = await totalXp(tx, childId);
      if (state?.claimed) return { granted: false, xpBefore, xp: 0 };
      if (!state?.reached) throw new HttpError(409, 'tier-not-reached');
      const reward = tierReward(entry, tier);
      const inserted = await tx
        .insert(rewardLedger)
        .values({ id: randomUUID(), childId, source: regionRewardSource(entry.region, tier), xp: reward.xp, coins: reward.coin, items: reward.item ? { [reward.item]: 1 } : {}, createdAt: clock() })
        .onConflictDoNothing()
        .returning({ id: rewardLedger.id });
      if (inserted.length === 0) return { granted: false, xpBefore, xp: 0 };
      if (reward.item) await tx.insert(shopInventory).values({ childId, itemId: reward.item, qty: 1 }).onConflictDoNothing();
      return { granted: true, xpBefore, xp: reward.xp };
    });
    const level = (xp: number): number => levelFromXp(xp, content.levelCurve).level;
    const body: RegionRewardClaimResponse = {
      ...regionDto(entry, await childRecord(db, childId)),
      claimed: tier,
      granted: outcome.granted,
      levelBefore: level(outcome.xpBefore),
      levelAfter: level(outcome.xpBefore + outcome.xp),
      progress: await progressSummary(db, childId, content),
    };
    res.json(body);
  });

  return router;
}
