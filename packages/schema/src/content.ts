import { z } from 'zod';

/** Content ids are kebab-case and never change once player progress references them. */
export const ContentId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const RewardSpec = z.strictObject({
  xp: z.number().int().min(0).default(0),
  coin: z.number().int().min(0).default(0),
  skillXp: z.record(ContentId, z.number().int().min(1)).default({}),
  items: z.record(ContentId, z.number().int().min(1)).default({}),
});
export type RewardSpec = z.infer<typeof RewardSpec>;

const Text = z.string().trim().min(1);

/** The eight beats every quest walks through (Master Plan §11), in story order. */
export const QUEST_PHASES = ['hook', 'explore', 'learn', 'challenge', 'decision', 'finale', 'reward', 'unlock'] as const;

/** Where the step happens on the map: an entity id the player interacts with or walks into. */
const StepTrigger = z.enum(['interact', 'enter-zone', 'auto']);
const stepBase = {
  id: ContentId,
  /** Short line for the quest tracker. */
  title: Text,
  target: ContentId.optional(),
  trigger: StepTrigger.default('interact'),
};
// Authoring objects are strict: a misspelt key in AI-drafted content fails the gate instead of being
// silently dropped. Only the step shapes below the answer level have a stripping variant, for QuestView.
const Choice = z.strictObject({ id: ContentId, text: Text });
const ChoiceAnswer = z.strictObject({ choice: ContentId });

/** Three support layers shared by every learning step (Master Plan §5); only the server hands them out. */
export const LearningSupport = z.strictObject({
  guide: z.array(Text).min(1),
  hint: Text,
  answer: z.strictObject({ text: Text, explanation: Text }),
});
export type LearningSupport = z.infer<typeof LearningSupport>;

// Each step kind is a shape. Learning steps have a public shape (safe to send before the child answers)
// and an authoring shape that adds the answer and the support layers.

const dialogueShape = {
  ...stepBase,
  kind: z.literal('dialogue'),
  lines: z.array(z.strictObject({ speaker: Text, text: Text })).min(1),
  /** Story-only choices: every choice leads to the same next step (branching is out of MVP scope). */
  choices: z.array(z.strictObject({ text: Text, reply: Text.optional() })).default([]),
};

/** Find every target, in any order. */
const searchShape = { id: ContentId, title: Text, kind: z.literal('search'), targets: z.array(ContentId).min(1) };

const readShape = {
  ...stepBase,
  kind: z.literal('read'),
  text: Text,
  question: Text,
  choices: z.array(Choice).min(2),
  skill: ContentId,
};

const riddleShape = { ...stepBase, kind: z.literal('riddle'), question: Text, skill: ContentId };

const challengeBase = { ...stepBase, kind: z.literal('challenge'), prompt: Text, skill: ContentId };

/** Drag pieces into the container until their values add up to the total; every piece counts. */
const dragDropShape = {
  ...challengeBase,
  mechanic: z.literal('drag-drop'),
  container: Text,
  pieces: z.array(z.strictObject({ id: ContentId, label: Text, value: z.number().int().min(1) })).min(1),
};

/** Put the items in the right order; `items` is the (shuffled) display order. */
const sortShape = {
  ...challengeBase,
  mechanic: z.literal('sort'),
  items: z.array(z.strictObject({ id: ContentId, label: Text })).min(2),
};

const quizShape = { ...challengeBase, mechanic: z.literal('quiz'), choices: z.array(Choice).min(2) };

const rewardShape = { ...stepBase, kind: z.literal('reward'), text: Text };
const unlockShape = { ...stepBase, kind: z.literal('unlock'), text: Text };

const secret = <A extends z.ZodType>(answer: A) => ({ answer, support: LearningSupport });

/** Step as the client sees it: parsing drops the answer and the support layers. */
export const QuestStepPublic = z.discriminatedUnion('kind', [
  z.object(dialogueShape),
  z.object(searchShape),
  z.object(readShape),
  z.object(riddleShape),
  z.discriminatedUnion('mechanic', [z.object(dragDropShape), z.object(sortShape), z.object(quizShape)]),
  z.object(rewardShape),
  z.object(unlockShape),
]);
export type QuestStepPublic = z.infer<typeof QuestStepPublic>;

