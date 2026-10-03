// Region chests (owner, 03/10/2026: "khi hoàn thành hết nhiệm vụ ko thấy phần thưởng thêm j đặc biệt"): every
// region pays a reward for its lessons played, in tiers the child claims on the region screen. The catalogue
// is content/region-rewards.json; the server alone decides what is reached and pays it through the ledger
// (source `region:<id>:<tier>`, once each).
import { z } from 'zod';
import { ContentId } from './content';
import { ProgressResponse } from './game';

/**
 * The tiers, in the order the region screen shows them: half of the region's lessons done, all of them (the
 * chest, with its exclusive item and the title), all of them with three stars (an extra item), and a small
 * bonus for minigame side quests played there.
 */
export const REGION_REWARD_TIERS = ['half', 'full', 'stars', 'minigames'] as const;
export const RegionRewardTier = z.enum(REGION_REWARD_TIERS);
export type RegionRewardTier = z.infer<typeof RegionRewardTier>;

/** Share of the region's lessons the first tier asks for (rounded up). */
export const HALF_SHARE = 0.5;

/** Ledger source of a tier claimed: one row per child, region and tier, so a claim pays once. */
export const regionRewardSource = (region: string, tier: RegionRewardTier): string => `region:${region}:${tier}`;
/** Ledger sources of every tier of one region start with this. */
export const regionRewardPrefix = (region: string): string => `region:${region}:`;

/** The region and tier a ledger source pays; null for any other source. */
export function regionRewardOfSource(source: string): { region: string; tier: RegionRewardTier } | null {
  const match = /^region:([a-z0-9]+(?:-[a-z0-9]+)*):([a-z]+)$/.exec(source);
  const tier = RegionRewardTier.safeParse(match?.[2]);
  return match?.[1] && tier.success ? { region: match[1], tier: tier.data } : null;
}

const Text = z.string().trim().min(1).max(40);
const TierReward = z.strictObject({ coin: z.number().int().min(0).max(500), xp: z.number().int().min(0).max(1000) });
/** A tier with an exclusive wearable: an item of content/accessories marked `"unlock": { "region": <this region> }`. */
const ItemTierReward = TierReward.extend({ item: ContentId });

export const RegionRewardEntry = z.strictObject({
  region: ContentId,
  /** The title the chest gives ("Nhà thám hiểm rừng xanh"), shown on Home and the region screen. */
  title: Text,
  half: TierReward,
  full: ItemTierReward,
  stars: ItemTierReward,
  minigames: TierReward,
});
export type RegionRewardEntry = z.infer<typeof RegionRewardEntry>;

export const RegionRewardCatalog = z
  .strictObject({
    version: z.literal(1),
    /** Side-quest minigames (runs, replays included) played in a region for its small bonus. */
    minigameGoal: z.number().int().min(1).max(50),
    regions: z.array(RegionRewardEntry).min(1),
  })
  .refine((c) => new Set(c.regions.map((r) => r.region)).size === c.regions.length, { message: 'a region is listed twice' });
export type RegionRewardCatalog = z.infer<typeof RegionRewardCatalog>;

/** What the region rewards are checked against. */
export interface RegionRewardContext {
  /** Every region of content/world/regions.json; `open`: playable. */
  regions: ReadonlyMap<string, { open: boolean }>;
  /** Every wearable by id, with the region whose chest opens it (none: not a chest item). */
  wearables: ReadonlyMap<string, { region: string | undefined }>;
  /** Lesson quests per region; left out, not checked (the server's tests play fixture quests). */
  lessons?: ReadonlyMap<string, number>;
}

/**
 * Problems of the catalogue against the content: every open region has a chest and only regions do; each
 * item is a wearable of its own region, given once; every region's wearable is given by its region's chest;
 * and, when lesson counts are known, every region has a lesson to play for it.
 */
