// Walks the child to the quest target when she taps the quest card: asks for a route (route-finder.ts),
// then steers along its waypoints like a child on the stick would, a little ahead of each corner (the
// controller eases into turns), hopping when something holds her up and finding the way again when she
// stays held up. Her own stick or a new target ends the walk (the game calls stop()).
import type { AutowalkState } from '../../game-bridge/game-store';
import type { MoveIntent } from '../player/player-controller';
import type { Point3, RouteQuery } from './route-search';
import type { RouteServiceResult } from './route-service';

export type { AutowalkState };

export interface WalkTarget {
  position: readonly number[];
  /** Interaction reach: within it, the target offers its step. */
  radius: number;
}

/** Waypoint counts as passed this close (blocks); a corner, where the route turns, this much earlier. */
const WAYPOINT_REACH = 0.45;
const CORNER_REACH = 0.8;
/** Run while this much route is left; walk the last stretch so she stops where the target is. */
const RUN_FROM = 6;
/** No closer to the waypoint for this long: hop (a step, a fence); this long: find the way again. */
const HOP_AFTER = 0.6;
const HOP_EVERY = 0.9;
const REPLAN_AFTER = 3.5;
const MAX_REPLANS = 2;
/** "Arrived" and "failed" show this long before the walk goes back to idle. */
const LINGER = 3;

const STAND: MoveIntent = { dirX: 0, dirZ: 0, run: false, jump: false };

export interface Feet {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export class RouteWalker {
  state: AutowalkState = 'idle';
  private target: WalkTarget | null = null;
  private points: Array<[number, number, number]> = [];
  private index = 0;
  /** Bumped by every new search and stop(): a route that comes back late is dropped. */
  private generation = 0;
  private best = Infinity;
  private heldFor = 0;
  private sinceHop = 0;
  private replans = 0;
  private lingering = 0;

  constructor(
    private readonly find: (query: RouteQuery) => Promise<RouteServiceResult>,
    private readonly onState: (state: AutowalkState) => void,
    /** Whether a column's blocks are in yet: waiting at the edge of what is loaded is not being held up. */
    private readonly loadedAt: (x: number, z: number) => boolean = () => true,
  ) {}

  /** Finding the way or walking it: the game takes the walker's intent instead of the stick's. */
  get active(): boolean {
    return this.state === 'finding' || this.state === 'walking';
  }

  /** Starts a walk from where the child stands to the target. */
  go(from: Feet, target: WalkTarget): void {
    this.target = target;
    this.replans = 0;
    this.plan(from);
  }

  stop(): void {
    this.generation++;
    this.target = null;
    this.points = [];
    if (this.state !== 'idle') this.set('idle');
  }

  /** Per frame: the intent while the walk is on, null once the child steers herself again. */
  update(dt: number, at: Feet): MoveIntent | null {
    if (this.state === 'arrived' || this.state === 'failed') {
      this.lingering += dt;
      if (this.lingering >= LINGER) this.set('idle');
      return null;
    }
    if (this.state === 'finding') return STAND;
    const target = this.target;
    if (this.state !== 'walking' || !target) return null;
    const [tx = 0, ty = 0, tz = 0] = target.position;
    if (Math.hypot(tx - at.x, ty - at.y, tz - at.z) <= target.radius * 0.8) return this.finish('arrived');

    while (this.index < this.points.length) {
      const [px = 0, py = 0, pz = 0] = this.points[this.index] ?? [];
      const turnsAfter = this.index < this.points.length - 1;
      const near = Math.hypot(px - at.x, pz - at.z) < (turnsAfter ? CORNER_REACH : WAYPOINT_REACH) && Math.abs(py - at.y) < 1.6;
      if (!near) break;
      this.index++;
      this.best = Infinity;
      this.heldFor = 0;
    }
    // The end of the route, short of the target's reach (the route could get no closer): as near as it goes.
    if (this.index >= this.points.length) return this.finish('arrived');

    const [px = 0, , pz = 0] = this.points[this.index] ?? [];
    const dx = px - at.x;
    const dz = pz - at.z;
    const distance = Math.hypot(dx, dz);
    if (distance < this.best - 0.25) {
      this.best = distance;
      this.heldFor = 0;
    } else if (this.loadedAt(px, pz)) {
      this.heldFor += dt;
    }
    this.sinceHop += dt;
    const jump = this.heldFor > HOP_AFTER && this.sinceHop > HOP_EVERY;
    if (jump) this.sinceHop = 0;
    if (this.heldFor > REPLAN_AFTER) {
      if (this.replans >= MAX_REPLANS) return this.finish('failed');
      this.replans++;
      this.plan(at);
      return STAND;
    }
    return { dirX: dx / Math.max(distance, 1e-6), dirZ: dz / Math.max(distance, 1e-6), run: this.left(at) > RUN_FROM, jump };
  }

  /** Route still to walk from where she is (blocks, across the ground). */
  private left(at: Feet): number {
    let total = 0;
    let [x, z] = [at.x, at.z];
    for (let i = this.index; i < this.points.length; i++) {
      const [px = 0, , pz = 0] = this.points[i] ?? [];
      total += Math.hypot(px - x, pz - z);
      [x, z] = [px, pz];
    }
    return total;
  }

  private plan(from: Feet): void {
    const target = this.target;
    if (!target) return;
    const generation = ++this.generation;
    const [tx = 0, ty = 0, tz = 0] = target.position;
    const start: Point3 = [from.x, from.y, from.z];
    this.set('finding');
    void this.find({ from: start, to: [tx, ty, tz], reach: Math.max(0.7, target.radius * 0.6) }).then((result) => {
      if (generation !== this.generation) return;
      if (!result.ok) {
        this.finish('failed');
        return;
      }
      this.points = result.points;
      this.index = 0;
      this.best = Infinity;
      this.heldFor = 0;
      this.sinceHop = Infinity;
      this.set('walking');
    });
  }

  private finish(state: 'arrived' | 'failed'): MoveIntent {
    this.generation++;
    this.target = null;
    this.points = [];
    this.set(state);
    return STAND;
  }

  private set(state: AutowalkState): void {
    this.state = state;
    this.lingering = 0;
    this.onState(state);
  }
}
