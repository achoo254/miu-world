import { describe, expect, it } from 'vitest';
import { PET_LEVEL_XP, PET_MAX_LEVEL, PET_STAT_FLOOR, PET_TRICKS } from '@miu/schema/pet-care';
import { CARE_XP_GAP_MS, STARTING_STATS, WALK_BEAT_SECONDS, applyCare, bondXp, careXpDue, decayedStats, petLevel, unlockedTricks, walkCredit } from './pet-bond';

const HOUR = 3_600_000;

describe('pet needs over time', () => {
  it('drift down slowly while she is away', () => {
    const later = decayedStats(STARTING_STATS, 2 * HOUR);
    expect(later.happiness).toBe(STARTING_STATS.happiness - 4);
    expect(later.fullness).toBe(STARTING_STATS.fullness - 6);
    expect(later.cleanliness).toBe(STARTING_STATS.cleanliness - 4);
  });

  it('never fall below the cheerful floor, however long she is away', () => {
    const weeks = decayedStats({ happiness: 100, fullness: 100, cleanliness: 100 }, 60 * 24 * HOUR);
    expect(weeks).toEqual({ happiness: PET_STAT_FLOOR, fullness: PET_STAT_FLOOR, cleanliness: PET_STAT_FLOOR });
  });

  it('stay put for no time or a clock that went back', () => {
    expect(decayedStats(STARTING_STATS, 0)).toEqual(STARTING_STATS);
    expect(decayedStats(STARTING_STATS, -HOUR)).toEqual(STARTING_STATS);
  });
});

describe('care scenes', () => {
  it('lift the need each one answers, up to 100', () => {
    const low = { happiness: 50, fullness: 45, cleanliness: 42 };
    expect(applyCare(low, 'feed').fullness).toBe(80);
    expect(applyCare(low, 'bath').cleanliness).toBe(82);
    expect(applyCare(low, 'pet').happiness).toBe(70);
    expect(applyCare(low, 'nap').happiness).toBe(65);
    expect(applyCare({ happiness: 95, fullness: 95, cleanliness: 95 }, 'play').happiness).toBe(100);
  });

  it('a play tires the pet a little, never below the floor', () => {
    const played = applyCare({ happiness: 60, fullness: 42, cleanliness: 70 }, 'play');
    expect(played.fullness).toBe(PET_STAT_FLOOR);
    expect(played.cleanliness).toBe(65);
  });

  it('a cooked dish feeds by its own numbers', () => {
    expect(applyCare({ happiness: 50, fullness: 50, cleanliness: 50 }, 'feed', { fullness: 20, happiness: 30 })).toEqual({ happiness: 80, fullness: 70, cleanliness: 50 });
  });

  it('pays bond XP once per gap for the same care', () => {
    expect(careXpDue(undefined, 1000)).toBe(true);
    expect(careXpDue(1000, 1000 + CARE_XP_GAP_MS - 1)).toBe(false);
    expect(careXpDue(1000, 1000 + CARE_XP_GAP_MS)).toBe(true);
  });
});

describe('bond level and tricks', () => {
  it('starts at level 1 and climbs by the XP table, stopping at the top', () => {
    expect(petLevel(0)).toEqual({ level: 1, levelXp: 0, nextLevelXp: PET_LEVEL_XP[1] });
    expect(petLevel(PET_LEVEL_XP[1] ?? 0).level).toBe(2);
    expect(petLevel(99_999)).toEqual({ level: PET_MAX_LEVEL, levelXp: PET_LEVEL_XP[PET_MAX_LEVEL - 1], nextLevelXp: null });
    expect(() => petLevel(-1)).toThrow(RangeError);
  });

  it('opens at least five tricks by level, one more at each early level', () => {
    expect(unlockedTricks(1)).toEqual(['sit']);
    expect(unlockedTricks(5)).toEqual(['sit', 'spin', 'jump', 'roll', 'high-five']);
    expect(unlockedTricks(PET_MAX_LEVEL)).toHaveLength(PET_TRICKS.length);
    expect(PET_TRICKS.filter((t) => t.level <= PET_MAX_LEVEL).length).toBeGreaterThanOrEqual(5);
  });

  it('counts walking together by the clock, never faster', () => {
    expect(walkCredit(null, 0)).toBe(WALK_BEAT_SECONDS);
    expect(walkCredit(0, 20_000)).toBe(20);
    expect(walkCredit(0, 10 * HOUR)).toBe(WALK_BEAT_SECONDS);
    expect(walkCredit(5000, 1000)).toBe(0);
    expect(bondXp(30, 95)).toBe(33);
  });
});
