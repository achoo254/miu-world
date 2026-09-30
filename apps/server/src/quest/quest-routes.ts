import { and, asc, eq, gt, inArray, isNotNull } from 'drizzle-orm';
import { Router } from 'express';
import { ContentId } from '@miu/schema/content';
import { InventoryResponse, StepCompleteRequest, StepCompleteResponse } from '@miu/schema/game';
import { completeStep, type StepError } from '@miu/quest/quest-progress';
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

const STEP_ERRORS: Record<Exclude<StepError, 'already-completed'>, readonly [number, string]> = {
  'unknown-step': [404, 'step-not-found'],
  'out-of-order': [409, 'out-of-order'],
  'answer-required': [400, 'answer-required'],
  'target-required': [400, 'target-required'],
  'unknown-target': [400, 'unknown-target'],
  'wrong-answer': [422, 'wrong-answer'],
};

/**
 * The server is the source of truth for progress and rewards (Master Plan §8, §9): the client only
 * says which step it did and, for that step, its answer or the target it found. The server grades the
 * answer, takes the reward from the quest catalogue (reward fields in the body are dropped), and
 * writes everything in one transaction.
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
    const input = StepCompleteRequest.safeParse(req.body ?? {});
    if (!input.success) throw new HttpError(400, 'invalid-step-input');

    const prerequisites = content.unlockedBy.get(questId) ?? [];
    if (prerequisites.length > 0) {
      const done = await db
        .select({ questId: questProgress.questId })
        .from(questProgress)
        .where(and(eq(questProgress.childId, childId), inArray(questProgress.questId, [...prerequisites]), isNotNull(questProgress.completedAt)));
      if (done.length === 0) throw new HttpError(409, 'quest-locked');
    }
    if (quest.status !== 'active') throw new HttpError(409, 'quest-coming-soon');

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
      // Found search targets are not stored yet: each call sees only the target it sends.
      const current = { completedSteps: row?.completedSteps ?? [], completed: row?.completedAt != null, found: {} };
      // A finished quest stays finished: steps added to its content later never pay a second reward.
      if (current.completed) return { quest: current, reward: await recordedReward(tx, childId, source), repeated: true };
      const result = completeStep(quest, current, stepId, input.data);
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
      const { completedSteps, completed } = result.progress;
      return { quest: { completedSteps, completed }, reward: granted ? result.reward : null, repeated: false };
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
