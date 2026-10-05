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
export const QUEST_PHASES = ['hook', 'explore', 'learn', 'challenge', 'decision', 'finale', 'reward', 'next'] as const;

/** Where the step happens on the map: an entity id the player interacts with or walks into. */
const StepTrigger = z.enum(['interact', 'enter-zone', 'auto']);
/**
 * Tracker line while the child walks to the step's place ("Đi tới bảng gỗ lớp Hai…"); the title stays
 * the heading of the scene once there. Textbook quests need one whenever the place changes.
 */
const GoTo = Text.optional();
const stepBase = {
  id: ContentId,
  /** Short line for the quest tracker, and the heading of the step's scene. */
  title: Text,
  goTo: GoTo,
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

/** Picture for a card or item: an emoji icon, or a diagram the client draws (clock, number line, scale…). */
export const IllustrationRef = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('icon'), id: ContentId }),
  z.strictObject({
    kind: z.literal('diagram'),
    type: z.enum(['clock', 'number-line', 'ruler', 'scale', 'jug', 'shapes', 'polyline', 'picture-card']),
    params: z.record(z.string(), z.union([z.number(), z.string(), z.boolean(), z.array(z.number())])).default({}),
  }),
]);
export type IllustrationRef = z.infer<typeof IllustrationRef>;

/**
 * Textbook inventory items (content/curriculum) the step covers. Authoring only: the content gate
 * checks that the step carries the book's wording and answer unchanged.
 */
const curriculumRef = { curriculumRef: z.array(ContentId).min(1).optional() };

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
const searchShape = { id: ContentId, title: Text, goTo: GoTo, kind: z.literal('search'), targets: z.array(ContentId).min(1) };

const DecisionChoice = z.strictObject({
  id: ContentId,
  text: Text,
  /** Consequence of picking this choice in the story. */
  consequence: Text,
  /** Optional next step id to branch to (must be an existing step in the quest). */
  nextStepId: ContentId.optional(),
  image: IllustrationRef.optional(),
});

/** Action choice beat (Master Plan §5, §6): multiple choices with story consequences and optional branching. */
const decisionShape = {
  ...stepBase,
  kind: z.literal('decision'),
  prompt: Text,
  speaker: Text.optional(),
  choices: z.array(DecisionChoice).min(2),
};

const FindObjectItem = z.strictObject({
  id: ContentId,
  name: Text,
  /** Reading comprehension clue / riddle to locate the hidden object in 3D. */
  clue: Text,
  /** Interactable target entity id on the map. */
  target: ContentId,
  image: IllustrationRef.optional(),
});

/** Find hidden objects in the 3D scene from text clues (Master Plan §5, §6). */
const findObjectShape = {
  ...stepBase,
  kind: z.literal('find-object'),
  prompt: Text,
  items: z.array(FindObjectItem).min(1),
  skill: ContentId.optional(),
};

const readShape = {
  ...stepBase,
  kind: z.literal('read'),
  /** The passage itself, or `textRef` to a passage in the quest's `texts` (exactly one of the two). */
  text: Text.optional(),
  textRef: ContentId.optional(),
  /** Offer to read the passage aloud with the device's speech voice. */
  audio: z.boolean().optional(),
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
  items: z.array(z.strictObject({ id: ContentId, label: Text, image: IllustrationRef.optional() })).min(2),
};

const quizShape = { ...challengeBase, mechanic: z.literal('quiz'), choices: z.array(Choice).min(2) };

/** Put every item into its group (words that name things / actions / qualities, kinds of sentence). */
const classifyShape = {
  ...challengeBase,
  mechanic: z.literal('classify'),
  groups: z.array(z.strictObject({ id: ContentId, label: Text })).min(2),
  items: z.array(z.strictObject({ id: ContentId, label: Text, image: IllustrationRef.optional() })).min(2),
};

/** Fill each `{{blank}}` of the template with one of its options (c/k, ch/tr, >, <, =, a number…). */
const fillBlankShape = {
  ...challengeBase,
  mechanic: z.literal('fill-blank'),
  template: Text,
  blanks: z.array(z.strictObject({ id: ContentId, options: z.array(Choice).min(2) })).min(1),
};

