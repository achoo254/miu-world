import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LevelCurve } from '@miu/schema/content';
import { levelFromXp } from './level';

const curve = LevelCurve.parse({ thresholds: [0, 100, 250] });

describe('levelFromXp', () => {
  it('maps XP to level with progress inside the level', () => {
    expect(levelFromXp(0, curve)).toEqual({ level: 1, xpIntoLevel: 0, xpForNextLevel: 100 });
    expect(levelFromXp(99, curve)).toEqual({ level: 1, xpIntoLevel: 99, xpForNextLevel: 100 });
    expect(levelFromXp(100, curve)).toEqual({ level: 2, xpIntoLevel: 0, xpForNextLevel: 150 });
    expect(levelFromXp(249, curve)).toEqual({ level: 2, xpIntoLevel: 149, xpForNextLevel: 150 });
  });

  it('caps at the last level', () => {
    expect(levelFromXp(250, curve)).toEqual({ level: 3, xpIntoLevel: 0, xpForNextLevel: null });
    expect(levelFromXp(10_000, curve)).toEqual({ level: 3, xpIntoLevel: 9_750, xpForNextLevel: null });
  });

  it('rejects negative or fractional XP', () => {
    expect(() => levelFromXp(-1, curve)).toThrow();
    expect(() => levelFromXp(1.5, curve)).toThrow();
  });

  it('accepts the shipped curve', () => {
    const raw: unknown = JSON.parse(readFileSync(new URL('../../../content/progression/level-curve.json', import.meta.url), 'utf8'));
    expect(levelFromXp(0, LevelCurve.parse(raw)).level).toBe(1);
  });

  it('rejects malformed curves', () => {
    expect(LevelCurve.safeParse({ thresholds: [10, 20] }).success).toBe(false);
    expect(LevelCurve.safeParse({ thresholds: [0, 20, 20] }).success).toBe(false);
  });
});
