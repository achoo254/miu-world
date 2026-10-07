// A companion bot finds its way the way someone who does not know the place does: only over what it sees. An A*
// search over the standing spots of a square window around it (side 2·sight + 1), moving to a neighbouring column
// only as the child's walk can (traversal.ts `canStep`), roads cheap, plain ground dearer, water dearest. A goal
// inside the window is walked to; a goal beyond it gives the edge spot that looks best on the way there (cost so far
// plus the straight distance left), and the bot plans again from further on. Straight runs on one level become one
// leg, where every column the body crosses has a spot at that level.
//
// Plans wait in one queue for the whole server and are worked through each tick until a time budget is spent, so
// many bots planning at once never stall the tick: a bot whose plan waits keeps walking its last one, or stands.
import { canStep } from '@miu/voxel/traversal';
import { WALK_GROUND, WALK_LEVELS } from '@miu/voxel/walk-cells';
import { clearOf, edgeOf, feetOf, groundOf, type PackedSpot, type Spot, type WalkMap } from './walk-store';

/** What a step onto each kind of ground costs (the client's auto-walk counts the same). */
const STEP_COST: Readonly<Record<number, number>> = { [WALK_GROUND.road]: 1, [WALK_GROUND.plain]: 3.5, [WALK_GROUND.water]: 150 };
const EDGE_COST = 0.6;
const CLIMB_COST = 0.6;
const DROP_COST = 0.2;
/** The widest sight a window is made for (a window is at most 2·MAX_SIGHT + 1 columns across). */
export const MAX_SIGHT = 28;
/** Spots taken off the open list in one plan, at most. */
export const MAX_EXPANSIONS = 3_000;
/** A goal counts as reached within its `reach` and this many blocks of height. */
const GOAL_HEIGHT = 3;
/** Path spots looked ahead when merging a straight run. */
const MERGE_LOOKAHEAD = 24;
/** Half the body's width plus a margin: a merged run needs ground this far to each side. */
const BODY_SIDE = 0.3;
const SIDES = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

export interface PathGoal {
  readonly x: number;
  /** The goal's feet height; null: any height (a direction to explore rather than a spot). */
  readonly y: number | null;
  readonly z: number;
  /** How close (blocks, horizontally) counts as there. */
  readonly reach: number;
}

/** A leg's end: a column centre at feet height. */
export interface PathPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface LocalPlan {
  /** Legs from the start to the end, each a column centre; a leg is a straight run on one level or one step. */
  readonly points: readonly PathPoint[];
  /** The columns walked, in order, after the start (each one a `canStep` from the one before). */
  readonly cells: readonly Spot[];
  /** False when it ends at the window's edge or as near as it could get. */
  readonly reachesGoal: boolean;
  readonly expansions: number;
}

/** A tiny binary heap of node ids by priority. */
class OpenList {
  private ids: number[] = [];
  private keys: number[] = [];

  get size(): number {
    return this.ids.length;
  }

  clear(): void {
    this.ids.length = 0;
    this.keys.length = 0;
  }

  push(id: number, key: number): void {
    const { ids, keys } = this;
    let i = ids.length;
    ids.push(id);
    keys.push(key);
    while (i > 0) {
      const up = (i - 1) >> 1;
      if ((keys[up] ?? 0) <= key) break;
      ids[i] = ids[up] ?? 0;
      keys[i] = keys[up] ?? 0;
      i = up;
    }
    ids[i] = id;
    keys[i] = key;
  }

  pop(): number {
    const { ids, keys } = this;
    const top = ids[0] ?? -1;
    const lastId = ids.pop() ?? 0;
    const lastKey = keys.pop() ?? 0;
    const n = ids.length;
    if (n === 0) return top;
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      if (l >= n) break;
      const r = l + 1;
      const c = r < n && (keys[r] ?? 0) < (keys[l] ?? 0) ? r : l;
      if ((keys[c] ?? 0) >= lastKey) break;
      ids[i] = ids[c] ?? 0;
      keys[i] = keys[c] ?? 0;
      i = c;
    }
    ids[i] = lastId;
    keys[i] = lastKey;
    return top;
  }
}

const SIDE = 2 * MAX_SIGHT + 1;
const NODES = SIDE * SIDE * WALK_LEVELS;

/**
 * Plans with reused scratch memory (one per server: plans run one at a time in the queue). Node ids are
 * (column in the window) · WALK_LEVELS + level; stamps mark which entries belong to the plan running now.
 */
export class LocalPlanner {
  private readonly g = new Float64Array(NODES);
  private readonly parent = new Int32Array(NODES);
  private readonly seen = new Uint32Array(NODES);
  private readonly done = new Uint32Array(NODES);
  private readonly open = new OpenList();
  private stamp = 0;

