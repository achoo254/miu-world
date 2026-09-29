import { and, asc, eq, gt, inArray, isNotNull } from 'drizzle-orm';
import { Router } from 'express';
import { ContentId } from '@miu/schema/content';
import { InventoryResponse, StepCompleteResponse } from '@miu/schema/game';
import { completeStep } from '@miu/quest/quest-progress';
import { activeChildId, requireParent } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { inventoryItems, questProgress } from '../db/schema';
import { HttpError } from '../http-error';
import { grantReward, progressSummary, questSource, recordedReward } from '../reward/reward-ledger';

export interface QuestRouteDeps {
  db: Db;
  content: ContentCatalog;
  clock: () => Date;
}

function contentId(raw: unknown, notFound: string): string {
  const parsed = ContentId.safeParse(raw);
  if (!parsed.success) throw new HttpError(404, notFound);
  return parsed.data;
}

const STEP_ERRORS = {
  'unknown-step': [404, 'step-not-found'],
  'out-of-order': [409, 'out-of-order'],
} as const;

/**
 * The server is the source of truth for progress and rewards (Master Plan §8, §9): the client only
 * says which step it believes it finished; the request body is ignored, the reward comes from the
 * quest catalogue, and everything is written in one transaction.
 */
export function questRoutes({ db, content, clock }: QuestRouteDeps): Router {
  const router = Router();

  router.get('/progress', requireParent, async (_req, res) => {
    res.json(await progressSummary(db, await activeChildId(db, res, content.consent.version), content));
  });

  router.get('/inventory', requireParent, async (_req, res) => {
    const childId = await activeChildId(db, res, content.consent.version);
    const rows = await db
      .select({ itemId: inventoryItems.itemId, qty: inventoryItems.qty })
      .from(inventoryItems)
      .where(and(eq(inventoryItems.childId, childId), gt(inventoryItems.qty, 0)))
      .orderBy(asc(inventoryItems.itemId));
    res.json(InventoryResponse.parse({ items: rows }));
  });

  router.post('/quests/:questId/steps/:stepId/complete', requireParent, async (req, res) => {
    const childId = await activeChildId(db, res, content.consent.version);
    const questId = contentId(req.params.questId, 'quest-not-found');
    const stepId = contentId(req.params.stepId, 'step-not-found');
    const quest = content.quests.get(questId);
    if (!quest) throw new HttpError(404, 'quest-not-found');

    const prerequisites = content.unlockedBy.get(questId) ?? [];
    if (prerequisites.length > 0) {
      const done = await db
        .select({ questId: questProgress.questId })
        .from(questProgress)
        .where(and(eq(questProgress.childId, childId), inArray(questProgress.questId, [...prerequisites]), isNotNull(questProgress.completedAt)));
      if (done.length === 0) throw new HttpError(409, 'quest-locked');
    }

    const now = clock();
    const source = questSource(questId);
    const outcome = await db.transaction(async (tx) => {
      // Create-then-lock the progress row so concurrent calls for the same quest run one after another.
      await tx.insert(questProgress).values({ childId, questId }).onConflictDoNothing();
      const [row] = await tx
        .select()
        .from(questProgress)
        .where(and(eq(questProgress.childId, childId), eq(questProgress.questId, questId)))
        .for('update');
      const current = { completedSteps: row?.completedSteps ?? [], completed: row?.completedAt != null };
      // A finished quest stays finished: steps added to its content later never pay a second reward.
      if (current.completed) return { quest: current, reward: await recordedReward(tx, childId, source), repeated: true };
      const result = completeStep(quest, current, stepId);
      if (!result.ok) {
        if (result.error === 'already-completed') {
          return { quest: current, reward: await recordedReward(tx, childId, source), repeated: true };
        }
        const [status, code] = STEP_ERRORS[result.error];
        throw new HttpError(status, code);
      }
      await tx
        .update(questProgress)
        .set({ completedSteps: result.progress.completedSteps, completedAt: result.progress.completed ? now : null })
        .where(and(eq(questProgress.childId, childId), eq(questProgress.questId, questId)));
      const granted = result.reward ? await grantReward(tx, childId, source, result.reward, now) : false;
      return { quest: result.progress, reward: granted ? result.reward : null, repeated: false };
    });

    res.json(
      StepCompleteResponse.parse({
        quest: { questId, ...outcome.quest },
        reward: outcome.reward,
        repeated: outcome.repeated,
        progress: await progressSummary(db, childId, content),
      }),
    );
  });

  return router;
}