/** Pick every right choice and none of the others. */
const multiSelectShape = { ...challengeBase, mechanic: z.literal('multi-select'), choices: z.array(Choice).min(2) };

const ClockTime = z.strictObject({ hour: z.number().int().min(0).max(23), minute: z.number().int().min(0).max(59) });
/** Read the time shown (`read`, `time` required) or set the hands to the time asked (`set`). */
const clockShape = {
  ...challengeBase,
  mechanic: z.literal('clock'),
  mode: z.enum(['read', 'set']),
  display: z.enum(['analog', 'digital']),
  time: ClockTime.optional(),
};

export const WEEKDAYS = ['thu-hai', 'thu-ba', 'thu-tu', 'thu-nam', 'thu-sau', 'thu-bay', 'chu-nhat'] as const;
const Weekday = z.enum(WEEKDAYS);
/** A month page of the calendar; the question asks for a day of the month or a weekday (`ask`). */
const calendarShape = {
  ...challengeBase,
  mechanic: z.literal('calendar'),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  question: Text,
  ask: z.enum(['day', 'weekday']),
};

/** Join points with segments (draw a segment, a polyline, a shape). */
const connectShape = {
  ...challengeBase,
  mechanic: z.literal('connect'),
  points: z.array(z.strictObject({ id: ContentId, x: z.number(), y: z.number(), label: Text })).min(2),
  showLengths: z.boolean().optional(),
};

/** Logic challenge (Master Plan §5, §6): patterns, mazes, or puzzle solving. */
const logicShape = {
  ...challengeBase,
  mechanic: z.literal('logic'),
  logicType: z.enum(['pattern', 'maze', 'puzzle']).default('pattern'),
  elements: z
    .array(z.strictObject({ id: ContentId, label: Text, image: IllustrationRef.optional() }))
    .default([]),
  choices: z.array(Choice).min(2),
  grid: z.array(z.array(z.string())).optional(),
};

/** Highest score a minigame round can report; the server refuses anything above it. */
export const MAX_MINIGAME_SCORE = 9999;
/** Keys of a game's tuning values (`speed`, `lanes`…): camelCase, like the game's code reads them. */
export const MinigameParamKey = z.string().regex(/^[a-z][a-zA-Z0-9]*$/);
export const MinigameParamValue = z.union([z.number(), z.string().max(40), z.boolean()]);
export const MinigameParams = z.record(MinigameParamKey, MinigameParamValue);
export type MinigameParams = z.infer<typeof MinigameParams>;

/**
 * Play a minigame of content/minigames (runner, egg catching, penalty kicks…) and reach `goal` points. The
 * client sends the round's score; the server grades `score >= goal` (the goal is not secret). `params` tune
 * the game for this quest (speed, lanes…), from the keys the game's own file declares.
 */
const minigameShape = {
  ...stepBase,
  kind: z.literal('challenge'),
  mechanic: z.literal('minigame'),
  /** What the character asks, shown on the how-to card ("Hứng giúp bà mười quả trứng nhé!"). */
  prompt: Text,
  game: ContentId,
  goal: z.number().int().min(1).max(MAX_MINIGAME_SCORE),
  params: MinigameParams.default({}),
};

/**
 * A single turn/question within a boss battle, as the client sees it: not strict, so parsing a turn with
 * its answer (`BossTurnWithSecret`, the authoring shape) drops the answer instead of failing.
 */
export const BossTurn = z.object({
  id: ContentId,
  prompt: Text,
  skill: ContentId,
  choices: z.array(Choice).min(2),
  damage: z.number().int().positive().default(80),
  illustration: IllustrationRef.optional(),
});
export type BossTurn = z.infer<typeof BossTurn>;

export const BossTurnWithSecret = z.strictObject({
  id: ContentId,
  prompt: Text,
  skill: ContentId,
  choices: z.array(Choice).min(2),
  damage: z.number().int().positive().default(80),
  illustration: IllustrationRef.optional(),
  answer: ChoiceAnswer,
});
export type BossTurnWithSecret = z.infer<typeof BossTurnWithSecret>;

