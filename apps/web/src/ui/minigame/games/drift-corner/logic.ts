// Drift corner ("Ôm cua"): a little race car drives itself along a road of straight stretches and right-angle
// corners, each with a post on the inside. Holding a finger down makes the car swing round the next corner's
// post; letting go sends it straight on. Let go when it faces down the next stretch (it straightens itself if
// close). Holding too late or too long runs it off the road: it is put back at the start of that stretch. Every
// corner passed is a point, and the car speeds up as the round goes on. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import type { BotContext, BotMove, GameInput, GameSetup, MinigameLogic, Point } from '../../types';

export interface DriftCornerState {
  /** Corner points of the road (world units, y up the screen is negative). */
  points: Point[];
  /** The stretch the car is on: from points[seg] to points[seg + 1]. */
  seg: number;
  car: Point;
  heading: number;
  holding: boolean;
  /** The post being swung round and the swing radius. */
  orbit: Point | null;
  radius: number;
  speed: number;
  /** Seconds left before the car goes again after running off; when it last did. */
  resetIn: number;
  crashAt: number;
  score: number;
  time: number;
}

/** Half the road's width, and the swing radius that lands on the next stretch's middle. */
export const ROAD = 62;
export const TURN = 95;
const SNAP = (35 * Math.PI) / 180;
const RESET_SECONDS = 0.8;

const dirOf = (a: Point, b: Point): Point => {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
};

/** The inside post of corner `i` (between stretch i-1 and stretch i). */
export function postOf(state: DriftCornerState, i: number): Point | null {
  const a = state.points[i - 1];
  const p = state.points[i];
  const b = state.points[i + 1];
  if (!a || !p || !b) return null;
  const din = dirOf(a, p);
  const dout = dirOf(p, b);
  return { x: p.x - din.x * TURN + dout.x * TURN, y: p.y - din.y * TURN + dout.y * TURN };
}

function extend(rng: Rng, points: Point[], width: number): void {
  while (points.length < 400) {
    const last = points.at(-1) ?? { x: 0, y: 0 };
    const n = points.length;
    // Stretches go up, then across (left or right, staying on a band about the screen's width), then up again.
    if (n % 2 === 1) points.push({ x: last.x, y: last.y - rng.range(230, 330) });
    else {
      const room = Math.max(260, width * 0.5);
      const side = last.x > 0 ? -1 : last.x < 0 ? 1 : rng.chance(0.5) ? 1 : -1;
      points.push({ x: last.x + side * rng.range(room * 0.7, room), y: last.y });
    }
  }
}

