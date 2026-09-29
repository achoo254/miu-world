import { randomUUID } from 'node:crypto';
import { asc, eq, sql } from 'drizzle-orm';
import type { RewardSpec } from '@miu/schema/content';
import { ProgressResponse } from '@miu/schema/game';
import { levelFromXp } from '@miu/quest/level';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { inventoryItems, questProgress, rewardLedger, skillProgress } from '../db/schema';

/** A transaction handle; same query surface as the db. */
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** One reward per quest (paid on its last step), whatever the step list becomes later. */
export const questSource = (questId: string): string => `quest:${questId}`;

/**
 * Appends a reward to the ledger and updates the inventory/skill aggregates in the caller's
 * transaction. The (child, source) unique key makes a second grant for the same source a no-op;
 * returns whether this call granted it.
 */
export async function grantReward(tx: Tx, childId: string, source: string, reward: RewardSpec, now: Date): Promise<boolean> {
  const inserted = await tx
    .insert(rewardLedger)
    .values({
      id: randomUUID(),
      childId,
      source,
      xp: reward.xp,
      coins: reward.coin,
      skillXp: reward.skillXp,
      items: reward.items,
      createdAt: now,
    })
    .onConflictDoNothing()
    .returning({ id: rewardLedger.id });
  if (inserted.length === 0) return false;
  // Sorted keys: concurrent grants for different quests lock aggregate rows in the same order (no deadlock).
  for (const [itemId, qty] of Object.entries(reward.items).sort(([a], [b]) => a.localeCompare(b))) {
    await tx
      .insert(inventoryItems)
      .values({ childId, itemId, qty })
      .onConflictDoUpdate({ target: [inventoryItems.childId, inventoryItems.itemId], set: { qty: sql`${inventoryItems.qty} + ${qty}` } });
  }
  for (const [skillId, xp] of Object.entries(reward.skillXp).sort(([a], [b]) => a.localeCompare(b))) {
    await tx
      .insert(skillProgress)
      .values({ childId, skillId, xp })
      .onConflictDoUpdate({ target: [skillProgress.childId, skillProgress.skillId], set: { xp: sql`${skillProgress.xp} + ${xp}` } });
  }
  return true;
}

/** Reward previously recorded for a source (shown again when a step is repeated). */
export async function recordedReward(db: Db | Tx, childId: string, source: string): Promise<RewardSpec | null> {
  const [row] = await db
    .select()
    .from(rewardLedger)
    .where(sql`${rewardLedger.childId} = ${childId} and ${rewardLedger.source} = ${source}`);
  return row ? { xp: row.xp, coin: row.coins, skillXp: row.skillXp, items: row.items } : null;
}

/** Totals: XP and coins summed from the ledger (source of truth); skills and items from the aggregates. */
export async function progressSummary(db: Db | Tx, childId: string, content: ContentCatalog): Promise<ProgressResponse> {
  const [totals] = await db
    .select({ xp: sql<number>`coalesce(sum(${rewardLedger.xp}), 0)::int`, coins: sql<number>`coalesce(sum(${rewardLedger.coins}), 0)::int` })
    .from(rewardLedger)
    .where(eq(rewardLedger.childId, childId));
  const quests = await db.select().from(questProgress).where(eq(questProgress.childId, childId)).orderBy(asc(questProgress.questId));
  const skills = await db.select().from(skillProgress).where(eq(skillProgress.childId, childId));
  const items = await db.select().from(inventoryItems).where(eq(inventoryItems.childId, childId));
  const xp = totals?.xp ?? 0;
  return ProgressResponse.parse({
    quests: quests.map((q) => ({ questId: q.questId, completedSteps: q.completedSteps, completed: q.completedAt !== null })),
    xp,
    ...levelFromXp(xp, content.levelCurve),
    coins: totals?.coins ?? 0,
    skillXp: Object.fromEntries(skills.map((s) => [s.skillId, s.xp])),
    items: Object.fromEntries(items.map((i) => [i.itemId, i.qty])),
  });
}