/** Friendly boss battle (Master Plan §5, §6): multi-turn cheerful quiz challenge, reducing HP per right turn. */
const bossShape = {
  ...stepBase,
  kind: z.literal('boss'),
  bossId: ContentId,
  bossName: Text,
  avatar: IllustrationRef.optional(),
  introDialogue: Text,
  winDialogue: Text,
  maxHp: z.number().int().positive().default(500),
  damagePerTurn: z.number().int().positive().default(80),
  turns: z.array(BossTurn).min(2),
};

const rewardShape = { ...stepBase, kind: z.literal('reward'), text: Text };
/** The story beat after the reward: where the adventure goes next. Nothing is locked: every map and quest is open. */
const nextShape = { ...stepBase, kind: z.literal('next'), text: Text };

/** Talk about something (recorded on the device only, never sent); done once the child moves on. */
const speakShape = {
  ...stepBase,
  kind: z.literal('speak'),
  prompt: Text,
  /** The book's "G:" prompt lines, in order. */
  hints: z.array(Text).default([]),
  pictureRefs: z.array(IllustrationRef).optional(),
};

/** Writing happens on a printed worksheet outside the game; the step only points at it. */
const worksheetShape = { ...stepBase, kind: z.literal('worksheet'), lessonId: ContentId, text: Text };

/**
 * What a character says after an answer. The server rotates through the lines by attempt, so a child
 * retrying never hears the same line twice in a row (content must never feel repeated).
 */
export const StepFeedback = z.strictObject({ right: z.array(Text).min(3), wrong: z.array(Text).min(3) });
export type StepFeedback = z.infer<typeof StepFeedback>;

const secret = <A extends z.ZodType>(answer: A) => ({ answer, support: LearningSupport, feedback: StepFeedback.optional() });

/** Step as the client sees it: parsing drops the answer and the support layers. */
export const QuestStepPublic = z.discriminatedUnion('kind', [
  z.object(dialogueShape),
  z.object(searchShape),
  z.object(decisionShape),
  z.object(findObjectShape),
  z.object(readShape),
  z.object(riddleShape),
  z.discriminatedUnion('mechanic', [
    z.object(dragDropShape),
    z.object(sortShape),
    z.object(quizShape),
    z.object(classifyShape),
    z.object(fillBlankShape),
    z.object(multiSelectShape),
    z.object(clockShape),
    z.object(calendarShape),
    z.object(connectShape),
    z.object(logicShape),
    z.object(minigameShape),
  ]),
  z.object(rewardShape),
  z.object(nextShape),
  z.object(speakShape),
  z.object(worksheetShape),
  z.object(bossShape),
]);
export type QuestStepPublic = z.infer<typeof QuestStepPublic>;

