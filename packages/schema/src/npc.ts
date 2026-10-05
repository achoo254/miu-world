// The characters of each map (content/npcs/<region>.json): who they are (personality, voice, fears, dreams, a
// secret, a habit), what they say on an ordinary day (by time of day, weather and how close the child is to
// them), who they know on the same map and on others, and their own stories, told chapter by chapter as story
// quests (content/quests/yarn-*.json) with a letter from a character after each. The server keeps one
// friendship per player and character; the client shows it as hearts. Every line ships in Vietnamese and English.
import { z } from 'zod';
import { ContentId } from './content';
import { QuestState } from './game';

const Text = z.string().trim().min(1);
/** A line a child reads in a speech bubble: one or two sentences. */
const LineText = Text.max(180);

/** One line in both languages. */
export const BiText = z.strictObject({ vi: Text, en: Text });
export type BiText = z.infer<typeof BiText>;

/** Parts of the day by the player's own clock: 5–11, 11–17, 17–21, 21–5. */
export const NPC_TIMES = ['morning', 'afternoon', 'evening', 'night'] as const;
export type NpcTime = (typeof NPC_TIMES)[number];
/** The weather where the child plays: rain during a rain shower, snow on a snowy map, fine otherwise. */
export const NPC_WEATHERS = ['fine', 'rain', 'snow'] as const;
export type NpcWeather = (typeof NPC_WEATHERS)[number];
/** Whether a map lies under snow (its fine days are snowy days); everywhere else a shower may pass. */
export const NPC_CLIMATES = ['mild', 'snowy'] as const;

export const MAX_HEARTS = 5;
/** Friendship points each heart needs: a player has as many hearts as these thresholds her points reach. */
export const HEART_POINTS = [2, 6, 12, 20, 30] as const;
/** What raises a friendship: a chat once a day, a liked gift once a day, each story chapter finished once. */
export const FRIENDSHIP_POINTS = { talk: 1, gift: 3, chapter: 5 } as const;

/** An everyday line; untagged lines fit any moment, a tag narrows it (and a tagged line is said first when it fits). */
export const NpcLine = z.strictObject({
  vi: LineText,
  en: LineText,
  when: z.enum(NPC_TIMES).optional(),
  weather: z.enum(NPC_WEATHERS).optional(),
  /** Said only to a friend with at least this many hearts (the closer, the more personal). */
  hearts: z.number().int().min(1).max(MAX_HEARTS).optional(),
  /** Another character the line talks about (its id): characters know each other, on this map and others. */
  about: ContentId.optional(),
});
export type NpcLine = z.infer<typeof NpcLine>;

/** Fewest everyday lines a character has (owner, 03/10/2026: NPC talk was too thin). */
export const MIN_NPC_LINES = 12;

export const NpcProfile = z.strictObject({
  /** Its target id on the map (content/world/targets.json); entries naming it as `character` are the same one. */
  id: ContentId,
  /** Its name as the target catalogue writes it. */
  name: Text,
  /** What it does on the map ("Người lái đò bến sông"). */
  role: BiText,
  personality: BiText,
  /** How it talks: rhythm, pet words. */
  voice: BiText,
  fear: BiText,
  dream: BiText,
  /** Told only to a close friend (hearts, `SECRET_HEARTS`). */
  secret: BiText,
  habit: BiText,
  /** Items it loves to get (content/items); a gift of one raises the friendship. */
  likes: z.array(ContentId).min(1).max(4),
  lines: z.array(NpcLine).min(MIN_NPC_LINES),
});
export type NpcProfile = z.infer<typeof NpcProfile>;

/** Hearts a friendship needs before the character tells its fear, and its secret. */
export const FEAR_HEARTS = 3;
export const SECRET_HEARTS = 4;

export const NPC_RELATION_KINDS = ['family', 'friend', 'neighbour', 'mentor', 'rival', 'pen-pal'] as const;

/** Two characters who know each other (either may be on another map). */
export const NpcRelation = z.strictObject({
  a: ContentId,
  b: ContentId,
  kind: z.enum(NPC_RELATION_KINDS),
  /** How they know each other, in a sentence. */
  note: BiText,
});
export type NpcRelation = z.infer<typeof NpcRelation>;

/** A letter in the mailbox after a chapter: from the storyteller or a character it knows, with a small gift. */
export const StoryLetter = z.strictObject({
  /** The character who writes it (a profiled character of any map). */
  from: ContentId,
  title: BiText,
  body: BiText,
  reward: z.strictObject({
    coins: z.number().int().min(0).max(100).default(0),
    xp: z.number().int().min(0).max(100).default(0),
    items: z.record(ContentId, z.number().int().min(1).max(3)).default({}),
  }),
});
export type StoryLetter = z.infer<typeof StoryLetter>;

export const StoryChapter = z.strictObject({
  /** The chapter's quest (content/quests/yarn-*.json, category story). */
  quest: ContentId,
  /** Hearts the friendship needs before the character offers it when talked to (the quest list always has it). */
  hearts: z.number().int().min(0).max(MAX_HEARTS),
  letter: StoryLetter,
});
export type StoryChapter = z.infer<typeof StoryChapter>;

