// A companion bot's feet: it walks the legs of its last plan column by column at its own pace, its height always
// the feet of the spot under it (a step up or down happens as it crosses into the next column), so it never stands
// where nobody could. It asks for a new plan every few columns or seconds while its plan only reaches the edge of
// what it saw, and plans from the end of the leg it is on, so the new plan starts where its feet will be. Making no
// headway over three plans in a row is being stuck: the column it is on is avoided for a minute and its goal given
// up. Where it walked is kept for the bot's memory.
import { lineColumns, type LocalPlanner, type PathGoal, type PathPoint } from './local-path';
import type { Spot, WalkMap } from './walk-store';

/** Columns walked, or time (ms), after which a plan that only reaches the window's edge is made again… */
export const REPLAN_CELLS = 8;
export const REPLAN_MS = 2_000;
/** …but never sooner than this after the last one (the queue's fair share per bot). */
export const MIN_PLAN_GAP_MS = 2_000;
/** Plans in a row without getting a block nearer that make it stuck. */
export const STUCK_PLANS = 3;
/** How long the column it got stuck on is avoided. */
export const STUCK_BAN_MS = 60_000;
/** A ride lasts this long; then it is at the stop's arrival. */
export const RIDE_MS = 3_000;
/** Columns of its way kept until its memory takes them. */
const TRACE_MAX = 600;

export type StepEvent = 'none' | 'arrived' | 'stuck' | 'rode';

/** What a bot's walking has been like, for measuring and for its memory. */
export interface WalkStats {
  plans: number;
  stuck: number;
  /** Time spent on goals it got stuck on, from its last headway to giving up (ms). */
  stuckMs: number;
}

const centreOf = (spot: Spot): PathPoint => ({ x: spot.x + 0.5, y: spot.y, z: spot.z + 0.5 });

export class Stepper {
  readonly map: WalkMap;
  private readonly speed: number;
  private readonly sight: number;
  x: number;
  y: number;
  z: number;
  yaw = 0;
  /** The spot of the column under it. */
  private cell: Spot;
  private goal: PathGoal | null = null;
  /** Legs still to walk; the first is the one it is on (from `legFrom`). */
  private legs: PathPoint[] = [];
  private legFrom: Spot;
  private planReaches = false;
  private plannedAt = Number.NEGATIVE_INFINITY;
  private plannedFrom: Spot = { x: -1, y: -1, z: -1 };
  private cellsSincePlan = 0;
  private bestLeft = Infinity;
  private noHeadway = 0;
  private headwayAt = 0;
  private stuckNow = false;
  private readonly banned = new Map<number, number>();
  private ride: { to: Spot; leftMs: number } | null = null;
  private trace: Spot[] = [];
  readonly stats: WalkStats = { plans: 0, stuck: 0, stuckMs: 0 };

  /** Stands at `start` (a standing spot of `map`). */
  constructor(map: WalkMap, start: Spot, pace: { speed: number; sight: number }) {
    if (map.standAt(start.x, start.y, start.z) === 0) throw new Error(`stepper: (${start.x}, ${start.y}, ${start.z}) is no standing spot on ${map.mapId}`);
    this.map = map;
    this.speed = pace.speed;
    this.sight = pace.sight;
    this.cell = start;
    this.legFrom = start;
    const at = centreOf(start);
    this.x = at.x;
    this.y = at.y;
    this.z = at.z;
  }

  /** The column it stands on. */
  get spot(): Spot {
    return this.cell;
  }

  get riding(): boolean {
    return this.ride !== null;
  }

  /** Walking a leg now (not waiting for a plan, resting or riding). */
  get moving(): boolean {
    return this.legs.length > 0 && this.ride === null;
  }

  get hasGoal(): boolean {
    return this.goal !== null;
  }

  /** Sets off towards `goal` (its old one dropped; the leg it is on is walked to its end). */
  go(goal: PathGoal, now: number): void {
    this.goal = goal;
    this.legs = this.legs.slice(0, 1);
    this.planReaches = false;
    // Plans for it as soon as its fair share allows.
    this.plannedFrom = { x: -1, y: -1, z: -1 };
    this.cellsSincePlan = REPLAN_CELLS;
    this.bestLeft = Infinity;
    this.noHeadway = 0;
    this.headwayAt = now;
    this.stuckNow = false;
  }

  /**
   * Aims at `goal` instead while walking on (the legs it has stay until its next plan, which heads for `goal`): the
   * next point of a way it knows came into sight.
   */
  retarget(goal: PathGoal, now: number): void {
    this.goal = goal;
    this.planReaches = false;
    this.cellsSincePlan = REPLAN_CELLS;
    this.bestLeft = Infinity;
    this.noHeadway = 0;
    this.headwayAt = now;
    this.stuckNow = false;
  }

  /** Put down at `spot` (stuck for good): no legs, no goal. */
  reset(spot: Spot): void {
    if (this.map.standAt(spot.x, spot.y, spot.z) === 0) return;
    this.ride = null;
    this.stuckNow = false;
    this.place(spot);
  }

  /** Stops where it is once the leg it is on ends (a leg always ends at a column's centre). */
  halt(): void {
    this.goal = null;
    this.legs = this.legs.slice(0, 1);
  }

  /** Gets on at a ride stop: off the map's ways for RIDE_MS, then at `to`. */
  rideTo(to: Spot): void {
    if (this.map.standAt(to.x, to.y, to.z) === 0) return;
    this.goal = null;
    this.legs = [];
    this.ride = { to, leftMs: RIDE_MS };
  }

