import { z } from 'zod';
import { ContentId } from './content';

export const OLYMPIAD_TOPIC_IDS = ['logic', 'arithmetic', 'number-theory', 'geometry', 'combinatorics'] as const;
export type OlympiadTopicId = (typeof OLYMPIAD_TOPIC_IDS)[number];

export const OLYMPIAD_AWARD_TIERS = ['gold', 'silver', 'bronze', 'consolation'] as const;
export type OlympiadAwardTier = (typeof OLYMPIAD_AWARD_TIERS)[number];

export const OlympiadTopic = z.strictObject({
  id: z.enum(OLYMPIAD_TOPIC_IDS),
  name: z.string().min(1),
  nameEn: z.string().min(1),
  icon: z.string().min(1),
  subtopics: z.string().min(1),
  description: z.string().min(1),
});
export type OlympiadTopic = z.infer<typeof OlympiadTopic>;

export const OlympiadChoice = z.strictObject({
  id: z.string().min(1),
  text: z.string().min(1),
});
export type OlympiadChoice = z.infer<typeof OlympiadChoice>;

export const OlympiadPracticeQuestion = z.strictObject({
  id: ContentId,
  topicId: z.enum(OLYMPIAD_TOPIC_IDS),
  title: z.string().min(1),
  prompt: z.string().min(1),
  visualType: z.enum(['none', 'scale', 'pattern', 'calendar', 'shapes', 'cubes', 'groups', 'equation']).default('none'),
  visualData: z.record(z.string(), z.unknown()).optional(),
  choices: z.array(OlympiadChoice).min(2).max(5),
  correctAnswer: z.string().min(1),
  guide: z.string().min(1),
  hint: z.string().min(1),
  explanation: z.string().min(1),
});
export type OlympiadPracticeQuestion = z.infer<typeof OlympiadPracticeQuestion>;

export const OlympiadExamQuestion = z.strictObject({
  id: ContentId,
  number: z.number().int().min(1).max(25),
  topicId: z.enum(OLYMPIAD_TOPIC_IDS),
  prompt: z.string().min(1),
  visualType: z.enum(['none', 'scale', 'pattern', 'calendar', 'shapes', 'cubes', 'groups', 'equation']).default('none'),
  visualData: z.record(z.string(), z.unknown()).optional(),
  choices: z.array(OlympiadChoice).length(4),
  correctAnswer: z.string().min(1),
  explanation: z.string().min(1),
});
export type OlympiadExamQuestion = z.infer<typeof OlympiadExamQuestion>;

export const OlympiadExamQuestionPublic = z.strictObject({
  id: ContentId,
  number: z.number().int().min(1).max(25),
  topicId: z.enum(OLYMPIAD_TOPIC_IDS),
  prompt: z.string().min(1),
  visualType: z.enum(['none', 'scale', 'pattern', 'calendar', 'shapes', 'cubes', 'groups', 'equation']).default('none'),
  visualData: z.record(z.string(), z.unknown()).optional(),
  choices: z.array(OlympiadChoice).length(4),
});
export type OlympiadExamQuestionPublic = z.infer<typeof OlympiadExamQuestionPublic>;

export const OlympiadCatalog = z.strictObject({
  version: z.literal(1),
  id: z.literal('olympic-math'),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  examDate: z.string().min(1),
  topics: z.array(OlympiadTopic).length(5),
  practiceQuestions: z.array(OlympiadPracticeQuestion).min(40),
  examQuestions: z.array(OlympiadExamQuestion).length(25),
});
export type OlympiadCatalog = z.infer<typeof OlympiadCatalog>;

export const ExamSubmitRequest = z.strictObject({
  answers: z.record(z.string(), z.string()),
  elapsedSeconds: z.number().int().min(0).max(7200).default(0),
});
export type ExamSubmitRequest = z.infer<typeof ExamSubmitRequest>;

export const TopicBreakdown = z.strictObject({
  topicId: z.enum(OLYMPIAD_TOPIC_IDS),
  topicName: z.string().min(1),
  correct: z.number().int().min(0).max(5),
  total: z.number().int().min(0).max(5),
  score: z.number().int().min(0).max(20),
});
export type TopicBreakdown = z.infer<typeof TopicBreakdown>;

export const QuestionReviewItem = z.strictObject({
  id: ContentId,
  number: z.number().int().min(1).max(25),
  topicId: z.enum(OLYMPIAD_TOPIC_IDS),
  prompt: z.string().min(1),
  choices: z.array(OlympiadChoice),
  chosenAnswer: z.string().nullable(),
  correctAnswer: z.string().min(1),
  isCorrect: z.boolean(),
  explanation: z.string().min(1),
});
export type QuestionReviewItem = z.infer<typeof QuestionReviewItem>;

export const ExamSubmitResponse = z.strictObject({
  score: z.number().int().min(0).max(100),
  totalScore: z.literal(100),
  correctCount: z.number().int().min(0).max(25),
  totalCount: z.literal(25),
  award: z.enum(OLYMPIAD_AWARD_TIERS).nullable(),
  awardTitle: z.string().nullable(),
  isNewBest: z.boolean(),
  bestScore: z.number().int().min(0).max(100),
  bestAward: z.enum(OLYMPIAD_AWARD_TIERS).nullable(),
  breakdown: z.record(z.enum(OLYMPIAD_TOPIC_IDS), TopicBreakdown),
  rewards: z.strictObject({
    xp: z.number().int().min(0),
    coin: z.number().int().min(0),
  }),
  elapsedSeconds: z.number().int().min(0),
  review: z.array(QuestionReviewItem).length(25),
});
export type ExamSubmitResponse = z.infer<typeof ExamSubmitResponse>;

export const OlympiadStatusResponse = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  examDate: z.string().min(1),
  topics: z.array(OlympiadTopic),
  practiceCountByTopic: z.record(z.enum(OLYMPIAD_TOPIC_IDS), z.number().int().min(0)),
  examQuestionsCount: z.literal(25),
  userBest: z.strictObject({
    score: z.number().int().min(0).max(100).nullable(),
    award: z.enum(OLYMPIAD_AWARD_TIERS).nullable(),
    awardTitle: z.string().nullable(),
    attemptsCount: z.number().int().min(0),
  }),
});
export type OlympiadStatusResponse = z.infer<typeof OlympiadStatusResponse>;

/** Calculate award tier from score 0..100 */
export function awardTierFromScore(score: number): OlympiadAwardTier | null {
  if (score >= 80) return 'gold';
  if (score >= 60) return 'silver';
  if (score >= 40) return 'bronze';
  if (score >= 20) return 'consolation';
  return null;
}

export function awardTitleFromTier(tier: OlympiadAwardTier | null): string | null {
  switch (tier) {
    case 'gold':
      return 'Giải Vàng (Gold Award)';
    case 'silver':
      return 'Giải Bạc (Silver Award)';
    case 'bronze':
      return 'Giải Đồng (Bronze Award)';
    case 'consolation':
      return 'Giải Khuyến khích (Merit Award)';
    default:
      return null;
  }
}