export function regionRewardIssues(catalog: RegionRewardCatalog, context: RegionRewardContext): string[] {
  const issues: string[] = [];
  const given = new Map<string, string>();
  for (const entry of catalog.regions) {
    const region = context.regions.get(entry.region);
    if (!region) issues.push(`region reward for unknown region ${entry.region}`);
    else if (!region.open) issues.push(`region reward for ${entry.region}, which is not open`);
    if (context.lessons && (context.lessons.get(entry.region) ?? 0) === 0) issues.push(`region ${entry.region} has a chest but no lesson quest to earn it`);
    for (const item of [entry.full.item, entry.stars.item]) {
      const wearable = context.wearables.get(item);
      if (!wearable) issues.push(`region ${entry.region} gives ${item}, which is not a wearable of content/accessories`);
      else if (wearable.region !== entry.region) issues.push(`region ${entry.region} gives ${item}: the accessory must say "unlock": { "region": "${entry.region}" }`);
      if (given.has(item)) issues.push(`${item} is given by two chests (${given.get(item) ?? ''}, ${entry.region})`);
      given.set(item, entry.region);
    }
  }
  const listed = new Set(catalog.regions.map((r) => r.region));
  for (const [id, region] of context.regions) if (region.open && !listed.has(id)) issues.push(`open region ${id} has no chest in content/region-rewards.json`);
  for (const [id, wearable] of context.wearables) {
    if (wearable.region !== undefined && given.get(id) !== wearable.region) issues.push(`accessory ${id} opens with the chest of ${wearable.region}, which does not give it`);
  }
  return issues;
}

export const RegionRewardItemDto = z.object({ id: ContentId, name: z.string(), slot: z.string() });
export type RegionRewardItemDto = z.infer<typeof RegionRewardItemDto>;

/** One tier as the region screen shows it: what it asks (`goal`), how far she is, and what it gives. */
export const RegionRewardTierDto = z.object({
  tier: RegionRewardTier,
  goal: z.number().int().min(0),
  progress: z.number().int().min(0),
  reached: z.boolean(),
  claimed: z.boolean(),
  coin: z.number().int().min(0),
  xp: z.number().int().min(0),
  item: RegionRewardItemDto.nullable(),
  /** The full chest's title. */
  title: z.string().nullable(),
});
export type RegionRewardTierDto = z.infer<typeof RegionRewardTierDto>;

/** A region's rewards for the selected child: her lessons there (done, with three stars), minigames played, the tiers. */
export const RegionRewardsDto = z.object({
  region: ContentId,
  title: z.string(),
  lessons: z.number().int().min(0),
  lessonsDone: z.number().int().min(0),
  lessonsThreeStar: z.number().int().min(0),
  sideRuns: z.number().int().min(0),
  tiers: z.array(RegionRewardTierDto),
});
export type RegionRewardsDto = z.infer<typeof RegionRewardsDto>;

/** Every region's rewards (Home and the world map mark the ones with a tier to claim) and the titles she holds, first earned first. */
export const RegionRewardsList = z.object({ regions: z.array(RegionRewardsDto), titles: z.array(z.string()) });
export type RegionRewardsList = z.infer<typeof RegionRewardsList>;

/** "Nhận thưởng": the tier only; what it pays is the server's. */
export const RegionRewardClaimRequest = z.object({ tier: RegionRewardTier });
export type RegionRewardClaimRequest = z.infer<typeof RegionRewardClaimRequest>;

/**
 * The region after the claim, the tier claimed, whether this call paid it (false: paid before, a resend), the
 * level before and after, and her totals for the badge.
 */
export const RegionRewardClaimResponse = RegionRewardsDto.extend({
  claimed: RegionRewardTier,
  granted: z.boolean(),
  levelBefore: z.number().int().min(1),
  levelAfter: z.number().int().min(1),
  progress: ProgressResponse,
});
export type RegionRewardClaimResponse = z.infer<typeof RegionRewardClaimResponse>;
