import { and, asc, eq, gt } from 'drizzle-orm';
import { Router, type Request } from 'express';
import { ContentId, type LearningSupport, type QuestStep } from '@miu/schema/content';
import {
  InventoryResponse,
  QuestListResponse,
  QuestSummary,
  QuestView,
  StepCompleteRequest,
  StepCompleteResponse,
  SupportRequest,
  SupportResponse,
  type SupportLayer,
} from '@miu/schema/game';
import { completeStep, isAnswerable, type StepError } from '@miu/quest/quest-progress';
import { activeChildId, optionalAuth, requireParent } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { inventoryItems, questProgress } from '../db/schema';
import { HttpError } from '../http-error';
import { ipKey, limiter } from '../rate-limit';
import { progressSummary, questSource, recordedReward } from '../reward/reward-ledger';
import { completedQuestIds, isUnlocked, playableQuest, progressDto, questState } from './quest-access';
import { finishQuest } from './quest-completion';
import { countAttempt, wrongAnswers } from './step-attempts';

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

const STEP_ERRORS: Record<Exclude<StepError, 'already-completed' | 'wrong-answer'>, readonly [number, string]> = {
  'unknown-step': [404, 'step-not-found'],
  'out-of-order': [409, 'out-of-order'],
  'answer-required': [400, 'answer-required'],
  'target-required': [400, 'target-required'],
  'unknown-target': [400, 'unknown-target'],
};


function supportPayload(support: LearningSupport, layer: SupportLayer): SupportResponse {
  switch (layer) {
    case 'guide':
      return { layer, steps: support.guide };
    case 'hint':
      return { layer, text: support.hint };
    case 'answer':
      return { layer, text: support.answer.text, explanation: support.answer.explanation };
  }
}

/**
 * The step's line for this attempt: the n-th wrong answer hears the n-th wrong line, a right answer after
 * n mistakes hears the n-th right line, cycling, so two tries in a row never get the same line.
 */
function feedbackLine(step: QuestStep | undefined, kind: 'right' | 'wrong', attempt: number): string | null {
  const lines = step && isAnswerable(step) ? step.feedback?.[kind] : undefined;
  return lines?.[attempt % lines.length] ?? null;
}

const MINUTE = 60 * 1000;
/** Anti-spam per child and step (not answer secrecy: answers are not secret and pay once). */
const perStep = (req: Request): string => {
  const session = req.res ? optionalAuth(req.res)?.session : undefined;
  const child = session?.activeChildId || ipKey(req);
  return `${child}|${String(req.params.questId)}|${String(req.params.stepId)}`;
};

/**
 * The server is the source of truth for progress, grading and rewards (Master Plan §8, §9): the
 * client only says which step it did and, for that step, its answer or the target it found. The
 * server grades the answer, keeps per-step counters (never the answer itself), takes the reward from
 * the quest catalogue (reward fields in the body are dropped), and writes everything in one transaction.
 */
