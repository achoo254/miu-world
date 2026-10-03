// The journey of a ride as numbers: the line the vehicle follows (measured along the ground), the height an air
// ride keeps over it, and the timing: boarding, the trip, getting off. A trip takes a few seconds whatever its
// length (owner, 03/10/2026: the child sees herself really travel); past a vehicle's top speed only its two
// ends are shown and a short fade joins them. Pure: unit-tested.
import type { Point3 } from './ride-route';

export interface PathSample {
  x: number;
  y: number;
  z: number;
  /** Heading (radians) as the game turns things: forward is (sin yaw, cos yaw). */
  yaw: number;
}

/** A line through points, sampled by the distance travelled along the ground from its start. */
export class RidePath {
  readonly length: number;
  private readonly points: readonly Point3[];
  private readonly at0: Float64Array;

  constructor(points: readonly Point3[]) {
    if (points.length === 0) throw new Error('a ride path needs at least one point');
    this.points = points.length === 1 ? [points[0] ?? [0, 0, 0], points[0] ?? [0, 0, 0]] : points;
    this.at0 = new Float64Array(this.points.length);
    let total = 0;
    for (let k = 1; k < this.points.length; k++) {
      const a = this.points[k - 1] ?? [0, 0, 0];
      const b = this.points[k] ?? [0, 0, 0];
      total += Math.hypot(b[0] - a[0], b[2] - a[2]);
      this.at0[k] = total;
    }
    this.length = total;
  }

  /** The point `s` blocks along (clamped to the ends), heading along the line there. */
  sample(s: number): PathSample {
    const d = Math.min(this.length, Math.max(0, s));
    let k = 1;
    while (k < this.points.length - 1 && (this.at0[k] ?? 0) < d) k++;
    const a = this.points[k - 1] ?? [0, 0, 0];
    const b = this.points[k] ?? [0, 0, 0];
    const span = (this.at0[k] ?? 0) - (this.at0[k - 1] ?? 0);
    const t = span > 0 ? (d - (this.at0[k - 1] ?? 0)) / span : 0;
    const dx = b[0] - a[0];
    const dz = b[2] - a[2];
    return { x: a[0] + dx * t, y: a[1] + (b[1] - a[1]) * t, z: a[2] + dz * t, yaw: dx === 0 && dz === 0 ? 0 : Math.atan2(dx, dz) };
  }
}

const smoothstep = (t: number): number => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/**
 * Height of an air ride `s` blocks along a line `length` long: up from `startY` to `cruiseY` over the first
 * `climb` blocks, level, and down to `endY` over the last `climb` (a short line never quite reaches the top).
 */
export function airHeight(s: number, length: number, startY: number, endY: number, cruiseY: number, climb: number): number {
  const c = Math.max(1, Math.min(climb, length / 2));
  const up = smoothstep(s / c);
  const down = smoothstep((length - s) / c);
  return Math.min(startY + (cruiseY - startY) * up, endY + (cruiseY - endY) * down);
}

/** Seconds the vehicle takes to speed up from rest, and to slow down to rest at the far stop. */
export const RAMP_S = 0.8;
/** The fade that joins the two ends of a long trip: seconds to dark, and back. */
export const CUT_FADE_S = 0.3;
const MIN_TRAVEL_S = 3.5;
const MAX_TRAVEL_S = 5.5;

export interface RideTimeline {
  /** Seconds of each part: getting on, the trip, getting off. */
  board: number;
  travel: number;
  alight: number;
  total: number;
  /** Line length shown: all of it, or (`cut`) the first half of this from the start and the last half to the end. */
  shown: number;
  length: number;
  cut: boolean;
}

/** Timing of a trip of `length` blocks at most `maxSpeed` fast; `board` and `alight` as the vehicle needs. */
export function rideTimeline(length: number, maxSpeed: number, board: number, alight: number): RideTimeline {
  const travel = Math.min(MAX_TRAVEL_S, Math.max(MIN_TRAVEL_S, 2.5 + length / 100));
  // Cruising the middle, ramping at both ends: the distance covered is cruise × (travel − ramp).
  const reach = maxSpeed * (travel - RAMP_S);
  const cut = length > reach;
  return { board, travel, alight, total: board + travel + alight, shown: cut ? reach : length, length, cut };
}

/** Distance along the shown line after `t` seconds of the trip (0…travel): speeds up, cruises, slows down. */
function shownAt(timeline: RideTimeline, t: number): number {
  const { travel, shown } = timeline;
  const cruise = shown / (travel - RAMP_S);
  const c = Math.min(travel, Math.max(0, t));
  if (c < RAMP_S) return (cruise * c * c) / (2 * RAMP_S);
  if (c > travel - RAMP_S) {
    const left = travel - c;
    return shown - (cruise * left * left) / (2 * RAMP_S);
  }
  return cruise * (c - RAMP_S / 2);
}

export interface TripState {
  /** Distance along the whole line. */
  s: number;
  /** Speed along the line (blocks a second), for wheels and sway. */
  speed: number;
  /** How dark the cut's fade is now (0 clear, 1 dark). */
  fade: number;
}

/** Where the vehicle is `t` seconds into the trip (0…travel): a cut trip jumps from its first end to its last at mid-trip. */
export function tripAt(timeline: RideTimeline, t: number): TripState {
  const shown = shownAt(timeline, t);
  const speed = (shownAt(timeline, t + 0.05) - shownAt(timeline, t - 0.05)) / 0.1;
  if (!timeline.cut) return { s: shown, speed, fade: 0 };
  const half = timeline.shown / 2;
  const s = shown <= half ? shown : timeline.length - timeline.shown + shown;
  const fade = 1 - Math.min(1, Math.abs(t - timeline.travel / 2) / CUT_FADE_S);
  return { s, speed, fade };
}

export type RidePhase = 'board' | 'travel' | 'alight' | 'done';

/** The part of the journey `t` seconds after it started, and seconds into that part. */
export function phaseAt(timeline: RideTimeline, t: number): { phase: RidePhase; t: number } {
  if (t < timeline.board) return { phase: 'board', t };
  if (t < timeline.board + timeline.travel) return { phase: 'travel', t: t - timeline.board };
  if (t < timeline.total) return { phase: 'alight', t: t - timeline.board - timeline.travel };
  return { phase: 'done', t: t - timeline.total };
}

/** Hop from a to b over `h` above the higher end, `u` 0…1 of the way. */
export function hop(a: Readonly<Point3>, b: Readonly<Point3>, h: number, u: number): Point3 {
  const c = Math.min(1, Math.max(0, u));
  const top = Math.max(a[1], b[1]) + h;
  // A parabola through a (u = 0), the top at mid-hop when the ends are level, and b (u = 1).
  const y = (1 - c) * (1 - c) * a[1] + 2 * c * (1 - c) * (2 * top - (a[1] + b[1]) / 2) + c * c * b[1];
  return [a[0] + (b[0] - a[0]) * c, y, a[2] + (b[2] - a[2]) * c];
}
