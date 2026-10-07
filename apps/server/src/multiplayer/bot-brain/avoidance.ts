// What a companion bot learnt from getting stuck: places it found no way to, squares of the map it could not get
// to, and the walls it met (where it got stuck heading some way: every place behind a fence is behind the same wall).
// It keeps away from each a while, twice as long each time it gets stuck there again. Kept in RAM only, a few dozen
// entries: the map's own walls are what it learns again after a restart.
import { AREA_SIDE } from './memory-graph';
import type { Spot } from './walk-store';

/** Stuck going to a place, or to a square: kept away from this long, doubled each time again (up to AVOID_MAX_MS). */
const PLACE_AVOID_MS = 5 * 60_000;
const AREA_AVOID_MS = 15 * 60_000;
const AVOID_MAX_MS = 2 * 3_600_000;
/** Stuck walking towards a square, it keeps away from the squares this far around it too (a long fence). */
const AREA_AVOID_AROUND = 2;
/**
 * A wall it met: a way it does not know that passes this close to the spot it got stuck at, heading the same way
 * (at most this far off it), is not tried for BARRIER_MS.
 */
const BARRIER_MS = 30 * 60_000;
const BARRIER_NEAR = 6;
const BARRIER_HEADING = 0.3;
const BARRIERS_KEPT = 48;

interface Avoid {
  until: number;
  strikes: number;
  /** Stuck on a way it knew, too: not even along a way it knows. */
  always?: boolean;
}

/** A spot it got stuck at, heading (dx, dz). */
interface Barrier {
  readonly x: number;
  readonly z: number;
  readonly dx: number;
  readonly dz: number;
  readonly until: number;
}

const avoiding = (avoid: Avoid | undefined, now: number): boolean => avoid !== undefined && avoid.until > now;

/** Marks `key` to keep away from: longer each time. */
function strike<K>(list: Map<K, Avoid>, key: K, base: number, now: number, always = false): void {
  const known = list.get(key);
  const strikes = (known?.strikes ?? 0) + 1;
  list.set(key, { until: now + Math.min(AVOID_MAX_MS, base * 2 ** (strikes - 1)), strikes, always: always || (known?.always === true && known.until > now) });
}

export class Avoidance {
  private readonly areaSide: readonly [number, number];
  private readonly places = new Map<string, Avoid>();
  private readonly areas = new Map<number, Avoid>();
  private barriers: Barrier[] = [];

  /** `areaSide`: the map's coarse squares across and down (memory-graph.ts). */
  constructor(areaSide: readonly [number, number]) {
    this.areaSide = areaSide;
  }

  /** It got stuck going to place `id` (`always`: along a way it knew). */
  strikePlace(id: string, now: number, always = false): void {
    strike(this.places, id, PLACE_AVOID_MS, now, always);
  }

  /** Whether it keeps away from place `id` now: by a way it does not know (`always`: by any way). */
  avoidsPlace(id: string, now: number, always = false): boolean {
    const avoid = this.places.get(id);
    return avoiding(avoid, now) && (!always || avoid?.always === true);
  }

  /** It found no way towards square `area`: that square only (it walked into nothing to find out). */
  strikeArea(area: number, now: number): void {
    if (area >= 0) strike(this.areas, area, AREA_AVOID_MS, now);
  }

  /** It got stuck walking towards square `area`: that square and the squares around it. */
  shunAround(area: number, now: number): void {
    if (area < 0) return;
    strike(this.areas, area, AREA_AVOID_MS, now);
    const until = this.areas.get(area)?.until ?? now;
    const [ax, az] = this.areaSide;
    const x = area % ax;
    const z = Math.floor(area / ax);
    for (let dz = -AREA_AVOID_AROUND; dz <= AREA_AVOID_AROUND; dz++) {
      for (let dx = -AREA_AVOID_AROUND; dx <= AREA_AVOID_AROUND; dx++) {
        const nx = x + dx;
        const nz = z + dz;
        if ((dx || dz) && nx >= 0 && nz >= 0 && nx < ax && nz < az) {
          const near = nx + nz * ax;
          const known = this.areas.get(near);
          this.areas.set(near, { until: Math.max(until, known?.until ?? 0), strikes: known?.strikes ?? 0 });
        }
      }
    }
  }

  /** Whether it keeps away from square `area` now. */
  avoidsArea(area: number, now: number): boolean {
    return avoiding(this.areas.get(area), now);
  }

  /** The middle of square `area` (blocks). */
  areaMiddle(area: number): { x: number; z: number } {
    const [ax] = this.areaSide;
    return { x: ((area % ax) + 0.5) * AREA_SIDE, z: (Math.floor(area / ax) + 0.5) * AREA_SIDE };
  }

  /** It got stuck at `at` heading for (toX, toZ): a wall. */
  addWall(at: Spot, toX: number, toZ: number, now: number): void {
    const x = at.x + 0.5;
    const z = at.z + 0.5;
    const length = Math.hypot(toX - x, toZ - z);
    if (length < 1) return;
    this.barriers = this.barriers.filter((b) => b.until > now);
    if (this.barriers.length >= BARRIERS_KEPT) this.barriers.shift();
    this.barriers.push({ x, z, dx: (toX - x) / length, dz: (toZ - z) / length, until: now + BARRIER_MS });
  }

  /** Whether going straight from `at` to (x, z) heads into a wall it met. */
  walled(at: Spot, x: number, z: number, now: number): boolean {
    const ax = at.x + 0.5;
    const az = at.z + 0.5;
    const length = Math.hypot(x - ax, z - az);
    if (length < 1) return false;
    const ux = (x - ax) / length;
    const uz = (z - az) / length;
    for (const b of this.barriers) {
      if (b.until <= now || ux * b.dx + uz * b.dz < BARRIER_HEADING) continue;
      const along = (b.x - ax) * ux + (b.z - az) * uz;
      const aside = Math.abs((b.x - ax) * uz - (b.z - az) * ux);
      if (along >= -BARRIER_NEAR / 2 && along <= length && aside <= BARRIER_NEAR) return true;
    }
    return false;
  }
}
