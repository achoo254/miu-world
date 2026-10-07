// Olympic Math practice (content/olympiad/olympic-math.json): five topics of the olympiad syllabus for the second
// grade, practice questions per topic and a mock exam laid out like the qualifying round (25 multiple-choice
// questions, 4 points each, no points taken off, a 60-minute clock the player may switch on). Every question is
// written for the game (none is copied from any published paper) and reads in both languages. Answers, guides,
// hints and explanations stay on the server: the client gets a question's support layers one at a time on request,
// and the grading of every answer from the server.
import { z } from 'zod';
import { ContentId } from './content';
import { BiText, EventRewardGrant } from './live-event';

export const OLYMPIAD_TOPIC_IDS = ['logic', 'arithmetic', 'number-theory', 'geometry', 'combinatorics'] as const;
export const OlympiadTopicId = z.enum(OLYMPIAD_TOPIC_IDS);
export type OlympiadTopicId = (typeof OLYMPIAD_TOPIC_IDS)[number];

export const OLYMPIAD_AWARD_TIERS = ['gold', 'silver', 'bronze', 'consolation'] as const;
export type OlympiadAwardTier = (typeof OLYMPIAD_AWARD_TIERS)[number];

/** Questions of the mock exam, points per right answer, and its optional clock (the qualifying round's own rules). */
export const EXAM_QUESTIONS = 25;
export const EXAM_POINTS = 4;
export const EXAM_MINUTES = 60;

const Text = z.string().trim().min(1);

export const OlympiadTopic = z.strictObject({
  id: OlympiadTopicId,
  name: BiText,
  /** A UI icon of the web app (`UI_ICONS`). */
  icon: Text,
  subtopics: BiText,
  description: BiText,
  /** Skill (content/learning/skills.json) a practice run of this topic trains. */
  skill: ContentId,
});
export type OlympiadTopic = z.infer<typeof OlympiadTopic>;

export const CHOICE_IDS = ['A', 'B', 'C', 'D', 'E'] as const;
/** A choice: its label, and its English label when it reads differently (a number reads the same). */
export const OlympiadChoice = z.strictObject({ id: z.enum(CHOICE_IDS), text: Text, en: Text.optional() });
export type OlympiadChoice = z.infer<typeof OlympiadChoice>;

const Count = z.number().int().min(0).max(99);
/** A colour of a colour pattern (drawn as a swatch, named in both languages by the client). */
export const PATTERN_COLOURS = ['red', 'blue', 'yellow', 'green', 'purple', 'orange'] as const;

/**
 * What the practice screens draw with a question (mocks 34–44), one kind per kind of problem, so a new question of a
 * known kind is data only. `scale`: balances (left pan = right pan); `sequence`: a row of numbers or colour swatches
 * with one `?`; `calendar`: a month page with marked days; `equation`: two sides to balance with a `?`; `numbers`:
 * number tiles to sort (odd/even); `share`: things shared out equally (`groups` of them, or `per` group); `segment`:
 * points on a line; `figure`: a drawn figure to count shapes in; `cubes`: unit cubes stacked by layer (a tower or a
 * stair), or one cube to count its faces, edges or corners; `digits`: digit cards to form numbers from; `pairs`: two
 * sets to pick one of each from; `people`: who meets, plays or lines up; `machine`: a number machine's steps.
 */
export const OlympiadVisual = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('scale'), pans: z.array(z.strictObject({ left: BiText, right: BiText })).min(1).max(3) }),
  z.strictObject({ type: z.literal('sequence'), items: z.array(z.union([z.number().int(), z.literal('?'), z.enum(PATTERN_COLOURS)])).min(3).max(12) }),
  z.strictObject({ type: z.literal('calendar'), month: z.number().int().min(1).max(12), year: z.number().int().min(2000).max(2100), marked: z.array(z.number().int().min(1).max(31)).max(6) }),
  z.strictObject({ type: z.literal('equation'), left: Text, right: Text }),
  z.strictObject({ type: z.literal('numbers'), numbers: z.array(z.number().int().min(0).max(999)).min(2).max(10) }),
  z.strictObject({ type: z.literal('share'), total: Count, groups: Count.optional(), per: Count.optional(), thing: BiText }),
  z.strictObject({ type: z.literal('segment'), points: z.array(z.string().regex(/^[A-Z]$/)).min(2).max(6) }),
  z.strictObject({ type: z.literal('figure'), figure: z.enum(['triangle-split', 'rect-split-2', 'rect-split-3', 'square-cross', 'two-triangles', 'rectangle']) }),
  z.strictObject({ type: z.literal('cubes'), layers: z.array(z.number().int().min(1).max(9)).min(1).max(4).optional(), single: z.boolean().optional() }),
  z.strictObject({ type: z.literal('digits'), digits: z.array(z.number().int().min(0).max(9)).min(2).max(4) }),
  z.strictObject({ type: z.literal('pairs'), left: z.array(BiText).min(1).max(5), right: z.array(BiText).min(1).max(5) }),
  z.strictObject({ type: z.literal('people'), names: z.array(Text).min(2).max(6) }),
  z.strictObject({ type: z.literal('machine'), steps: z.array(z.string().regex(/^[+−×:] ?\d{1,3}$/)).min(1).max(4), input: z.union([z.number().int(), z.literal('?')]), output: z.union([z.number().int(), z.literal('?')]) }),
]);
export type OlympiadVisual = z.infer<typeof OlympiadVisual>;

