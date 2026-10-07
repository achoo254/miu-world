// The Olympic Math practice (content/olympiad/olympic-math.json): loading it, the shapes the client may see, and the
// grading of a mock exam. Answers and support layers never leave the server except in a graded result or a support
// layer asked for.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  awardTierFromScore,
  EXAM_POINTS,
  OLYMPIAD_TOPIC_IDS,
  OlympiadCatalog,
  type OlympiadAwardTier,
  type OlympiadQuestion,
  type OlympiadQuestionPublic,
  type OlympiadTopicId,
  type QuestionReviewItem,
  type TopicBreakdown,
} from '@miu/schema/olympiad';
import { CONTENT_DIR } from '../content/content-dir';

const OLYMPIAD_FILE = 'olympiad/olympic-math.json';

export function loadOlympiadCatalog(dir: string = CONTENT_DIR): OlympiadCatalog {
  const filePath = path.join(dir, OLYMPIAD_FILE);
  const raw: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
  const parsed = OlympiadCatalog.safeParse(raw);
  if (!parsed.success) throw new Error(`invalid olympiad content ${filePath}: ${parsed.error.message}`);
  return parsed.data;
}

/** A question as the client may see it before answering: no answer, no guide, hint or explanation. */
export function publicQuestion(q: OlympiadQuestion): OlympiadQuestionPublic {
  return { id: q.id, topicId: q.topicId, title: q.title, prompt: q.prompt, ...(q.visual ? { visual: q.visual } : {}), choices: q.choices };
}

/** XP and coins a mock exam run pays by its award (every run pays: owner, 03/10/2026). */
const EXAM_REWARD: Readonly<Record<OlympiadAwardTier | 'none', { xp: number; coin: number }>> = {
  gold: { xp: 300, coin: 60 },
  silver: { xp: 200, coin: 40 },
  bronze: { xp: 150, coin: 30 },
  consolation: { xp: 100, coin: 20 },
  none: { xp: 100, coin: 20 },
};

export interface ExamGrading {
  score: number;
  correctCount: number;
  award: OlympiadAwardTier | null;
  breakdown: TopicBreakdown[];
  weakest: OlympiadTopicId;
  rewards: { xp: number; coin: number };
  review: QuestionReviewItem[];
}

/** Grades a mock exam: 4 points a right answer, nothing taken off for a wrong or empty one. */
export function gradeExam(catalog: OlympiadCatalog, answers: Readonly<Record<string, string>>): ExamGrading {
  const byTopic = new Map<OlympiadTopicId, { correct: number; total: number }>(OLYMPIAD_TOPIC_IDS.map((t) => [t, { correct: 0, total: 0 }]));
  const review: QuestionReviewItem[] = catalog.examQuestions.map((q) => {
    const tally = byTopic.get(q.topicId);
    const chosen = answers[q.id];
    const pick = q.choices.find((c) => c.id === chosen)?.id ?? null;
    const correct = pick === q.answer;
    if (tally) {
      tally.total += 1;
      if (correct) tally.correct += 1;
    }
    return { ...publicQuestion(q), chosen: pick, answer: q.answer, correct, guide: q.guide, hint: q.hint, explanation: q.explanation };
  });
  const correctCount = review.filter((r) => r.correct).length;
  const score = correctCount * EXAM_POINTS;
  const award = awardTierFromScore(score);
  const breakdown = OLYMPIAD_TOPIC_IDS.map((topicId) => {
    const t = byTopic.get(topicId) ?? { correct: 0, total: 0 };
    return { topicId, correct: t.correct, total: t.total, score: t.correct * EXAM_POINTS };
  });
  // The topic with the fewest right answers, the first in syllabus order on a tie.
  const weakest = breakdown.reduce((low, b) => (b.total - b.correct > low.total - low.correct ? b : low)).topicId;
  return { score, correctCount, award, breakdown, weakest, rewards: EXAM_REWARD[award ?? 'none'], review };
}