export const QuestStep = z.discriminatedUnion('kind', [
  z.strictObject(dialogueShape),
  z.strictObject(searchShape),
  z.strictObject(decisionShape),
  z.strictObject(findObjectShape),
  z.strictObject({ ...readShape, ...curriculumRef, ...secret(ChoiceAnswer) }),
  z.strictObject({ ...riddleShape, ...curriculumRef, ...secret(z.strictObject({ value: z.number().int() })) }),
  z.discriminatedUnion('mechanic', [
    z.strictObject({ ...dragDropShape, ...curriculumRef, ...secret(z.strictObject({ total: z.number().int().min(1) })) }),
    z.strictObject({ ...sortShape, ...curriculumRef, ...secret(z.strictObject({ order: z.array(ContentId).min(2) })) }),
    z.strictObject({ ...quizShape, ...curriculumRef, ...secret(ChoiceAnswer) }),
    z.strictObject({ ...classifyShape, ...curriculumRef, ...secret(z.strictObject({ assignment: z.record(ContentId, ContentId) })) }),
    z.strictObject({ ...fillBlankShape, ...curriculumRef, ...secret(z.strictObject({ fills: z.record(ContentId, ContentId) })) }),
    z.strictObject({ ...multiSelectShape, ...curriculumRef, ...secret(z.strictObject({ choices: z.array(ContentId).min(1) })) }),
    z.strictObject({ ...clockShape, ...curriculumRef, ...secret(ClockTime) }),
    z.strictObject({
      ...calendarShape,
      ...curriculumRef,
      ...secret(z.union([z.strictObject({ day: z.number().int().min(1).max(31) }), z.strictObject({ weekday: Weekday })])),
    }),
    z.strictObject({
      ...connectShape,
      ...curriculumRef,
      ...secret(z.strictObject({ edges: z.array(z.tuple([ContentId, ContentId])).min(1).max(50) })),
    }),
    z.strictObject({
      ...logicShape,
      ...curriculumRef,
      ...secret(ChoiceAnswer),
    }),
    // Graded on the score alone: no answer, no support layers (the game's how-to card is its guide).
    z.strictObject(minigameShape),
  ]),
  z.strictObject(rewardShape),
  z.strictObject(nextShape),
  z.strictObject({ ...speakShape, ...curriculumRef }),
  z.strictObject({ ...worksheetShape, ...curriculumRef }),
  z.strictObject({
    ...bossShape,
    ...curriculumRef,
    turns: z.array(BossTurnWithSecret).min(2),
  }),
]);
export type QuestStep = z.infer<typeof QuestStep>;
/** Steps the child answers; each carries an answer and the three support layers. */
export type AnswerableStep = Extract<QuestStep, { support: LearningSupport }>;
export type ChallengeStep = Extract<QuestStep, { kind: 'challenge' }>;
export type MinigameStep = Extract<QuestStep, { mechanic: 'minigame' }>;

/** Entity ids a step needs on the map. */
export function stepTargets(step: QuestStep | QuestStepPublic): string[] {
  if (step.kind === 'search') return [...step.targets];
  if (step.kind === 'find-object') return step.items.map((i) => i.target);
  return step.target ? [step.target] : [];
}

/** Textbook quests (Toán 2 `toan2-cd<topic>-b<lesson>`, Tiếng Việt 2 `tv2-t<week>-…`) follow stricter rules. */
export const isTextbookQuest = (id: string) => id.startsWith('toan2-') || id.startsWith('tv2-');

/** Challenges where the child manipulates something (Master Plan §16), as opposed to picking one answer. */
const INTERACTIVE_MECHANICS = new Set(['drag-drop', 'sort', 'classify', 'fill-blank', 'multi-select', 'clock', 'calendar', 'connect', 'logic']);