/** A question as written: what the player sees, its answer and its three support layers (server-only). */
export const OlympiadQuestion = z.strictObject({
  id: ContentId,
  topicId: OlympiadTopicId,
  title: BiText,
  prompt: BiText,
  visual: OlympiadVisual.optional(),
  choices: z.array(OlympiadChoice).min(2).max(5),
  answer: z.enum(CHOICE_IDS),
  /** "Hướng dẫn": how to go about it. */
  guide: BiText,
  /** "Gợi ý": a nudge toward the answer. */
  hint: BiText,
  /** "Đáp án kèm giải thích": why the answer is right. */
  explanation: BiText,
});
export type OlympiadQuestion = z.infer<typeof OlympiadQuestion>;

/** A question as the client sees it before answering: no answer, no support layers. */
export const OlympiadQuestionPublic = OlympiadQuestion.omit({ answer: true, guide: true, hint: true, explanation: true });
export type OlympiadQuestionPublic = z.infer<typeof OlympiadQuestionPublic>;

export const OlympiadCatalog = z
  .strictObject({
    version: z.literal(2),
    id: z.literal('olympic-math'),
    title: BiText,
    subtitle: BiText,
    topics: z.array(OlympiadTopic).length(OLYMPIAD_TOPIC_IDS.length),
    practiceQuestions: z.array(OlympiadQuestion).min(40),
    examQuestions: z.array(OlympiadQuestion).length(EXAM_QUESTIONS),
  })
  .superRefine((catalog, ctx) => {
    const ids = [...catalog.practiceQuestions, ...catalog.examQuestions].map((q) => q.id);
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'two questions share an id' });
    if (new Set(catalog.topics.map((t) => t.id)).size !== catalog.topics.length) ctx.addIssue({ code: 'custom', message: 'a topic is listed twice' });
    for (const q of [...catalog.practiceQuestions, ...catalog.examQuestions]) {
      if (!q.choices.some((c) => c.id === q.answer)) ctx.addIssue({ code: 'custom', message: `question ${q.id}: its answer ${q.answer} is not one of its choices` });
      if (new Set(q.choices.map((c) => c.id)).size !== q.choices.length) ctx.addIssue({ code: 'custom', message: `question ${q.id}: two choices share an id` });
    }
    for (const topic of OLYMPIAD_TOPIC_IDS) {
      const exam = catalog.examQuestions.filter((q) => q.topicId === topic).length;
      if (exam !== EXAM_QUESTIONS / OLYMPIAD_TOPIC_IDS.length) ctx.addIssue({ code: 'custom', message: `the mock exam has ${exam} questions of ${topic}, not ${EXAM_QUESTIONS / OLYMPIAD_TOPIC_IDS.length}` });
      if (catalog.practiceQuestions.filter((q) => q.topicId === topic).length < 8) ctx.addIssue({ code: 'custom', message: `practice has fewer than 8 questions of ${topic}` });
    }
  });
export type OlympiadCatalog = z.infer<typeof OlympiadCatalog>;

// ——— API ———

/** `GET /olympiad/status`: the topics with the player's stars (her best practice run of each), and her best mock exam. */
export const OlympiadStatusResponse = z.strictObject({
  id: z.literal('olympic-math'),
  title: BiText,
  subtitle: BiText,
  topics: z.array(
    OlympiadTopic.omit({ skill: true }).extend({
      questions: z.number().int().min(0),
      /** 0–5 stars from her best practice run of this topic (right answers out of its questions). */
      stars: z.number().int().min(0).max(5),
    }),
  ),
  exam: z.strictObject({ questions: z.literal(EXAM_QUESTIONS), minutes: z.literal(EXAM_MINUTES), points: z.literal(EXAM_POINTS) }),
  best: z.strictObject({
    score: z.number().int().min(0).max(100).nullable(),
    award: z.enum(OLYMPIAD_AWARD_TIERS).nullable(),
    runs: z.number().int().min(0),
  }),
});
export type OlympiadStatusResponse = z.infer<typeof OlympiadStatusResponse>;

export const PracticeResponse = z.strictObject({ topicId: OlympiadTopicId, questions: z.array(OlympiadQuestionPublic) });
export type PracticeResponse = z.infer<typeof PracticeResponse>;

