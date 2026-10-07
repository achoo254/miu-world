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
import { clearOf, edgeOf, feetOf, groundOf, type Spot, type WalkMap } from './walk-store';

/** What a step onto each kind of ground costs (the client's auto-walk counts the same). */
const STEP_COST: Readonly<Record<number, number>> = { [WALK_GROUND.road]: 1, [WALK_GROUND.plain]: 3.5, [WALK_GROUND.water]: 150 };
/** STEP_COST by ground code (2 bits), for the search: ground of no known kind costs as plain… */
const SEARCH_COST = [0, 1, 2, 3].map((ground) => STEP_COST[ground] ?? STEP_COST[WALK_GROUND.plain] ?? 1);
/** …and for merging straight runs: ground of no known kind is never walked straight over. */
const RUN_COST = [0, 1, 2, 3].map((ground) => STEP_COST[ground] ?? Infinity);
/** Nothing in the way (the plan's default). */
const NOTHING_BLOCKED = (): boolean => false;
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
/** SIDES as two lists, for the search's inner loop. */
const SIDE_X = SIDES.map(([dx]) => dx);
const SIDE_Z = SIDES.map(([, dz]) => dz);

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

/** Entries the open list ever holds in one plan: one per step considered (each expansion considers at most 4 × levels). */
const OPEN_MAX = MAX_EXPANSIONS * SIDES.length * WALK_LEVELS + 1;

/** A tiny binary heap of node ids by priority, in memory kept from plan to plan. */
class OpenList {
  private readonly ids = new Int32Array(OPEN_MAX);
  private readonly keys = new Float64Array(OPEN_MAX);
  private n = 0;

  get size(): number {
    return this.n;
  }

  clear(): void {
    this.n = 0;
  }

  push(id: number, key: number): void {
    const { ids, keys } = this;
    let i = this.n;
    this.n += 1;
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
    if (this.n === 0) return -1;
    const top = ids[0] ?? -1;
    this.n -= 1;
    const n = this.n;
    if (n === 0) return top;
    const lastId = ids[n] ?? 0;
    const lastKey = keys[n] ?? 0;
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
const COLUMNS = SIDE * SIDE;
const NODES = COLUMNS * WALK_LEVELS;

/**
 * Plans with reused scratch memory (one per server: plans run one at a time in the queue). Node ids are
 * (column in the window) · WALK_LEVELS + level; stamps mark which entries belong to the plan running now.
 */
export class LocalPlanner {
  private readonly g = new Float64Array(NODES);
  private readonly parent = new Int32Array(NODES);
  private readonly seen = new Uint32Array(NODES);
  private readonly done = new Uint32Array(NODES);
  /** Each column's straight distance to the goal, worked out once a plan (`awaySeen` stamps it). */
  private readonly away = new Float64Array(COLUMNS);
  private readonly awaySeen = new Uint32Array(COLUMNS);
  private readonly open = new OpenList();
  private stamp = 0;

  /**
   * The way from `from` (a standing spot) towards `goal` within `sight` of it, avoiding columns `blocked` says no
   * to; null when it stands nowhere, or nothing in the window gets it any nearer.
   */
  plan(map: WalkMap, from: Spot, goal: PathGoal, sight: number, blocked: (x: number, z: number) => boolean = NOTHING_BLOCKED): LocalPlan | null {
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
      this.awaySeen.fill(0);
      this.stamp = 1;
    }
    const stamp = this.stamp;
    const { g, parent, seen, done, open } = this;
    open.clear();
    const { reach } = goal;
    const goalY = goal.y;

    const first = (r + r * side) * WALK_LEVELS + startLevel;
    g[first] = 0;
    parent[first] = -1;
    seen[first] = stamp;
    const firstLeft = this.left(r + r * side, x0, z0, side, goal, goalInside);
    open.push(first, firstLeft);
    let end = -1;
    let nearest = first;
    let nearestLeft = firstLeft;
    let expansions = 0;
    while (open.size > 0 && expansions < MAX_EXPANSIONS) {
      const id = open.pop();
      if (done[id] === stamp) continue;
      done[id] = stamp;
      expansions++;
      const column = Math.floor(id / WALK_LEVELS);
      const lx = column % side;
      const lz = Math.floor(column / side);
      const here = map.spot(x0 + lx, z0 + lz, id % WALK_LEVELS);
      const isGoal = goalInside
        ? this.awayOf(column, x0, z0, side, goal) <= reach && (goalY === null || Math.abs(feetOf(here) - goalY) <= GOAL_HEIGHT)
        : Math.max(Math.abs(x0 + lx - from.x), Math.abs(z0 + lz - from.z)) === r;
      if (isGoal) {
        end = id;
        break;
      }
      const left = this.left(column, x0, z0, side, goal, goalInside);
      if (left < nearestLeft) {
        nearest = id;
        nearestLeft = left;
      }
      const feet = feetOf(here);
      const room = clearOf(here);
      const gHere = g[id] ?? 0;
      for (let k = 0; k < SIDES.length; k++) {
        const nx = lx + (SIDE_X[k] ?? 0);
        const nz = lz + (SIDE_Z[k] ?? 0);
        if (nx < 0 || nz < 0 || nx >= side || nz >= side || blocked(x0 + nx, z0 + nz)) continue;
        const nextColumn = nx + nz * side;
        for (let level = 0; level < WALK_LEVELS; level++) {
          const there = map.spot(x0 + nx, z0 + nz, level);
          if (there === 0) break;
          const next = nextColumn * WALK_LEVELS + level;
          if (done[next] === stamp) continue;
          const nextFeet = feetOf(there);
          if (!canStep(feet, room, nextFeet, clearOf(there))) continue;
          const rise = nextFeet - feet;
          const cost = gHere + (SEARCH_COST[groundOf(there)] ?? 1) + (edgeOf(there) ? EDGE_COST : 0) + (rise > 0 ? rise * CLIMB_COST : -rise * DROP_COST);
          if (seen[next] === stamp && cost >= (g[next] ?? Infinity)) continue;
          seen[next] = stamp;
          g[next] = cost;
          parent[next] = id;
          open.push(next, cost + this.left(nextColumn, x0, z0, side, goal, goalInside));
        }
      }
    }
    const reachesGoal = end >= 0 && goalInside;
    // No goal spot (or edge spot) found: as near as it got, if that is a block nearer than where it stands.
    if (end < 0) {
      if (nearest === first || nearestLeft > firstLeft - 1) return null;
      end = nearest;
    }
    const cells: Spot[] = [];
    for (let id = end; id !== first && id >= 0; id = parent[id] ?? -1) {
      const column = Math.floor(id / WALK_LEVELS);
      const x = x0 + (column % side);
      const z = z0 + Math.floor(column / side);
      cells.push({ x, y: feetOf(map.spot(x, z, id % WALK_LEVELS)), z });
    }
    cells.reverse();
    return { points: mergeRuns(map, from, cells, blocked), cells, reachesGoal, expansions };
  }

  /** Column `column` of the window's straight distance to the goal (worked out once a plan). */
  private awayOf(column: number, x0: number, z0: number, side: number, goal: PathGoal): number {
    if (this.awaySeen[column] === this.stamp) return this.away[column] ?? 0;
    const d = Math.hypot(x0 + (column % side) + 0.5 - goal.x, z0 + Math.floor(column / side) + 0.5 - goal.z);
    this.awaySeen[column] = this.stamp;
    this.away[column] = d;
    return d;
  }

  /** The search's estimate of what is left from column `column`: to within the goal's reach, or to the goal beyond the window. */
  private left(column: number, x0: number, z0: number, side: number, goal: PathGoal, goalInside: boolean): number {
    const away = this.awayOf(column, x0, z0, side, goal);
    return goalInside ? Math.max(0, away - goal.reach) : away;
  }
}

/**
 * Each column a straight line from (ax, az) to (bx, bz) crosses, in order, both sides of a corner it passes through
 * included, handed to `visit` until it says false (then false).
 */
function eachLineColumn(ax: number, az: number, bx: number, bz: number, visit: (x: number, z: number) => boolean): boolean {
  let x = Math.floor(ax);
  let z = Math.floor(az);
  const ex = Math.floor(bx);
  const ez = Math.floor(bz);
  if (!visit(x, z)) return false;
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
      if (!visit(x + stepX, z) || !visit(x, z + stepZ)) return false;
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
    if (!visit(x, z)) return false;
  }
  return true;
}

