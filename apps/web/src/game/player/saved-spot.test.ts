import { describe, expect, it } from 'vitest';
import { usableSpot } from './saved-spot';

// A 16 × 16 × 16 world: ground up to y = 4 (blocks 0..4 solid), a pillar at (8, 5..6, 8), water at (3, 5, 3).
const solid = (x: number, y: number, z: number): boolean => y <= 4 || (x === 8 && z === 8 && y <= 6);
const liquid = (x: number, y: number, z: number): boolean => x === 3 && z === 3 && y === 5;
const bounds = { x0: 0, z0: 0, x1: 16, z1: 16 };
const height = 16;

describe('usableSpot', () => {
  it('keeps a spot on open ground, snapping the feet onto the block top', () => {
    expect(usableSpot([5.5, 5, 6.25], solid, liquid, bounds, height)).toEqual([5.5, 5, 6.25]);
    expect(usableSpot([5.5, 4.9999, 6.25], solid, liquid, bounds, height)).toEqual([5.5, 5, 6.25]);
  });

  it('drops a spot that a regenerated map has walled in, flooded, or left hanging in the air', () => {
    expect(usableSpot([8.5, 5, 8.5], solid, liquid, bounds, height)).toBeNull();
    expect(usableSpot([3.5, 5, 3.5], solid, liquid, bounds, height)).toBeNull();
    expect(usableSpot([5.5, 9, 6.5], solid, liquid, bounds, height)).toBeNull();
  });

  it('drops a spot outside the map or with a broken number', () => {
    for (const spot of [[-1, 5, 5], [5, 5, 16], [5, 15, 5], [Number.NaN, 5, 5]] as const) {
      expect(usableSpot(spot, solid, liquid, bounds, height)).toBeNull();
    }
  });
});
