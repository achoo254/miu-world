// Region chests on the web (content/region-rewards.json, paid by the server): loading a region's tiers or every
// region's, claiming a tier, and the words the region screen, Home and the quest's reward card use for them.
// Every number is the server's; the client names the tier it claims and nothing else.
import { useEffect, useState } from 'react';
import { nextRegionGoal } from '@miu/quest/region-reward';
import { accessoryArtPath } from '@miu/schema/accessory-art';
import {
  RegionRewardClaimResponse,
  RegionRewardsDto,
  RegionRewardsList,
  type RegionRewardTier,
  type RegionRewardTierDto,
} from '@miu/schema/region-reward';
import { api } from '../api-client';
import { pairOf, type Bilingual, type TextKey } from '../i18n/i18n';
import { assetUrl } from '../kit/ui-art';

export const fetchRegionRewards = (region: string): Promise<RegionRewardsDto> => api('GET', `/regions/${encodeURIComponent(region)}/rewards`, RegionRewardsDto);
export const fetchRegionRewardList = (): Promise<RegionRewardsList> => api('GET', '/region-rewards', RegionRewardsList);
export const claimRegionTier = (region: string, tier: RegionRewardTier): Promise<RegionRewardClaimResponse> =>
  api('POST', `/regions/${encodeURIComponent(region)}/rewards/claim`, RegionRewardClaimResponse, { tier });

/**
 * Loads `load(key)` whenever `key` changes (null: nothing to load); null until it answers, and stays null if it
 * fails: the chests are a bonus, so a screen without them still works. `load` is a module function (stable).
 */
function useLoaded<T>(key: string | null, load: (key: string) => Promise<T>): T | null {
  const [value, setValue] = useState<{ key: string; data: T } | null>(null);
  useEffect(() => {
    if (key === null) return;
    let live = true;
    load(key).then(
      (data) => live && setValue({ key, data }),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [key, load]);
  return value !== null && value.key === key ? value.data : null;
}

/** One region's chest tiers for the selected child (`null`: none asked, loading, or unreachable). */
export function useRegionRewards(region: string | null): RegionRewardsDto | null {
  return useLoaded(region, fetchRegionRewards);
}

/** Every region's chest tiers and the titles she holds (Home, the world map). */
export function useRegionRewardList(): RegionRewardsList | null {
  return useLoaded('all', fetchRegionRewardList);
}

const TIER_KEYS: Readonly<Record<RegionRewardTier, TextKey>> = {
  half: 'reward.tier.half',
  full: 'reward.tier.full',
  stars: 'reward.tier.stars',
  minigames: 'reward.tier.minigames',
};

/** The tier's name ("Quà nửa chặng"). */
export const tierLabel = (tier: RegionRewardTier): Bilingual => pairOf(TIER_KEYS[tier]);

/** What the tier asks, in the child's words. */
export function tierAsk(tier: Pick<RegionRewardTierDto, 'tier' | 'goal'>): Bilingual {
  switch (tier.tier) {
    case 'half':
      return pairOf('reward.ask.half', { goal: tier.goal });
    case 'full':
      return pairOf('reward.ask.full', { goal: tier.goal });
    case 'stars':
      return pairOf('reward.ask.stars', { goal: tier.goal });
    case 'minigames':
      return pairOf('reward.ask.minigames', { goal: tier.goal });
  }
}

/** Tiers reached and not claimed yet. */
export const claimableTiers = (dto: RegionRewardsDto): RegionRewardTierDto[] => dto.tiers.filter((t) => t.reached && !t.claimed);

/**
 * The next thing to tell the child about a region's lessons (null once every lesson tier is claimed): a tier
 * waiting, else how many lessons are missing to the next tier ("Còn 2 nhiệm vụ nữa tới rương!"), else how many
 * lessons still lack three stars.
 */
export function regionGoalLine(dto: RegionRewardsDto): Bilingual | null {
  const goal = nextRegionGoal(dto.tiers);
  switch (goal.kind) {
    case 'claim':
      return pairOf('reward.goal.claim', { tier: tierLabel(goal.tier) });
    case 'lessons':
      return pairOf(goal.tier === 'full' ? 'reward.goal.full' : 'reward.goal.half', { missing: goal.missing });
    case 'stars':
      return pairOf('reward.goal.stars', { missing: goal.missing });
    case 'done':
      return null;
  }
}

/** The picture of an exclusive wearable (`pnpm assets:accessories`). */
export const rewardItemArt = (itemId: string): string => assetUrl(accessoryArtPath(itemId));