/** The columns a straight line from (ax, az) to (bx, bz) crosses, both sides of a corner it passes through included. */
export function lineColumns(ax: number, az: number, bx: number, bz: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  eachLineColumn(ax, az, bx, bz, (x, z) => {
    out.push([x, z]);
    return true;
  });
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
    return spot !== 0 && clearOf(spot) >= 2 && (RUN_COST[groundOf(spot)] ?? Infinity) <= worst && !blocked(x, z);
  };
  if (!eachLineColumn(ax, az, bx, bz, fits)) return false;
  const length = Math.hypot(bx - ax, bz - az);
  const sideX = -(bz - az) / length;
  const sideZ = (bx - ax) / length;
  const samples = Math.max(1, Math.ceil(length / 0.25));
  // Samples a quarter block apart mostly fall in the column the one before fell in on the same side: each column is
  // looked at once per run of samples in it.
  let leftX = NaN;
  let leftZ = NaN;
  let rightX = NaN;
  let rightZ = NaN;
  for (let s = 0; s <= samples; s++) {
    const t = s / samples;
    const x = ax + (bx - ax) * t;
    const z = az + (bz - az) * t;
    const lx = Math.floor(x + sideX * -BODY_SIDE);
    const lz = Math.floor(z + sideZ * -BODY_SIDE);
    if (lx !== leftX || lz !== leftZ) {
      if (!fits(lx, lz)) return false;
      leftX = lx;
      leftZ = lz;
    }
    const rx = Math.floor(x + sideX * BODY_SIDE);
    const rz = Math.floor(z + sideZ * BODY_SIDE);
    if (rx !== rightX || rz !== rightZ) {
      if (!fits(rx, rz)) return false;
      rightX = rx;
      rightZ = rz;
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
  // The worst ground up to each cell looked ahead at (its own step cost being the run's limit).
  const worstUpTo: number[] = [];
  while (i < cells.length) {
    let b = i;
    let worst = STEP_COST[groundOf(map.standAt(at.x, at.y, at.z))] ?? 1;
    worstUpTo.length = 0;
    for (let k = i; k < Math.min(cells.length, i + MERGE_LOOKAHEAD); k++) {
      const cell = cells[k];
      if (!cell || cell.y !== at.y) break;
      worst = Math.max(worst, STEP_COST[groundOf(map.standAt(cell.x, cell.y, cell.z))] ?? 1);
      worstUpTo.push(worst);
    }
    // The furthest cell it walks straight to (looked for from the furthest back: the first that holds is the one).
    for (let k = i + worstUpTo.length - 1; k > i; k--) {
      const cell = cells[k];
      if (cell && straightRun(map, at, cell, worstUpTo[k - i] ?? 1, blocked)) {
        b = k;
        break;
      }
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