/** Gameplay mechanics other than multiple choice (Master Plan §16: at least two per quest). */
function mechanicOf(step: QuestStep): string | null {
  if (step.kind === 'search' || step.kind === 'riddle' || step.kind === 'find-object' || step.kind === 'decision' || step.kind === 'boss') return step.kind;
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

function sameIdSet(a: readonly string[], b: readonly string[]): boolean {
  return uniqueIds(a) && a.length === b.length && a.every((id) => b.includes(id));
}

export function daysInMonth(month: number, year: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** `{{blank}}` markers in a fill-blank template, in order. */
export function templateBlanks(template: string): string[] {
  return [...template.matchAll(/\{\{([a-z0-9]+(?:-[a-z0-9]+)*)\}\}/g)].map((m) => m[1] ?? '');
}

/** Clock times compared as the child sees them: an analog face cannot tell morning from afternoon. */
export function sameClockTime(a: { hour: number; minute: number }, b: { hour: number; minute: number }, display: 'analog' | 'digital'): boolean {
  const hour = (h: number) => (display === 'analog' ? h % 12 : h);
  return hour(a.hour) === hour(b.hour) && a.minute === b.minute;
}

const edgeKey = ([a, b]: readonly [string, string]) => [a, b].sort().join('|');

function challengeIssues(step: ChallengeStep): string[] {
  const issues: string[] = [];
  switch (step.mechanic) {
    case 'quiz':
    case 'multi-select': {
      if (!uniqueIds(step.choices.map((c) => c.id))) issues.push('duplicate choice id');
      const picked = step.mechanic === 'quiz' ? [step.answer.choice] : step.answer.choices;
      if (!uniqueIds(picked)) issues.push('answer lists a choice twice');
      if (!picked.every((id) => step.choices.some((c) => c.id === id))) issues.push('answer is not one of the choices');
      break;
    }
    case 'drag-drop':
      if (!uniqueIds(step.pieces.map((p) => p.id))) issues.push('duplicate piece id');
      if (!reachableTotal(step.pieces.map((p) => p.value), step.answer.total)) issues.push('no set of pieces adds up to the total');
      break;
    case 'sort': {
      const ids = step.items.map((i) => i.id);
      const order = step.answer.order;
      if (!uniqueIds(ids)) issues.push('duplicate item id');
      if (!sameIdSet(order, ids)) issues.push('answer order must list every item once');
      else if (order.every((id, i) => ids[i] === id)) issues.push('items are already displayed in the answer order');
      break;
    }
    case 'classify': {
      const groups = step.groups.map((g) => g.id);
      const items = step.items.map((i) => i.id);
      if (!uniqueIds(groups)) issues.push('duplicate group id');
      if (!uniqueIds(items)) issues.push('duplicate item id');
      if (!sameIdSet(Object.keys(step.answer.assignment), items)) issues.push('answer must assign every item exactly once');
      if (!Object.values(step.answer.assignment).every((g) => groups.includes(g))) issues.push('answer assigns an item to an unknown group');
      break;
    }
    case 'fill-blank': {
      const blanks = step.blanks.map((b) => b.id);
      if (!sameIdSet(templateBlanks(step.template), blanks)) issues.push('template must hold each blank exactly once');
      if (!sameIdSet(Object.keys(step.answer.fills), blanks)) issues.push('answer must fill every blank');
      for (const blank of step.blanks) {
        if (!uniqueIds(blank.options.map((o) => o.id))) issues.push(`blank ${blank.id} has a duplicate option id`);
        const fill = step.answer.fills[blank.id];
        if (fill !== undefined && !blank.options.some((o) => o.id === fill)) issues.push(`answer for blank ${blank.id} is not one of its options`);
      }
      break;
    }
    case 'clock':
      if (step.mode === 'read' && !step.time) issues.push('a clock to read needs the time it shows');
      if (step.mode === 'set' && step.time) issues.push('a clock to set must not show the answer');
      if (step.mode === 'read' && step.time && !sameClockTime(step.time, step.answer, step.display)) issues.push('answer is not the time the clock shows');
      break;
    case 'calendar':
      if (('day' in step.answer ? 'day' : 'weekday') !== step.ask) issues.push(`answer must be a ${step.ask}, as the step asks`);
      if ('day' in step.answer && step.answer.day > daysInMonth(step.month, step.year)) issues.push('answer day is not in that month');
      break;
    case 'connect': {
      const points = step.points.map((p) => p.id);
      if (!uniqueIds(points)) issues.push('duplicate point id');
      if (!step.answer.edges.every(([a, b]) => a !== b && points.includes(a) && points.includes(b))) issues.push('answer joins unknown points or a point to itself');
      if (!uniqueIds(step.answer.edges.map(edgeKey))) issues.push('answer lists a segment twice');
      break;
    }
    case 'logic': {
      if (!uniqueIds(step.choices.map((c) => c.id))) issues.push('duplicate choice id');
      if (!step.choices.some((c) => c.id === step.answer.choice)) issues.push('answer choice is not one of the choices');
      if (step.elements && !uniqueIds(step.elements.map((e) => e.id))) issues.push('duplicate element id');
      break;
    }
    case 'minigame':
      // The game id, its params and the goal are checked against content/minigames by the catalogue.
      break;
  }
  return issues;
}

function stepIssues(step: QuestStep, texts: Readonly<Record<string, unknown>>, allStepIds?: readonly string[]): string[] {
  const issues: string[] = [];
  if (step.kind !== 'search' && step.kind !== 'find-object' && step.trigger !== 'auto' && !step.target) issues.push('needs a target unless its trigger is auto');
  if (step.kind === 'search' && !uniqueIds(step.targets)) issues.push('duplicate search target');
  if (step.kind === 'find-object') {
    if (!uniqueIds(step.items.map((i) => i.id))) issues.push('duplicate item id');
    if (!uniqueIds(step.items.map((i) => i.target))) issues.push('duplicate item target');
  }
  if (step.kind === 'decision') {
    if (!uniqueIds(step.choices.map((c) => c.id))) issues.push('duplicate choice id');
    for (const choice of step.choices) {
      if (choice.nextStepId && allStepIds && !allStepIds.includes(choice.nextStepId)) {
        issues.push(`choice ${choice.id} has nextStepId "${choice.nextStepId}", which is not a step in this quest`);
      }
    }
  }
  if (step.kind === 'read') {
    if ((step.text === undefined) === (step.textRef === undefined)) issues.push('needs exactly one of text and textRef');
    if (step.textRef !== undefined && !(step.textRef in texts)) issues.push(`textRef ${step.textRef} is not in the quest texts`);
    if (!uniqueIds(step.choices.map((c) => c.id))) issues.push('duplicate choice id');
    if (!step.choices.some((c) => c.id === step.answer.choice)) issues.push('answer is not one of the choices');
  }
  if (step.kind === 'boss') {
    if (!uniqueIds(step.turns.map((t) => t.id))) issues.push('duplicate turn id');
    for (const turn of step.turns) {
      if (!uniqueIds(turn.choices.map((c) => c.id))) issues.push(`turn ${turn.id}: duplicate choice id`);
      if ('answer' in turn && !turn.choices.some((c) => c.id === turn.answer.choice)) {
        issues.push(`turn ${turn.id}: answer choice is not one of the choices`);
      }
    }
  }
  if (step.kind === 'challenge') issues.push(...challengeIssues(step));
  return issues;
}

const StubQuest = z.strictObject({
  id: ContentId,
  region: ContentId,
  chapter: z.number().int().min(1),
  title: Text,
  /** Announced but not written yet: players see it as "coming soon" and cannot start it. */
  status: z.literal('stub'),
});

/** Long passage shared by several steps (a textbook reading); `section` names its inventory section. */
export const QuestText = z.strictObject({
  title: Text,
  author: Text.optional(),
  body: Text,
  /** The "Từ ngữ" box printed under a textbook passage. */
  glossary: z.array(z.strictObject({ term: Text, meaning: Text })).optional(),
  section: ContentId.optional(),
});
export type QuestText = z.infer<typeof QuestText>;

/** Ids of side quests start with this, so their files sort together (`content/quests/side-*.json`). */
export const SIDE_QUEST_PREFIX = 'side-';

const questFields = {
  id: ContentId,
  region: ContentId,
  chapter: z.number().int().min(1),
  title: Text,
  summary: Text,
  /**
   * `side`: a minigame played for fun, offered by a character on the map whenever the child talks to it. It
   * never stands for a lesson: the quest list, the HUD tracker and the arrow follow lessons (`main`) only.
   */
  category: z.enum(['main', 'side']).default('main'),
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
    next: Text,
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
    next: ContentId,
  }),
  /**
   * Textbook lesson the quest plays (`tv2-t1-b01`): the quest list shows its title and printed pages,
   * since teachers set homework by page or lesson title. Required on textbook quests.
   */
  lesson: ContentId.optional(),
  texts: z.record(ContentId, QuestText).default({}),
  /**
   * Where each target stands, and the area of each search step, as the tracker names it ("cổng rừng").
   * Targets sharing a place share the name. Authoring only: the client gets the `goTo` lines.
   */
  places: z.record(ContentId, Text).default({}),
  steps: z.array(QuestStep).min(1),
  reward: RewardSpec,
};

