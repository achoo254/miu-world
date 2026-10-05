import { describe, expect, it } from 'vitest';
import { isEmbedded } from './saved-spot';
import { standBeside } from './stand-beside';

// A 16 × 16 × 16 world: ground up to y = 4; a wall of solid cells along x = 6 and x = 7 (y 5..7) beside the
// target at (8.5, 5, 8.5), so the usual first side (the one towards -x, -z) is inside the wall.
const solid = (x: number, y: number, _z: number): boolean => y <= 4 || ((x === 6 || x === 7) && y <= 7);
const liquid = (): boolean => false;
const bounds = { x0: 0, z0: 0, x1: 16, z1: 16 };
const height = 16;
const target = { position: [8.5, 5, 8.5], radius: 3 };
const distance = (p: readonly number[]) => Math.hypot((p[0] ?? 0) - 8.5, (p[1] ?? 0) - 5, (p[2] ?? 0) - 8.5);

describe('standBeside', () => {
  it('stands her on open ground beside the target, inside its radius, never inside the wall', () => {
    const spot = standBeside(target, [], solid, liquid, bounds, height);
    expect(isEmbedded(spot, solid)).toBe(false);
    expect(distance(spot)).toBeLessThan(target.radius);
    expect(spot[0]).toBeGreaterThan(8);
  });

  it('picks a side where the target, not a neighbour, is the nearest thing to tap', () => {
    const neighbour = { position: [10.5, 5, 7.5], radius: 3 };
    const spot = standBeside(target, [neighbour], solid, liquid, bounds, height);
    const flat = (p: readonly number[]) => Math.hypot((p[0] ?? 0) - spot[0], (p[2] ?? 0) - spot[2]);
    expect(flat(target.position)).toBeLessThan(flat(neighbour.position));
    expect(isEmbedded(spot, solid)).toBe(false);
  });

  it('falls back beside the target when no open ground is near (a target in the air)', () => {
    const floating = { position: [12.5, 12, 12.5], radius: 3 };
    expect(standBeside(floating, [], solid, liquid, bounds, height)).toEqual([11, 12, 11]);
  });
});