  /**
   * The way from `from` (a standing spot) towards `goal` within `sight` of it, avoiding columns `blocked` says no
   * to; null when it stands nowhere, or nothing in the window gets it any nearer.
   */
  plan(map: WalkMap, from: Spot, goal: PathGoal, sight: number, blocked: (x: number, z: number) => boolean = () => false): LocalPlan | null {
    const startLevel = map.levelAt(from.x, from.y, from.z);
    if (startLevel < 0) return null;
    const r = Math.max(1, Math.min(MAX_SIGHT, Math.floor(sight)));
    const x0 = from.x - r;
    const z0 = from.z - r;
    const side = 2 * r + 1;
    const goalInside = Math.abs(Math.floor(goal.x) - from.x) <= r && Math.abs(Math.floor(goal.z) - from.z) <= r;
    this.stamp += 1;
    if (this.stamp === 0xffffffff) {
      this.seen.fill(0);
      this.done.fill(0);
      this.stamp = 1;
    }
    const stamp = this.stamp;
    const { g, parent, seen, done, open } = this;
    open.clear();

    const columnOf = (id: number): number => Math.floor(id / WALK_LEVELS);
    const xOf = (id: number): number => x0 + (columnOf(id) % side);
    const zOf = (id: number): number => z0 + Math.floor(columnOf(id) / side);
    const spotOf = (id: number): PackedSpot => map.spot(xOf(id), zOf(id), id % WALK_LEVELS);
    const away = (id: number): number => Math.hypot(xOf(id) + 0.5 - goal.x, zOf(id) + 0.5 - goal.z);
    const estimate = goalInside ? (id: number): number => Math.max(0, away(id) - goal.reach) : away;
    const isGoal = goalInside
      ? (id: number): boolean => away(id) <= goal.reach && (goal.y === null || Math.abs(feetOf(spotOf(id)) - goal.y) <= GOAL_HEIGHT)
      : (id: number): boolean => Math.max(Math.abs(xOf(id) - from.x), Math.abs(zOf(id) - from.z)) === r;

    const first = (r + r * side) * WALK_LEVELS + startLevel;
    g[first] = 0;
    parent[first] = -1;
    seen[first] = stamp;
    open.push(first, estimate(first));
    let end = -1;
    let nearest = first;
    let nearestLeft = estimate(first);
    let expansions = 0;
    while (open.size > 0 && expansions < MAX_EXPANSIONS) {
      const id = open.pop();
      if (done[id] === stamp) continue;
      done[id] = stamp;
      expansions++;
      if (isGoal(id)) {
        end = id;
        break;
      }
      const left = estimate(id);
      if (left < nearestLeft) {
        nearest = id;
        nearestLeft = left;
      }
      const here = spotOf(id);
      const feet = feetOf(here);
      const room = clearOf(here);
      const column = columnOf(id);
      const lx = column % side;
      const lz = Math.floor(column / side);
      for (const [dx, dz] of SIDES) {
        const nx = lx + dx;
        const nz = lz + dz;
        if (nx < 0 || nz < 0 || nx >= side || nz >= side || blocked(x0 + nx, z0 + nz)) continue;
        for (let level = 0; level < WALK_LEVELS; level++) {
          const there = map.spot(x0 + nx, z0 + nz, level);
          if (there === 0) break;
          const next = (nx + nz * side) * WALK_LEVELS + level;
          if (done[next] === stamp) continue;
          const nextFeet = feetOf(there);
          if (!canStep(feet, room, nextFeet, clearOf(there))) continue;
          const rise = nextFeet - feet;
          const cost =
            (g[id] ?? 0) +
            (STEP_COST[groundOf(there)] ?? STEP_COST[WALK_GROUND.plain] ?? 1) +
            (edgeOf(there) ? EDGE_COST : 0) +
            (rise > 0 ? rise * CLIMB_COST : -rise * DROP_COST);
          if (seen[next] === stamp && cost >= (g[next] ?? Infinity)) continue;
          seen[next] = stamp;
          g[next] = cost;
          parent[next] = id;
          open.push(next, cost + estimate(next));
        }
      }
    }
    const reachesGoal = end >= 0 && goalInside;
    // No goal spot (or edge spot) found: as near as it got, if that is a block nearer than where it stands.
    if (end < 0) {
      if (nearest === first || nearestLeft > estimate(first) - 1) return null;
      end = nearest;
    }
    const cells: Spot[] = [];
    for (let id = end; id !== first && id >= 0; id = parent[id] ?? -1) cells.push({ x: xOf(id), y: feetOf(spotOf(id)), z: zOf(id) });
    cells.reverse();
    return { points: mergeRuns(map, from, cells, blocked), cells, reachesGoal, expansions };
  }
}

