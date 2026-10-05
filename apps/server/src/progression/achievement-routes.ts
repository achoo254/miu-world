import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { levelFromXp } from '@miu/quest/level';
import { achievementOfSource, achievementSource, type AchievementClaimResponse, type AchievementDto, type AchievementEntry, type AchievementListResponse } from '@miu/schema/achievement';
import { ContentId } from '@miu/schema/content';
import { activePlayerId, requireParent } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { rewardLedger, shopInventory } from '../db/schema';
import { HttpError } from '../http-error';
import { progressSummary, totalXp, type Tx } from '../reward/reward-ledger';
import { lockChild } from '../shop/shop-routes';
import { loadPlayerRecord, metricValue, playerFacts, type PlayerFacts } from './player-facts';
import { awardItem } from './skill-gifts';

export interface AchievementRouteDeps {
  db: Db;
  content: ContentCatalog;
  clock: () => Date;
}

interface AchievementState {
  facts: PlayerFacts;
  claimed: ReadonlySet<string>;
}

async function achievementState(db: Db | Tx, content: ContentCatalog, childId: string): Promise<AchievementState> {
  const record = await loadPlayerRecord(db, childId);
  return { facts: playerFacts(content, record), claimed: new Set(record.ledger.flatMap((row) => achievementOfSource(row.source) ?? [])) };
}

function achievementDto(content: ContentCatalog, entry: AchievementEntry, state: AchievementState): AchievementDto {
  const value = metricValue(entry.metric, state.facts);
  return {
    id: entry.id,
    category: entry.category,
    name: entry.name,
    description: entry.description,
    icon: entry.icon,
    progress: Math.min(value, entry.goal),
    goal: entry.goal,
    reached: value >= entry.goal,
    claimed: state.claimed.has(entry.id),
    reward: { xp: entry.reward.xp, coin: entry.reward.coin, item: awardItem(content, entry.reward.item) },
  };
}

/**
 * The achievements of the selected player (mock "Thành tích"). `GET /achievements` lists every one with her
 * progress, computed here from what the server already keeps; `POST /achievements/:achievementId/claim` pays a
 * reached one once (the client names it only: its goal and reward are the server's).
 */
export function achievementRoutes({ db, content, clock }: AchievementRouteDeps): Router {
  const router = Router();

  function entryOf(raw: unknown): AchievementEntry {
    const id = ContentId.safeParse(raw);
    const entry = id.success ? content.achievements.get(id.data) : undefined;
    if (!entry) throw new HttpError(404, 'achievement-not-found');
    return entry;
  }

  router.get('/achievements', requireParent, async (_req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const state = await achievementState(db, content, childId);
    const body: AchievementListResponse = { achievements: [...content.achievements.values()].map((entry) => achievementDto(content, entry, state)) };
    res.json(body);
  });

  /**
   * Pays a reached achievement: a ledger row `achievement:<id>` (XP, coins, the item) and, for an item, the
   * wearable into her cupboard, in one transaction under her profile lock. The (child, source) key pays it once:
   * claiming it again answers `granted: false` and pays nothing. Refused: unknown achievement (404), not reached
   * yet (409 `achievement-not-reached`). Anything the client sends besides the id is ignored.
   */
  router.post('/achievements/:achievementId/claim', requireParent, async (req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const entry = entryOf(req.params.achievementId);
    const outcome = await db.transaction(async (tx) => {
      await lockChild(tx, childId);
      const state = achievementDto(content, entry, await achievementState(tx, content, childId));
      const xpBefore = await totalXp(tx, childId);
      if (state.claimed) return { granted: false, xpBefore, xp: 0 };
      if (!state.reached) throw new HttpError(409, 'achievement-not-reached');
      const { item } = entry.reward;
      const inserted = await tx
        .insert(rewardLedger)
        .values({ id: randomUUID(), childId, source: achievementSource(entry.id), xp: entry.reward.xp, coins: entry.reward.coin, items: item ? { [item]: 1 } : {}, createdAt: clock() })
        .onConflictDoNothing()
        .returning({ id: rewardLedger.id });
      if (inserted.length === 0) return { granted: false, xpBefore, xp: 0 };
      if (item) await tx.insert(shopInventory).values({ childId, itemId: item, qty: 1 }).onConflictDoNothing();
      return { granted: true, xpBefore, xp: entry.reward.xp };
    });
    const level = (xp: number): number => levelFromXp(xp, content.levelCurve).level;
    const body: AchievementClaimResponse = {
      achievement: achievementDto(content, entry, await achievementState(db, content, childId)),
      granted: outcome.granted,
      levelBefore: level(outcome.xpBefore),
      levelAfter: level(outcome.xpBefore + outcome.xp),
      progress: await progressSummary(db, childId, content),
    };
    res.json(body);
  });

  return router;
}
