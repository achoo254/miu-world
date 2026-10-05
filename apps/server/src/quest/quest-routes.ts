import { and, asc, eq, gt } from 'drizzle-orm';
import { Router, type Request } from 'express';
import { ContentId, type LearningSupport } from '@miu/schema/content';
import {
  InventoryResponse,
  QuestCategory,
  QuestListResponse,
  QuestSummary,
  type QuestStory,
  QuestView,
  SkillCheckResult,
  StepCompleteRequest,
  StepCompleteResponse,
  SupportRequest,
  SupportResponse,
  type SupportLayer,
} from '@miu/schema/game';
import { notebookLine } from '@miu/quest/notebook';
import { isAnswerable } from '@miu/quest/quest-progress';
import { activePlayerId, optionalAuth, requireParent } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { inventoryItems, questProgress } from '../db/schema';
import { HttpError } from '../http-error';
import { ipKey, limiter } from '../rate-limit';
import { paidRunsByQuest, progressSummary } from '../reward/reward-ledger';
import { playableQuest, progressDto, questState, runFinished } from './quest-access';
import { skillLevel } from './knowledge-gate';
import { countAttempt } from './step-attempts';
import { recordStep } from './step-record';
import type { PartyQuestHooks } from '../coop/party-quest';

export interface QuestRouteDeps {
  db: Db;
  content: ContentCatalog;
  clock: () => Date;
  /** Quests played as a party (over the multiplayer hub): when a member may go on, and what her steps move for the others. */
  partyQuests?: PartyQuestHooks;
}

function contentId(raw: unknown, notFound: string): string {
  const parsed = ContentId.safeParse(raw);
  if (!parsed.success) throw new HttpError(404, notFound);
  return parsed.data;
}


function supportPayload(support: LearningSupport, layer: SupportLayer): SupportResponse {
  const en = support.en;
  switch (layer) {
    case 'guide':
      return { layer, steps: support.guide, ...(en ? { stepsEn: en.guide } : {}) };
    case 'hint':
      return { layer, text: support.hint, ...(en ? { textEn: en.hint } : {}) };
    case 'answer':
      return { layer, text: support.answer.text, explanation: support.answer.explanation, ...(en ? { textEn: en.answer.text, explanationEn: en.answer.explanation } : {}) };
  }
}

