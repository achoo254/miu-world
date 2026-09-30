import { and, eq, sql } from 'drizzle-orm';
import type { QuestEffort } from '@miu/quest/quest-score';
import type { Db } from '../db/client';
import { stepAttempts } from '../db/schema';
import type { Tx } from '../reward/reward-ledger';

export type AttemptCounter = 'wrongCount' | 'answerViews';

export interface StepKey {
  childId: string;
  questId: string;
  stepId: string;
}

/** Adds one to a per-step counter (an atomic upsert, safe under concurrent calls); returns the new value. */
export async function countAttempt(db: Db | Tx, key: StepKey, counter: AttemptCounter): Promise<number> {
  const [row] = await db
    .insert(stepAttempts)
    .values({ ...key, [counter]: 1 })
    .onConflictDoUpdate({
      target: [stepAttempts.childId, stepAttempts.questId, stepAttempts.stepId],
      set: { [counter]: sql`${stepAttempts[counter]} + 1` },
    })
    .returning({ value: stepAttempts[counter] });
  return row?.value ?? 1;
}

/** Wrong answers given so far on one step. */
export async function wrongAnswers(db: Db | Tx, key: StepKey): Promise<number> {
  const [row] = await db
    .select({ wrongCount: stepAttempts.wrongCount })
    .from(stepAttempts)
    .where(and(eq(stepAttempts.childId, key.childId), eq(stepAttempts.questId, key.questId), eq(stepAttempts.stepId, key.stepId)));
  return row?.wrongCount ?? 0;
}

/** Drops a quest's counters once its score is stored: they have no use after that. */
export async function clearAttempts(db: Db | Tx, childId: string, questId: string): Promise<void> {
  await db.delete(stepAttempts).where(and(eq(stepAttempts.childId, childId), eq(stepAttempts.questId, questId)));
}

/** Totals over every step of a quest, used to score it when it finishes. */
export async function questEffort(db: Db | Tx, childId: string, questId: string): Promise<QuestEffort> {
  const [row] = await db
    .select({
      wrongCount: sql<number>`coalesce(sum(${stepAttempts.wrongCount}), 0)::int`,
      answerViews: sql<number>`coalesce(sum(${stepAttempts.answerViews}), 0)::int`,
    })
    .from(stepAttempts)
    .where(and(eq(stepAttempts.childId, childId), eq(stepAttempts.questId, questId)));
  return { wrongCount: row?.wrongCount ?? 0, answerViewed: (row?.answerViews ?? 0) > 0 };
}
