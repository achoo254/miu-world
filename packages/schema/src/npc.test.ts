import { describe, expect, it } from 'vitest';
import { heartsFor, nextHeartAt, timeOfDay, vietnamDay } from './npc';

describe('friendship arithmetic', () => {
  it('fills a heart at each threshold', () => {
    expect([0, 1, 2, 5, 6, 12, 20, 29, 30, 99].map(heartsFor)).toEqual([0, 0, 1, 1, 2, 3, 4, 4, 5, 5]);
    expect([0, 2, 29, 30].map(nextHeartAt)).toEqual([2, 6, 30, null]);
  });
  it('reads the part of the day and the Vietnam day', () => {
    expect([4, 5, 10, 11, 16, 17, 20, 21, 23].map(timeOfDay)).toEqual(['night', 'morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening', 'night', 'night']);
    expect(vietnamDay(new Date('2026-10-05T16:59:00Z'))).toBe('2026-10-05');
    expect(vietnamDay(new Date('2026-10-05T17:00:00Z'))).toBe('2026-10-06');
  });
});