export function createDriftCorner({ arena, duration, rng }: GameSetup): MinigameLogic<DriftCornerState> {
  const events = eventQueue();
  const points: Point[] = [{ x: 0, y: 200 }];
  extend(rng, points, arena.width);
  const state: DriftCornerState = {
    points,
    seg: 0,
    car: { x: 0, y: 200 },
    heading: -Math.PI / 2,
    holding: false,
    orbit: null,
    radius: TURN,
    speed: 260,
    resetIn: 0,
    crashAt: -9,
    score: 0,
    time: 0,
  };

  const putBack = (): void => {
    const a = points[state.seg] ?? { x: 0, y: 0 };
    const b = points[state.seg + 1] ?? a;
    const d = dirOf(a, b);
    state.car = { x: a.x + d.x * 10, y: a.y + d.y * 10 };
    state.heading = Math.atan2(d.y, d.x);
    state.orbit = null;
    state.resetIn = RESET_SECONDS;
    state.crashAt = state.time;
    events.push({ type: 'hit', x: arena.width / 2, y: arena.height * 0.65 });
  };

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return false;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.speed = 260 + 100 * Math.min(1, state.time / duration);
      if (state.resetIn > 0) {
        state.resetIn -= dt;
        return;
      }
      const holding = input.pointer !== null;
      const a = points[state.seg] ?? { x: 0, y: 0 };
      const b = points[state.seg + 1] ?? a;
      const c = points[state.seg + 2] ?? b;
      const din = dirOf(a, b);
      const dout = dirOf(b, c);
      if (holding && !state.orbit) {
        const post = postOf(state, state.seg + 1);
        if (post) {
          state.orbit = post;
          state.radius = Math.max(30, Math.hypot(state.car.x - post.x, state.car.y - post.y));
        }
      }
      if (!holding && state.orbit) {
        state.orbit = null;
        // Straighten when close to either stretch's direction.
        for (const d of [dout, din]) {
          const want = Math.atan2(d.y, d.x);
          const diff = Math.atan2(Math.sin(want - state.heading), Math.cos(want - state.heading));
          if (Math.abs(diff) <= SNAP) {
            state.heading = want;
            break;
          }
        }
      }
      state.holding = holding;
      if (state.orbit) {
        const turn = Math.sign(din.x * dout.y - din.y * dout.x) || 1;
        state.heading += (turn * state.speed * dt) / state.radius;
        const ang = Math.atan2(state.car.y - state.orbit.y, state.car.x - state.orbit.x) + (turn * state.speed * dt) / state.radius;
        state.car = { x: state.orbit.x + Math.cos(ang) * state.radius, y: state.orbit.y + Math.sin(ang) * state.radius };
      } else {
        state.car.x += Math.cos(state.heading) * state.speed * dt;
        state.car.y += Math.sin(state.heading) * state.speed * dt;
      }
      // Which stretch is it on? Past the corner onto the next one is a point.
      const onStretch = (p: Point, q: Point, slack: number): { along: number; side: number; len: number } => {
        const d = dirOf(p, q);
        const rx = state.car.x - p.x;
        const ry = state.car.y - p.y;
        return { along: rx * d.x + ry * d.y, side: -rx * d.y + ry * d.x, len: Math.hypot(q.x - p.x, q.y - p.y) + slack };
      };
      const next = onStretch(b, c, 0);
      if (next.along > ROAD && Math.abs(next.side) < ROAD) {
        state.seg += 1;
        state.score += 1;
        events.push({ type: 'score', x: arena.width / 2, y: arena.height * 0.55, note: 72 + (state.score % 5) * 2, voice: 'bell' });
        // Ease onto the middle of the new stretch.
        return;
      }
      const here = onStretch(a, b, ROAD);
      const inCorner = Math.hypot(state.car.x - b.x, state.car.y - b.y) < ROAD * 1.5 || (next.along > -ROAD && next.along <= ROAD && Math.abs(next.side) < ROAD);
      const onRoad = (here.along >= -ROAD && here.along <= here.len && Math.abs(here.side) < ROAD) || inCorner;
      if (!onRoad) {
        putBack();
        return;
      }
      // Not swinging: drift gently back to the middle of the stretch.
      if (!state.orbit && here.along <= here.len - ROAD && Math.abs(here.side) > 1) {
        const ease = Math.min(Math.abs(here.side), 60 * dt) * Math.sign(here.side);
        state.car.x += din.y * ease;
        state.car.y -= din.x * ease;
      }
    },
  };
}

/** Good play: hold as the car comes level with the post, let go once it faces down the next stretch. */
export function driftCornerBot(state: DriftCornerState, context: BotContext): BotMove {
  const finger = { x: context.arena.width / 2, y: context.arena.height * 0.8 };
  if (state.resetIn > 0) return {};
  const a = state.points[state.seg];
  const b = state.points[state.seg + 1];
  const c = state.points[state.seg + 2];
  if (!a || !b || !c) return {};
  const din = dirOf(a, b);
  const dout = dirOf(b, c);
  if (state.orbit) {
    const want = Math.atan2(dout.y, dout.x);
    const diff = Math.abs(Math.atan2(Math.sin(want - state.heading), Math.cos(want - state.heading)));
    return diff < (state.speed / state.radius) * 0.06 ? {} : { touch: finger };
  }
  const toCorner = (b.x - state.car.x) * din.x + (b.y - state.car.y) * din.y;
  return toCorner <= TURN + state.speed * 0.05 && toCorner > TURN - 40 ? { touch: finger } : {};
}
