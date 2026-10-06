// Limited-time events of the living world (Master Plan §6 "Live World", §8 tier 3). An event is data only
// (content/events/<id>.json): its name and words in both languages, its windows in Vietnam time, the quests it
// opens, the limited rewards it gives, and the characters and decorations it puts on its map while it is on.
// Adding, changing or removing an event is a content change, never a code change. Whether a window is open is
// decided by the server's clock alone (packages/quest/src/live-event.ts), never by the player's device.
import { z } from 'zod';
import { ContentId } from './content';

const Text = z.string().trim().min(1);
/** A line in both languages (the bilingual display, docs/i18n.md). */
export const BiText = z.strictObject({ vi: Text, en: Text });
export type BiText = z.infer<typeof BiText>;

/**
 * A moment in Vietnam time, written with its offset so nobody reads it in another zone:
 * `2026-10-06T00:00:00+07:00` (seconds optional).
 */
export const VietnamTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?\+07:00$/, 'a time in Vietnam time, as 2026-10-06T00:00:00+07:00')
  .refine((s) => Number.isFinite(Date.parse(s)), 'not a real date');

/**
 * When the event is on. `live`: the event itself; `commemorative`: a later reopening (owner, 04/10/2026: a limited
 * item missed is never lost for good) whose limited rewards are the commemorative editions. `endsAt` is exclusive.
 */
export const EVENT_WINDOW_KINDS = ['live', 'commemorative'] as const;
export const EventWindow = z.strictObject({
  kind: z.enum(EVENT_WINDOW_KINDS),
  startsAt: VietnamTime,
  endsAt: VietnamTime,
});
export type EventWindow = z.infer<typeof EventWindow>;

/**
 * What earns a limited reward within one window: every quest of the event finished in it (`quests`), or a mock exam
 * of the event's practice scoring at least `score` out of 100 in it (`exam-score`).
 */
export const EventGoal = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('quests') }),
  z.strictObject({ kind: z.literal('exam-score'), score: z.number().int().min(1).max(100) }),
]);
export type EventGoal = z.infer<typeof EventGoal>;

/**
 * A limited reward: a badge (an item of content/items, kept in the backpack) or a wearable (an item of
 * content/accessories marked `"unlock": { "award": true }`, kept in the wardrobe). It is given once per window kind:
 * `item` in a live window, `commemorativeItem` (its commemorative edition) in a commemorative one. What was received
 * stays with the player for good, after the event too.
 */
export const EVENT_REWARD_KINDS = ['badge', 'wearable'] as const;
export const EventReward = z.strictObject({
  id: ContentId,
  kind: z.enum(EVENT_REWARD_KINDS),
  item: ContentId,
  commemorativeItem: ContentId,
  name: BiText,
  goal: EventGoal,
});
export type EventReward = z.infer<typeof EventReward>;

const vec3 = z.tuple([z.number(), z.number(), z.number()]);
const ModelPath = z.string().regex(/^(packs|generated)\/[a-z0-9./_-]+\.glb$/i);

/**
 * Someone or something the event puts on its map while a window is open: a character the player talks to (`npc`,
 * where an event quest starts) or a thing a quest step looks for (`object`). Same fields as a map's interactable.
 */
