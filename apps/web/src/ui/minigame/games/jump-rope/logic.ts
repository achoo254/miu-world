// Jump rope: two friends turn a long rope round the child. She taps to jump; while she is up in the air the
// rope must pass under her feet. Each clean jump is a point and the rope turns a little faster; caught by the
// rope, the turning stops for a moment and starts again slowly (the run of jumps starts again too). A jump
// lasts a fixed time, so tapping all the time lands her on the rope as often as not. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { BotContext, BotMove, GameInput, GameSetup, MinigameLogic } from '../../types';

export interface RopeState {
  /** Where she stands: the middle of the screen, on the ground. */
  childX: number;
  groundY: number;
  /** Rope angle (radians): it passes under her feet at every whole turn. */
  angle: number;
  /** Seconds per turn now. */
  period: number;
  /** Seconds the rope stays still after catching her (0 while turning). */
  stopped: number;
  /** Seconds since she left the ground (-1 on the ground), and of rest after landing. */
  air: number;
  rest: number;
  streak: number;
  best: number;
  /** The last pass under her feet: cleared or caught, and seconds since. */
  last: 'clear' | 'caught' | null;
  lastAgo: number;
  score: number;
  time: number;
}

export const JUMP_SECONDS = 0.46;
export const JUMP_HEIGHT = 70;
/** Her feet must be this high when the rope passes. */
export const CLEARANCE = 30;
const REST_SECONDS = 0.3;
const PERIOD_START = 1.35;
const PERIOD_MIN = 0.9;
const PERIOD_STEP = 0.035;
const STOP_SECONDS = 1.4;

/** Height of her feet `air` seconds into a jump. */
export const feetAt = (air: number): number => (air < 0 || air > JUMP_SECONDS ? 0 : (4 * JUMP_HEIGHT * air * (JUMP_SECONDS - air)) / (JUMP_SECONDS * JUMP_SECONDS));

/** Seconds until the rope next passes under her feet. */
export const untilPass = (state: RopeState): number => (state.stopped > 0 ? Infinity : ((Math.PI * 2 - (state.angle % (Math.PI * 2))) / (Math.PI * 2)) * state.period);

export function createJumpRope({ arena, params }: GameSetup): MinigameLogic<RopeState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.4, Math.max(0.7, params.speed)) : 1;
  const events = eventQueue();
  const state: RopeState = {
    childX: arena.width / 2,
    groundY: arena.height * 0.72,
    // Starts at the top, so the first pass comes after half a turn.
    angle: Math.PI,
    period: PERIOD_START / factor,
    stopped: 0,
    air: -1,
    rest: 0,
    streak: 0,
    best: 0,
    last: null,
    lastAgo: 9,
    score: 0,
    time: 0,
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
      state.lastAgo += dt;
      state.rest = Math.max(0, state.rest - dt);
      if (state.air >= 0) {
        state.air += dt;
        if (state.air > JUMP_SECONDS) {
          state.air = -1;
          state.rest = REST_SECONDS;
        }
      } else if (input.pressed && state.rest <= 0) {
        state.air = 0;
        events.push({ type: 'action', x: state.childX, y: state.groundY });
      }

      if (state.stopped > 0) {
        state.stopped -= dt;
        if (state.stopped <= 0) {
          state.stopped = 0;
          state.angle = Math.PI;
        }
        return;
      }
      const before = Math.floor(state.angle / (Math.PI * 2));
      state.angle += ((Math.PI * 2) / state.period) * dt;
      if (Math.floor(state.angle / (Math.PI * 2)) === before) return;
      // The rope passes under her feet.
      state.lastAgo = 0;
      if (feetAt(state.air) >= CLEARANCE) {
        state.last = 'clear';
        state.streak += 1;
        state.best = Math.max(state.best, state.streak);
        state.score += 1;
        state.period = Math.max(PERIOD_MIN, state.period - PERIOD_STEP);
        events.push({ type: 'score', x: state.childX, y: state.groundY - 150, note: 72 + (state.streak % 5) * 2, voice: 'bell' });
      } else {
        state.last = 'caught';
        state.streak = 0;
        state.period = PERIOD_START / factor;
        state.stopped = STOP_SECONDS;
        events.push({ type: 'hit', x: state.childX, y: state.groundY });
      }
    },
  };
}

/** Good play: jump so the rope passes at the top of the jump. */
export function jumpRopeBot(state: RopeState, context: BotContext): BotMove {
  if (state.air >= 0 || state.rest > 0) return {};
  const wait = untilPass(state) - JUMP_SECONDS / 2;
  return wait >= -0.05 && wait < 0.05 ? { tap: { x: context.arena.width / 2, y: context.arena.height / 2 } } : {};
}
