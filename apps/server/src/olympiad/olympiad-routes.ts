import { randomUUID } from 'node:crypto';
import { and, desc, eq, like } from 'drizzle-orm';
import { Router } from 'express';
import {
  awardTierFromScore,
  awardTitleFromTier,
  ExamSubmitRequest,
  ExamSubmitResponse,
  OlympiadCatalog,
  OlympiadStatusResponse,
  type OlympiadAwardTier,
  type OlympiadTopicId,
} from '@miu/schema/olympiad';
import { activePlayerId, optionalAuth, requireParent } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { rewardLedger } from '../db/schema';
import { HttpError, parseInput } from '../http-error';
import { ipKey, limiter } from '../rate-limit';
import { grantReward } from '../reward/reward-ledger';
import { getPublicExamQuestions, gradeExam, loadOlympiadCatalog } from './olympiad-catalog';

export interface OlympiadRouteDeps {
  db: Db;
  content: ContentCatalog;
  catalog?: OlympiadCatalog;
  clock?: () => Date;
}

const MINUTE = 60 * 1000;
const perChild = (req: import('express').Request): string => {
  const session = req.res ? optionalAuth(req.res)?.session : undefined;
  return session?.activeChildId || ipKey(req);
};

export function olympiadRoutes({ db, content, catalog = loadOlympiadCatalog(), clock = () => new Date() }: OlympiadRouteDeps): Router {
  const router = Router();
  const submitLimit = limiter(MINUTE, 10, perChild);

  /** Helper to get best score and award from ledger */
  async function getUserBest(childId: string): Promise<{
    score: number | null;
    award: OlympiadAwardTier | null;
    awardTitle: string | null;
    attemptsCount: number;
  }> {
    const rows = await db
      .select({ source: rewardLedger.source, createdAt: rewardLedger.createdAt })
      .from(rewardLedger)
      .where(and(eq(rewardLedger.childId, childId), like(rewardLedger.source, 'olympiad:exam:%')))
      .orderBy(desc(rewardLedger.createdAt));

    if (rows.length === 0) {
      return { score: null, award: null, awardTitle: null, attemptsCount: 0 };
    }

    let bestScore = 0;
    for (const row of rows) {
      // source format: olympiad:exam:<score>:<award>:<uuid>
      const match = /^olympiad:exam:(\d+):([a-z-]+):/.exec(row.source);
      if (match && match[1]) {
        const sc = parseInt(match[1], 10);
        if (!isNaN(sc) && sc > bestScore) {
          bestScore = sc;
        }
      }
    }

    const award = awardTierFromScore(bestScore);
    return {
      score: bestScore,
      award,
      awardTitle: awardTitleFromTier(award),
      attemptsCount: rows.length,
    };
  }

  /** Overview status of Olympic Math Challenge */
  router.get('/olympiad/status', requireParent, async (_req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const userBest = await getUserBest(childId);

    const practiceCountByTopic: Record<OlympiadTopicId, number> = {
      logic: 0,
      arithmetic: 0,
      'number-theory': 0,
      geometry: 0,
      combinatorics: 0,
    };
    for (const q of catalog.practiceQuestions) {
      practiceCountByTopic[q.topicId] = (practiceCountByTopic[q.topicId] ?? 0) + 1;
    }

    const response = OlympiadStatusResponse.parse({
      id: catalog.id,
      title: catalog.title,
      subtitle: catalog.subtitle,
      examDate: catalog.examDate,
      topics: catalog.topics,
      practiceCountByTopic,
      examQuestionsCount: 25,
      userBest,
    });
    res.json(response);
  });

  /** Get practice questions for a specific topic */
  router.get('/olympiad/practice/:topicId', requireParent, async (req, res) => {
    const { topicId } = req.params;
    const questions = catalog.practiceQuestions.filter((q) => q.topicId === topicId);
    if (questions.length === 0) {
      throw new HttpError(404, 'topic-not-found');
    }
    res.json({ topicId, questions });
  });

  /**
   * Get 25 questions for the mock exam.
   * Answers are intentionally omitted so they are never leaked!
   */
  router.get('/olympiad/exam', requireParent, async (_req, res) => {
    const publicQuestions = getPublicExamQuestions(catalog);
    res.json({
      title: catalog.title,
      examDate: catalog.examDate,
      totalQuestions: 25,
      timeLimitMinutes: 60,
      questions: publicQuestions,
    });
  });

  /** Submit answers for mock exam, grade on server, award XP and coins */
  router.post('/olympiad/submit', requireParent, submitLimit, async (req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const { answers, elapsedSeconds } = parseInput(ExamSubmitRequest, req.body);

    const graded = gradeExam(catalog, answers);
    const previousBest = await getUserBest(childId);
    const isNewBest = previousBest.score === null || graded.score > previousBest.score;
    const bestScore = isNewBest ? graded.score : (previousBest.score ?? graded.score);
    const bestAward = awardTierFromScore(bestScore);

    // Save attempt and grant reward in a transaction
    const attemptId = randomUUID();
    const source = `olympiad:exam:${graded.score}:${graded.award ?? 'none'}:${attemptId}`;
    const now = clock();

    await db.transaction(async (tx) => {
      await grantReward(
        tx,
        childId,
        source,
        {
          xp: graded.rewards.xp,
          coin: graded.rewards.coin,
          skillXp: {
            'phep-cong': Math.round(graded.rewards.xp * 0.25),
            'phep-tru': Math.round(graded.rewards.xp * 0.25),
            logic: Math.round(graded.rewards.xp * 0.25),
            'hinh-phang': Math.round(graded.rewards.xp * 0.25),
          },
          items: {},
        },
        now,
      );
    });

    const response = ExamSubmitResponse.parse({
      score: graded.score,
      totalScore: 100,
      correctCount: graded.correctCount,
      totalCount: 25,
      award: graded.award,
      awardTitle: graded.awardTitle,
      isNewBest,
      bestScore,
      bestAward,
      breakdown: graded.breakdown,
      rewards: graded.rewards,
      elapsedSeconds,
      review: graded.review,
    });

    res.json(response);
  });

  return router;
}
