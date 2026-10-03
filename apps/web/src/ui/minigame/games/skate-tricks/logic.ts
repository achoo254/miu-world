// Skate tricks: the child rolls along the skate park on her board. A swipe up jumps; rolling over a ramp
// launches her high on its own. In the air, a swipe left, right or down starts a trick (a spin, a board flip, a
// grab) that takes a moment: done before she lands, it is a point; still turning when the board touches down,
// she tumbles and needs a second to get up. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type SwipeDirection } from '../../types';

export interface Ramp {
  x: number;
  used: boolean;
}

export interface SkateState {
  x: number;
  /** Height above the ground (0 = rolling) and upward speed. */
  height: number;
  vy: number;
  /** The trick under way: its kind and seconds into it; null when none. */
  trick: { kind: SwipeDirection; t: number } | null;
  /** Seconds left lying after a tumble. */
  down: number;
  ramps: Ramp[];
  distance: number;
  groundY: number;
  lastTrick: SwipeDirection | null;
  lastTrickAt: number;
  score: number;
  time: number;
}

export const TRICK_SECONDS = 0.45;
export const GRAVITY = 1400;
const JUMP = 620;
const RAMP_JUMP = 900;
const SPEED = 260;
const RAMP_GAP: readonly [number, number] = [700, 1200];
const DOWN_SECONDS = 1.0;

/** Seconds until she lands from where she is now. */
export function timeToLand(state: SkateState): number {
  if (state.height <= 0 && state.vy <= 0) return 0;
  return (state.vy + Math.sqrt(state.vy * state.vy + 2 * GRAVITY * state.height)) / GRAVITY;
}

export function createSkateTricks({ arena, rng }: GameSetup): MinigameLogic<SkateState> {
  const events = eventQueue();
  const groundY = HUD_SAFE_TOP + (arena.height - HUD_SAFE_TOP) * 0.72;
  const placeRamp = (r: Rng, after: number): Ramp => ({ x: after + r.range(RAMP_GAP[0], RAMP_GAP[1]), used: false });
  const state: SkateState = { x: arena.width * 0.3, height: 0, vy: 0, trick: null, down: 0, ramps: [], distance: 0, groundY, lastTrick: null, lastTrickAt: -9, score: 0, time: 0 };
  state.ramps.push(placeRamp(rng, arena.width * 0.6));

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
      if (state.down > 0) {
        state.down = Math.max(0, state.down - dt);
        return;
      }
      state.distance += SPEED * dt;
      for (const r of state.ramps) r.x -= SPEED * dt;
      state.ramps = state.ramps.filter((r) => r.x > -200);
      const last = state.ramps[state.ramps.length - 1];
      if (!last || last.x < arena.width) state.ramps.push(placeRamp(rng, Math.max(arena.width, last?.x ?? 0)));

      const grounded = state.height <= 0 && state.vy <= 0;
      if (grounded) {
        const ramp = state.ramps.find((r) => !r.used && Math.abs(r.x - state.x) < 12);
        if (ramp) {
          ramp.used = true;
          state.vy = RAMP_JUMP;
          events.push({ type: 'action', x: state.x, y: groundY });
        }
      }
      for (const swipe of input.swipes) {
        if (state.height <= 0 && state.vy <= 0 && swipe.direction === 'up') {
          state.vy = JUMP;
          events.push({ type: 'action', x: state.x, y: groundY });
        } else if ((state.height > 0 || state.vy > 0) && !state.trick && swipe.direction !== 'up') {
          state.trick = { kind: swipe.direction, t: 0 };
        }
      }
      if (state.height > 0 || state.vy > 0) {
        state.vy -= GRAVITY * dt;
        state.height += state.vy * dt;
        if (state.trick) {
          state.trick.t += dt;
          if (state.trick.t >= TRICK_SECONDS) {
            state.score += 1;
            state.lastTrick = state.trick.kind;
            state.lastTrickAt = state.time;
            events.push({ type: 'score', x: state.x, y: groundY - state.height - 60 });
            state.trick = null;
          }
        }
        if (state.height <= 0) {
          state.height = 0;
          state.vy = 0;
          if (state.trick) {
            state.trick = null;
            state.down = DOWN_SECONDS;
            events.push({ type: 'hit', x: state.x, y: groundY });
          }
        }
      }
    },
  };
}

const TRICKS: readonly SwipeDirection[] = ['left', 'right', 'down'];

/** Good play: jumps whenever it rolls, and starts a trick whenever one fits before landing. */
export function skateBot(state: SkateState, _context: BotContext): BotMove {
  if (state.down > 0) return {};
  const from = { x: state.x, y: state.groundY - 60 };
  const airborne = state.height > 0 || state.vy > 0;
  if (!airborne) {
    // Wait for a ramp that is about to come.
    if (state.ramps.some((r) => !r.used && r.x - state.x > 0 && r.x - state.x < 120)) return {};
    return { swipe: { from, dx: 0, dy: -120 } };
  }
  if (!state.trick && timeToLand(state) > TRICK_SECONDS + 0.12) {
    const kind = TRICKS[Math.floor(state.distance / 100) % TRICKS.length] ?? 'left';
    return { swipe: { from, dx: kind === 'left' ? -120 : kind === 'right' ? 120 : 0, dy: kind === 'down' ? 120 : 0 } };
  }
  return {};
}
