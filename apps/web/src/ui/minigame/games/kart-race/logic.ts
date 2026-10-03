// Kart race: an oval track seen from above, four karts on the start line. While the child's finger is down her
// kart speeds up and steers toward the finger (it turns at a kart's pace, not in one jump); lifting the finger
// lets it coast to a stop. Grass beside the track slows it to half. Two laps against three friends, who drive
// steady lines a little slower than a full-speed kart. Stars on the track are a bonus. Points come at the
// finish: first 8, second 6, third 4, each star one more; last place scores 1 and its stars do not count, and
// a race not finished scores nothing. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const LAPS = 2;
/** Half the track's width. */
export const TRACK_HALF = 64;
export const MAX_SPEED = 210;
const ACCEL = 380;
const COAST = 320;
const TURN_RATE = 3.4;
const GRASS_FACTOR = 0.5;
const STARS_PER_LAP = 6;
const STAR_REACH = 44;
/** Finishing points by place (1st … 4th). */
export const PLACE_POINTS = [8, 6, 4, 1] as const;
/** The friends' speeds as a share of a full-speed kart. */
const RIVAL_PACE = [0.83, 0.88, 0.93] as const;

export interface Kart {
  x: number;
  y: number;
  heading: number;
  speed: number;
  /** Laps done, as a fraction (2 = finished), counted from the start line. */
  progress: number;
  /** Track angle last step (for counting progress). */
  angle: number;
  /** Rivals: their lane offset from the centre line and their pace. */
  lane: number;
  pace: number;
  /** Seconds into the round it finished, or -1. */
  finishedAt: number;
}

export interface TrackStar {
  /** Track angle and lane offset. */
  angle: number;
  lane: number;
  /** Seconds since it was picked up, -1 while it waits. */
  taken: number;
}

export interface KartState {
  cx: number;
  cy: number;
  /** The centre line's radii. */
  rx: number;
  ry: number;
  player: Kart;
  rivals: Kart[];
  stars: TrackStar[];
  starsTaken: number;
  /** The child's place when she finished (1–4), or 0 while racing. */
  place: number;
  /** The child's place right now (for the label). */
  position: number;
  offTrack: boolean;
  score: number;
  time: number;
}

type Geometry = Pick<KartState, 'cx' | 'cy' | 'rx' | 'ry'>;

/** Start line at the bottom of the oval; karts go clockwise on screen (the track angle grows). */
const START_ANGLE = Math.PI / 2;

const wrap = (a: number): number => {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
};

/** A point on the oval at track angle `angle`, pushed `lane` units outward. */
export function trackPoint(s: Geometry, angle: number, lane = 0): Point {
  const nx = Math.cos(angle) / s.rx;
  const ny = Math.sin(angle) / s.ry;
  const n = Math.hypot(nx, ny);
  return { x: s.cx + s.rx * Math.cos(angle) + (nx / n) * lane, y: s.cy + s.ry * Math.sin(angle) + (ny / n) * lane };
}

/** The track angle of a point (the oval's parameter, not the true angle). */
export function trackAngle(s: Geometry, p: Point): number {
  return Math.atan2((p.y - s.cy) / s.ry, (p.x - s.cx) / s.rx);
}

/** How far a point is from the centre line (roughly, along the normal). */
export function offCentre(s: Geometry, p: Point): number {
  const c = trackPoint(s, trackAngle(s, p));
  return Math.hypot(p.x - c.x, p.y - c.y);
}

/** Units of centre line per unit of track angle at `angle`. */
export const arcScale = (s: Geometry, angle: number): number => Math.hypot(s.rx * Math.sin(angle), s.ry * Math.cos(angle));

function placeKart(s: Geometry, lane: number, pace: number, rng: Rng | null): Kart {
  const p = trackPoint(s, START_ANGLE, lane);
  // Heading along the track (clockwise on screen at the bottom: leftward).
  return { x: p.x, y: p.y, heading: Math.PI, speed: 0, progress: 0, angle: START_ANGLE, lane, pace: pace * (rng ? rng.range(0.98, 1.02) : 1), finishedAt: -1 };
}

