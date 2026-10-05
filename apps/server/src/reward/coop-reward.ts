// Paying a won co-op challenge (Master Plan §8): each player in her own transaction, like the last step of a quest.
// Every run pays the quest's reward from the catalogue (owner, 03/10/2026: replays pay); the run number names it in
// the ledger, so a run is paid once. The quest stands finished with every step done, and the vở gets every question.
import { and, eq } from 'drizzle-orm';
import type { ActiveQuest } from '@miu/schema/content';
import type { CoopResult } from '@miu/schema/coop';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { questProgress } from '../db/schema';
import { finishQuest } from '../quest/quest-completion';
import type { CoopRewards } from '../coop/coop-service';
import { paidRuns } from './reward-ledger';

export function dbCoopRewards(db: Db, content: ContentCatalog, clock: () => Date = () => new Date()): CoopRewards {
  return {
    async pay(childId: string, quest: ActiveQuest): Promise<CoopResult> {
      const now = clock();
      const row = and(eq(questProgress.childId, childId), eq(questProgress.questId, quest.id));
      return db.transaction(async (tx) => {
        // Create-then-lock her progress row: two payments for her run one after the other, each its own run.
        await tx.insert(questProgress).values({ childId, questId: quest.id }).onConflictDoNothing();
        const [current] = await tx.select().from(questProgress).where(row).for('update');
        const run = (await paidRuns(tx, childId, quest.id)) + 1;
        await tx
          .update(questProgress)
          .set({ completedSteps: quest.steps.map((s) => s.id), found: {}, completedAt: current?.completedAt ?? now })
          .where(row);
        const finished = await finishQuest(tx, content, childId, quest, now, run);
        return { reward: finished.reward, completion: finished.completion, unpaid: finished.reward ? null : 'failed' };
      });
    },
  };
}
