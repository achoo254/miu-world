// Seal balance: a circus seal holds a ball on its nose; the ball wants to roll off (an upside-down pendulum).
// The child drags left and right and the seal slides after her finger: moving under the ball's lean brings it
// back up. Gusts of wind now and then give it a nudge. Every second the ball sits steady is a point; a ball that
// falls rolls away and a new one is tossed after a moment. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export interface SealState {
  /** The seal's position along the floor and its speed. */
  x: number;
  vx: number;
  /** The ball's lean from upright (radians, + = right) and how fast it changes. */
  lean: number;
  spin: number;
  /** Seconds since the ball fell (it rolls off), or -1 while on the nose. */
  fallen: number;
  /** Side it fell to, for the roll. */
  fellTo: number;
  /** Seconds the ball has been steady, in total (the score is its whole part). */
  steady: number;
  /** Wind: seconds until the next gust, and the current one's push and age. */
  nextGust: number;
  gust: number;
  gustAge: number;
  floorY: number;
  minX: number;
  maxX: number;
  score: number;
  time: number;
}

/** Lean beyond which the ball falls, and within which it counts as steady. */
export const FALL_LEAN = 1.0;
export const STEADY_LEAN = 0.22;
/** How fast a lean grows on its own (per second) and how much the air calms it. */
const GROWTH = 1.7;
const DAMPING = 0.6;
/** The pendulum's length in arena units: how much the seal's push turns the ball. */
const LENGTH = 170;
const FOLLOW = 9;
const MAX_SPEED = 700;
const MAX_ACCEL = 3200;
const NEW_BALL_SECONDS = 1.3;

export function createSealBalance({ arena, params, rng }: GameSetup): MinigameLogic<SealState> {
  const wind = typeof params.wind === 'number' ? Math.min(1.5, Math.max(0, params.wind)) : 1;
  const events = eventQueue();
  const floorY = arena.height - Math.max(70, (arena.height - HUD_SAFE_TOP) * 0.18);
  const state: SealState = {
    x: arena.width / 2,
    vx: 0,
    lean: 0,
    spin: 0,
    fallen: -1,
    fellTo: 1,
    steady: 0,
    nextGust: 3,
    gust: 0,
    gustAge: 9,
    floorY,
    minX: 80,
    maxX: arena.width - 80,
    score: 0,
    time: 0,
  };

  const newBall = (r: Rng): void => {
    state.lean = r.range(0.04, 0.08) * (r.chance(0.5) ? 1 : -1);
    state.spin = 0;
    state.fallen = -1;
  };
  newBall(rng);

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
      state.gustAge += dt;
      // The seal slides after the finger, quick but not in one jump.
      const target = input.pointer?.x ?? input.taps.at(-1)?.x ?? null;
      const wanted = target === null ? 0 : Math.max(-MAX_SPEED, Math.min(MAX_SPEED, (target - state.x) * FOLLOW));
      const accel = Math.max(-MAX_ACCEL, Math.min(MAX_ACCEL, (wanted - state.vx) * 14));
      state.vx += accel * dt;
      state.x += state.vx * dt;
      if (state.x < state.minX || state.x > state.maxX) {
        state.x = Math.min(state.maxX, Math.max(state.minX, state.x));
        state.vx = 0;
      }
      const pushed = state.x === state.minX || state.x === state.maxX ? 0 : accel;

      if (state.fallen >= 0) {
        state.fallen += dt;
        if (state.fallen >= NEW_BALL_SECONDS) newBall(rng);
        return;
      }
      // Gusts.
      state.nextGust -= dt;
      if (state.nextGust <= 0 && wind > 0) {
        state.gust = rng.range(0.2, 0.45) * wind * (rng.chance(0.5) ? 1 : -1);
        state.gustAge = 0;
        state.spin += state.gust;
        state.nextGust = rng.range(3, 5.5);
      }
      // The upside-down pendulum: gravity tips it over, the seal's push under it turns it back.
      const tilt = GROWTH * GROWTH * Math.sin(state.lean) - (pushed / LENGTH) * Math.cos(state.lean) - DAMPING * state.spin;
      state.spin += tilt * dt;
      state.lean += state.spin * dt;
      if (Math.abs(state.lean) >= FALL_LEAN) {
        state.fallen = 0;
        state.fellTo = Math.sign(state.lean) || 1;
        events.push({ type: 'hit', x: state.x + state.fellTo * 80, y: floorY - 160 });
        return;
      }
      if (Math.abs(state.lean) < STEADY_LEAN) {
        const before = Math.floor(state.steady);
        state.steady += dt;
        if (Math.floor(state.steady) > before) {
          state.score = Math.floor(state.steady);
          events.push({ type: 'score', x: state.x, y: floorY - 260 });
        }
      }
    },
  };
}

/**
 * Good play: slides under the lean, a little ahead of where it is going, and lets the ball lean a touch toward
 * the middle of the stage so the seal drifts back there instead of running into the edge.
 */
export function sealBot(state: SealState, context: BotContext): BotMove {
  const towardMiddle = Math.max(-0.12, Math.min(0.12, (context.arena.width / 2 - state.x) * 0.0004 - state.vx * 0.0003));
  const x = state.x + (state.lean - towardMiddle) * 900 + state.spin * 80;
  return { touch: { x: Math.min(state.maxX, Math.max(state.minX, x)), y: state.floorY - 40 } };
}
