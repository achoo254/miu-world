// Olympic Math practice and mock exam for the selected player. The server grades everything: a practice answer is
// checked here (right or not; its explanation once right), a support layer is handed out one at a time on request,
// and a mock exam is graded on submit. Every finished practice run and every mock exam run pays (owner, 03/10/2026:
// every replay pays), and a run pays once: its id (made by the client when the run starts) names it in the ledger,
// so a resent request pays nothing more. A mock exam run while an event with this practice is on may also reach the
// event's limited badges (paid by the event, from the ledger rows of its window).
import { and, eq, like } from 'drizzle-orm';
import { Router, type Request } from 'express';
import { ContentId } from '@miu/schema/content';
import {
  awardTierFromScore,
  EXAM_MINUTES,
  EXAM_POINTS,
  EXAM_QUESTIONS,
  ExamResponse,
  ExamSubmitRequest,
  ExamSubmitResponse,
  OlympiadStatusResponse,
  OlympiadTopicId,
  PracticeCheckRequest,
  PracticeCheckResponse,
  PracticeFinishRequest,
  PracticeFinishResponse,
  PracticeResponse,
  PracticeSupportRequest,
  PracticeSupportResponse,
  starsFor,
  type OlympiadCatalog,
  type OlympiadQuestion,
} from '@miu/schema/olympiad';
import { activePlayerId, optionalAuth, requireParent } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { rewardLedger } from '../db/schema';
import { grantEventRewards, examScoreOfSource } from '../event/event-rewards';
import { HttpError, parseInput } from '../http-error';
import { grantSkillGifts } from '../progression/skill-gifts';
import { ipKey, limiter } from '../rate-limit';
import { grantReward, recordedReward, type Tx } from '../reward/reward-ledger';
import { lockChild } from '../shop/shop-routes';
import { gradeExam, loadOlympiadCatalog, publicQuestion } from './olympiad-catalog';
import { PracticeRuns } from './practice-runs';

export interface OlympiadRouteDeps {
  db: Db;
  content: ContentCatalog;
  catalog?: OlympiadCatalog;
  clock?: () => Date;
}

const MINUTE = 60 * 1000;
/** A practice run pays this much for each question the server graded right in it. */
const PRACTICE_XP_PER_RIGHT = 5;
const PRACTICE_COIN_PER_RIGHT = 1;
const PRACTICE_SKILL_XP_PER_RIGHT = 3;

const perChild = (req: Request): string => {
  const session = req.res ? optionalAuth(req.res)?.session : undefined;
  return session?.activeChildId || ipKey(req);
};

/** Ledger source of a finished practice run: `olympiad:practice:<topic>:<right answers>:<run>`. */
const practiceSource = (topic: string, correct: number, runId: string): string => `olympiad:practice:${topic}:${correct}:${runId}`;
const PRACTICE_SOURCE = /^olympiad:practice:([a-z-]+):(\d+):/;
/** Ledger source of a mock exam run: `olympiad:exam:<score>:<award or none>:<run>` (journey and achievements read it). */
const examSource = (score: number, award: string | null, runId: string): string => `olympiad:exam:${score}:${award ?? 'none'}:${runId}`;