export const EventCharacter = z
  .strictObject({
    id: ContentId,
    kind: z.enum(['npc', 'object']),
    name: Text,
    /** Name in English, shown on the event page in the English display. */
    nameEn: Text,
    /** Action shown on the interaction prompt. */
    label: Text,
    position: vec3,
    yaw: z.number(),
    radius: z.number().positive().max(6),
    model: ModelPath,
    scale: z.number().positive(),
    animation: z.string().min(1).optional(),
    tint: z.string().regex(/^#[0-9a-f]{6}$/).optional(),
    /** Something only one of the event's quests looks for: in the world only while that quest is played. */
    quest: ContentId.optional(),
  })
  .refine((c) => c.kind !== 'npc' || c.animation !== undefined, { message: 'a character plays its idle clip (animation)' });
export type EventCharacter = z.infer<typeof EventCharacter>;

/** A decoration standing on the map while a window is open (flags, lanterns, a stall): no quest points at it. */
export const EventDecoration = z.strictObject({
  model: ModelPath,
  position: vec3,
  yaw: z.number(),
  scale: z.number().positive(),
});
export type EventDecoration = z.infer<typeof EventDecoration>;

/** What the event adds to its map at runtime: no map is generated again for it (a layer the game puts on top). */
export const EventScene = z.strictObject({
  characters: z.array(EventCharacter).min(1),
  decorations: z.array(EventDecoration).default([]),
  /** Where the event page's "go to the event" walks the player: the character who opens the first quest. */
  meetAt: ContentId,
});
export type EventScene = z.infer<typeof EventScene>;

/** Event practice the event page opens (content/olympiad): its mock exam scores the `exam-score` goals. */
export const EVENT_PRACTICES = ['olympic-math'] as const;

export const LiveEvent = z.strictObject({
  version: z.literal(1),
  id: ContentId,
  name: BiText,
  /** One line under the name on the Home banner. */
  tagline: BiText,
  /** The event page's paragraph: what it is and what there is to do. */
  description: BiText,
  /** What the event's host says on the event page (`{name}`: the player's character). */
  greeting: BiText,
  /** A UI icon of the web app (apps/web/src/ui/kit/ui-art.ts `UI_ICONS`). */
  icon: Text,
  /** The region whose map the event's scene stands on and whose quests it opens. */
  region: ContentId,
  /** Days before a window opens that Home already shows the event as "coming soon"; 0: not before it opens. */
  announceDays: z.number().int().min(0).max(30).default(7),
  windows: z.array(EventWindow).min(1),
  /** Quests the event opens (category `event`), in the order the event page lists them. */
  quests: z.array(ContentId).min(1),
  practice: z.enum(EVENT_PRACTICES).optional(),
  rewards: z.array(EventReward).min(1),
  scene: EventScene,
});
export type LiveEvent = z.infer<typeof LiveEvent>;

export interface LiveEventContext {
  /** Every quest by id, with its category and region. */
  quests: ReadonlyMap<string, { category: string; region: string }>;
  /** Item ids of content/items. */
  items: ReadonlySet<string>;
  /** Every wearable by id; `award`: never sold, given by a gift, an achievement or an event. */
  wearables: ReadonlyMap<string, { award: boolean }>;
  /** Region ids of content/world/regions.json. */
  regions: ReadonlySet<string>;
  /** UI icon keys of the web app. */
  icons?: ReadonlySet<string>;
}

const unique = (ids: readonly string[]): boolean => new Set(ids).size === ids.length;

/** Problems of one event file that the schema cannot see: windows in order, known quests, items and characters. */
export function liveEventIssues(event: LiveEvent, ctx: LiveEventContext): string[] {
  const issues: string[] = [];
  if (!ctx.regions.has(event.region)) issues.push(`region ${event.region} is not a region of content/world/regions.json`);
  if (ctx.icons && !ctx.icons.has(event.icon)) issues.push(`icon ${event.icon} is not a UI icon of the web app`);
  let lastEnd = -Infinity;
  for (const [i, w] of event.windows.entries()) {
    const start = Date.parse(w.startsAt);
    const end = Date.parse(w.endsAt);
    if (end <= start) issues.push(`window ${i + 1} ends before it starts`);
    if (start < lastEnd) issues.push(`window ${i + 1} starts before the window before it ends (windows are in order and never overlap)`);
    lastEnd = Math.max(lastEnd, end);
  }
  if (event.windows[0]?.kind !== 'live') issues.push('the first window is the live event itself (kind "live"); commemorative ones come after it');
  if (!unique(event.quests)) issues.push('a quest is listed twice');
  for (const id of event.quests) {
    const quest = ctx.quests.get(id);
    if (!quest) issues.push(`quest ${id} is not in content/quests`);
    else if (quest.category !== 'event') issues.push(`quest ${id} is not an event quest ("category": "event")`);
    else if (quest.region !== event.region) issues.push(`quest ${id} plays in ${quest.region}, the event in ${event.region}`);
  }
  if (!unique(event.rewards.map((r) => r.id))) issues.push('two rewards share an id');
  const given = event.rewards.flatMap((r) => [r.item, r.commemorativeItem]);
  if (!unique(given)) issues.push('an item is given by two rewards (or is its own commemorative edition)');
  for (const reward of event.rewards) {
    for (const item of [reward.item, reward.commemorativeItem]) {
      if (reward.kind === 'badge' && !ctx.items.has(item)) issues.push(`reward ${reward.id}: badge ${item} is not in content/items`);
      if (reward.kind === 'wearable') {
        const wearable = ctx.wearables.get(item);
        if (!wearable) issues.push(`reward ${reward.id}: wearable ${item} is not in content/accessories`);
        else if (!wearable.award) issues.push(`reward ${reward.id}: wearable ${item} must say "unlock": { "award": true } (never sold)`);
      }
    }
    if (reward.goal.kind === 'exam-score' && !event.practice) issues.push(`reward ${reward.id}: an exam-score goal needs the event's practice (its mock exam)`);
  }
  const characters = event.scene.characters.map((c) => c.id);
  if (!unique(characters)) issues.push('two scene characters share an id');
  if (!characters.includes(event.scene.meetAt)) issues.push(`scene.meetAt ${event.scene.meetAt} is not one of the scene's characters`);
  for (const c of event.scene.characters) if (c.quest && !event.quests.includes(c.quest)) issues.push(`scene character ${c.id} belongs to quest ${c.quest}, which is not one of the event's`);
  return issues;
}

// What the server says of the events now (`GET /api/events`, `GET /api/events/:id`): only events a player may see now
// (a window open, or the next one opening within the announce days), with the state the server's clock gives them.

export const EVENT_STATES = ['upcoming', 'live', 'commemorative'] as const;
export const EventStateDto = z.enum(EVENT_STATES);

/** A limited reward as one player stands with it in the window shown: earned already, or how far she is. */
export const EventRewardDto = z.strictObject({
  id: ContentId,
  kind: z.enum(EVENT_REWARD_KINDS),
  /** The item this window gives (the commemorative edition in a commemorative window). */
  item: ContentId,
  commemorative: z.boolean(),
  name: BiText,
  goal: EventGoal,
  /** Received in this window (it stays with her after the event too). */
  earned: z.boolean(),
  /** Progress toward the goal in this window: quests finished, or the best mock exam score. */
  progress: z.number().int().min(0),
  target: z.number().int().min(1),
});
export type EventRewardDto = z.infer<typeof EventRewardDto>;

export const EventQuestDto = z.strictObject({
  id: ContentId,
  title: BiText,
  /** The character it starts at, in both languages (the scene's character). */
  keeper: BiText,
  keeperId: ContentId,
  /** Finished in this window. */
  done: z.boolean(),
});
export type EventQuestDto = z.infer<typeof EventQuestDto>;

export const EventSceneDto = z.strictObject({
  characters: z.array(z.strictObject({
    id: ContentId,
    kind: z.enum(['npc', 'object']),
    name: z.string(),
    label: z.string(),
    position: vec3,
    yaw: z.number(),
    radius: z.number(),
    model: z.string(),
    scale: z.number(),
    animation: z.string().optional(),
    tint: z.string().optional(),
    quest: ContentId.optional(),
  })),
  decorations: z.array(EventDecoration),
  meetAt: ContentId,
});
export type EventSceneDto = z.infer<typeof EventSceneDto>;

export const LiveEventDto = z.strictObject({
  id: ContentId,
  name: BiText,
  tagline: BiText,
  description: BiText,
  greeting: BiText,
  icon: z.string(),
  region: ContentId,
  state: EventStateDto,
  /** First and last day of the window shown (Vietnam time, `YYYY-MM-DD`). */
  firstDay: z.string(),
  lastDay: z.string(),
  /** Days left in the open window (any part of a day counts), or days until it opens. */
  daysLeft: z.number().int().min(1).nullable(),
  daysUntilStart: z.number().int().min(1).nullable(),
  /** Milliseconds until the state changes (the window opens or closes): the client asks again then. */
  changesInMs: z.number().int().min(0),
  quests: z.array(EventQuestDto),
  practice: z.enum(EVENT_PRACTICES).nullable(),
  /** Best mock exam score in this window (null: none yet). */
  bestExamScore: z.number().int().min(0).max(100).nullable(),
  rewards: z.array(EventRewardDto),
  scene: EventSceneDto,
});
export type LiveEventDto = z.infer<typeof LiveEventDto>;

export const LiveEventListResponse = z.strictObject({ events: z.array(LiveEventDto) });
export type LiveEventListResponse = z.infer<typeof LiveEventListResponse>;

/** A limited reward just received (a quest run or a mock exam earned it), for the Event Reward screen. */
export const EventRewardGrant = z.strictObject({
  eventId: ContentId,
  eventName: BiText,
  rewardId: ContentId,
  kind: z.enum(EVENT_REWARD_KINDS),
  item: ContentId,
  name: BiText,
  commemorative: z.boolean(),
});
export type EventRewardGrant = z.infer<typeof EventRewardGrant>;