/**
 * A textbook quest says where to go: every step the child walks to has a place, and a step whose place
 * differs from the last one's has a `goTo` line naming it.
 */
function wayfindingIssues(steps: readonly QuestStep[], places: Readonly<Record<string, string>>): string[] {
  const issues: string[] = [];
  const known = new Set(steps.flatMap((s) => [...stepTargets(s), ...(s.kind === 'search' || s.kind === 'find-object' ? [s.id] : [])]));
  for (const key of Object.keys(places)) if (!known.has(key)) issues.push(`places names ${key}, which is neither a target nor a search step`);
  let last: string | null = null;
  for (const step of steps) {
    const walked = step.kind === 'search' || step.kind === 'find-object' || (step.trigger !== 'auto' && step.target !== undefined);
    if (!walked) continue;
    const key = step.kind === 'search' || step.kind === 'find-object' ? step.id : (step.target ?? '');
    const place = places[key];
    if (!place) {
      issues.push(`step ${step.id}: ${key} has no place in "places"`);
      continue;
    }
    if (place !== last && !step.goTo?.toLocaleLowerCase('vi').includes(place.toLocaleLowerCase('vi'))) {
      issues.push(`step ${step.id}: the place changes to "${place}", so it needs a goTo line naming it`);
    }
    last = place;
  }
  return issues;
}