export const QuestStep = z.discriminatedUnion('kind', [
  z.strictObject(dialogueShape),
  z.strictObject(searchShape),
  z.strictObject({ ...readShape, ...secret(ChoiceAnswer) }),
  z.strictObject({ ...riddleShape, ...secret(z.strictObject({ value: z.number().int() })) }),
  z.discriminatedUnion('mechanic', [
    z.strictObject({ ...dragDropShape, ...secret(z.strictObject({ total: z.number().int().min(1) })) }),
    z.strictObject({ ...sortShape, ...secret(z.strictObject({ order: z.array(ContentId).min(2) })) }),
    z.strictObject({ ...quizShape, ...secret(ChoiceAnswer) }),
  ]),
  z.strictObject(rewardShape),
  z.strictObject(unlockShape),
]);
export type QuestStep = z.infer<typeof QuestStep>;
/** Steps the child answers; each carries an answer and the three support layers. */
export type AnswerableStep = Extract<QuestStep, { support: LearningSupport }>;
export type ChallengeStep = Extract<QuestStep, { kind: 'challenge' }>;

/** Entity ids a step needs on the map. */
export function stepTargets(step: QuestStep | QuestStepPublic): string[] {
  if (step.kind === 'search') return [...step.targets];
  return step.target ? [step.target] : [];
}

/** Gameplay mechanics other than multiple choice (Master Plan §16: at least two per quest). */
function mechanicOf(step: QuestStep): string | null {
  if (step.kind === 'search' || step.kind === 'riddle') return step.kind;
  if (step.kind === 'challenge' && step.mechanic !== 'quiz') return step.mechanic;
  return null;
}

/** Whether some subset of the values adds up to exactly `total`. */
function reachableTotal(values: readonly number[], total: number): boolean {
  let sums = new Set([0]);
  for (const v of values) sums = new Set([...sums, ...[...sums].map((s) => s + v).filter((s) => s <= total)]);
  return sums.has(total);
}

function uniqueIds(ids: readonly string[]): boolean {
  return new Set(ids).size === ids.length;
}

function stepIssues(step: QuestStep): string[] {
  const issues: string[] = [];
  if (step.kind !== 'search' && step.trigger !== 'auto' && !step.target) issues.push('needs a target unless its trigger is auto');
  if (step.kind === 'search' && !uniqueIds(step.targets)) issues.push('duplicate search target');
  if (step.kind === 'read' || (step.kind === 'challenge' && step.mechanic === 'quiz')) {
    if (!uniqueIds(step.choices.map((c) => c.id))) issues.push('duplicate choice id');
    if (!step.choices.some((c) => c.id === step.answer.choice)) issues.push('answer is not one of the choices');
  }
  if (step.kind === 'challenge' && step.mechanic === 'drag-drop') {
    if (!uniqueIds(step.pieces.map((p) => p.id))) issues.push('duplicate piece id');
    if (!reachableTotal(step.pieces.map((p) => p.value), step.answer.total)) issues.push('no set of pieces adds up to the total');
  }
  if (step.kind === 'challenge' && step.mechanic === 'sort') {
    const ids = step.items.map((i) => i.id);
    const order = step.answer.order;
    if (!uniqueIds(ids)) issues.push('duplicate item id');
    if (order.length !== ids.length || !uniqueIds(order) || !order.every((id) => ids.includes(id))) {
      issues.push('answer order must list every item once');
    } else if (order.every((id, i) => ids[i] === id)) {
      issues.push('items are already displayed in the answer order');
    }
  }
  return issues;
}

const StubQuest = z.strictObject({
  id: ContentId,
  region: ContentId,
  chapter: z.number().int().min(1),
  title: Text,
  /** Announced but not written yet: players see it as "coming soon" and cannot start it. */
  status: z.literal('stub'),
  /** A stub can never be finished, so anything it unlocked would stay locked forever. */
  unlock: z.array(ContentId).max(0, 'a stub quest cannot unlock other quests').default([]),
});

