import { describe, expect, it } from 'vitest';
import { buildWalkGrid, findRoute, type RouteQuery } from './route-search';
import { Ground, walkRegion, type BlockKinds } from './walk-grid';

const AIR = 0;
const GRASS = 1;
const PATH = 2;
const WALL = 3;
const WATER = 4;
const HEIGHT = 16;
const kinds: BlockKinds = {
  solid: (id) => id === GRASS || id === PATH || id === WALL,
  liquid: (id) => id === WATER,
  road: (id) => id === PATH,
  blocking: () => false,
};

/** A flat field one region wide: ground up to y = 1, feet at y = 2, with what `paint` puts on it. */
function field(paint: (put: (x: number, y: number, z: number, id: number) => void) => void) {
  const blocks = new Map<string, number>();
  const put = (x: number, y: number, z: number, id: number): void => void blocks.set(`${x},${y},${z}`, id);
  paint(put);
  const walk = walkRegion((x, y, z) => blocks.get(`${x},${y},${z}`) ?? (y <= 1 ? GRASS : AIR), HEIGHT, kinds);
  return buildWalkGrid(0, 0, 64, 64, (rx, rz) => (rx === 0 && rz === 0 ? walk : null));
}

const query = (from: [number, number], to: [number, number], reach = 1): RouteQuery => ({ from: [from[0] + 0.5, 2, from[1] + 0.5], to: [to[0] + 0.5, 2, to[1] + 0.5], reach });
const road = (put: (x: number, y: number, z: number, id: number) => void, a: [number, number], b: [number, number]): void => {
  for (let x = Math.min(a[0], b[0]) - 1; x <= Math.max(a[0], b[0]) + 1; x++) for (let z = Math.min(a[1], b[1]) - 1; z <= Math.max(a[1], b[1]) + 1; z++) put(x, 1, z, PATH);
};

describe('walkRegion', () => {
  it('finds a spot on the ground and on top of a block, each with the room over it and what it stands on', () => {
    const grid = field((put) => {
      put(3, 2, 3, WALL);
      put(4, 1, 3, PATH);
      put(5, 1, 3, WATER);
    });
    const spots = (x: number, z: number) => {
      const c = x + z * grid.width;
      return Array.from({ length: (grid.start[c + 1] ?? 0) - (grid.start[c] ?? 0) }, (_, k) => {
        const i = (grid.start[c] ?? 0) + k;
        return { feet: grid.feet[i], ground: grid.ground[i] };
      });
    };
    expect(spots(3, 3)).toEqual([{ feet: 3, ground: Ground.plain }]);
    expect(spots(4, 3)).toEqual([{ feet: 2, ground: Ground.road }]);
    expect(spots(5, 3)).toEqual([{ feet: 1, ground: Ground.water }]);
  });
});

describe('findRoute', () => {
  it('keeps to the road round the field rather than cutting straight across the grass', () => {
    const grid = field((put) => {
      road(put, [5, 5], [5, 30]);
      road(put, [5, 30], [40, 30]);
      road(put, [40, 30], [40, 5]);
    });
    const route = findRoute(grid, query([5, 5], [40, 5]));
    expect(route.ok && route.reachesTarget).toBe(true);
    if (!route.ok) return;
    // Down the road to the far side and back up: the route passes the road's two corners.
    expect(route.points.some(([x, , z]) => x < 8 && z > 27)).toBe(true);
    expect(route.points.some(([x, , z]) => x > 37 && z > 27)).toBe(true);
    // Merged into a few waypoints, not one per block.
    expect(route.points.length).toBeLessThan(15);
  });

  it('goes straight over open ground when there is no road', () => {
    const route = findRoute(field(() => undefined), query([5, 5], [30, 5]));
    expect(route.ok).toBe(true);
    if (!route.ok) return;
    expect(route.points).toHaveLength(1);
    expect(route.points[0]?.[0]).toBeGreaterThan(28);
  });

  it('goes round a wall three blocks high, and over one two blocks high', () => {
    const wall = (height: number) =>
      field((put) => {
        for (let z = 0; z < 40; z++) for (let y = 2; y < 2 + height; y++) put(20, y, z, WALL);
      });
    const round = findRoute(wall(3), query([10, 10], [30, 10]));
    expect(round.ok).toBe(true);
    if (round.ok) expect(round.points.some(([x, , z]) => Math.abs(x - 20.5) < 1.5 && z > 39)).toBe(true);
    const over = findRoute(wall(2), query([10, 10], [30, 10]));
    expect(over.ok).toBe(true);
    if (over.ok) expect(over.points.some(([x, y]) => x === 20.5 && y === 4)).toBe(true);
  });

  it('wades only when there is no other way across', () => {
    // Water over a riverbed one block down; a plank-less bridge is the bank's ground carried across.
    const river = (bridge: boolean) =>
      field((put) => {
        for (let x = 0; x < 64; x++) for (const z of [20, 21, 22]) if (!(bridge && x >= 40 && x <= 42)) put(x, 1, z, WATER);
      });
    const withBridge = findRoute(river(true), query([10, 10], [10, 30]));
    expect(withBridge.ok).toBe(true);
    if (withBridge.ok) expect(withBridge.points.some(([x, , z]) => x > 39 && z >= 19 && z <= 23)).toBe(true);
    const noBridge = findRoute(river(false), query([10, 10], [10, 30]));
    expect(noBridge.ok && noBridge.reachesTarget).toBe(true);
  });

  it('says there is no way when the target is walled in', () => {
    const grid = field((put) => {
      for (let i = 25; i <= 35; i++) {
        for (let y = 2; y <= 5; y++) {
          put(i, y, 25, WALL);
          put(i, y, 35, WALL);
          put(25, y, i, WALL);
          put(35, y, i, WALL);
        }
      }
    });
    expect(findRoute(grid, query([5, 5], [30, 30]))).toEqual({ ok: false, reason: 'no-way' });
  });
});
