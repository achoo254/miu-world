// The way a ground or water ride goes from its stop to the far stop. The rides link places no track joins (the
// maps' rule: a bus, a boat or a cable car line ties two ends of the ways), so the runtime finds a way itself on
// the map's horizon (the top block of every 4 x 4 cell, all loaded with the map): a bus or a train keeps to the
// roads and lanes, round houses and trees; a boat keeps to rivers and the sea and crosses land only where it
// must. An A* over the cells, then a smooth line through them. Pure: unit-tested.
import type { Horizon } from '@miu/voxel/region-format';

export type GroundClass = 'way' | 'land' | 'water' | 'blocked';
export type Point3 = [number, number, number];

/** Paved and trodden ways, and the boards of bridges and jetties. */
const WAY_BLOCKS = new Set(['path', 'trail', 'cobble', 'cobble-grey', 'paver', 'asphalt', 'planks', 'board']);
/** Open ground a vehicle can cross (every `grass-*` too); anything else on top is a roof, a wall or a tree. */
const LAND_BLOCKS = new Set(['dirt', 'sand', 'snow', 'farmland', 'wheat', 'riverbed', 'stone', 'rock-moss', 'ice']);

/** What each top block is to a vehicle, by the atlas's block names. Unknown ids and empty cells are blocked. */
export function groundClasses(blocks: ReadonlyArray<{ id: number; name: string; liquid?: boolean }>): (top: number) => GroundClass {
  const byId = new Map<number, GroundClass>();
  for (const b of blocks) {
    byId.set(b.id, b.liquid ? 'water' : WAY_BLOCKS.has(b.name) ? 'way' : b.name.startsWith('grass') || LAND_BLOCKS.has(b.name) ? 'land' : 'blocked');
  }
  return (top) => byId.get(top) ?? 'blocked';
}

/**
 * Cost of a step onto each kind of cell: a road detour several times longer still wins for a bus, a sea detour
 * for a boat. Roofs, walls and trees cost so much that a route crosses them only when nothing else joins.
 */
const STEP_COST: Readonly<Record<'ground' | 'water', Readonly<Record<GroundClass, number>>>> = {
  ground: { way: 1, land: 3, water: 30, blocked: 40 },
  water: { water: 1, way: 5, land: 5, blocked: 40 },
};
/** Each block of height between two cells costs this much more; a step this high or more is a cliff. */
const CLIMB_COST = 1.5;
const CLIFF = 4;
const CLIFF_COST = 25;
/** The line keeps one cell centre in this many before it is smoothed (stairs of the grid smoothed away). */
const KEEP_EVERY = 3;
const SMOOTHING_PASSES = 3;

/** A* over the horizon cells from one block position to another; the cells crossed, start to end. */
export function findCells(grid: Horizon, classOf: (top: number) => GroundClass, travel: 'ground' | 'water', from: readonly [number, number], to: readonly [number, number]): number[] {
  const [w, d] = grid.cells;
  const cellOf = ([x, z]: readonly [number, number]): number => {
    const cx = Math.min(w - 1, Math.max(0, Math.floor(x / grid.cell)));
    const cz = Math.min(d - 1, Math.max(0, Math.floor(z / grid.cell)));
    return cz * w + cx;
  };
  const start = cellOf(from);
  const goal = cellOf(to);
  const costs = STEP_COST[travel];
  const gx = goal % w;
  const gz = Math.floor(goal / w);
  const heuristic = (i: number): number => {
    const dx = Math.abs((i % w) - gx);
    const dz = Math.abs(Math.floor(i / w) - gz);
    return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
  };
  const best = new Float64Array(w * d).fill(Infinity);
  const parent = new Int32Array(w * d).fill(-1);
  const closed = new Uint8Array(w * d);
  const heap = new MinHeap();
  best[start] = 0;
  heap.push(start, heuristic(start));
  while (heap.size > 0) {
    const i = heap.pop();
    if (i === goal) break;
    if (closed[i]) continue;
    closed[i] = 1;
    const cx = i % w;
    const cz = Math.floor(i / w);
    const here = grid.heights[i] ?? 0;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dz === 0) continue;
        const nx = cx + dx;
        const nz = cz + dz;
        if (nx < 0 || nz < 0 || nx >= w || nz >= d) continue;
        const n = nz * w + nx;
        if (closed[n]) continue;
        const rise = Math.abs((grid.heights[n] ?? 0) - here);
        const step = costs[classOf(grid.tops[n] ?? 0)] + rise * CLIMB_COST + (rise >= CLIFF ? CLIFF_COST : 0);
        const g = (best[i] ?? Infinity) + step * (dx !== 0 && dz !== 0 ? Math.SQRT2 : 1);
        if (g >= (best[n] ?? Infinity)) continue;
        best[n] = g;
        parent[n] = i;
        heap.push(n, g + heuristic(n));
      }
    }
  }
  const cells: number[] = [];
  for (let i = goal; i !== -1; i = parent[i] ?? -1) {
    cells.push(i);
    if (i === start) break;
  }
  return cells.reverse();
}