/** A run of practice or of the mock exam: an id the client makes when it starts, so a resent request pays nothing twice. */
export const RunId = z.uuid();

export const PracticeCheckRequest = z.strictObject({ runId: RunId, choice: z.enum(CHOICE_IDS) });
/** A practice answer graded: right or not; once right, the explanation (the answer was found, nothing is given away). */
export const PracticeCheckResponse = z.strictObject({
  correct: z.boolean(),
  explanation: BiText.nullable(),
});
export type PracticeCheckResponse = z.infer<typeof PracticeCheckResponse>;

export const OLYMPIAD_SUPPORT_LAYERS = ['guide', 'hint', 'answer'] as const;
export const PracticeSupportRequest = z.strictObject({ layer: z.enum(OLYMPIAD_SUPPORT_LAYERS) });
export const PracticeSupportResponse = z.discriminatedUnion('layer', [
  z.strictObject({ layer: z.literal('guide'), text: BiText }),
  z.strictObject({ layer: z.literal('hint'), text: BiText }),
  z.strictObject({ layer: z.literal('answer'), choice: z.enum(CHOICE_IDS), explanation: BiText }),
]);
export type PracticeSupportResponse = z.infer<typeof PracticeSupportResponse>;

export const PracticeFinishRequest = z.strictObject({ runId: RunId });
/** A practice run finished: what the server counted right in it and what it paid (once per run). */
export const PracticeFinishResponse = z.strictObject({
  correct: z.number().int().min(0),
  questions: z.number().int().min(1),
  stars: z.number().int().min(0).max(5),
  rewards: z.strictObject({ xp: z.number().int().min(0), coin: z.number().int().min(0) }),
  repeated: z.boolean(),
});
export type PracticeFinishResponse = z.infer<typeof PracticeFinishResponse>;

export const ExamResponse = z.strictObject({
  questions: z.array(OlympiadQuestionPublic).length(EXAM_QUESTIONS),
  minutes: z.literal(EXAM_MINUTES),
});
export type ExamResponse = z.infer<typeof ExamResponse>;

export const ExamSubmitRequest = z.strictObject({
  runId: RunId,
  answers: z.record(ContentId, z.enum(CHOICE_IDS)),
  /** Shown on the result only; never part of the score or the reward. */
  elapsedSeconds: z.number().int().min(0).max(7200).default(0),
});
export type ExamSubmitRequest = z.infer<typeof ExamSubmitRequest>;

export const TopicBreakdown = z.strictObject({
  topicId: OlympiadTopicId,
  correct: z.number().int().min(0),
  total: z.number().int().min(0),
  score: z.number().int().min(0).max(100),
});
export type TopicBreakdown = z.infer<typeof TopicBreakdown>;

/** One exam question after grading: the player's choice, the right one and all three support layers. */
export const QuestionReviewItem = OlympiadQuestionPublic.extend({
  chosen: z.enum(CHOICE_IDS).nullable(),
  answer: z.enum(CHOICE_IDS),
  correct: z.boolean(),
  guide: BiText,
  hint: BiText,
  explanation: BiText,
});
export type QuestionReviewItem = z.infer<typeof QuestionReviewItem>;

export const ExamSubmitResponse = z.strictObject({
  score: z.number().int().min(0).max(100),
  correctCount: z.number().int().min(0).max(EXAM_QUESTIONS),
  award: z.enum(OLYMPIAD_AWARD_TIERS).nullable(),
  isNewBest: z.boolean(),
  bestScore: z.number().int().min(0).max(100),
  breakdown: z.array(TopicBreakdown).length(OLYMPIAD_TOPIC_IDS.length),
  /** The topic with the fewest right answers (the result's "practise this next"). */
  weakest: OlympiadTopicId,
  rewards: z.strictObject({ xp: z.number().int().min(0), coin: z.number().int().min(0) }),
  /** Limited event badges this run reached (an event on now with this practice). */
  eventRewards: z.array(EventRewardGrant),
  elapsedSeconds: z.number().int().min(0),
  /** True when this run had been submitted before: nothing new was paid. */
  repeated: z.boolean(),
  review: z.array(QuestionReviewItem).length(EXAM_QUESTIONS),
});
export type ExamSubmitResponse = z.infer<typeof ExamSubmitResponse>;

/** Award tier for a score out of 100: the qualifying round's medal lines. */
export function awardTierFromScore(score: number): OlympiadAwardTier | null {
  if (score >= 80) return 'gold';
  if (score >= 60) return 'silver';
  if (score >= 40) return 'bronze';
  if (score >= 20) return 'consolation';
  return null;
}

/** Stars (0–5) for right answers out of a topic's questions. */
export function starsFor(correct: number, questions: number): number {
  if (questions <= 0) return 0;
  return Math.max(0, Math.min(5, Math.round((correct / questions) * 5)));
}
