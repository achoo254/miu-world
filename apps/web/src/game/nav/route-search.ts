// The way to a quest target (owner, 02/10/2026: tapping the quest card walks the child there along the
// main ways, never straight across, where things stand in the way). An A* search over the standing spots of
// a rectangle of the map (walk-grid.ts), moving to a neighbouring column the way the controller can: level,
// one block up (step-up), two up (its automatic climb, with room overhead) or down a drop of up to three.
// Walking on a road costs a step, on plain ground several, through water so many that any bridge in sight wins, so the route keeps to
// the ways and leaves them only for the last stretch to the target. The route comes back as a few
// waypoints: straight runs on one level are merged where the body fits all along them.
import { REGION_BLOCKS } from '@miu/voxel/region-format';
import { Ground, MAX_LEVELS, slotOf, type RegionWalk } from './walk-grid';

/** What a step onto each kind of ground costs: a road detour up to this many times longer still wins. */
const STEP_COST: Readonly<Record<number, number>> = { [Ground.road]: 1, [Ground.plain]: 3.5, [Ground.water]: 150 };
/** A step that ends against a wall or a ledge costs this much more: the route keeps off edges and corners. */
const EDGE_COST = 0.6;
const CLIMB_COST = 0.6;
const DROP_COST = 0.2;
const MAX_CLIMB = 2;
const MAX_DROP = 3;
/** Search budget (spots taken off the open list); a map's core has well under this many. */
const MAX_EXPANSIONS = 1_500_000;
/** No spot within reach of the target: the route may end this much further out (the child walks the rest). */
const NEAR_ENOUGH = 4;
/** Half the body's width plus a margin: a merged straight run needs ground this far to each side. */
const BODY_SIDE = 0.3;
/** Path spots looked ahead when merging a straight run. */
const MERGE_LOOKAHEAD = 48;

export type Point3 = readonly [number, number, number];

export interface RouteQuery {
  /** Where the child stands (feet). */
  from: Point3;
  /** The target (its feet height) and how close counts as there. */
  to: Point3;
  reach: number;
}

export type RouteResult =
  | {
      ok: true;
      /** Waypoints from the first step after the start to the end (block centres, feet height). */
      points: Array<[number, number, number]>;
      /** False when the route stops short of the target's reach (NEAR_ENOUGH away at most). */
      reachesTarget: boolean;
    }
  | { ok: false; reason: 'no-start' | 'no-way' };

/** The standing spots of a rectangle of columns [x0, x1) × [z0, z1), packed one after another. */
export interface WalkGrid {
  readonly x0: number;
  readonly z0: number;
  readonly width: number;
  readonly depth: number;
  /** First spot of each column (x fastest), and one past the last. */
  readonly start: Uint32Array;
  readonly feet: Uint8Array;
  readonly clear: Uint8Array;
  readonly ground: Uint8Array;
  /** 1 where a spot has a wall or a ledge on some side. */
  readonly edge: Uint8Array;
}

/** Packs the rectangle's spots; `region(rx, rz)` is null where nothing can be walked (outside the world). */
export function buildWalkGrid(x0: number, z0: number, x1: number, z1: number, region: (rx: number, rz: number) => RegionWalk | null): WalkGrid {
  const width = x1 - x0;
  const depth = z1 - z0;
  const start = new Uint32Array(width * depth + 1);
  const slotFor = (x: number, z: number): { walk: RegionWalk; slot: number } | null => {
    const rx = Math.floor(x / REGION_BLOCKS);
    const rz = Math.floor(z / REGION_BLOCKS);
    const walk = region(rx, rz);
    return walk ? { walk, slot: slotOf(x - rx * REGION_BLOCKS, z - rz * REGION_BLOCKS) } : null;
  };
  let count = 0;
  for (let pass = 0; pass < 2; pass++) {
    const fill = pass === 1 ? { feet: new Uint8Array(count), clear: new Uint8Array(count), ground: new Uint8Array(count) } : null;
    let n = 0;
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        start[x + z * width] = n;
        const at = slotFor(x0 + x, z0 + z);
        if (!at) continue;
        for (let k = 0; k < MAX_LEVELS; k++) {
          const f = at.walk.feet[at.slot + k] ?? 0;
          if (f === 0) break;
          if (fill) {
            fill.feet[n] = f;
            fill.clear[n] = at.walk.clear[at.slot + k] ?? 0;
            fill.ground[n] = at.walk.ground[at.slot + k] ?? Ground.plain;
          }
          n++;
        }
      }
    }
    start[width * depth] = n;
    if (fill) {
      const grid = { x0, z0, width, depth, start, ...fill, edge: new Uint8Array(n) };
      markEdges(grid);
      return grid;
    }
    count = n;
  }
  throw new Error('unreachable');
}

