import { describe, expect, it } from 'vitest';
import type { CollectibleEntry } from '@miu/schema/collectible';
import { WHOLE_SET_SHARE, pickCollectible, seededRoll } from './collectible-drop';

const SET: CollectibleEntry[] = [
  { id: 'a', rarity: 'common', lore: 'a' },
  { id: 'b', rarity: 'common', lore: 'b' },
  { id: 'c', rarity: 'uncommon', lore: 'c' },
  { id: 'd', rarity: 'rare', lore: 'd' },
];
const none = new Map<string, number>();
const keys = (n: number) => Array.from({ length: n }, (_, i) => `child|quest:q#${i + 1}`);

describe('collectible drops', () => {
  it('rolls the same number for the same key, spread over [0, 1)', () => {
    expect(seededRoll('quest:x#2')).toBe(seededRoll('quest:x#2'));
    const rolls = keys(2000).map(seededRoll);
    expect(Math.min(...rolls)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...rolls)).toBeLessThan(1);
    expect(rolls.filter((r) => r < 0.5).length).toBeGreaterThan(800);
  });

  it('names the same thing for the same run, and other things for other runs', () => {
    expect(pickCollectible(SET, none, 'child|quest:q')).toBe(pickCollectible(SET, none, 'child|quest:q'));
    expect(new Set(keys(200).map((k) => pickCollectible(SET, none, k)))).toEqual(new Set(['a', 'b', 'c', 'd']));
  });

  it('drops rare things less often', () => {
    const picks = keys(4000).map((k) => pickCollectible(SET, none, k));
    const count = (id: string) => picks.filter((p) => p === id).length;
    expect(count('d')).toBeLessThan(count('c'));
    expect(count('c')).toBeLessThan(count('a'));
  });

  it('prefers missing things, with a share of doubles from the whole set', () => {
    const owned = new Map([['a', 1], ['b', 2], ['c', 1]]);
    const picks = keys(2000).map((k) => pickCollectible(SET, owned, k));
    const doubles = picks.filter((p) => p !== 'd').length / picks.length;
    expect(doubles).toBeGreaterThan(WHOLE_SET_SHARE * 0.5);
    expect(doubles).toBeLessThan(WHOLE_SET_SHARE * 1.5);
  });

  it('keeps dropping doubles once the set is full, and nothing from an empty set', () => {
    const full = new Map(SET.map((e) => [e.id, 1]));
    expect(SET.map((e) => e.id)).toContain(pickCollectible(SET, full, 'child|quest:q#9'));
    expect(pickCollectible([], none, 'k')).toBeNull();
  });
});
