import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  awardTierFromScore,
  awardTitleFromTier,
  OlympiadCatalog,
  type OlympiadAwardTier,
  type OlympiadExamQuestionPublic,
  type OlympiadTopicId,
  type QuestionReviewItem,
  type TopicBreakdown,
} from '@miu/schema/olympiad';
import { CONTENT_DIR } from '../content/content-dir';

const OLYMPIAD_FILE = 'olympiad/olympic-math.json';

export function loadOlympiadCatalog(dir: string = CONTENT_DIR): OlympiadCatalog {
  const filePath = path.join(dir, OLYMPIAD_FILE);
  const raw = JSON.parse(readFileSync(filePath, 'utf8'));
  const parsed = OlympiadCatalog.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`invalid olympiad content ${filePath}: ${parsed.error.message}`);
  }
  return parsed.data;
}

/**
 * Public exam questions for the web client.
 * Drops correctAnswer and explanation so answers NEVER leak to client bundles!
 */
export function getPublicExamQuestions(catalog: OlympiadCatalog): OlympiadExamQuestionPublic[] {
  return catalog.examQuestions.map((q) => ({
    id: q.id,
    number: q.number,
    topicId: q.topicId,
    prompt: q.prompt,
    visualType: q.visualType,
    visualData: q.visualData,
    choices: q.choices,
  }));
}

export interface ExamGradingResult {
  score: number;
  totalScore: 100;
  correctCount: number;
  totalCount: 25;
  award: OlympiadAwardTier | null;
  awardTitle: string | null;
  breakdown: Record<OlympiadTopicId, TopicBreakdown>;
  rewards: { xp: number; coin: number };
  review: QuestionReviewItem[];
}

export function gradeExam(catalog: OlympiadCatalog, answers: Record<string, string>): ExamGradingResult {
  const topicMap = new Map(catalog.topics.map((t) => [t.id, t.name]));
  const breakdown: Record<OlympiadTopicId, TopicBreakdown> = {
    logic: { topicId: 'logic', topicName: topicMap.get('logic') ?? 'Tư duy logic', correct: 0, total: 0, score: 0 },
    arithmetic: { topicId: 'arithmetic', topicName: topicMap.get('arithmetic') ?? 'Số học', correct: 0, total: 0, score: 0 },
    'number-theory': { topicId: 'number-theory', topicName: topicMap.get('number-theory') ?? 'Lý thuyết số', correct: 0, total: 0, score: 0 },
    geometry: { topicId: 'geometry', topicName: topicMap.get('geometry') ?? 'Hình học', correct: 0, total: 0, score: 0 },
    combinatorics: { topicId: 'combinatorics', topicName: topicMap.get('combinatorics') ?? 'Tổ hợp', correct: 0, total: 0, score: 0 },
  };

  const review: QuestionReviewItem[] = [];
  let correctCount = 0;

  for (const q of catalog.examQuestions) {
    breakdown[q.topicId].total += 1;
    const chosen = answers[q.id] ?? null;
    const isCorrect = chosen !== null && chosen.toUpperCase() === q.correctAnswer.toUpperCase();
    if (isCorrect) {
      correctCount += 1;
      breakdown[q.topicId].correct += 1;
      breakdown[q.topicId].score += 4;
    }
    review.push({
      id: q.id,
      number: q.number,
      topicId: q.topicId,
      prompt: q.prompt,
      choices: q.choices,
      chosenAnswer: chosen,
      correctAnswer: q.correctAnswer,
      isCorrect,
      explanation: q.explanation,
    });
  }

  const score = correctCount * 4;
  const award = awardTierFromScore(score);
  const awardTitle = awardTitleFromTier(award);

  // Rewards based on achievement
  let xp = 100;
  let coin = 20;
  if (award === 'gold') {
    xp = 300;
    coin = 60;
  } else if (award === 'silver') {
    xp = 200;
    coin = 40;
  } else if (award === 'bronze') {
    xp = 150;
    coin = 30;
  } else if (award === 'consolation') {
    xp = 100;
    coin = 20;
  }

  return {
    score,
    totalScore: 100,
    correctCount,
    totalCount: 25,
    award,
    awardTitle,
    breakdown,
    rewards: { xp, coin },
    review,
  };
}