const SIDES = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/** Spot of column (x, z) (map coordinates) with feet exactly at `feet`, or -1. */
function spotAt(grid: WalkGrid, x: number, z: number, feet: number): number {
  const cx = x - grid.x0;
  const cz = z - grid.z0;
  if (cx < 0 || cz < 0 || cx >= grid.width || cz >= grid.depth) return -1;
  const c = cx + cz * grid.width;
  for (let i = grid.start[c] ?? 0; i < (grid.start[c + 1] ?? 0); i++) if (grid.feet[i] === feet) return i;
  return -1;
}

function markEdges(grid: WalkGrid): void {
  for (let c = 0; c < grid.width * grid.depth; c++) {
    const x = grid.x0 + (c % grid.width);
    const z = grid.z0 + Math.floor(c / grid.width);
    for (let i = grid.start[c] ?? 0; i < (grid.start[c + 1] ?? 0); i++) {
      const f = grid.feet[i] ?? 0;
      const level = (dx: number, dz: number): boolean => spotAt(grid, x + dx, z + dz, f) >= 0 || spotAt(grid, x + dx, z + dz, f + 1) >= 0 || spotAt(grid, x + dx, z + dz, f - 1) >= 0;
      if (!SIDES.every(([dx, dz]) => level(dx, dz))) grid.edge[i] = 1;
    }
  }
}

/** Binary min-heap of spot ids keyed by their f score. */
class OpenList {
  private ids: number[] = [];
  private keys: number[] = [];
  get size(): number {
    return this.ids.length;
  }
  push(id: number, key: number): void {
    const ids = this.ids;
    const keys = this.keys;
    let i = ids.length;
    ids.push(id);
    keys.push(key);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if ((keys[parent] ?? 0) <= key) break;
      ids[i] = ids[parent] ?? 0;
      keys[i] = keys[parent] ?? 0;
      i = parent;
    }
    ids[i] = id;
    keys[i] = key;
  }
  pop(): number {
    const ids = this.ids;
    const keys = this.keys;
    const top = ids[0] ?? -1;
    const lastId = ids.pop() ?? 0;
    const lastKey = keys.pop() ?? 0;
    const n = ids.length;
    if (n === 0) return top;
    let i = 0;
    for (;;) {
      const left = 2 * i + 1;
      if (left >= n) break;
      const right = left + 1;
      const child = right < n && (keys[right] ?? 0) < (keys[left] ?? 0) ? right : left;
      if ((keys[child] ?? 0) >= lastKey) break;
      ids[i] = ids[child] ?? 0;
      keys[i] = keys[child] ?? 0;
      i = child;
    }
    ids[i] = lastId;
    keys[i] = lastKey;
    return top;
  }
}

/** Column index of each spot, filled lazily (the grid stores spots per column, not the reverse). */
function columnsOf(grid: WalkGrid): Uint32Array {
  const col = new Uint32Array(grid.feet.length);
  for (let c = 0; c < grid.width * grid.depth; c++) for (let i = grid.start[c] ?? 0; i < (grid.start[c + 1] ?? 0); i++) col[i] = c;
  return col;
}

/** The spot the child stands on: her column at her feet's height, else the nearest one round her. */
function startSpot(grid: WalkGrid, from: Point3): number {
  const fx = Math.floor(from[0]);
  const fz = Math.floor(from[2]);
  const fy = Math.floor(from[1] + 0.01);
  let best = -1;
  let bestScore = Infinity;
  for (let r = 0; r <= 2 && best < 0; r++) {
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const cx = fx + dx - grid.x0;
        const cz = fz + dz - grid.z0;
        if (cx < 0 || cz < 0 || cx >= grid.width || cz >= grid.depth) continue;
        const c = cx + cz * grid.width;
        for (let i = grid.start[c] ?? 0; i < (grid.start[c + 1] ?? 0); i++) {
          const dy = Math.abs((grid.feet[i] ?? 0) - fy);
          if (dy > 3) continue;
          const score = dy * 2 + Math.hypot(dx, dz);
          if (score < bestScore) {
            bestScore = score;
            best = i;
          }
        }
      }
    }
  }
  return best;
}