/**
 * The smooth line a ground or water ride follows from `from` to `to` (feet heights given): through the cells
 * `findCells` picks, each point at the height of its cell's top (a roof or a tree top takes its neighbours'),
 * the grid's stairs smoothed into curves. Starts at `from` and ends at `to` exactly.
 */
export function planRoute(grid: Horizon, classOf: (top: number) => GroundClass, travel: 'ground' | 'water', from: Readonly<Point3>, to: Readonly<Point3>): Point3[] {
  const cells = findCells(grid, classOf, travel, [from[0], from[2]], [to[0], to[2]]);
  const [w] = grid.cells;
  const inner = cells.slice(1, -1).filter((_, k) => k % KEEP_EVERY === KEEP_EVERY - 1);
  const heights = inner.map((i) => (classOf(grid.tops[i] ?? 0) === 'blocked' ? Number.NaN : (grid.heights[i] ?? 0)));
  // A cell under a roof or a tree takes the height of the ground before it (or after it, at the start).
  for (let k = 0; k < heights.length; k++) if (Number.isNaN(heights[k])) heights[k] = k > 0 ? (heights[k - 1] ?? from[1]) : from[1];
  const points: Point3[] = [
    [from[0], from[1], from[2]],
    ...inner.map((i, k): Point3 => [((i % w) + 0.5) * grid.cell, heights[k] ?? from[1], (Math.floor(i / w) + 0.5) * grid.cell]),
    [to[0], to[1], to[2]],
  ];
  return smooth(points, SMOOTHING_PASSES);
}

/** Chaikin's corner cutting: each pass replaces every corner by two points a quarter in; the ends stay. */
export function smooth(points: readonly Point3[], passes: number): Point3[] {
  let line = points.map((p): Point3 => [p[0], p[1], p[2]]);
  for (let pass = 0; pass < passes && line.length > 2; pass++) {
    const next: Point3[] = [line[0] ?? [0, 0, 0]];
    for (let k = 0; k < line.length - 1; k++) {
      const a = line[k] ?? [0, 0, 0];
      const b = line[k + 1] ?? [0, 0, 0];
      next.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25, a[2] * 0.75 + b[2] * 0.25]);
      next.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75, a[2] * 0.25 + b[2] * 0.75]);
    }
    next.push(line[line.length - 1] ?? [0, 0, 0]);
    line = next;
  }
  return line;
}

/** A binary min-heap of cell indices by priority. */
class MinHeap {
  private readonly items: number[] = [];
  private readonly keys: number[] = [];

  get size(): number {
    return this.items.length;
  }

  push(item: number, key: number): void {
    this.items.push(item);
    this.keys.push(key);
    let i = this.items.length - 1;
    while (i > 0) {
      const up = (i - 1) >> 1;
      if ((this.keys[up] ?? 0) <= key) break;
      this.swap(i, up);
      i = up;
    }
  }

  pop(): number {
    const top = this.items[0] ?? -1;
    const lastItem = this.items.pop() ?? -1;
    const lastKey = this.keys.pop() ?? 0;
    if (this.items.length > 0) {
      this.items[0] = lastItem;
      this.keys[0] = lastKey;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < this.items.length && (this.keys[l] ?? 0) < (this.keys[m] ?? 0)) m = l;
        if (r < this.items.length && (this.keys[r] ?? 0) < (this.keys[m] ?? 0)) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    const item = this.items[a] ?? 0;
    const key = this.keys[a] ?? 0;
    this.items[a] = this.items[b] ?? 0;
    this.keys[a] = this.keys[b] ?? 0;
    this.items[b] = item;
    this.keys[b] = key;
  }
}
