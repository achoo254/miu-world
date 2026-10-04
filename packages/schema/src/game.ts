import { z } from 'zod';
import { ContentId, MAX_MINIGAME_SCORE, QuestStepPublic, RewardSpec, WEEKDAYS } from './content';

// Game DTOs for the active child profile. Diamonds are intentionally absent (not used in the MVP).

export const CharacterDto = z.object({
  /** Species id from `content/species.json` (cat, rabbit, fox, bear...). */
  species: ContentId,
  name: z.string(),
  /** Accessory ids from `content/accessories/`, at most one per slot. */
  equipped: z.array(ContentId),
  /** Pet id from `content/pets.json` that trots after the character, or none. */
  pet: ContentId.nullable().default(null),
});
export type CharacterDto = z.infer<typeof CharacterDto>;

export const CharacterUpdate = z.object({
  name: z
    .string()
    .min(1)
    .max(40)
    .transform((s) => s.normalize('NFC')),
  /** One item per slot (the server checks it); room for every slot, the clothes and the vehicle included. */
  equipped: z.array(ContentId).max(16),
  /** Left out: the species stays as it is. */
  species: ContentId.optional(),
  /** Left out: the pet stays as it is; null: no pet. */
  pet: ContentId.nullable().optional(),
});
export type CharacterUpdate = z.infer<typeof CharacterUpdate>;

const Counts = z.record(ContentId, z.number().int().min(0));

export const BossState = z.object({ hp: z.number().int(), answered: z.array(ContentId) });
export type BossState = z.infer<typeof BossState>;

export const QuestProgressDto = z.object({
  questId: ContentId,
  completedSteps: z.array(ContentId),
  completed: z.boolean(),
  /** Targets found so far, per search step. */
  found: z.record(ContentId, z.array(ContentId)),
  /** Boss battle states: current HP and answered turn ids per boss step. */
  bossState: z.record(ContentId, BossState).optional(),
  /** 1–3, the best of the quest's finished runs; null before the first. */
  stars: z.number().int().min(1).max(3).nullable(),
  /**
   * The run the completed steps belong to: 1 the first time. A finished quest can be played again and pays
   * again (owner, 03/10/2026): its next run is `run + 1`, named in every step request of that run. Absent: 1.
   */
  run: z.number().int().min(1).optional(),
});
export type QuestProgressDto = z.infer<typeof QuestProgressDto>;

const SkillLevel = z.object({ skillId: ContentId, name: z.string(), xp: z.number().int().min(0), level: z.number().int().min(1) });

/** Subject level aggregates its skills (Master Plan §5): the summed skill XP on the skill curve. */
export const SubjectProgress = z.object({
  subjectId: ContentId,
  name: z.string(),
  xp: z.number().int().min(0),
  level: z.number().int().min(1),
  skills: z.array(SkillLevel),
});
export type SubjectProgress = z.infer<typeof SubjectProgress>;

export const ProgressResponse = z.object({
  quests: z.array(QuestProgressDto),
  xp: z.number().int().min(0),
  level: z.number().int().min(1),
  xpIntoLevel: z.number().int().min(0),
  xpForNextLevel: z.number().int().min(1).nullable(),
  coins: z.number().int().min(0),
  skillXp: Counts,
  items: Counts,
  subjects: z.array(SubjectProgress),
});
export type ProgressResponse = z.infer<typeof ProgressResponse>;

export const GrantedReward = z.object({
  xp: z.number().int().min(0),
  coin: z.number().int().min(0),
  skillXp: Counts,
  items: Counts,
});

/** What finishing a quest changed; the client shows it as is (stars, Level Up, Skill Up). */
/**
 * A line the child copies into her vở (owner, 03/10/2026): a step's question and its answer as the book
 * writes it (the author's answer text). Sent only once the step is done, so it never gives an answer away.
 */
export const NotebookLine = z.object({ step: ContentId, question: z.string(), answer: z.string() });
export type NotebookLine = z.infer<typeof NotebookLine>;

export const CollectibleDrop = z.object({ itemId: ContentId, mapId: ContentId, owned: z.number().int().positive() });
export type CollectibleDrop = z.infer<typeof CollectibleDrop>;

export const QuestCompletion = z.object({
  stars: z.number().int().min(1).max(3),
  xpAwarded: z.number().int().min(0),
  levelBefore: z.number().int().min(1),
  levelAfter: z.number().int().min(1),
  /** Skills this quest rewarded, with their level before and after. */
  skillLevels: z.array(z.object({ skillId: ContentId, levelBefore: z.number().int().min(1), levelAfter: z.number().int().min(1) })),
  /** Every question of the quest with its answer, to copy into the vở before the reward. */
  notebook: z.array(NotebookLine).optional(),
  /** The collectible this run dropped (content/collectibles.json), with how many she owns now (1: a new one). */
  collectible: CollectibleDrop.nullish(),
});
export type QuestCompletion = z.infer<typeof QuestCompletion>;

export const StepCompleteResponse = z.object({
  /** False when a learning step got a wrong answer: nothing advanced, try again as often as needed. */
  correct: z.boolean(),
  /** A character's line for this answer, never the same as the previous try (null when the step has none). */
  feedback: z.string().nullable(),
  quest: QuestProgressDto,
  /** Reward paid by this step (only the last step pays); on a repeat, the reward recorded the first time. */
  reward: GrantedReward.nullable(),
  /** True when the step had already been recorded: nothing new was granted. */
  repeated: z.boolean(),
  /** Set only by the call that finished the quest. */
  completion: QuestCompletion.nullable(),
  /** A right answer to a question: the question and its answer to copy into the vở now. */
  copy: NotebookLine.nullish(),
  progress: ProgressResponse,
});
export type StepCompleteResponse = z.infer<typeof StepCompleteResponse>;

