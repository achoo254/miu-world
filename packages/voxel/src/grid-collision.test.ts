import { describe, expect, it } from 'vitest';
import { moveAndCollide, raycastGrid, type Body } from './grid-collision';

type Vec3 = [number, number, number];

function worldFrom(blocks: Array<Vec3>): (x: number, y: number, z: number) => boolean {
  const set = new Set(blocks.map((b) => b.join(',')));
  // Solid floor under y=1 everywhere, plus the listed blocks.
  return (x, y, z) => y < 1 || set.has(`${x},${y},${z}`);
}

const BODY: Body = { halfWidth: 0.3, height: 1.8 };

describe('moveAndCollide', () => {
  it('stops against a wall instead of passing through it', () => {
    const solid = worldFrom([[3, 1, 0], [3, 2, 0]]);
    const r = moveAndCollide([1.5, 1, 0.5], [3, 0, 0], BODY, solid, { stepHeight: 1, onGround: true });
    expect(r.position[0]).toBeCloseTo(3 - BODY.halfWidth, 2);
    expect(r.position[0]).toBeLessThan(3 - BODY.halfWidth);
    expect(r.blocked[0]).toBe(true);
  });

  it('does not tunnel through a 1-block wall on a large step', () => {
    const solid = worldFrom([[3, 1, 0], [3, 2, 0]]);
    const r = moveAndCollide([1.5, 1, 0.5], [10, 0, 0], BODY, solid, { stepHeight: 1, onGround: true });
    expect(r.position[0]).toBeLessThan(3);
  });

  it('steps up onto a single block when on the ground', () => {
    const solid = worldFrom([[3, 1, 0], [4, 1, 0], [5, 1, 0]]);
    const r = moveAndCollide([2.5, 1, 0.5], [1.5, -0.05, 0], BODY, solid, { stepHeight: 1, onGround: true });
    expect(r.position[0]).toBeCloseTo(4, 2);
    expect(r.position[1]).toBeCloseTo(2, 2);
    expect(r.onGround).toBe(true);
  });

  it('does not step up while airborne or onto a 2-block wall', () => {
    const low = worldFrom([[3, 1, 0]]);
    const air = moveAndCollide([2.5, 1.2, 0.5], [1.5, 0, 0], BODY, low, { stepHeight: 1, onGround: false });
    expect(air.position[0]).toBeLessThan(3);
    const high = worldFrom([[3, 1, 0], [3, 2, 0]]);
    const wall = moveAndCollide([2.5, 1, 0.5], [1.5, 0, 0], BODY, high, { stepHeight: 1, onGround: true });
    expect(wall.position[0]).toBeLessThan(3);
  });

  it('does not pass through the ceiling when jumping', () => {
    const solid = worldFrom([[0, 3, 0]]);
    const r = moveAndCollide([0.5, 1, 0.5], [0, 1, 0], BODY, solid, { stepHeight: 1, onGround: true });
    expect(r.position[1] + BODY.height).toBeLessThanOrEqual(3);
    expect(r.hitCeiling).toBe(true);
  });

  it('lands on the floor and reports onGround', () => {
    const solid = worldFrom([]);
    const r = moveAndCollide([0.5, 1.5, 0.5], [0, -2, 0], BODY, solid, { stepHeight: 1, onGround: false });
    expect(r.position[1]).toBeCloseTo(1, 3);
    expect(r.onGround).toBe(true);
  });
});

describe('raycastGrid', () => {
  it('returns the distance to the first solid block along the ray', () => {
    const solid = (x: number, y: number, z: number): boolean => x === 5 && y === 0 && z === 0;
    const hit = raycastGrid([0.5, 0.5, 0.5], [1, 0, 0], 20, solid);
    expect(hit).toBeCloseTo(4.5, 5);
  });

  it('returns null when nothing is hit within range', () => {
    expect(raycastGrid([0.5, 0.5, 0.5], [0, 1, 0], 10, () => false)).toBeNull();
  });
});