const ActiveQuest = z
  .strictObject({
    id: ContentId,
    region: ContentId,
    chapter: z.number().int().min(1),
    title: Text,
    status: z.literal('active'),
    summary: Text,
    /** Learning content is drafted by AI and must be approved by a teacher before it reaches children. */
    review: z.enum(['teacher-pending', 'teacher-approved']),
    /** The seven design questions every quest must answer (Master Plan §11). */
    sevenQuestions: z.strictObject({
      who: Text,
      where: Text,
      goal: Text,
      play: Text,
      learn: Text,
      reward: Text,
      unlock: Text,
    }),
    /** Step id where each phase begins; phases appear in story order (a step may open several). */
    phases: z.strictObject({
      hook: ContentId,
      explore: ContentId,
      learn: ContentId,
      challenge: ContentId,
      decision: ContentId,
      finale: ContentId,
      reward: ContentId,
      unlock: ContentId,
    }),
    steps: z.array(QuestStep).min(1),
    reward: RewardSpec,
    /**
     * Quest ids this quest unlocks once finished. A quest opens when ANY quest listing it is finished;
     * a quest no one lists is open from the start.
     */
    unlock: z.array(ContentId).default([]),
  })
  .superRefine((q, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
    const ids = q.steps.map((s) => s.id);
    if (!uniqueIds(ids)) issue('duplicate step id');
    let previous = 0;
    for (const phase of QUEST_PHASES) {
      const index = ids.indexOf(q.phases[phase]);
      if (index < 0) issue(`phase ${phase} points at unknown step ${q.phases[phase]}`);
      else if (index < previous) issue(`phase ${phase} starts before the phase that precedes it`);
      else previous = index;
    }
    for (const step of q.steps) for (const message of stepIssues(step)) issue(`step ${step.id}: ${message}`);
    const mechanics = new Set(q.steps.map(mechanicOf).filter((m) => m !== null));
    if (mechanics.size < 2) issue('needs at least two mechanics other than multiple choice (search, riddle, drag-drop, sort)');
  });

/** Quest data model (Master Plan §11): Quest → Step → Interaction → Challenge, with learning support. */
export const QuestDefinition = z.discriminatedUnion('status', [ActiveQuest, StubQuest]);
export type QuestDefinition = z.infer<typeof QuestDefinition>;
export type ActiveQuest = z.infer<typeof ActiveQuest>;
export type StubQuest = z.infer<typeof StubQuest>;

/** Subject → Skill catalogue (Master Plan §5). Skill ids are unique across subjects. */
export const SkillCatalog = z
  .object({
    subjects: z
      .array(
        z.object({
          id: ContentId,
          name: z.string().min(1),
          skills: z.array(z.object({ id: ContentId, name: z.string().min(1) })).min(1),
        }),
      )
      .min(1),
  })
  .refine(
    (c) => {
      const ids = c.subjects.flatMap((s) => s.skills.map((k) => k.id));
      return new Set(ids).size === ids.length;
    },
    { message: 'duplicate skill id' },
  );
export type SkillCatalog = z.infer<typeof SkillCatalog>;

/** Pick-from-list names (Master Plan §9: no free-text names for children). */
export const NameList = z
  .object({ names: z.array(z.string().trim().min(1).max(40).transform((s) => s.normalize('NFC'))).min(1) })
  .refine((l) => new Set(l.names).size === l.names.length, { message: 'duplicate name' });
export type NameList = z.infer<typeof NameList>;

/** Parent consent text. `requiresLegalReview` stays true until legal counsel approves the wording. */
export const ConsentDocument = z.object({
  version: z.string().min(1).max(32),
  requiresLegalReview: z.boolean(),
  title: z.string().min(1),
  paragraphs: z.array(z.string().min(1)).min(1),
});
export type ConsentDocument = z.infer<typeof ConsentDocument>;

/**
 * Cumulative XP needed to reach each level: `thresholds[0]` is level 1 and must be 0.
 * Strictly increasing so every XP total maps to exactly one level.
 */
export const LevelCurve = z
  .object({ thresholds: z.array(z.number().int().min(0)).min(2) })
  .refine((c) => c.thresholds[0] === 0, { message: 'level 1 starts at 0 XP' })
  .refine((c) => c.thresholds.every((v, i, a) => i === 0 || v > (a[i - 1] ?? 0)), { message: 'thresholds must increase' });
export type LevelCurve = z.infer<typeof LevelCurve>;