/** The columns a straight line from (ax, az) to (bx, bz) crosses, both sides of a corner it passes through included. */
export function lineColumns(ax: number, az: number, bx: number, bz: number): Array<[number, number]> {
  let x = Math.floor(ax);
  let z = Math.floor(az);
  const ex = Math.floor(bx);
  const ez = Math.floor(bz);
  const out: Array<[number, number]> = [[x, z]];
  const dx = bx - ax;
  const dz = bz - az;
  const stepX = Math.sign(dx);
  const stepZ = Math.sign(dz);
  const tDeltaX = stepX === 0 ? Infinity : Math.abs(1 / dx);
  const tDeltaZ = stepZ === 0 ? Infinity : Math.abs(1 / dz);
  let tMaxX = stepX === 0 ? Infinity : (stepX > 0 ? x + 1 - ax : ax - x) * tDeltaX;
  let tMaxZ = stepZ === 0 ? Infinity : (stepZ > 0 ? z + 1 - az : az - z) * tDeltaZ;
  for (let guard = 0; (x !== ex || z !== ez) && guard < 4_096; guard++) {
    if (Math.abs(tMaxX - tMaxZ) < 1e-9) {
      // Through a corner: the body brushes both columns beside it.
      out.push([x + stepX, z], [x, z + stepZ]);
      x += stepX;
      z += stepZ;
      tMaxX += tDeltaX;
      tMaxZ += tDeltaZ;
    } else if (tMaxX < tMaxZ) {
      x += stepX;
      tMaxX += tDeltaX;
    } else {
      z += stepZ;
      tMaxZ += tDeltaZ;
    }
    out.push([x, z]);
  }
  return out;
}

/** Whether the body walks straight from spot a's centre to spot b's on one level, on ground no worse than `worst`. */
function straightRun(map: WalkMap, a: Spot, b: Spot, worst: number, blocked: (x: number, z: number) => boolean): boolean {
  const ax = a.x + 0.5;
  const az = a.z + 0.5;
  const bx = b.x + 0.5;
  const bz = b.z + 0.5;
  const fits = (x: number, z: number): boolean => {
    const spot = map.standAt(x, a.y, z);
    return spot !== 0 && clearOf(spot) >= 2 && (STEP_COST[groundOf(spot)] ?? Infinity) <= worst && !blocked(x, z);
  };
  for (const [x, z] of lineColumns(ax, az, bx, bz)) if (!fits(x, z)) return false;
  const length = Math.hypot(bx - ax, bz - az);
  const sideX = -(bz - az) / length;
  const sideZ = (bx - ax) / length;
  const samples = Math.max(1, Math.ceil(length / 0.25));
  for (let s = 0; s <= samples; s++) {
    const t = s / samples;
    for (const side of [-BODY_SIDE, BODY_SIDE]) {
      if (!fits(Math.floor(ax + (bx - ax) * t + sideX * side), Math.floor(az + (bz - az) * t + sideZ * side))) return false;
    }
  }
  return true;
}

/** Path cells to legs: each straight run on one level becomes its end point, every other step one leg. */
function mergeRuns(map: WalkMap, from: Spot, cells: readonly Spot[], blocked: (x: number, z: number) => boolean): PathPoint[] {
  const out: PathPoint[] = [];
  const centre = (c: Spot): PathPoint => ({ x: c.x + 0.5, y: c.y, z: c.z + 0.5 });
  let at = from;
  let i = 0;
  while (i < cells.length) {
    let b = i;
    let worst = STEP_COST[groundOf(map.standAt(at.x, at.y, at.z))] ?? 1;
    for (let k = i; k < Math.min(cells.length, i + MERGE_LOOKAHEAD); k++) {
      const cell = cells[k];
      if (!cell || cell.y !== at.y) break;
      worst = Math.max(worst, STEP_COST[groundOf(map.standAt(cell.x, cell.y, cell.z))] ?? 1);
      if (k > i && straightRun(map, at, cell, worst, blocked)) b = k;
    }
    const end = cells[b];
    if (!end) break;
    out.push(centre(end));
    at = end;
    i = b + 1;
  }
  return out;
}

/** A plan someone waits for: run once its turn comes (a bot keeps at most one waiting). */
interface PlanRequest {
  readonly run: () => void;
}

/**
 * Plans of every bot of the server, first come first served: each tick works through them until `budgetMs` is spent
 * (at least one runs, so the queue always moves).
 */
export class PathQueue {
  private readonly waiting = new Map<string, PlanRequest>();
  private readonly budgetMs: number;
  private readonly now: () => number;
  /** Plans run and time spent, for measuring. */
  ran = 0;
  spentMs = 0;

  constructor(budgetMs = 4, now: () => number = () => performance.now()) {
    this.budgetMs = budgetMs;
    this.now = now;
  }

  get size(): number {
    return this.waiting.size;
  }

  /** Queues `run` for `key` unless one already waits (it keeps its place in line). */
  request(key: string, run: () => void): void {
    if (!this.waiting.has(key)) this.waiting.set(key, { run });
  }

  cancel(key: string): void {
    this.waiting.delete(key);
  }

  clear(): void {
    this.waiting.clear();
  }

  /** Runs waiting plans in order until the budget is spent. */
  drain(): void {
    const start = this.now();
    // Only the plans waiting now: one queued while these run waits for the next tick.
    for (const [key, request] of [...this.waiting]) {
      this.waiting.delete(key);
      request.run();
      this.ran += 1;
      if (this.now() - start >= this.budgetMs) break;
    }
    this.spentMs += this.now() - start;
  }
}
