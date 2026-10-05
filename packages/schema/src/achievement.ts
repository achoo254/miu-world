// Thành tích (owner's mock "Hành trình, Thành tích, Cửa hàng", panels 4–6): goals over what the player has
// already done (exploration, learning, minigames, collecting, events), each paying XP, coins and sometimes an
// exclusive wearable once, claimed on a "Chúc mừng!" card. The catalogue is content/progression/achievements.json;
// the server computes every goal's progress from records it already keeps (quest progress, the reward ledger,
// skills, inventories) and pays a claim through the ledger (source `achievement:<id>`, once each).
import { z } from 'zod';
import { ContentId } from './content';
import { ProgressResponse } from './game';
import { AwardItemDto } from './progression';

/** The tabs of the Achievements screen after "Tất cả", in order. */
export const ACHIEVEMENT_CATEGORIES = ['kham-pha', 'hoc-tap', 'minigame', 'suu-tam', 'su-kien'] as const;
export const AchievementCategory = z.enum(ACHIEVEMENT_CATEGORIES);
export type AchievementCategory = z.infer<typeof AchievementCategory>;

/**
 * What an achievement counts, all from existing records. `lessons`: lessons finished (in one region when
 * given); `regions-started` / `regions-complete`: regions with a lesson / all lessons finished; `three-stars`:
 * lessons with three stars; `quest-runs`: lesson runs paid, replays included; `minigame-runs`: minigame runs
 * paid (in one region when given); `minigames-tried`: different minigames played; `boss-wins`: boss quests
 * finished; `player-level`; `skill-level`: one skill's level; `skills-at-level`: skills at `level` or more;
 * `subject-level`: one subject's level; `coins-earned`: coins ever earned (spending does not count);
 * `collectibles`: different collectibles owned; `collection-sets`: full sets claimed; `region-chests`: region
 * chests opened; `region-tiers`: region rewards of any tier claimed; `wearables-owned`: wearables bought or
 * received; `shop-purchases`; `olympiad-runs`; `olympiad-awards`: olympiad runs with an award; `mail-gifts`:
 * mail gifts claimed; `gates-opened`: knowledge gates opened; `skill-gifts`: skill level gifts received.
 */
export const AchievementMetric = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('lessons'), region: ContentId.optional() }),
  z.strictObject({ kind: z.literal('regions-started') }),
  z.strictObject({ kind: z.literal('regions-complete') }),
  z.strictObject({ kind: z.literal('three-stars') }),
  z.strictObject({ kind: z.literal('quest-runs') }),
  z.strictObject({ kind: z.literal('minigame-runs'), region: ContentId.optional() }),
  z.strictObject({ kind: z.literal('minigames-tried') }),
  z.strictObject({ kind: z.literal('boss-wins') }),
  z.strictObject({ kind: z.literal('player-level') }),
  z.strictObject({ kind: z.literal('skill-level'), skill: ContentId }),
  z.strictObject({ kind: z.literal('skills-at-level'), level: z.number().int().min(2).max(10) }),
  z.strictObject({ kind: z.literal('subject-level'), subject: ContentId }),
  z.strictObject({ kind: z.literal('coins-earned') }),
  z.strictObject({ kind: z.literal('collectibles') }),
  z.strictObject({ kind: z.literal('collection-sets') }),
  z.strictObject({ kind: z.literal('region-chests') }),
  z.strictObject({ kind: z.literal('region-tiers') }),
  z.strictObject({ kind: z.literal('wearables-owned') }),
  z.strictObject({ kind: z.literal('shop-purchases') }),
  z.strictObject({ kind: z.literal('olympiad-runs') }),
  z.strictObject({ kind: z.literal('olympiad-awards') }),
  z.strictObject({ kind: z.literal('mail-gifts') }),
  z.strictObject({ kind: z.literal('gates-opened') }),
  z.strictObject({ kind: z.literal('skill-gifts') }),
]);
export type AchievementMetric = z.infer<typeof AchievementMetric>;
export type AchievementMetricKind = AchievementMetric['kind'];

export const AchievementReward = z.strictObject({
  xp: z.number().int().min(0).max(500),
  coin: z.number().int().min(0).max(500),
  /** An exclusive wearable: an item of content/accessories marked `"unlock": { "award": true }`. */
  item: ContentId.optional(),
});
export type AchievementReward = z.infer<typeof AchievementReward>;

export const AchievementEntry = z.strictObject({
  id: ContentId,
  category: AchievementCategory,
  name: z.string().trim().min(1).max(40),
  /** What to do, said to the player (`{name}` filled with her character's name). */
  description: z.string().trim().min(1).max(140),
  /** A UI icon of the web app (`UI_ICONS`), checked by `pnpm content:check`. */
  icon: z.string().min(1),
  metric: AchievementMetric,
  goal: z.number().int().min(1).max(10_000),
  reward: AchievementReward,
});
export type AchievementEntry = z.infer<typeof AchievementEntry>;

export const AchievementCatalog = z
  .strictObject({ version: z.literal(1), achievements: z.array(AchievementEntry).min(1) })
  .refine((c) => new Set(c.achievements.map((a) => a.id)).size === c.achievements.length, { message: 'an achievement id is listed twice' });
export type AchievementCatalog = z.infer<typeof AchievementCatalog>;

/** Ledger source of a claimed achievement: one row per player and achievement, so it pays once. */
export const achievementSource = (id: string): string => `achievement:${id}`;