export const StoryArc = z.strictObject({
  id: ContentId,
  /** The character whose story it is (a profile of the same file). */
  npc: ContentId,
  title: BiText,
  /** The hook the character drops before the first chapter. */
  teaser: BiText,
  chapters: z.array(StoryChapter).min(3).max(5),
});
export type StoryArc = z.infer<typeof StoryArc>;

export const NpcMapFile = z.strictObject({
  version: z.literal(1),
  region: ContentId,
  climate: z.enum(NPC_CLIMATES).default('mild'),
  npcs: z.array(NpcProfile).min(1),
  relations: z.array(NpcRelation).default([]),
  arcs: z.array(StoryArc).default([]),
});
export type NpcMapFile = z.infer<typeof NpcMapFile>;

/** Fewest profiled characters and story arcs an open map has (the first batch of character stories). */
export const MIN_NPCS_PER_MAP = 5;
export const MIN_ARCS_PER_MAP = 2;

/** Hearts for a number of friendship points. */
export function heartsFor(points: number): number {
  return HEART_POINTS.filter((p) => points >= p).length;
}

/** Points the next heart needs, or null at the last heart. */
export function nextHeartAt(points: number): number | null {
  return HEART_POINTS.find((p) => points < p) ?? null;
}

/** The day (YYYY-MM-DD, Vietnam time) a moment falls on: one chat and one gift a day count. */
export function vietnamDay(at: Date): string {
  return new Date(at.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
}

/** The part of the day at an hour (0–23). */
export function timeOfDay(hour: number): NpcTime {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// ---- API (`/api/npcs`) ----

export const NpcFriendshipDto = z.object({
  npc: ContentId,
  points: z.number().int().min(0),
  hearts: z.number().int().min(0).max(MAX_HEARTS),
  /** Points the next heart needs (null at the last one). */
  nextHeartAt: z.number().int().min(1).nullable(),
  /** The chat of today was counted already (one a day raises the friendship). */
  talkedToday: z.boolean(),
  /** A gift was given today already (one a day). */
  giftedToday: z.boolean(),
});
export type NpcFriendshipDto = z.infer<typeof NpcFriendshipDto>;

export const NpcChapterDto = z.object({
  questId: ContentId,
  /** 1-based number of the chapter in its arc. */
  part: z.number().int().min(1),
  title: BiText,
  hearts: z.number().int().min(0).max(MAX_HEARTS),
  state: QuestState,
});
export type NpcChapterDto = z.infer<typeof NpcChapterDto>;

export const NpcArcDto = z.object({ id: ContentId, title: BiText, teaser: BiText, chapters: z.array(NpcChapterDto) });
export type NpcArcDto = z.infer<typeof NpcArcDto>;

/** What the character offers when talked to: the next chapter of its stories, or the hearts the next one waits for. */
export const StoryOffer = z.object({
  questId: ContentId,
  arcId: ContentId,
  part: z.number().int().min(1),
  /** True when the friendship is close enough for the character to tell it now. */
  ready: z.boolean(),
  hearts: z.number().int().min(0).max(MAX_HEARTS),
});
export type StoryOffer = z.infer<typeof StoryOffer>;

export const NpcDto = z.object({
  id: ContentId,
  name: z.string(),
  region: ContentId,
  /** Target ids on the map that are this character. */
  targets: z.array(ContentId),
  role: BiText,
  personality: BiText,
  voice: BiText,
  dream: BiText,
  habit: BiText,
  /** Told once the friendship has FEAR_HEARTS (null before). */
  fear: BiText.nullable(),
  /** Told once the friendship has SECRET_HEARTS (null before). */
  secret: BiText.nullable(),
  likes: z.array(ContentId),
  climate: z.enum(NPC_CLIMATES),
  lines: z.array(NpcLine),
  relations: z.array(z.object({ npc: ContentId, name: z.string(), region: ContentId, kind: z.enum(NPC_RELATION_KINDS), note: BiText })),
  arcs: z.array(NpcArcDto),
  friendship: NpcFriendshipDto,
  offer: StoryOffer.nullable(),
});
export type NpcDto = z.infer<typeof NpcDto>;

export const NpcListResponse = z.object({ npcs: z.array(NpcDto) });
export type NpcListResponse = z.infer<typeof NpcListResponse>;

/** A chat or a gift: the friendship after it, and whether it raised it (false: today's was counted already). */
export const NpcTalkResponse = z.object({ friendship: NpcFriendshipDto, raised: z.boolean(), offer: StoryOffer.nullable() });
export type NpcTalkResponse = z.infer<typeof NpcTalkResponse>;

export const NpcGiftRequest = z.object({ itemId: ContentId });
export type NpcGiftRequest = z.infer<typeof NpcGiftRequest>;

export const NpcGiftResponse = z.object({ friendship: NpcFriendshipDto, itemId: ContentId, left: z.number().int().min(0), offer: StoryOffer.nullable() });
export type NpcGiftResponse = z.infer<typeof NpcGiftResponse>;