  /** Whether it should be given a new plan now. */
  wantsPlan(now: number): boolean {
    if (!this.goal || this.ride || this.stuckNow || now - this.plannedAt < MIN_PLAN_GAP_MS) return false;
    if (this.legs.length === 0) return true;
    // Still on the leg it planned from the end of: a new plan would start from the same spot.
    const from = this.origin();
    if (from.x === this.plannedFrom.x && from.y === this.plannedFrom.y && from.z === this.plannedFrom.z) return false;
    return !this.planReaches && (this.cellsSincePlan >= REPLAN_CELLS || now - this.plannedAt >= REPLAN_MS);
  }

  /** Where its next plan starts: the end of the leg it is on, or where it stands. */
  private origin(): Spot {
    const current = this.legs[0];
    return current ? { x: Math.floor(current.x), y: current.y, z: Math.floor(current.z) } : this.cell;
  }

  private blocked = (x: number, z: number): boolean => {
    const key = x + z * this.map.sx;
    const until = this.banned.get(key);
    if (until === undefined) return false;
    if (until > this.clock) return true;
    this.banned.delete(key);
    return false;
  };

  /** The time the plan running now was asked at (for the bans). */
  private clock = 0;

  /** Plans the way on from the end of the leg it is on (or from where it stands). */
  plan(planner: LocalPlanner, now: number): void {
    const goal = this.goal;
    if (!goal || this.ride) return;
    this.clock = now;
    this.plannedAt = now;
    this.cellsSincePlan = 0;
    this.stats.plans += 1;
    const current = this.legs[0];
    const from = this.origin();
    this.plannedFrom = from;
    // No column banned: nothing to look up at every step of the search.
    const found = planner.plan(this.map, from, goal, this.sight, this.banned.size > 0 ? this.blocked : undefined);
    this.legs = current ? [current, ...(found?.points ?? [])] : [...(found?.points ?? [])];
    this.planReaches = found?.reachesGoal ?? false;
    const end = found?.cells.at(-1) ?? from;
    const left = Math.hypot(end.x + 0.5 - goal.x, end.z + 0.5 - goal.z);
    if (left <= this.bestLeft - 1 || this.planReaches) {
      this.bestLeft = Math.min(left, this.bestLeft);
      this.noHeadway = 0;
      this.headwayAt = now;
      return;
    }
    this.noHeadway += 1;
    if (this.noHeadway < STUCK_PLANS) return;
    this.stuckNow = true;
    this.stats.stuck += 1;
    this.stats.stuckMs += now - this.headwayAt;
    this.banned.set(this.cell.x + this.cell.z * this.map.sx, now + STUCK_BAN_MS);
    this.goal = null;
    this.legs = this.legs.slice(0, 1);
  }

  /** Walks on for `dt` seconds. */
  step(dt: number): StepEvent {
    if (this.ride) {
      this.ride.leftMs -= dt * 1000;
      if (this.ride.leftMs > 0) return 'none';
      const { to } = this.ride;
      this.ride = null;
      this.place(to);
      return 'rode';
    }
    if (this.stuckNow && this.legs.length === 0) {
      this.stuckNow = false;
      return 'stuck';
    }
    let budget = this.speed * dt;
    while (budget > 1e-9) {
      const target = this.legs[0];
      if (!target) break;
      const dx = target.x - this.x;
      const dz = target.z - this.z;
      const d = Math.hypot(dx, dz);
      if (d > 1e-9) this.yaw = Math.atan2(dx, dz);
      const k = d <= budget ? 1 : budget / d;
      this.moveTo(this.x + dx * k, this.z + dz * k, target);
      budget -= Math.min(d, budget);
      if (k === 1) {
        this.x = target.x;
        this.z = target.z;
        this.legs.shift();
        this.legFrom = this.cell;
      }
    }
    if (this.legs.length > 0 || !this.goal) return 'none';
    if (!this.planReaches) return 'none';
    this.goal = null;
    return 'arrived';
  }

  /**
   * Moves its body; crossing into other columns it takes each one's spot in turn (the leg's start height while in the
   * leg's first column, else its end height: a leg is a run on one level or a single step).
   */
  private moveTo(x: number, z: number, target: PathPoint): void {
    const crossed = lineColumns(this.x, this.z, x, z);
    this.x = x;
    this.z = z;
    for (const [cx, cz] of crossed) {
      if (cx === this.cell.x && cz === this.cell.z) continue;
      const y = cx === this.legFrom.x && cz === this.legFrom.z ? this.legFrom.y : target.y;
      this.cell = { x: cx, y, z: cz };
      this.y = y;
      this.cellsSincePlan += 1;
      this.trace.push(this.cell);
    }
    if (this.trace.length > TRACE_MAX) this.trace.splice(0, this.trace.length - TRACE_MAX);
  }

  /** Put down at `spot` (after a ride): no legs, no goal. */
  private place(spot: Spot): void {
    this.cell = spot;
    this.legFrom = spot;
    this.legs = [];
    this.goal = null;
    const at = centreOf(spot);
    this.x = at.x;
    this.y = at.y;
    this.z = at.z;
    this.trace = [];
  }

  /** The columns walked since the last call, in order (its memory keeps them as a way it knows). */
  takeTrace(): Spot[] {
    const out = this.trace;
    this.trace = [];
    return out;
  }
}

/** Whether every spot of `cells` stands and each is a step from the one before (for tests and audits). */
export function walksAlong(map: WalkMap, cells: readonly Spot[]): boolean {
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (!cell || map.standAt(cell.x, cell.y, cell.z) === 0) return false;
    const before = cells[i - 1];
    if (before && !map.steps(before, cell)) return false;
  }
  return true;
}