export function olympiadRoutes({ db, content, catalog = loadOlympiadCatalog(), clock = () => new Date() }: OlympiadRouteDeps): Router {
  const router = Router();
  const checkLimit = limiter(MINUTE, 120, perChild);
  const runLimit = limiter(MINUTE, 20, perChild);
  const practice = new Map(catalog.practiceQuestions.map((q) => [q.id, q]));
  const runs = new PracticeRuns(() => clock().getTime());

  function practiceQuestion(raw: unknown): OlympiadQuestion {
    const id = ContentId.safeParse(raw);
    const question = id.success ? practice.get(id.data) : undefined;
    if (!question) throw new HttpError(404, 'question-not-found');
    return question;
  }

  async function sourcesLike(db: Db | Tx, childId: string, pattern: string): Promise<string[]> {
    const rows = await db
      .select({ source: rewardLedger.source })
      .from(rewardLedger)
      .where(and(eq(rewardLedger.childId, childId), like(rewardLedger.source, pattern)));
    return rows.map((r) => r.source);
  }

  router.get('/olympiad/status', requireParent, async (_req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const best = new Map<string, number>();
    for (const source of await sourcesLike(db, childId, 'olympiad:practice:%')) {
      const match = PRACTICE_SOURCE.exec(source);
      if (match?.[1] && match[2]) best.set(match[1], Math.max(best.get(match[1]) ?? 0, Number(match[2])));
    }
    const scores = (await sourcesLike(db, childId, 'olympiad:exam:%')).flatMap((s) => examScoreOfSource(s) ?? []);
    const bestScore = scores.length > 0 ? Math.max(...scores) : null;
    res.json(
      OlympiadStatusResponse.parse({
        id: catalog.id,
        title: catalog.title,
        subtitle: catalog.subtitle,
        topics: catalog.topics.map(({ skill: _skill, ...topic }) => {
          const questions = catalog.practiceQuestions.filter((q) => q.topicId === topic.id).length;
          return { ...topic, questions, stars: starsFor(best.get(topic.id) ?? 0, questions) };
        }),
        exam: { questions: EXAM_QUESTIONS, minutes: EXAM_MINUTES, points: EXAM_POINTS },
        best: { score: bestScore, award: bestScore === null ? null : awardTierFromScore(bestScore), runs: scores.length },
      }),
    );
  });

  router.get('/olympiad/practice/:topicId', requireParent, (req, res) => {
    const topic = OlympiadTopicId.safeParse(req.params.topicId);
    if (!topic.success) throw new HttpError(404, 'topic-not-found');
    const questions = catalog.practiceQuestions.filter((q) => q.topicId === topic.data).map(publicQuestion);
    res.json(PracticeResponse.parse({ topicId: topic.data, questions }));
  });

  /** Grades one practice answer: right or not (wrong tells nothing more); once right, its explanation. */
  router.post('/olympiad/practice/:questionId/check', requireParent, checkLimit, async (req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const question = practiceQuestion(req.params.questionId);
    const { runId, choice } = parseInput(PracticeCheckRequest, req.body);
    const correct = choice === question.answer;
    if (correct) runs.recordRight(childId, runId, question.topicId, question.id);
    res.json(PracticeCheckResponse.parse({ correct, explanation: correct ? question.explanation : null }));
  });

  /** One support layer of a practice question: Hướng dẫn, Gợi ý, or Đáp án with its explanation. */
  router.post('/olympiad/practice/:questionId/support', requireParent, checkLimit, async (req, res) => {
    await activePlayerId(db, res, content.consent.version);
    const question = practiceQuestion(req.params.questionId);
    const { layer } = parseInput(PracticeSupportRequest, req.body);
    const body =
      layer === 'answer' ? { layer, choice: question.answer, explanation: question.explanation } : { layer, text: layer === 'guide' ? question.guide : question.hint };
    res.json(PracticeSupportResponse.parse(body));
  });

  /** A practice run over: pays its right answers (graded here) once; a resent call pays nothing more. */
  router.post('/olympiad/practice/:topicId/finish', requireParent, runLimit, async (req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const topicId = OlympiadTopicId.safeParse(req.params.topicId);
    const topic = topicId.success ? catalog.topics.find((t) => t.id === topicId.data) : undefined;
    if (!topic) throw new HttpError(404, 'topic-not-found');
    const { runId } = parseInput(PracticeFinishRequest, req.body);
    const questions = catalog.practiceQuestions.filter((q) => q.topicId === topic.id).length;
    const outcome = await db.transaction(async (tx) => {
      await lockChild(tx, childId);
      const [before] = await sourcesLike(tx, childId, `olympiad:practice:${topic.id}:%:${runId}`);
      if (before) {
        const correct = Number(PRACTICE_SOURCE.exec(before)?.[2] ?? 0);
        const paid = await recordedReward(tx, childId, before);
        return { correct, rewards: { xp: paid?.xp ?? 0, coin: paid?.coin ?? 0 }, repeated: true };
      }
      const correct = Math.min(runs.finish(childId, runId, topic.id), questions);
      const rewards = { xp: correct * PRACTICE_XP_PER_RIGHT, coin: correct * PRACTICE_COIN_PER_RIGHT };
      if (correct > 0) {
        const skillXp = { [topic.skill]: correct * PRACTICE_SKILL_XP_PER_RIGHT };
        const now = clock();
        await grantReward(tx, childId, practiceSource(topic.id, correct, runId), { ...rewards, skillXp, items: {} }, now);
        await grantSkillGifts(tx, content, childId, [topic.skill], now);
      }
      return { correct, rewards, repeated: false };
    });
    res.json(PracticeFinishResponse.parse({ ...outcome, questions, stars: starsFor(outcome.correct, questions) }));
  });

  /** The mock exam's 25 questions; answers and support layers stay here until it is submitted. */
  router.get('/olympiad/exam', requireParent, (_req, res) => {
    res.json(ExamResponse.parse({ questions: catalog.examQuestions.map(publicQuestion), minutes: EXAM_MINUTES }));
  });

  /** Grades a mock exam run, pays it once, and pays any event badge it reached; a resent run is graded again, paid nothing. */
  router.post('/olympiad/submit', requireParent, runLimit, async (req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const { runId, answers, elapsedSeconds } = parseInput(ExamSubmitRequest, req.body);
    const graded = gradeExam(catalog, answers);
    const now = clock();
    const outcome = await db.transaction(async (tx) => {
      await lockChild(tx, childId);
      const earlier = (await sourcesLike(tx, childId, 'olympiad:exam:%')).flatMap((s) => examScoreOfSource(s) ?? []);
      const previousBest = earlier.length > 0 ? Math.max(...earlier) : null;
      const [before] = await sourcesLike(tx, childId, `olympiad:exam:%:${runId}`);
      if (before) {
        const paid = await recordedReward(tx, childId, before);
        return { repeated: true, previousBest, rewards: { xp: paid?.xp ?? 0, coin: paid?.coin ?? 0 }, eventRewards: [] };
      }
      const quarter = Math.round(graded.rewards.xp * 0.25);
      const skillXp = { 'phep-cong': quarter, 'phep-tru': quarter, logic: quarter, 'hinh-phang': quarter };
      await grantReward(tx, childId, examSource(graded.score, graded.award, runId), { ...graded.rewards, skillXp, items: {} }, now);
      // The skill XP may reach a skill level: its gift is paid with it (shown on the skill tree).
      await grantSkillGifts(tx, content, childId, Object.keys(skillXp), now);
      const eventRewards = await grantEventRewards(tx, content, childId, now);
      return { repeated: false, previousBest, rewards: graded.rewards, eventRewards };
    });
    const bestScore = Math.max(outcome.previousBest ?? 0, graded.score);
    res.json(
      ExamSubmitResponse.parse({
        score: graded.score,
        correctCount: graded.correctCount,
        award: graded.award,
        isNewBest: !outcome.repeated && (outcome.previousBest === null || graded.score > outcome.previousBest),
        bestScore,
        breakdown: graded.breakdown,
        weakest: graded.weakest,
        rewards: outcome.rewards,
        eventRewards: outcome.eventRewards,
        elapsedSeconds,
        repeated: outcome.repeated,
        review: graded.review,
      }),
    );
  });

  return router;
}
