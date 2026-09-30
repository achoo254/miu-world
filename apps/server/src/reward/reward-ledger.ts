import { randomUUID } from 'node:crypto';
import { asc, eq, sql } from 'drizzle-orm';
import type { RewardSpec } from '@miu/schema/content';
import { ProgressResponse, type SubjectProgress } from '@miu/schema/game';
import { levelFromXp } from '@miu/quest/level';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { inventoryItems, questProgress, rewardLedger, skillProgress } from '../db/schema';
import { progressDto } from '../quest/quest-access';

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

/** Total XP earned: the ledger sum (source of truth). */
export async function totalXp(db: Db | Tx, childId: string): Promise<number> {
  const [row] = await db
    .select({ xp: sql<number>`coalesce(sum(${rewardLedger.xp}), 0)::int` })
    .from(rewardLedger)
    .where(eq(rewardLedger.childId, childId));
  return row?.xp ?? 0;
}

function subjectLevels(content: ContentCatalog, skillXp: Readonly<Record<string, number>>): SubjectProgress[] {
  return content.subjects.map((subject) => {
    const skills = subject.skills.map((skill) => {
      const xp = skillXp[skill.id] ?? 0;
      return { skillId: skill.id, name: skill.name, xp, level: levelFromXp(xp, content.skillCurve).level };
    });
    const xp = skills.reduce((sum, k) => sum + k.xp, 0);
    return { subjectId: subject.id, name: subject.name, xp, level: levelFromXp(xp, content.skillCurve).level, skills };
  });
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
  const skillXp = Object.fromEntries(skills.map((s) => [s.skillId, s.xp]));
  return ProgressResponse.parse({
    quests: quests.map((q) => progressDto(q.questId, q)),
    xp,
    ...levelFromXp(xp, content.levelCurve),
    coins: totals?.coins ?? 0,
    skillXp,
    items: Object.fromEntries(items.map((i) => [i.itemId, i.qty])),
    subjects: subjectLevels(content, skillXp),
  });
}
