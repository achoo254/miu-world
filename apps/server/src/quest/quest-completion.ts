import { and, eq, inArray } from 'drizzle-orm';
import type { ActiveQuest, RewardSpec } from '@miu/schema/content';
import type { QuestCompletion } from '@miu/schema/game';
import { levelFromXp } from '@miu/quest/level';
import { notebookLines } from '@miu/quest/notebook';
import { questScore } from '@miu/quest/quest-score';
import type { ContentCatalog } from '../content/content-catalog';
import { questProgress, skillProgress } from '../db/schema';
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
 * Scores and pays a quest whose last step was just recorded, in the caller's transaction. Stars and
 * awarded XP are stored with the progress row so later counter changes never rewrite them.
 */
export async function finishQuest(tx: Tx, content: ContentCatalog, childId: string, quest: ActiveQuest, now: Date): Promise<FinishedQuest> {
  const score = questScore(quest.reward.xp, await questEffort(tx, childId, quest.id));
  await clearAttempts(tx, childId, quest.id);
  const reward: RewardSpec = { ...structuredClone(quest.reward), xp: score.xpAwarded };
  const skillIds = Object.keys(reward.skillXp).sort();
  const xpBefore = await totalXp(tx, childId);
  const skillsBefore = await skillXpOf(tx, childId, skillIds);

  const granted = await grantReward(tx, childId, questSource(quest.id), reward, now);
  await tx
    .update(questProgress)
    .set({ stars: score.stars, xpAwarded: score.xpAwarded })
    .where(and(eq(questProgress.childId, childId), eq(questProgress.questId, quest.id)));

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
    },
  };
}