export function questRoutes({ db, content, clock }: QuestRouteDeps): Router {
  const router = Router();
  const completeLimit = limiter(MINUTE, 30, perStep);
  const supportLimit = limiter(MINUTE, 20, perStep);

  async function summaries(childId: string): Promise<Map<string, QuestSummary>> {
    const rows = await db.select().from(questProgress).where(eq(questProgress.childId, childId));
    const byQuest = new Map(rows.map((r) => [r.questId, r]));
    const completed = await completedQuestIds(db, childId);
    return new Map(
      [...content.quests.values()].map((quest) => {
        const row = byQuest.get(quest.id);
        const summary = {
          quest: QuestView.parse({ ...quest, textbook: content.textbooks.get(quest.id) }),
          state: questState(isUnlocked(content, quest.id, completed), row),
          progress: progressDto(quest.id, row),
        };
        return [quest.id, summary];
      }),
    );
  }

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

  router.get('/quests', requireParent, async (req, res) => {
    const childId = await activeChildId(db, res, content.consent.version);
    const region = req.query.region === undefined ? undefined : ContentId.safeParse(req.query.region);
    if (region && !region.success) throw new HttpError(400, 'invalid-region');
    const quests = [...(await summaries(childId)).values()].filter((s) => !region || s.quest.region === region.data);
    res.json(QuestListResponse.parse({ quests }));
  });

  router.get('/quests/:questId', requireParent, async (req, res) => {
    const childId = await activeChildId(db, res, content.consent.version);
    const summary = (await summaries(childId)).get(contentId(req.params.questId, 'quest-not-found'));
    if (!summary) throw new HttpError(404, 'quest-not-found');
    res.json(QuestSummary.parse(summary));
  });

  router.post('/quests/:questId/steps/:stepId/complete', requireParent, completeLimit, async (req, res) => {
    const childId = await activeChildId(db, res, content.consent.version);
    const questId = contentId(req.params.questId, 'quest-not-found');
    const stepId = contentId(req.params.stepId, 'step-not-found');
    const input = StepCompleteRequest.safeParse(req.body ?? {});
    if (!input.success) throw new HttpError(400, 'invalid-step-input');
    const quest = await playableQuest(db, content, childId, questId);
    const stepDef = quest.steps.find((s) => s.id === stepId);

    const now = clock();
    const thisProgressRow = and(eq(questProgress.childId, childId), eq(questProgress.questId, questId));
    const outcome = await db.transaction(async (tx) => {
      // Create-then-lock the progress row so concurrent calls for the same quest run one after another.
      await tx.insert(questProgress).values({ childId, questId }).onConflictDoNothing();
      const [row] = await tx.select().from(questProgress).where(thisProgressRow).for('update');
      const current = { completedSteps: row?.completedSteps ?? [], completed: row?.completedAt != null, found: row?.found ?? {} };
      const repeated = async () => ({
        correct: true,
        feedback: null,
        row,
        reward: await recordedReward(tx, childId, questSource(questId)),
        repeated: true,
        completion: null,
      });
      // A finished quest stays finished: steps added to its content later never pay a second reward.
      if (current.completed) return repeated();
      const result = completeStep(quest, current, stepId, input.data);
      if (!result.ok) {
        if (result.error === 'already-completed') return repeated();
        if (result.error === 'wrong-answer') {
          // Try again as often as needed; only the count is kept, never the answer.
          const wrong = await countAttempt(tx, { childId, questId, stepId }, 'wrongCount');
          return { correct: false, feedback: feedbackLine(stepDef, 'wrong', wrong - 1), row, reward: null, repeated: false, completion: null };
        }
        const [status, code] = STEP_ERRORS[result.error];
        throw new HttpError(status, code);
      }
      const [updated] = await tx
        .update(questProgress)
        .set({ completedSteps: result.progress.completedSteps, found: result.progress.found, completedAt: result.progress.completed ? now : null })
        .where(thisProgressRow)
        .returning();
      // Read before finishing: scoring the quest clears its counters.
      const feedback = feedbackLine(stepDef, 'right', await wrongAnswers(tx, { childId, questId, stepId }));
      if (!result.reward) return { correct: true, feedback, row: updated, reward: null, repeated: false, completion: null };
      const finished = await finishQuest(tx, content, childId, quest, now);
      const [scored] = await tx.select().from(questProgress).where(thisProgressRow);
      return { correct: true, feedback, row: scored, reward: finished.reward, repeated: false, completion: finished.completion };
    });

    res.json(
      StepCompleteResponse.parse({
        correct: outcome.correct,
        feedback: outcome.feedback,
        quest: progressDto(questId, outcome.row),
        reward: outcome.reward,
        repeated: outcome.repeated,
        completion: outcome.completion,
        progress: await progressSummary(db, childId, content),
      }),
    );
  });

  router.post('/quests/:questId/steps/:stepId/support', requireParent, supportLimit, async (req, res) => {
    const childId = await activeChildId(db, res, content.consent.version);
    const questId = contentId(req.params.questId, 'quest-not-found');
    const stepId = contentId(req.params.stepId, 'step-not-found');
    const body = SupportRequest.safeParse(req.body ?? {});
    if (!body.success) throw new HttpError(400, 'invalid-support-layer');
    const quest = await playableQuest(db, content, childId, questId);
    const index = quest.steps.findIndex((s) => s.id === stepId);
    const step = quest.steps[index];
    if (!step) throw new HttpError(404, 'step-not-found');
    if (!isAnswerable(step)) throw new HttpError(404, 'support-not-found');
    const { layer } = body.data;
    await db.transaction(async (tx) => {
      // Same row lock as step completion, so a view cannot be counted after the quest was scored.
      await tx.insert(questProgress).values({ childId, questId }).onConflictDoNothing();
      const [row] = await tx
        .select({ completedSteps: questProgress.completedSteps, completedAt: questProgress.completedAt })
        .from(questProgress)
        .where(and(eq(questProgress.childId, childId), eq(questProgress.questId, questId)))
        .for('update');
      const current = row?.completedSteps.length ?? 0;
      // Help is for the step the child is on (or has done), not for steps further ahead.
      if (index > current) throw new HttpError(409, 'out-of-order');
      // Only the answer layer on the unsolved step costs anything; reviewing a solved step is free.
      if (layer === 'answer' && index === current && !row?.completedAt) {
        await countAttempt(tx, { childId, questId, stepId }, 'answerViews');
      }
    });
    res.json(SupportResponse.parse(supportPayload(step.support, layer)));
  });

  return router;
}