export function findRoute(grid: WalkGrid, query: RouteQuery): RouteResult {
  const first = startSpot(grid, query.from);
  if (first < 0) return { ok: false, reason: 'no-start' };
  const col = columnsOf(grid);
  const n = grid.feet.length;
  const g = new Float32Array(n).fill(Infinity);
  const parent = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const [tx, ty, tz] = query.to;
  const centreX = (i: number): number => grid.x0 + ((col[i] ?? 0) % grid.width) + 0.5;
  const centreZ = (i: number): number => grid.z0 + Math.floor((col[i] ?? 0) / grid.width) + 0.5;
  const away = (i: number): number => Math.hypot(centreX(i) - tx, centreZ(i) - tz);
  const isGoal = (i: number): boolean => away(i) <= query.reach && Math.abs((grid.feet[i] ?? 0) - ty) <= 3;
  const estimate = (i: number): number => Math.max(0, away(i) - query.reach);
  const open = new OpenList();
  g[first] = 0;
  open.push(first, estimate(first));
  let goal = -1;
  let nearest = first;
  let nearestAway = away(first);
  let expansions = 0;
  while (open.size > 0 && expansions < MAX_EXPANSIONS) {
    const i = open.pop();
    if (closed[i]) continue;
    closed[i] = 1;
    expansions++;
    if (isGoal(i)) {
      goal = i;
      break;
    }
    const d = away(i);
    if (d < nearestAway && Math.abs((grid.feet[i] ?? 0) - ty) <= 3) {
      nearest = i;
      nearestAway = d;
    }
    const c = col[i] ?? 0;
    const cx = c % grid.width;
    const cz = Math.floor(c / grid.width);
    const y = grid.feet[i] ?? 0;
    const room = grid.clear[i] ?? 0;
    for (const [dx, dz] of SIDES) {
      const nx = cx + dx;
      const nz = cz + dz;
      if (nx < 0 || nz < 0 || nx >= grid.width || nz >= grid.depth) continue;
      const nc = nx + nz * grid.width;
      for (let j = grid.start[nc] ?? 0; j < (grid.start[nc + 1] ?? 0); j++) {
        if (closed[j]) continue;
        const ny = grid.feet[j] ?? 0;
        const rise = ny - y;
        // Up: room over the current spot for the body to rise. Down: open blocks all the way from her feet.
        if (rise > MAX_CLIMB || -rise > MAX_DROP) continue;
        if (rise > 0 && room < rise + 2) continue;
        if (rise < 0 && (grid.clear[j] ?? 0) < 2 - rise) continue;
        const step =
          (STEP_COST[grid.ground[j] ?? Ground.plain] ?? 1) +
          (grid.edge[j] ? EDGE_COST : 0) +
          (rise > 0 ? rise * CLIMB_COST : -rise * DROP_COST);
        const cost = (g[i] ?? Infinity) + step;
        if (cost >= (g[j] ?? Infinity)) continue;
        g[j] = cost;
        parent[j] = i;
        open.push(j, cost + estimate(j));
      }
    }
  }
  const end = goal >= 0 ? goal : nearestAway <= query.reach + NEAR_ENOUGH ? nearest : -1;
  if (end < 0) return { ok: false, reason: 'no-way' };
  const spots: number[] = [];
  for (let i = end; i >= 0; i = parent[i] ?? -1) spots.push(i);
  spots.reverse();
  return { ok: true, points: mergeRuns(grid, spots, centreX, centreZ), reachesTarget: goal >= 0 };
}

/** Whether the body walks straight from spot a to spot b on one level, on ground no worse than the path's. */
function straightRun(grid: WalkGrid, ax: number, az: number, bx: number, bz: number, feet: number, worst: number): boolean {
  const length = Math.hypot(bx - ax, bz - az);
  const steps = Math.max(1, Math.ceil(length / 0.25));
  const sideX = length > 0 ? -(bz - az) / length : 0;
  const sideZ = length > 0 ? (bx - ax) / length : 0;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const px = ax + (bx - ax) * t;
    const pz = az + (bz - az) * t;
    for (const side of [-BODY_SIDE, 0, BODY_SIDE]) {
      const i = spotAt(grid, Math.floor(px + sideX * side), Math.floor(pz + sideZ * side), feet);
      if (i < 0 || (grid.clear[i] ?? 0) < 2) return false;
      if ((STEP_COST[grid.ground[i] ?? Ground.plain] ?? 1) > worst) return false;
    }
  }
  return true;
}

/** Path spots to waypoints: each straight run on one level becomes its end point. */
function mergeRuns(grid: WalkGrid, spots: readonly number[], centreX: (i: number) => number, centreZ: (i: number) => number): Array<[number, number, number]> {
  const point = (i: number): [number, number, number] => [centreX(i), grid.feet[i] ?? 0, centreZ(i)];
  const out: Array<[number, number, number]> = [];
  let a = 0;
  while (a < spots.length - 1) {
    const from = spots[a] ?? 0;
    const feet = grid.feet[from] ?? 0;
    let b = a + 1;
    let worst = STEP_COST[grid.ground[from] ?? Ground.plain] ?? 1;
    for (let k = a + 1; k < Math.min(spots.length, a + MERGE_LOOKAHEAD); k++) {
      const spot = spots[k] ?? 0;
      if (grid.feet[spot] !== feet) break;
      worst = Math.max(worst, STEP_COST[grid.ground[spot] ?? Ground.plain] ?? 1);
      if (straightRun(grid, centreX(from), centreZ(from), centreX(spot), centreZ(spot), feet, worst)) b = k;
    }
    out.push(point(spots[b] ?? 0));
    a = b;
  }
  return out;
}
