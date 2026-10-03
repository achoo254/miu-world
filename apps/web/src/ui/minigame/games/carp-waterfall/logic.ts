// Carp waterfall (cá chép vượt Vũ Môn): a carp climbs a waterfall rock by rock. The water comes in surges: calm,
// then foam rushing down from the top, then a strong white surge, then calm again. The child taps to make the
// carp leap to the next rock; a leap that meets the strong surge washes it down a rock (and it takes a moment
// to shake off). Every new rock is a point; at the fifteenth rock the dragon gate shines. Surges vary in length,
// so the child watches the water, not a clock, and the strong spells are long enough that leaping blindly
// loses more rocks than it wins. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export type Flow = 'calm' | 'warning' | 'strong';

export interface CarpState {
  /** The rock the carp is on (0 = the pool at the bottom). */
  ledge: number;
  /** Highest rock reached: the score. */
  best: number;
  /** Seconds into a leap (from `from` to `to`), or -1 when resting. */
  leap: number;
  from: number;
  to: number;
  /** Seconds left of being dizzy after being washed down. */
  dizzy: number;
  flow: Flow;
  /** Seconds into the current flow, and how long it lasts. */
  flowTime: number;
  flowLength: number;
  /** Seconds since it reached a gate rock (multiple of GATE_EVERY), or large. */
  gateAgo: number;
  /** Seconds since it was washed down, or large. */
  washedAgo: number;
  /** Camera: the rock height shown at the screen's anchor, eased toward the carp. */
  view: number;
  arena: { width: number; height: number };
  score: number;
  time: number;
}

export const LEAP_SECONDS = 0.42;
const DIZZY_SECONDS = 0.5;
const WARNING_SECONDS = 0.4;
export const GATE_EVERY = 15;
/** Units between two rocks on screen. */
export const LEDGE_GAP = 120;

/** Seconds of calm left (0 while the water is not calm). */
export function calmLeft(state: CarpState): number {
  return state.flow === 'calm' ? state.flowLength - state.flowTime : 0;
}

export function createCarpWaterfall({ arena, duration, params, rng }: GameSetup): MinigameLogic<CarpState> {
  const pace = typeof params.speed === 'number' ? Math.min(1.4, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const state: CarpState = {
    ledge: 0,
    best: 0,
    leap: -1,
    from: 0,
    to: 0,
    dizzy: 0,
    flow: 'calm',
    flowTime: 0,
    flowLength: 1.8,
    gateAgo: 99,
    washedAgo: 99,
    view: 0,
    arena,
    score: 0,
    time: 0,
  };

  const lengthOf = (flow: Flow, r: Rng): number => {
    // Calm spells shorten a little as the round goes on.
    const late = Math.min(1, state.time / duration);
    if (flow === 'calm') return (r.range(0.95, 1.45) * (1 - 0.15 * late)) / pace;
    if (flow === 'warning') return WARNING_SECONDS / pace;
    return r.range(1.4, 1.8) / pace;
  };

  function nextFlow(): void {
    state.flow = state.flow === 'calm' ? 'warning' : state.flow === 'warning' ? 'strong' : 'calm';
    state.flowTime = 0;
    state.flowLength = lengthOf(state.flow, rng);
  }

  function washDown(): void {
    state.leap = -1;
    state.ledge = Math.max(0, state.from - 1);
    state.dizzy = DIZZY_SECONDS;
    state.washedAgo = 0;
    events.push({ type: 'hit', x: arena.width / 2, y: HUD_SAFE_TOP + (arena.height - HUD_SAFE_TOP) * 0.7 });
  }

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
      state.gateAgo += dt;
      state.washedAgo += dt;
      state.dizzy = Math.max(0, state.dizzy - dt);
      state.flowTime += dt;
      if (state.flowTime >= state.flowLength) nextFlow();
      // The camera follows the carp.
      const target = state.leap >= 0 ? state.from + (state.to - state.from) * Math.min(1, state.leap / LEAP_SECONDS) : state.ledge;
      state.view += (target - state.view) * Math.min(1, dt * 6);

      if (state.leap >= 0) {
        state.leap += dt;
        if (state.flow === 'strong') {
          washDown();
          return;
        }
        if (state.leap >= LEAP_SECONDS) {
          state.leap = -1;
          state.ledge = state.to;
          if (state.ledge > state.best) {
            state.best = state.ledge;
            state.score = state.best;
            events.push({ type: 'score', x: arena.width / 2, y: HUD_SAFE_TOP + (arena.height - HUD_SAFE_TOP) * 0.6 });
            if (state.best % GATE_EVERY === 0) state.gateAgo = 0;
          } else {
            events.push({ type: 'action', x: arena.width / 2, y: HUD_SAFE_TOP + (arena.height - HUD_SAFE_TOP) * 0.6 });
          }
        }
        return;
      }
      if (input.taps.length > 0 && state.dizzy <= 0) {
        state.from = state.ledge;
        state.to = state.ledge + 1;
        state.leap = 0;
        // Leaping straight into the surge washes it down at once.
        if (state.flow === 'strong') washDown();
      }
    },
  };
}

/** Good play: leaps when the calm will last through the leap. */
export function carpBot(state: CarpState, _context: BotContext): BotMove {
  if (state.leap >= 0 || state.dizzy > 0) return {};
  return calmLeft(state) >= LEAP_SECONDS + 0.12 ? { tap: { x: state.arena.width / 2, y: state.arena.height / 2 } } : {};
}
