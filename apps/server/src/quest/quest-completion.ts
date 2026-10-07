import { randomUUID } from 'node:crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { ActiveQuest, RewardSpec } from '@miu/schema/content';
import { collectibleDropSource } from '@miu/schema/collectible';
import type { CollectibleDrop, QuestCompletion } from '@miu/schema/game';
import { pickCollectible } from '@miu/quest/collectible-drop';
import { levelFromXp } from '@miu/quest/level';
import { notebookLines } from '@miu/quest/notebook';
import { questScore } from '@miu/quest/quest-score';
import type { ContentCatalog } from '../content/content-catalog';
import { inventoryItems, mail, questProgress, skillProgress } from '../db/schema';
import { grantEventRewards } from '../event/event-rewards';
import { letterTemplateId } from '../npc/npc-catalog';
import { chapterHearts } from '../npc/npc-friendship';
import { grantSkillGifts } from '../progression/skill-gifts';
import { grantReward, questSource, totalXp, type Tx } from '../reward/reward-ledger';
import { clearAttempts, questEffort } from './step-attempts';

export interface FinishedQuest {
  /** Reward actually paid (quest XP reduced if the answer was viewed); null if it had been paid before. */
  reward: RewardSpec | null;
  completion: QuestCompletion;
}

async function skillXpOf(tx: Tx, childId: string, skillIds: string[]): Promise<Map<string, number>> {
  if (skillIds.length === 0) return new Map();
  const rows = await tx
    .select()
    .from(skillProgress)
    .where(and(eq(skillProgress.childId, childId), inArray(skillProgress.skillId, skillIds)));
  return new Map(rows.map((r) => [r.skillId, r.xp]));
}

/**
 * Drops one thing of the region's collectible set for a run just paid (`runSource`), in the same transaction:
 * its own ledger row `drop:<run source>` and the item into her inventory (a double adds to the count). The
 * thing is picked from the child and the run (and what she owned before it), so a run drops once and always
 * the same thing; a new run may drop again. Null for a region without a set.
 */
async function dropCollectible(tx: Tx, content: ContentCatalog, childId: string, region: string, runSource: string, now: Date): Promise<CollectibleDrop | null> {
  const set = content.collectibles.get(region);
  if (!set) return null;
  const ids = set.items.map((e) => e.id);
  const rows = await tx
    .select({ itemId: inventoryItems.itemId, qty: inventoryItems.qty })
    .from(inventoryItems)
    .where(and(eq(inventoryItems.childId, childId), inArray(inventoryItems.itemId, ids)));
  const owned = new Map(rows.map((r) => [r.itemId, r.qty]));
  const itemId = pickCollectible(set.items, owned, `${childId}|${runSource}`);
  if (!itemId) return null;
  const granted = await grantReward(tx, childId, collectibleDropSource(runSource), { xp: 0, coin: 0, skillXp: {}, items: { [itemId]: 1 } }, now);
  return granted ? { itemId, mapId: set.mapId, owned: (owned.get(itemId) ?? 0) + 1 } : null;
}

/**
 * Scores and pays a run of a quest whose last step was just recorded, in the caller's transaction. Every
 * run pays the quest's reward (owner, 03/10/2026); `run` names it in the ledger, so a run pays once. Skill
 * levels it reaches pay their gifts (once per level). The
 * progress row keeps the best stars of all runs and the XP of the latest, so later counter changes never
 * rewrite them.
 */
export async function finishQuest(tx: Tx, content: ContentCatalog, childId: string, quest: ActiveQuest, now: Date, run = 1): Promise<FinishedQuest> {
  const score = questScore(quest.reward.xp, await questEffort(tx, childId, quest.id));
  await clearAttempts(tx, childId, quest.id);
  const reward: RewardSpec = { ...structuredClone(quest.reward), xp: score.xpAwarded };
  const skillIds = Object.keys(reward.skillXp).sort();
  const xpBefore = await totalXp(tx, childId);
  const skillsBefore = await skillXpOf(tx, childId, skillIds);

  const source = questSource(quest.id, run);
  const granted = await grantReward(tx, childId, source, reward, now);
  const collectible = granted ? await dropCollectible(tx, content, childId, quest.region, source, now) : null;
  // A skill level reached pays its gift once, with the skill XP that reached it.
  const skillGifts = granted ? await grantSkillGifts(tx, content, childId, skillIds, now) : [];
  await tx
    .update(questProgress)
    .set({ stars: sql`greatest(coalesce(${questProgress.stars}, 0), ${score.stars})`, xpAwarded: score.xpAwarded })
    .where(and(eq(questProgress.childId, childId), eq(questProgress.questId, quest.id)));

  const story = quest.category === 'story' ? await finishChapter(tx, content, childId, quest.id, run === 1, now) : undefined;
  // A run of an event quest may reach the event's limited rewards (all its quests done in this window).
  const eventRewards = granted && quest.category === 'event' ? await grantEventRewards(tx, content, childId, now) : [];
  const paid = granted ? reward : null;
  const level = (xp: number) => levelFromXp(xp, content.levelCurve).level;
  const skillLevel = (xp: number) => levelFromXp(xp, content.skillCurve).level;
  const skillLevels = skillIds.map((skillId) => {
    const before = skillsBefore.get(skillId) ?? 0;
    const after = before + (paid?.skillXp[skillId] ?? 0);
    return { skillId, levelBefore: skillLevel(before), levelAfter: skillLevel(after) };
  });
  return {
    reward: paid,
    completion: {
      stars: score.stars,
      xpAwarded: score.xpAwarded,
      levelBefore: level(xpBefore),
      levelAfter: level(xpBefore + (paid?.xp ?? 0)),
      skillLevels,
      // Every question with its answer, to copy into the vở before the reward (owner, 03/10/2026).
      notebook: notebookLines(quest.steps),
      collectible,
      skillGifts,
      ...(story ? { story } : {}),
      ...(eventRewards.length > 0 ? { eventRewards } : {}),
    },
  };
}

/**
 * A story chapter finished: its letter comes to the mailbox on the first finish (one per player, the mailbox's
 * unique key keeps it so), and the storyteller's hearts before and after it, for the reward screens.
 */
async function finishChapter(tx: Tx, content: ContentCatalog, childId: string, questId: string, first: boolean, now: Date): Promise<NonNullable<QuestCompletion['story']> | undefined> {
  const entry = content.npcs.chapters.get(questId);
  if (!entry) return undefined;
  const sent = first
    ? await tx
        .insert(mail)
        .values({ id: randomUUID(), childId, templateId: letterTemplateId(questId), category: 'npc', createdAt: now })
        .onConflictDoNothing()
        .returning({ id: mail.id })
    : [];
  const hearts = await chapterHearts(tx, content, childId, entry.npc, first);
  return { npc: entry.npc, npcName: content.npcs.npcs.get(entry.npc)?.profile.name ?? entry.npc, heartsBefore: hearts.before, heartsAfter: hearts.after, letter: sent.length > 0 };
}
