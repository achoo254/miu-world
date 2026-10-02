import { describe, expect, it } from 'vitest';
import { SparseWorld } from './sparse-world';

const bounds = { x0: -256, z0: -256, x1: 384, z1: 384 };

describe('SparseWorld', () => {
  it('reads blocks of the regions it holds, negative coordinates included, and air elsewhere', () => {
    const world = new SparseWorld(bounds, 48);
    const west = world.createRegion();
    west.set(127, 10, 5, 7); // world x = -1 (region -1), z = 5
    world.setRegion(-1, 0, west);
    const home = world.createRegion();
    home.set(0, 10, 5, 3);
    world.setRegion(0, 0, home);
    expect(world.get(-1, 10, 5)).toBe(7);
    expect(world.get(0, 10, 5)).toBe(3);
    expect(world.get(-1, 10, 5)).toBe(7);
    expect(world.get(-129, 10, 5)).toBe(0); // region -2 is not held
    expect(world.get(0, -1, 5)).toBe(0);
    expect(world.get(0, 48, 5)).toBe(0);
    expect(world.regionList().sort()).toEqual([[-1, 0], [0, 0]]);
  });

  it('forgets a dropped region and refuses one of the wrong shape', () => {
    const world = new SparseWorld(bounds, 48);
    const region = world.createRegion();
    region.set(1, 1, 1, 9);
    world.setRegion(2, -2, region);
    expect(world.get(257, 1, -255)).toBe(9);
    world.deleteRegion(2, -2);
    expect(world.hasRegion(2, -2)).toBe(false);
    expect(world.get(257, 1, -255)).toBe(0);
    expect(() => world.setRegion(0, 0, new SparseWorld(bounds, 32).createRegion())).toThrow(/expected/);
  });

  it('knows its bounds', () => {
    const world = new SparseWorld(bounds, 48);
    expect(world.contains(-256, 383)).toBe(true);
    expect(world.contains(384, 0)).toBe(false);
  });
});