export function createKartRace({ arena, params, rng }: GameSetup): MinigameLogic<KartState> {
  const rivalFactor = typeof params.rivals === 'number' ? Math.min(1.15, Math.max(0.7, params.rivals)) : 1;
  const events = eventQueue();
  const top = HUD_SAFE_TOP + 16;
  const geometry: Geometry = {
    cx: arena.width / 2,
    cy: (top + arena.height - 20) / 2,
    rx: arena.width / 2 - 26 - TRACK_HALF,
    ry: (arena.height - 20 - top) / 2 - TRACK_HALF,
  };
  // Four karts side by side on the start line; the child second from the inside.
  const lanes = [-46, -15, 16, 46] as const;
  const state: KartState = {
    ...geometry,
    player: placeKart(geometry, lanes[1], 1, null),
    rivals: RIVAL_PACE.map((pace, i) => placeKart(geometry, [lanes[0], lanes[2], lanes[3]][i] ?? 0, pace * rivalFactor, rng)),
    stars: [],
    starsTaken: 0,
    place: 0,
    position: 4,
    offTrack: false,
    score: 0,
    time: 0,
  };
  let lapsDone = 0;

  function layStars(): void {
    state.stars = Array.from({ length: STARS_PER_LAP }, (_, i) => ({
      angle: START_ANGLE + ((i + 0.6) / STARS_PER_LAP) * Math.PI * 2,
      lane: rng.pick([-34, 0, 34] as const),
      taken: -1,
    }));
  }
  layStars();

  /** Counts a kart's way round from the change of its track angle. */
  function track(k: Kart): void {
    const angle = trackAngle(state, k);
    k.progress += wrap(angle - k.angle) / (Math.PI * 2);
    k.angle = angle;
  }

  function finishedRivals(): number {
    return state.rivals.filter((r) => r.finishedAt >= 0).length;
  }

  function finish(): void {
    state.place = finishedRivals() + 1;
    const placePoints = PLACE_POINTS[state.place - 1] ?? 1;
    state.score = state.place <= 3 ? placePoints + state.starsTaken : placePoints;
    events.push({ type: 'score', x: state.player.x, y: state.player.y - 40, points: state.score, note: 84, voice: 'bell' });
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.place > 0 && state.time - state.player.finishedAt > 1.5;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      const k = state.player;
      if (state.place === 0) {
        const target = input.pointer;
        if (target) {
          const dist = Math.hypot(target.x - k.x, target.y - k.y);
          if (dist > 18) {
            const turn = wrap(Math.atan2(target.y - k.y, target.x - k.x) - k.heading);
            k.heading += Math.max(-TURN_RATE * dt, Math.min(TURN_RATE * dt, turn));
          }
          k.speed = Math.min(MAX_SPEED, k.speed + ACCEL * dt);
        } else k.speed = Math.max(0, k.speed - COAST * dt);
      } else k.speed = Math.max(0, k.speed - COAST * dt);
      state.offTrack = offCentre(state, k) > TRACK_HALF;
      if (state.offTrack) k.speed = Math.max(Math.min(k.speed, MAX_SPEED * GRASS_FACTOR), k.speed - ACCEL * 2 * dt);
      k.x = Math.min(arena.width - 14, Math.max(14, k.x + Math.cos(k.heading) * k.speed * dt));
      k.y = Math.min(arena.height - 14, Math.max(HUD_SAFE_TOP, k.y + Math.sin(k.heading) * k.speed * dt));
      track(k);

      // Rivals drive their lane at their pace, wobbling a little.
      for (const r of state.rivals) {
        const pace = r.pace * (1 + 0.04 * Math.sin(state.time * 0.9 + r.lane));
        // A gentle start: they need a second to get up to speed too.
        r.speed = Math.min(MAX_SPEED * pace, r.speed + ACCEL * 0.8 * dt);
        const angle = r.angle + (r.speed * dt) / arcScale(state, r.angle);
        r.progress += (angle - r.angle) / (Math.PI * 2);
        r.angle = angle;
        const p = trackPoint(state, angle, r.lane);
        if (Math.hypot(p.x - r.x, p.y - r.y) > 0.01) r.heading = Math.atan2(p.y - r.y, p.x - r.x);
        r.x = p.x;
        r.y = p.y;
        if (r.finishedAt < 0 && r.progress >= LAPS) r.finishedAt = state.time;
      }

      if (state.place === 0) {
        for (const star of state.stars) {
          if (star.taken >= 0) continue;
          const p = trackPoint(state, star.angle, star.lane);
          if (Math.hypot(p.x - k.x, p.y - k.y) <= STAR_REACH) {
            star.taken = 0;
            state.starsTaken += 1;
            events.push({ type: 'score', x: p.x, y: p.y, note: 76 + (state.starsTaken % 5) * 2, voice: 'bell' });
          }
        }
        if (k.progress >= LAPS) {
          k.finishedAt = state.time;
          finish();
        }
        state.position = 1 + state.rivals.filter((r) => r.progress > k.progress).length;
      }
      for (const star of state.stars) if (star.taken >= 0) star.taken += dt;
      // A new lap: the stars come back.
      const lap = Math.floor(Math.max(0, k.progress));
      if (lap > lapsDone) {
        lapsDone = lap;
        if (state.place === 0) {
          layStars();
          events.push({ type: 'action', x: k.x, y: k.y, note: 72, voice: 'whistle' });
        }
      }
    },
  };
}

/** Good play: aims at the centre line a little ahead (a star nearby pulls it over), finger always down. */
export function kartBot(state: KartState, _context: BotContext): BotMove {
  const k = state.player;
  if (state.place > 0) return {};
  const ahead = k.angle + 150 / arcScale(state, k.angle);
  let target = trackPoint(state, ahead);
  const star = state.stars.find((s) => s.taken < 0 && wrap(s.angle - k.angle) > 0 && wrap(s.angle - k.angle) < 280 / arcScale(state, k.angle));
  if (star) target = trackPoint(state, star.angle, star.lane);
  return { touch: target };
}

