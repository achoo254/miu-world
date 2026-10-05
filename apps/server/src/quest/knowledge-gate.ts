import { and, eq } from 'drizzle-orm';
import { levelFromXp } from '@miu/quest/level';
import type { StepCompleteResponse } from '@miu/schema/game';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { skillProgress } from '../db/schema';
import { grantReward, type Tx } from '../reward/reward-ledger';

export type OpenedGate = NonNullable<StepCompleteResponse['gates']>[number];

/** Ledger source of a knowledge gate's treasure for one run of a quest (`runSource`: `quest:<id>[#<run>]`). */
export const gateSource = (targetId: string, runSource: string): string => `gate:${targetId}@${runSource}`;

/** The gate a ledger source paid; null for any other source. */
export function gateOfSource(source: string): string | null {
  return /^gate:([a-z0-9]+(?:-[a-z0-9]+)*)@quest:/.exec(source)?.[1] ?? null;
}

/** The player's level in one skill. */
export async function skillLevel(db: Db | Tx, content: ContentCatalog, childId: string, skill: string): Promise<number> {
  const [row] = await db
    .select({ xp: skillProgress.xp })
    .from(skillProgress)
    .where(and(eq(skillProgress.childId, childId), eq(skillProgress.skillId, skill)));
  return levelFromXp(row?.xp ?? 0, content.skillCurve).level;
}

/**
 * Opens the knowledge gates among `targets` (the targets of a step just completed) that the player has the level
 * for, in the step's transaction: each pays its treasure once per run (`runSource`), so a resent step or the same
 * gate reached by two steps of a run pays nothing more, while the next run pays again. A gate she is short of
 * stays shut and the step goes on (a lesson never waits for a skill). Returns the gates this call paid.
 */
export async function openGates(tx: Tx, content: ContentCatalog, childId: string, targets: readonly string[], runSource: string, now: Date): Promise<OpenedGate[]> {
  const opened: OpenedGate[] = [];
  for (const targetId of new Set(targets)) {
    const check = content.targets.get(targetId)?.skillCheck;
    if (!check) continue;
    if ((await skillLevel(tx, content, childId, check.skill)) < check.level) continue;
    const reward = { xp: check.reward.xp, coin: check.reward.coin, skillXp: {}, items: {} };
    if (await grantReward(tx, childId, gateSource(targetId, runSource), reward, now)) {
      opened.push({ targetId, skill: check.skill, level: check.level, coin: check.reward.coin, xp: check.reward.xp });
    }
  }
  return opened;
}
