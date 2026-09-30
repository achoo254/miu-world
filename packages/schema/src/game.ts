import { z } from 'zod';
import { ContentId, QuestStepPublic, RewardSpec } from './content';

// Game DTOs for the active child profile. Diamonds are intentionally absent (not used in the MVP).

export const CharacterDto = z.object({
  species: z.literal('cat'),
  name: z.string(),
  /** Accessory ids from `content/accessories/`, at most one per slot. */
  equipped: z.array(ContentId),
});
export type CharacterDto = z.infer<typeof CharacterDto>;

export const CharacterUpdate = z.object({
  name: z
    .string()
    .min(1)
    .max(40)
    .transform((s) => s.normalize('NFC')),
  equipped: z.array(ContentId).max(8),
});
export type CharacterUpdate = z.infer<typeof CharacterUpdate>;

const Counts = z.record(ContentId, z.number().int().min(0));

export const QuestProgressDto = z.object({
  questId: ContentId,
  completedSteps: z.array(ContentId),
  completed: z.boolean(),
  /** Targets found so far, per search step. */
  found: z.record(ContentId, z.array(ContentId)),
  /** 1–3, fixed when the quest was finished; null before that. */
  stars: z.number().int().min(1).max(3).nullable(),
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

/** What finishing a quest changed; the client shows it as is (stars, Level Up, Skill Up, unlocks). */
export const QuestCompletion = z.object({
  stars: z.number().int().min(1).max(3),
  xpAwarded: z.number().int().min(0),
  levelBefore: z.number().int().min(1),
  levelAfter: z.number().int().min(1),
  /** Quests that became playable (or visible as coming soon) because this one finished. */
  unlocked: z.array(ContentId),
  /** Skills this quest rewarded, with their level before and after. */
  skillLevels: z.array(z.object({ skillId: ContentId, levelBefore: z.number().int().min(1), levelAfter: z.number().int().min(1) })),
});
export type QuestCompletion = z.infer<typeof QuestCompletion>;

export const StepCompleteResponse = z.object({
  /** False when a learning step got a wrong answer: nothing advanced, try again as often as needed. */
  correct: z.boolean(),
  quest: QuestProgressDto,
  /** Reward paid by this step (only the last step pays); on a repeat, the reward recorded the first time. */
  reward: GrantedReward.nullable(),
  /** True when the step had already been recorded: nothing new was granted. */
  repeated: z.boolean(),
  /** Set only by the call that finished the quest. */
  completion: QuestCompletion.nullable(),
  progress: ProgressResponse,
});
export type StepCompleteResponse = z.infer<typeof StepCompleteResponse>;

export const InventoryResponse = z.object({
  items: z.array(z.object({ itemId: ContentId, qty: z.number().int().min(1) })),
});
export type InventoryResponse = z.infer<typeof InventoryResponse>;

/** What the child submits for a learning step; the shape depends on the step kind. */
export const StepAnswer = z.union([
  z.strictObject({ choice: ContentId }),
  z.strictObject({ value: z.number().int() }),
  z.strictObject({ placed: z.array(ContentId).max(100) }),
  z.strictObject({ order: z.array(ContentId).max(100) }),
]);
export type StepAnswer = z.infer<typeof StepAnswer>;

/** Body of a step completion: an answer for learning steps, the found target for search steps. */
export const StepCompleteRequest = z.object({ answer: StepAnswer.optional(), target: ContentId.optional() });
export type StepCompleteRequest = z.infer<typeof StepCompleteRequest>;

/**
 * A quest as the client sees it. Parsing a definition through this schema drops every key it does not
 * list, so answers, support layers and authoring notes never leave the server.
 */
export const QuestView = z.discriminatedUnion('status', [
  z.object({
    id: ContentId,
    region: ContentId,
    chapter: z.number().int().min(1),
    title: z.string(),
    status: z.literal('active'),
    summary: z.string(),
    steps: z.array(QuestStepPublic),
    reward: RewardSpec,
    unlock: z.array(ContentId),
  }),
  z.object({ id: ContentId, region: ContentId, chapter: z.number().int().min(1), title: z.string(), status: z.literal('stub') }),
]);
export type QuestView = z.infer<typeof QuestView>;

export const QuestState = z.enum(['locked', 'open', 'in-progress', 'completed']);
export type QuestState = z.infer<typeof QuestState>;

export const QuestSummary = z.object({ quest: QuestView, state: QuestState, progress: QuestProgressDto });
export type QuestSummary = z.infer<typeof QuestSummary>;

export const QuestListResponse = z.object({ quests: z.array(QuestSummary) });
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