/**
 * A side quest is short and always the same shape: a dialogue at the character who offers it, its one
 * minigame, then the reward and the closing line, which run by themselves.
 */
function sideQuestIssues(q: { id: string; lesson?: string | undefined; steps: QuestStep[] }): string[] {
  const issues: string[] = [];
  if (!q.id.startsWith(SIDE_QUEST_PREFIX)) issues.push(`a side quest id starts with "${SIDE_QUEST_PREFIX}"`);
  if (isTextbookQuest(q.id) || q.lesson) issues.push('a side quest plays no textbook lesson');
  const [first] = q.steps;
  if (first?.kind !== 'dialogue' || first.trigger !== 'interact' || !first.target) issues.push('a side quest starts with a dialogue at the character who offers it');
  const games = q.steps.filter((s) => s.kind === 'challenge' && s.mechanic === 'minigame');
  if (games.length !== 1) issues.push('a side quest holds exactly one minigame step');
  for (const step of q.steps.slice(1)) {
    const allowed = step.kind === 'dialogue' || step.kind === 'reward' || step.kind === 'next' || (step.kind === 'challenge' && step.mechanic === 'minigame');
    if (!allowed) issues.push(`step ${step.id}: a side quest has only dialogue, its minigame, reward and next steps`);
    else if (step.trigger !== 'auto') issues.push(`step ${step.id}: after the first dialogue, side quest steps start by themselves (trigger "auto")`);
  }
  return issues;
}

function questIssues(q: {
  id: string;
  category: 'main' | 'side';
  lesson?: string | undefined;
  phases: Record<(typeof QUEST_PHASES)[number], string>;
  steps: QuestStep[];
  texts: Record<string, QuestText>;
  places: Record<string, string>;
}): string[] {
  const issues: string[] = [];
  const ids = q.steps.map((s) => s.id);
  if (!uniqueIds(ids)) issues.push('duplicate step id');
  let previous = 0;
  for (const phase of QUEST_PHASES) {
    const index = ids.indexOf(q.phases[phase]);
    if (index < 0) issues.push(`phase ${phase} points at unknown step ${q.phases[phase]}`);
    else if (index < previous) issues.push(`phase ${phase} starts before the phase that precedes it`);
    else previous = index;
  }
  for (const step of q.steps) for (const message of stepIssues(step, q.texts, ids)) issues.push(`step ${step.id}: ${message}`);
  const feedbackLines = q.steps.flatMap((s) => ('feedback' in s && s.feedback ? [...s.feedback.right, ...s.feedback.wrong] : []));
  const seen = new Set<string>();
  for (const line of feedbackLines) {
    if (seen.has(line)) issues.push(`feedback line "${line}" is used twice in the quest`);
    seen.add(line);
  }
  if (q.category === 'side') {
    // Played for fun: its own shape instead of the lesson rules (mechanics, wayfinding).
    issues.push(...sideQuestIssues(q));
  } else if (q.id.startsWith(SIDE_QUEST_PREFIX)) {
    issues.push(`a quest whose id starts with "${SIDE_QUEST_PREFIX}" is a side quest ("category": "side")`);
  } else if (isTextbookQuest(q.id)) {
    if (!q.lesson) issues.push('a textbook quest names its lesson ("lesson"), shown with its pages in the quest list');
    for (const step of q.steps) if ('support' in step && !step.feedback) issues.push(`step ${step.id}: a textbook quest step needs feedback lines`);
    issues.push(...wayfindingIssues(q.steps, q.places));
    const interactive = new Set(q.steps.map(mechanicOf).filter((m) => m !== null && INTERACTIVE_MECHANICS.has(m)));
    if (interactive.size < 2) {
      issues.push('a textbook quest needs at least two different interactive challenges (classify, fill-blank, multi-select, clock, calendar, connect, sort, drag-drop)');
    }
  } else if (new Set(q.steps.map(mechanicOf).filter((m) => m !== null)).size < 2) {
    issues.push('needs at least two mechanics other than multiple choice (search, riddle or an interactive challenge)');
  }
  return issues;
}

