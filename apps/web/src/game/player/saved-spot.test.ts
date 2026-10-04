import { describe, expect, it } from 'vitest';
import { PlayerController } from './player-controller';
import { isEmbedded, nearestUsableSpot, usableSpot } from './saved-spot';

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

describe('isEmbedded', () => {
  it('is true inside a block, at the feet or at the head, and false on open ground', () => {
    expect(isEmbedded([8.5, 5, 8.5], solid)).toBe(true);
    expect(isEmbedded([8.5, 4.5, 8.5], solid)).toBe(true);
    expect(isEmbedded([5.5, 5, 6.25], solid)).toBe(false);
    expect(isEmbedded([5.5, 4.9999, 6.25], solid)).toBe(false);
  });
});

// A seat between two desks (a classroom row): the chair's centre cell is open, but a body standing on the
// seat's own spot, a hair from a desk, overlaps the desk's cell and cannot take any step.
describe('a seat squeezed between two desks', () => {
  const desks = (x: number, y: number, z: number): boolean => y <= 4 || (y === 5 && z === 8 && (x === 7 || x === 9));
  const seat = [8.05, 5, 8.5] as const;
  const nowhere = (): boolean => false;

  it('is embedded, and no spot to put her on, though the cell under her centre is open', () => {
    expect(desks(8, 5, 8)).toBe(false);
    expect(isEmbedded(seat, desks)).toBe(true);
    expect(usableSpot(seat, desks, nowhere, bounds, height)).toBeNull();
    expect(isEmbedded([8.5, 5, 8.5], desks)).toBe(false);
  });

  it('puts her on the nearest spot her body fits, from where she can walk', () => {
    const spot = nearestUsableSpot(seat, desks, nowhere, bounds, height, 6);
    expect(spot).not.toBeNull();
    if (!spot) return;
    expect(isEmbedded(spot, desks)).toBe(false);
    const controller = new PlayerController(desks, spot, 0);
    const before = controller.position.x;
    for (let frame = 0; frame < 60; frame++) controller.update(1 / 60, { dirX: 1, dirZ: 0, run: false, jump: false });
    expect(controller.position.x).toBeGreaterThan(before + 1);
  });

  it('is why she cannot walk off from there on her own', () => {
    const controller = new PlayerController(desks, seat, 0);
    for (let frame = 0; frame < 120; frame++) controller.update(1 / 60, { dirX: 0, dirZ: -1, run: false, jump: false });
    expect(controller.position.z).toBeCloseTo(8.5, 5);
  });
});