/** The achievement a ledger source pays; null for any other source. */
export function achievementOfSource(source: string): string | null {
  const match = /^achievement:([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(source);
  return match?.[1] ?? null;
}

/**
 * What the catalogue is checked against. The references are always checked; `reach` (the shipped quests, the
 * number of gates…) is given by `pnpm content:check` so no goal asks for more than the game has.
 */
export interface AchievementContext {
  regions: ReadonlySet<string>;
  skills: ReadonlySet<string>;
  subjects: ReadonlySet<string>;
  /** Every wearable by id; `award`: given only by a skill gift or an achievement. */
  wearables: ReadonlyMap<string, { award: boolean }>;
  /** Wearables the skill gifts already give (an award item has one giver). */
  giftItems?: ReadonlySet<string>;
  icons?: ReadonlySet<string>;
  reach?: {
    /** Lessons by region. */
    lessons: ReadonlyMap<string, number>;
    /** Minigame side quests by region. */
    minigames: ReadonlyMap<string, number>;
    bosses: number;
    collectibles: number;
    collectionSets: number;
    gates: number;
    skillLevels: number;
    playerLevels: number;
  };
}

function maxGoal(metric: AchievementMetric, context: AchievementContext): number | null {
  const reach = context.reach;
  if (!reach) return null;
  const sum = (counts: ReadonlyMap<string, number>): number => [...counts.values()].reduce((a, b) => a + b, 0);
  const regionsWithLessons = [...reach.lessons.values()].filter((n) => n > 0).length;
  switch (metric.kind) {
    case 'lessons':
      return metric.region ? (reach.lessons.get(metric.region) ?? 0) : sum(reach.lessons);
    case 'regions-started':
    case 'regions-complete':
    case 'region-chests':
      return regionsWithLessons;
    case 'three-stars':
      return sum(reach.lessons);
    case 'minigame-runs':
      return metric.region ? ((reach.minigames.get(metric.region) ?? 0) > 0 ? null : 0) : null;
    case 'minigames-tried':
      return sum(reach.minigames);
    case 'boss-wins':
      return reach.bosses;
    case 'player-level':
      return reach.playerLevels;
    case 'skill-level':
    case 'subject-level':
      return reach.skillLevels;
    case 'skills-at-level':
      return context.skills.size;
    case 'collectibles':
      return reach.collectibles;
    case 'collection-sets':
      return reach.collectionSets;
    case 'gates-opened':
      return reach.gates;
    default:
      return null;
  }
}

/** Problems of the catalogue: known regions, skills, subjects and pictures, award items given once, goals in reach. */
export function achievementIssues(catalog: AchievementCatalog, context: AchievementContext): string[] {
  const issues: string[] = [];
  const items = new Set(context.giftItems ?? []);
  const names = new Set<string>();
  const descriptions = new Set<string>();
  for (const entry of catalog.achievements) {
    const where = `achievement ${entry.id}`;
    if (names.has(entry.name)) issues.push(`${where}: the name "${entry.name}" is used twice`);
    if (descriptions.has(entry.description)) issues.push(`${where}: the description is used twice`);
    names.add(entry.name);
    descriptions.add(entry.description);
    const { metric } = entry;
    if ('region' in metric && metric.region !== undefined && !context.regions.has(metric.region)) issues.push(`${where}: unknown region ${metric.region}`);
    if (metric.kind === 'skill-level' && !context.skills.has(metric.skill)) issues.push(`${where}: unknown skill ${metric.skill}`);
    if (metric.kind === 'subject-level' && !context.subjects.has(metric.subject)) issues.push(`${where}: unknown subject ${metric.subject}`);
    if (context.icons && !context.icons.has(entry.icon)) issues.push(`${where}: unknown picture ${entry.icon}`);
    const item = entry.reward.item;
    if (item) {
      const wearable = context.wearables.get(item);
      if (!wearable) issues.push(`${where}: ${item} is not a wearable of content/accessories`);
      else if (!wearable.award) issues.push(`${where}: the accessory ${item} must say "unlock": { "award": true }`);
      if (items.has(item)) issues.push(`${where}: ${item} is already given by another gift`);
      items.add(item);
    }
    const most = maxGoal(metric, context);
    if (most !== null && entry.goal > most) issues.push(`${where}: asks for ${entry.goal}, the game has ${most}`);
  }
  return issues;
}

export const AchievementDto = z.object({
  id: ContentId,
  category: AchievementCategory,
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  /** How far she is, at most the goal. */
  progress: z.number().int().min(0),
  goal: z.number().int().min(1),
  reached: z.boolean(),
  claimed: z.boolean(),
  reward: z.object({ xp: z.number().int().min(0), coin: z.number().int().min(0), item: AwardItemDto.nullable() }),
});
export type AchievementDto = z.infer<typeof AchievementDto>;

export const AchievementListResponse = z.object({ achievements: z.array(AchievementDto) });
export type AchievementListResponse = z.infer<typeof AchievementListResponse>;

export const AchievementClaimResponse = z.object({
  achievement: AchievementDto,
  /** False when it had been claimed before: nothing more was paid. */
  granted: z.boolean(),
  levelBefore: z.number().int().min(1),
  levelAfter: z.number().int().min(1),
  progress: ProgressResponse,
});
export type AchievementClaimResponse = z.infer<typeof AchievementClaimResponse>;