const questRules = (q: Parameters<typeof questIssues>[0], ctx: z.RefinementCtx) => {
  for (const message of questIssues(q)) ctx.addIssue({ code: 'custom', message });
};

const ActiveQuest = z.strictObject({ ...questFields, status: z.literal('active') }).superRefine(questRules);
/** Being written: same shape and rules as an active quest, but never loaded into the game. */
const DraftQuest = z.strictObject({ ...questFields, status: z.literal('draft') }).superRefine(questRules);

/** Quest data model (Master Plan §11): Quest → Step → Interaction → Challenge, with learning support. */
export const QuestDefinition = z.discriminatedUnion('status', [ActiveQuest, DraftQuest, StubQuest]);
export type QuestDefinition = z.infer<typeof QuestDefinition>;
export type ActiveQuest = z.infer<typeof ActiveQuest>;
export type DraftQuest = z.infer<typeof DraftQuest>;
export type StubQuest = z.infer<typeof StubQuest>;
/** Quests the game can load (drafts never are). */
export type PlayableQuest = ActiveQuest | StubQuest;

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

/**
 * Parent consent text. `requiresLegalReview` marks a draft that must not reach real users; a new
 * `version` asks every parent to consent again.
 */
export const ConsentDocument = z.object({
  version: z.string().min(1).max(32),
  requiresLegalReview: z.boolean(),
  title: z.string().min(1),
  paragraphs: z.array(z.string().min(1)).min(1),
});
export type ConsentDocument = z.infer<typeof ConsentDocument>;

/** Public privacy page (`/privacy`), readable before signing in. */
export const PrivacyDocument = z.object({
  title: z.string().min(1),
  /** Date of the last wording change, `YYYY-MM-DD`. */
  updatedOn: z.iso.date(),
  /** Consent version this page describes; content:check keeps the two in step. */
  consentVersion: z.string().min(1).max(32),
  /** Address for data requests; null until the owner publishes one (the page then points to the self-service tools). */
  contactEmail: z.email().nullable(),
  sections: z.array(z.object({ heading: z.string().min(1), paragraphs: z.array(z.string().min(1)).min(1) })).min(1),
});
export type PrivacyDocument = z.infer<typeof PrivacyDocument>;

/**
 * Cumulative XP needed to reach each level: `thresholds[0]` is level 1 and must be 0.
 * Strictly increasing so every XP total maps to exactly one level.
 */
export const LevelCurve = z
  .object({ thresholds: z.array(z.number().int().min(0)).min(2) })
  .refine((c) => c.thresholds[0] === 0, { message: 'level 1 starts at 0 XP' })
  .refine((c) => c.thresholds.every((v, i, a) => i === 0 || v > (a[i - 1] ?? 0)), { message: 'thresholds must increase' });
export type LevelCurve = z.infer<typeof LevelCurve>;