/** The story a chapter belongs to, for the quest list (content/npcs); none for any other quest. */
function storyOf(content: ContentCatalog, questId: string): QuestStory | undefined {
  const entry = content.npcs.chapters.get(questId);
  if (!entry) return undefined;
  return {
    npc: entry.npc,
    npcName: content.npcs.npcs.get(entry.npc)?.profile.name ?? entry.npc,
    arc: entry.arc.id,
    arcTitle: entry.arc.title,
    part: entry.part,
    parts: entry.arc.chapters.length,
    hearts: entry.chapter.hearts,
  };
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
export function questRoutes(deps: QuestRouteDeps): Router {
  const { db, content, clock } = deps;
  const router = Router();
  const completeLimit = limiter(MINUTE, 30, perStep);
  const supportLimit = limiter(MINUTE, 20, perStep);

  async function summaries(childId: string): Promise<Map<string, QuestSummary>> {
    const rows = await db.select().from(questProgress).where(eq(questProgress.childId, childId));
    const byQuest = new Map(rows.map((r) => [r.questId, r]));
    const runs = await paidRunsByQuest(db, childId);
    return new Map(
      [...content.quests.values()].map((quest) => {
        const row = byQuest.get(quest.id);
        const summary = {
          quest: QuestView.parse({ ...quest, textbook: content.textbooks.get(quest.id), story: storyOf(content, quest.id) }),
          state: questState(row),
          progress: progressDto(quest.id, row, runs.get(quest.id) ?? 0, quest),
        };
        return [quest.id, summary];
      }),
    );
  }

  router.get('/progress', requireParent, async (_req, res) => {
    res.json(await progressSummary(db, await activePlayerId(db, res, content.consent.version), content));
  });

  router.get('/inventory', requireParent, async (_req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const rows = await db
      .select({ itemId: inventoryItems.itemId, qty: inventoryItems.qty })
      .from(inventoryItems)
      .where(and(eq(inventoryItems.childId, childId), gt(inventoryItems.qty, 0)))
      .orderBy(asc(inventoryItems.itemId));
    res.json(InventoryResponse.parse({ items: rows }));
  });

  // The quest list by default: the lessons, then the story chapters (their ids sort after every lesson, so the first
  // lesson stays the one to play next). `?category=side` lists the minigame side quests instead, so a side quest never
  // shows up where the lessons are counted, listed or picked; `?category=main` or `story` one kind only.
  router.get('/quests', requireParent, async (req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const region = req.query.region === undefined ? undefined : ContentId.safeParse(req.query.region);
    if (region && !region.success) throw new HttpError(400, 'invalid-region');
    const category = req.query.category === undefined ? undefined : QuestCategory.safeParse(req.query.category);
    if (category && !category.success) throw new HttpError(400, 'invalid-category');
    const listed = new Set<string>(category ? [category.data] : ['main', 'story']);
    const quests = [...(await summaries(childId)).values()].filter(
      (s) => (!region || s.quest.region === region.data) && listed.has(s.quest.status === 'active' ? (s.quest.category ?? 'main') : 'main'),
    );
    res.json(QuestListResponse.parse({ quests }));
  });

  router.get('/quests/:questId', requireParent, async (req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const summary = (await summaries(childId)).get(contentId(req.params.questId, 'quest-not-found'));
    if (!summary) throw new HttpError(404, 'quest-not-found');
    res.json(QuestSummary.parse(summary));
  });

  router.get('/skill-check/:targetId', requireParent, async (req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const targetId = contentId(req.params.targetId, 'target-not-found');
    const target = content.targets?.get(targetId);
    if (!target) throw new HttpError(404, 'target-not-found');

    if (!target.skillCheck) {
      res.json(
        SkillCheckResult.parse({
          targetId,
          targetName: target.name,
          hasSkillCheck: false,
          passed: true,
        }),
      );
      return;
    }

    const check = target.skillCheck;
    const currentLevel = await skillLevel(db, content, childId, check.skill);
    const skillName = content.subjects.flatMap((s) => s.skills).find((k) => k.id === check.skill)?.name ?? check.skill;
    res.json(
      SkillCheckResult.parse({
        targetId,
        targetName: target.name,
        hasSkillCheck: true,
        passed: currentLevel >= check.level,
        skill: check.skill,
        skillName,
        currentLevel,
        requiredLevel: check.level,
        hintQuestId: check.hintQuest,
        reward: check.reward,
      }),
    );
  });

  router.post('/quests/:questId/steps/:stepId/complete', requireParent, completeLimit, async (req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const questId = contentId(req.params.questId, 'quest-not-found');
    const stepId = contentId(req.params.stepId, 'step-not-found');
    const input = StepCompleteRequest.safeParse(req.body ?? {});
    if (!input.success) throw new HttpError(400, 'invalid-step-input');
    const quest = playableQuest(content, questId);
    const stepDef = quest.steps.find((s) => s.id === stepId);

    // In a party's run of this quest, the party decides when she may go on (everyone answers each question).
    const party = deps.partyQuests ? await deps.partyQuests.gate(childId, quest, stepId, input.data) : 'ok';
    if (party !== 'ok') throw new HttpError(409, party);
    const outcome = await recordStep({ db, content, clock }, childId, quest, stepId, input.data);
    if (deps.partyQuests && outcome.correct && !outcome.repeated) void deps.partyQuests.recorded(childId, quest, stepId, input.data);
    res.json(
      StepCompleteResponse.parse({
        correct: outcome.correct,
        feedback: outcome.feedback?.vi ?? null,
        feedbackEn: outcome.feedback?.en ?? null,
        quest: progressDto(questId, outcome.row, outcome.paid, quest),
        reward: outcome.reward,
        repeated: outcome.repeated,
        completion: outcome.completion,
        // A right answer: its question and answer to copy into the vở now.
        copy: outcome.correct && !outcome.repeated && stepDef ? notebookLine(stepDef) : null,
        gates: outcome.gates,
        progress: await progressSummary(db, childId, content),
      }),
    );
  });

  router.post('/quests/:questId/steps/:stepId/support', requireParent, supportLimit, async (req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const questId = contentId(req.params.questId, 'quest-not-found');
    const stepId = contentId(req.params.stepId, 'step-not-found');
    const body = SupportRequest.safeParse(req.body ?? {});
    if (!body.success) throw new HttpError(400, 'invalid-support-layer');
    const quest = playableQuest(content, questId);
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
      const between = runFinished(row, quest);
      const current = row?.completedSteps.length ?? 0;
      // Help is for the step the child is on (or has done), not for steps further ahead.
      if (index > current) throw new HttpError(409, 'out-of-order');
      // Only the answer layer on the unsolved step costs anything; reviewing a solved step is free. Between two
      // runs of a finished quest, the unsolved step is the first one of the next run.
      if (layer === 'answer' && index === (between ? 0 : current)) {
        await countAttempt(tx, { childId, questId, stepId }, 'answerViews');
      }
    });
    res.json(SupportResponse.parse(supportPayload(step.support, layer)));
  });

  return router;
}
