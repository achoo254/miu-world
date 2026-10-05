// Hành trình (owner's mock "Hành trình, Thành tích, Cửa hàng", panels 1–3): how far the player is in every
// region and a timeline of what she did (quests, minigames, things received, level-ups). Built by the server from
// records it already keeps (quest progress, the reward ledger and its dates): nothing new is collected for it.
import { z } from 'zod';
import { ContentId } from './content';

export const JOURNEY_EVENT_KINDS = [
  'quest',
  'minigame',
  'item',
  'chest',
  'collection',
  'gift',
  'achievement',
  'gate',
  'olympiad',
  'mail',
  'level-up',
  'skill-up',
] as const;
export const JourneyEventKind = z.enum(JOURNEY_EVENT_KINDS);
export type JourneyEventKind = z.infer<typeof JourneyEventKind>;

/** The timeline's tabs after "Tất cả": which kinds each shows. */
export const JOURNEY_TABS = {
  quests: ['quest', 'minigame', 'olympiad'],
  items: ['item', 'chest', 'collection', 'gift', 'achievement', 'gate', 'mail'],
  growth: ['level-up', 'skill-up'],
} as const satisfies Record<string, readonly JourneyEventKind[]>;
export const JourneyTab = z.enum(['quests', 'items', 'growth']);
export type JourneyTab = z.infer<typeof JourneyTab>;

export const JourneyEvent = z.object({
  at: z.string(),
  kind: JourneyEventKind,
  /** What it is about: a quest, region, skill, achievement or gate id (null when nothing more is known). */
  ref: ContentId.nullable(),
  /** Its name as the content gives it (a quest title, a skill, an achievement); null when the screen names it. */
  label: z.string().nullable(),
  /** A thing received (a collectible, a wearable, something bought). */
  itemId: ContentId.nullable(),
  /** Its name when the server knows it (a wearable, something from the shop); the screen names collectibles. */
  itemName: z.string().nullable(),
  /** The level reached, for a level-up, a skill-up or a skill gift. */
  level: z.number().int().min(1).nullable(),
  xp: z.number().int(),
  coin: z.number().int(),
});
export type JourneyEvent = z.infer<typeof JourneyEvent>;

export const JourneyRegion = z.object({
  region: ContentId,
  lessons: z.number().int().min(0),
  lessonsDone: z.number().int().min(0),
  threeStars: z.number().int().min(0),
  minigameRuns: z.number().int().min(0),
  /** Region reward tiers claimed (the chest among them). */
  chestTiers: z.number().int().min(0),
});
export type JourneyRegion = z.infer<typeof JourneyRegion>;

/** At most this many events, newest first. */
export const JOURNEY_EVENT_LIMIT = 60;

export const JourneyResponse = z.object({
  regions: z.array(JourneyRegion),
  events: z.array(JourneyEvent),
});
export type JourneyResponse = z.infer<typeof JourneyResponse>;
