// Wall jump ("Nhảy vách hẻm núi"): the child climbs up the side of a narrow icy canyon on her own. Ice spikes
// stick out of both walls; a tap leaps across to the other wall (safe while in the air). Climbing into a spike
// knocks her 5 m down and she needs a moment to grip again. Stars on the walls give a 2 m boost. The score is
// the height reached, in metres; she climbs a little faster as the round goes on. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export type Side = -1 | 1;

export interface Spike {
  side: Side;
  /** Bottom of the spike (m) and its length. */
  at: number;
}

export interface WallStar {
  side: Side;
  at: number;
  taken: boolean;
}

export interface WallJumpState {
  /** Height (m), the wall she clings to (or leaps toward) and how far through a leap (0 … 1, 1 = clinging). */
  height: number;
  side: Side;
  leap: number;
  /** Seconds left of the knock-back stun; when she last got hit. */
  stunned: number;
  hitAt: number;
  spikes: Spike[];
  stars: WallStar[];
  /** Canyon walls: inner x of the left and right wall. */
  left: number;
  right: number;
  speed: number;
  score: number;
  time: number;
}

export const SPIKE_LENGTH = 1.3;
export const KNOCK = 5;
const LEAP_SECONDS = 0.32;
const STUN_SECONDS = 0.6;
const STAR_BOOST = 2;
/** She is this tall (m): a spike touches her when it overlaps her body. */
const BODY = 0.9;

function build(rng: Rng, from: number, spikes: Spike[], stars: WallStar[]): void {
  let at = Math.max(from, spikes.at(-1)?.at ?? 4);
  while (at < from + 40) {
    at += rng.range(2.6, 4.2);
    const side: Side = rng.chance(0.5) ? -1 : 1;
    spikes.push({ side, at });
    if (rng.chance(0.35)) stars.push({ side: side === 1 ? -1 : 1, at: at + 0.4, taken: false });
  }
}

export function createWallJump({ arena, duration, rng }: GameSetup): MinigameLogic<WallJumpState> {
  const events = eventQueue();
  const wall = Math.max(50, arena.width * 0.12);
  const state: WallJumpState = {
    height: 0,
    side: -1,
    leap: 1,
    stunned: 0,
    hitAt: -9,
    spikes: [],
    stars: [],
    left: wall,
    right: arena.width - wall,
    speed: 1.6,
    score: 0,
    time: 0,
  };
  build(rng, 0, state.spikes, state.stars);

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
      state.speed = 1.6 + 0.6 * Math.min(1, state.time / duration);
      if (state.stunned > 0) {
        state.stunned -= dt;
        return;
      }
      if (state.leap >= 1 && input.taps.some((t) => t.y > HUD_SAFE_TOP)) {
        state.side = state.side === 1 ? -1 : 1;
        state.leap = 0;
        events.push({ type: 'action', x: state.side > 0 ? state.right : state.left, y: arena.height * 0.6 });
      }
      if (state.leap < 1) state.leap = Math.min(1, state.leap + dt / LEAP_SECONDS);
      state.height += state.speed * dt;
      const clinging = state.leap >= 1;
      if (clinging) {
        const spike = state.spikes.find((s) => s.side === state.side && s.at < state.height + BODY && s.at + SPIKE_LENGTH > state.height);
        if (spike) {
          state.height = Math.max(0, spike.at - KNOCK);
          state.stunned = STUN_SECONDS;
          state.hitAt = state.time;
          events.push({ type: 'hit', x: state.side > 0 ? state.right : state.left, y: arena.height * 0.6 });
        }
        for (const star of state.stars) {
          if (star.taken || star.side !== state.side || Math.abs(star.at - state.height - BODY / 2) > 0.7) continue;
          star.taken = true;
          state.height += STAR_BOOST;
          events.push({ type: 'score', x: state.side > 0 ? state.right - 40 : state.left + 40, y: arena.height * 0.55, points: STAR_BOOST });
        }
      }
      build(rng, state.height, state.spikes, state.stars);
      state.spikes = state.spikes.filter((s) => s.at > state.height - 30);
      state.stars = state.stars.filter((s) => s.at > state.height - 30);
      state.score = Math.floor(state.height);
    },
  };
}

/** Good play: leap across when a spike is coming up on this wall and the other wall is clear where she lands. */
export function wallJumpBot(state: WallJumpState, context: BotContext): BotMove {
  if (state.stunned > 0 || state.leap < 1) return {};
  const ahead = state.speed * 0.45;
  const danger = state.spikes.some((s) => s.side === state.side && s.at > state.height && s.at < state.height + BODY + ahead);
  const other: Side = state.side === 1 ? -1 : 1;
  const landing = state.height + state.speed * LEAP_SECONDS;
  const clear = !state.spikes.some((s) => s.side === other && s.at < landing + BODY + 0.4 && s.at + SPIKE_LENGTH > landing - 0.2);
  const star = state.stars.some((s) => !s.taken && s.side === other && s.at > landing && s.at < landing + 1.5);
  return (danger || star) && clear ? { tap: { x: context.arena.width / 2, y: context.arena.height / 2 } } : {};
}
