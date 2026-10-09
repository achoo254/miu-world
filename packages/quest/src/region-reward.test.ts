import { describe, expect, it } from 'vitest';
import type { RegionRewardEntry } from '@miu/schema/region-reward';
import { nextRegionGoal, regionTiers, tierReward, type RegionFacts } from './region-reward';

const facts = (over: Partial<RegionFacts> = {}): RegionFacts => ({ lessons: 9, lessonsDone: 0, lessonsThreeStar: 0, sideRuns: 0, ...over });
const none = new Set<never>();

describe('region chest tiers', () => {
  it('asks half the lessons rounded up, then all of them, then all with three stars, and the minigame goal', () => {
    expect(regionTiers(facts(), 10, none).map((t) => [t.tier, t.goal])).toEqual([
      ['half', 5],
      ['full', 9],
      ['stars', 9],
      ['minigames', 10],
    ]);
  });

  it('reaches each tier on its own count and caps the progress at the goal', () => {
    const tiers = regionTiers(facts({ lessonsDone: 9, lessonsThreeStar: 4, sideRuns: 14 }), 10, new Set(['half'] as const));
    expect(tiers.map((t) => [t.tier, t.progress, t.reached, t.claimed])).toEqual([
      ['half', 5, true, true],
      ['full', 9, true, false],
      ['stars', 4, false, false],
      ['minigames', 10, true, false],
    ]);
  });

  it('gives one lesson region both lesson tiers on its one lesson', () => {
    const tiers = regionTiers(facts({ lessons: 1, lessonsDone: 1 }), 10, none);
    expect(tiers.filter((t) => t.reached).map((t) => t.tier)).toEqual(['half', 'full']);
  });

  it('never opens a lesson tier of a region without lessons', () => {
    expect(regionTiers(facts({ lessons: 0 }), 10, none).filter((t) => t.reached)).toEqual([]);
  });
});

describe('what the screens say next', () => {
  it('points at a tier to claim first', () => {
    expect(nextRegionGoal(regionTiers(facts({ lessonsDone: 5 }), 10, none))).toEqual({ kind: 'claim', tier: 'half' });
  });

  it('counts the lessons missing to the next lesson tier, then the stars', () => {
    expect(nextRegionGoal(regionTiers(facts({ lessonsDone: 3 }), 10, none))).toEqual({ kind: 'lessons', tier: 'half', missing: 2 });
    expect(nextRegionGoal(regionTiers(facts({ lessonsDone: 7 }), 10, new Set(['half'] as const)))).toEqual({ kind: 'lessons', tier: 'full', missing: 2 });
    expect(nextRegionGoal(regionTiers(facts({ lessonsDone: 9, lessonsThreeStar: 6 }), 10, new Set(['half', 'full'] as const)))).toEqual({ kind: 'stars', missing: 3 });
  });

  it('has nothing left once every lesson tier is claimed', () => {
    expect(nextRegionGoal(regionTiers(facts({ lessonsDone: 9, lessonsThreeStar: 9 }), 10, new Set(['half', 'full', 'stars'] as const)))).toEqual({ kind: 'done' });
  });
});

describe('tier rewards', () => {
  const entry: RegionRewardEntry = {
    region: 'nui-tuyet',
    title: 'Bạn của tuyết',
    half: { coin: 40, xp: 50, decor: 'rug-snowflake' },
    full: { coin: 150, xp: 200, item: 'hat-ruong-nui-tuyet' },
    stars: { coin: 100, xp: 100, item: 'wings-ruong-nui-tuyet' },
    minigames: { coin: 50, xp: 40 },
  };

  it('gives the title with the chest, the items with the chest and the stars, the souvenir halfway', () => {
    expect(tierReward(entry, 'full')).toEqual({ coin: 150, xp: 200, item: 'hat-ruong-nui-tuyet', decor: null, title: 'Bạn của tuyết' });
    expect(tierReward(entry, 'stars')).toEqual({ coin: 100, xp: 100, item: 'wings-ruong-nui-tuyet', decor: null, title: null });
    expect(tierReward(entry, 'half')).toEqual({ coin: 40, xp: 50, item: null, decor: 'rug-snowflake', title: null });
    expect(tierReward(entry, 'minigames')).toEqual({ coin: 50, xp: 40, item: null, decor: null, title: null });
  });
});