export const InventoryResponse = z.object({
  items: z.array(z.object({ itemId: ContentId, qty: z.number().int().min(1) })),
});
export type InventoryResponse = z.infer<typeof InventoryResponse>;

/** Id → id map from the child (item → group, blank → option), bounded like the lists. */
const IdMap = z.record(ContentId, ContentId).refine((m) => Object.keys(m).length <= 50, { message: 'too many entries' });

/** What the child submits for a learning step; the shape depends on the step kind. */
export const StepAnswer = z.union([
  z.strictObject({ choice: ContentId }),
  z.strictObject({ turnId: ContentId, choice: ContentId }),
  z.strictObject({ value: z.number().int() }),
  z.strictObject({ placed: z.array(ContentId).max(100) }),
  z.strictObject({ order: z.array(ContentId).max(100) }),
  z.strictObject({ assignment: IdMap }),
  z.strictObject({ fills: IdMap }),
  z.strictObject({ choices: z.array(ContentId).max(50) }),
  z.strictObject({ hour: z.number().int().min(0).max(23), minute: z.number().int().min(0).max(59) }),
  z.strictObject({ day: z.number().int().min(1).max(31) }),
  z.strictObject({ weekday: z.enum(WEEKDAYS) }),
  z.strictObject({ edges: z.array(z.tuple([ContentId, ContentId])).max(50) }),
  /** A minigame round's score. */
  z.strictObject({ score: z.number().int().min(0).max(MAX_MINIGAME_SCORE) }),
]);
export type StepAnswer = z.infer<typeof StepAnswer>;

/**
 * Body of a step completion: an answer for learning steps, the found target for search steps, and the run it
 * belongs to (`QuestProgressDto.run`). A finished quest only moves with the number of its next run, so a
 * request sent twice never pays twice.
 */
export const StepCompleteRequest = z.object({ answer: StepAnswer.optional(), target: ContentId.optional(), run: z.number().int().min(1).max(1_000_000).optional() });
export type StepCompleteRequest = z.infer<typeof StepCompleteRequest>;

/** Textbook lesson a quest plays, as printed: teachers set homework by page or by lesson title. */
export const QuestTextbook = z.object({
  /** "Tiếng Việt 2, tập một" */
  book: z.string(),
  /** "Bài 1. Tôi là học sinh lớp 2" */
  lesson: z.string(),
  /** First and last printed page. */
  pages: z.tuple([z.number().int(), z.number().int()]),
});
export type QuestTextbook = z.infer<typeof QuestTextbook>;

/**
 * A quest as the client sees it. Parsing a definition through this schema drops every key it does not
 * list, so answers, support layers and authoring notes never leave the server. Draft quests are never
 * loaded, so they have no view.
 */

export const QuestView = z.discriminatedUnion('status', [
  z.object({
    id: ContentId,
    region: ContentId,
    chapter: z.number().int().min(1),
    title: z.string(),
    status: z.literal('active'),
    summary: z.string(),
    /** `side`: a minigame side quest, listed apart from the lessons (`GET /quests?category=side`). Absent: main. */
    category: z.enum(['main', 'side']).optional(),
    /** Passages the read steps point at (`textRef`). */
    texts: z.record(
      ContentId,
      z.object({
        title: z.string(),
        author: z.string().optional(),
        body: z.string(),
        glossary: z.array(z.object({ term: z.string(), meaning: z.string() })).optional(),
      }),
    ),
    steps: z.array(QuestStepPublic),
    reward: RewardSpec,
    textbook: QuestTextbook.optional(),
  }),
  z.object({ id: ContentId, region: ContentId, chapter: z.number().int().min(1), title: z.string(), status: z.literal('stub') }),
]);
export type QuestView = z.infer<typeof QuestView>;

/** Every quest is open from the start: no quest or map is ever locked behind another. */
export const QuestState = z.enum(['open', 'in-progress', 'completed']);
export type QuestState = z.infer<typeof QuestState>;

export const QuestSummary = z.object({ quest: QuestView, state: QuestState, progress: QuestProgressDto });
export type QuestSummary = z.infer<typeof QuestSummary>;

export const QuestListResponse = z.object({ quests: z.array(QuestSummary) });
/** `GET /quests` lists the lessons; `?category=side` the side quests instead. */
export const QuestCategory = z.enum(['main', 'side']);
export type QuestCategory = z.infer<typeof QuestCategory>;
export type QuestListResponse = z.infer<typeof QuestListResponse>;

export const SupportLayer = z.enum(['guide', 'hint', 'answer']);
export type SupportLayer = z.infer<typeof SupportLayer>;
export const SupportRequest = z.object({ layer: SupportLayer });

/** One support layer, handed out only on request so the server can count it. */
export const SupportResponse = z.discriminatedUnion('layer', [
  z.object({ layer: z.literal('guide'), steps: z.array(z.string()) }),
  z.object({ layer: z.literal('hint'), text: z.string() }),
  z.object({ layer: z.literal('answer'), text: z.string(), explanation: z.string() }),
]);
export type SupportResponse = z.infer<typeof SupportResponse>;
