// What each region chest tier asks and whether the child has reached it, from the facts the server counts:
// her lessons in the region (finished, finished with three stars) and the minigame side quests she played
// there. Pure, so the server decides with it and the screens word the next goal from its result.
import { HALF_SHARE, REGION_REWARD_TIERS, type RegionRewardEntry, type RegionRewardTier } from '@miu/schema/region-reward';

export interface RegionFacts {
  /** Lesson quests of the region (active, category main). */
  lessons: number;
  /** Of them, finished at least once. */
  lessonsDone: number;
  /** Of them, finished with three stars (best run). */
  lessonsThreeStar: number;
  /** Runs of the region's side quests paid so far (replays count). */
  sideRuns: number;
}

export interface TierState {
  tier: RegionRewardTier;
  goal: number;
  progress: number;
  reached: boolean;
  claimed: boolean;
}

/** How many the tier asks for: lessons for the lesson tiers (half rounded up), minigame runs for the bonus. */
export function tierGoal(tier: RegionRewardTier, facts: RegionFacts, minigameGoal: number): number {
  switch (tier) {
    case 'half':
      return Math.ceil(facts.lessons * HALF_SHARE);
    case 'full':
    case 'stars':
      return facts.lessons;
    case 'minigames':
      return minigameGoal;
  }
}

/** How far she is toward the tier's goal. */
export function tierProgress(tier: RegionRewardTier, facts: RegionFacts): number {
  switch (tier) {
    case 'half':
    case 'full':
      return facts.lessonsDone;
    case 'stars':
      return facts.lessonsThreeStar;
    case 'minigames':
      return facts.sideRuns;
  }
}

/** Every tier of a region, in display order. A tier asking for nothing (a region without lessons) is never reached. */
export function regionTiers(facts: RegionFacts, minigameGoal: number, claimed: ReadonlySet<RegionRewardTier>): TierState[] {
  return REGION_REWARD_TIERS.map((tier) => {
    const goal = tierGoal(tier, facts, minigameGoal);
    const progress = Math.min(tierProgress(tier, facts), goal);
    return { tier, goal, progress, reached: goal > 0 && progress >= goal, claimed: claimed.has(tier) };
  });
}

/** The tier's reward in the catalogue: coins, XP, and the item and title it gives (if any). */
export function tierReward(entry: RegionRewardEntry, tier: RegionRewardTier): { coin: number; xp: number; item: string | null; title: string | null } {
  switch (tier) {
    case 'full':
      return { coin: entry.full.coin, xp: entry.full.xp, item: entry.full.item, title: entry.title };
    case 'stars':
      return { coin: entry.stars.coin, xp: entry.stars.xp, item: entry.stars.item, title: null };
    case 'half':
    case 'minigames':
      return { coin: entry[tier].coin, xp: entry[tier].xp, item: null, title: null };
  }
}

/** What the child should hear next about a region's lesson tiers. */
export type RegionGoal =
  | { kind: 'claim'; tier: RegionRewardTier }
  | { kind: 'lessons'; tier: 'half' | 'full'; missing: number }
  | { kind: 'stars'; missing: number }
  | { kind: 'done' };

/**
 * The next thing to say about a region: a tier waiting to be claimed first, else the lessons still missing for
 * the next lesson tier, else the lessons still short of three stars, else nothing left.
 */
export function nextRegionGoal(tiers: readonly Pick<TierState, 'tier' | 'goal' | 'progress' | 'reached' | 'claimed'>[]): RegionGoal {
  const waiting = tiers.find((t) => t.reached && !t.claimed);
  if (waiting) return { kind: 'claim', tier: waiting.tier };
  for (const t of tiers) {
    if (t.reached || t.goal === 0) continue;
    if (t.tier === 'half' || t.tier === 'full') return { kind: 'lessons', tier: t.tier, missing: t.goal - t.progress };
    if (t.tier === 'stars') return { kind: 'stars', missing: t.goal - t.progress };
  }
  return { kind: 'done' };
}
