import { describe, expect, it } from 'vitest';
import { levelProfile } from './outland-levelling';

describe('levelProfile', () => {
  const level = (ground: number[]): number[] => levelProfile(ground, { maxRun: 6, maxShift: 1 });

  it('levels a one-block bump or dip between equal heights', () => {
    expect(level([12, 12, 13, 13, 12, 12])).toEqual([12, 12, 12, 12, 12, 12]);
    expect(level([12, 11, 12, 12, 11, 11, 12])).toEqual([12, 12, 12, 12, 12, 12, 12]);
  });

  it('levels an alternating wobble without flipping it', () => {
    expect(level([12, 13, 12, 13, 12])).toEqual([12, 12, 12, 12, 12]);
  });

  it('keeps a climb: steps that do not come back down', () => {
    const climb = [12, 12, 13, 13, 14, 14, 15, 16, 16];
    expect(level(climb)).toEqual(climb);
  });

  it('keeps a hill, trimming its crest by at most maxShift, and a bump longer than maxRun', () => {
    expect(level([12, 13, 14, 15, 14, 13, 12])).toEqual([12, 13, 14, 14, 14, 13, 12]);
    const long = [12, 13, 13, 13, 13, 13, 13, 13, 12];
    expect(level(long)).toEqual(long);
  });

  it('levels a two-block swell only when maxShift allows it', () => {
    expect(level([12, 13, 14, 13, 12])).toEqual([12, 13, 13, 13, 12]);
    expect(levelProfile([12, 13, 14, 13, 12], { maxRun: 6, maxShift: 2 })).toEqual([12, 12, 12, 12, 12]);
  });

  it('leaves water (NaN) and stops runs at it', () => {
    const out = level([12, 13, Number.NaN, 13, 12]);
    expect(out[0]).toBe(12);
    expect(out[1]).toBe(13);
    expect(Number.isNaN(out[2])).toBe(true);
  });
});
