import type { LevelCurve } from '@miu/schema/content';

export interface LevelInfo {
  level: number;
  xpIntoLevel: number;
  /** XP from the current level threshold to the next; null at the top level. */
  xpForNextLevel: number | null;
}

export function levelFromXp(xp: number, curve: LevelCurve): LevelInfo {
  if (!Number.isInteger(xp) || xp < 0) throw new RangeError('xp must be a non-negative integer');
  const { thresholds } = curve;
  let index = 0;
  while (index + 1 < thresholds.length && (thresholds[index + 1] ?? Infinity) <= xp) index += 1;
  const start = thresholds[index] ?? 0;
  const next = thresholds[index + 1];
  return { level: index + 1, xpIntoLevel: xp - start, xpForNextLevel: next === undefined ? null : next - start };
}
