// Candle cake spin: a round birthday cake turns on its stand; a tap sends a candle up from below to stick
// into the cake's edge. Each cake needs a few candles (6, then 8, 9, 10); a candle that hits one already
// standing bounces off, the cake is cleared for a moment and then starts over. Later cakes turn
// faster, change direction, and come with a candle or two already on. A finished cake scores its candles
// and three more. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export interface Candle {
  /** Angle on the cake (radians, in the cake's own turning frame). */
  at: number;
  /** Already on the cake when it came (cannot be hit either). */
  old: boolean;
}

export interface Flying {
  t: number;
  /** The candle bounced off another: seconds since. */
  bounced: number;
}

export interface CandleCakeState {
  cx: number;
  cy: number;
  radius: number;
  launchY: number;
  /** The cake's turn (radians) and how it turns. */
  angle: number;
  spin: number;
  wobble: number;
  phase: number;
  candles: Candle[];
  cake: number;
  need: number;
  flying: Flying | null;
  /** Seconds since the cake was finished (-1 while working on it), and since it was spoilt. */
  doneAgo: number;
  spoiltAgo: number;
  score: number;
  time: number;
}

/** Seconds a candle takes to reach the cake. */
export const FLIGHT = 0.18;
/** Two candles closer than this (radians on the rim) collide. */
export const MIN_GAP = 0.3;
const CAKE_BONUS = 3;
/** Angle (screen) where candles strike: the bottom of the cake. */
export const STRIKE = Math.PI / 2;
const NEXT_CAKE = 0.9;
const BOUNCE_PAUSE = 1.4;

const normal = (a: number): number => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
export const angleGap = (a: number, b: number): number => {
  const d = normal(a - b);
  return Math.min(d, Math.PI * 2 - d);
};

function setUpCake(state: CandleCakeState, rng: Rng, factor: number): void {
  const n = state.cake;
  state.need = n === 0 ? 6 : Math.min(10, 7 + n);
  state.candles = [];
  // From the second cake on, one or two candles are already standing.
  const old = n === 0 ? 0 : n < 3 ? 1 : 2;
  for (let i = 0; i < old; i += 1) state.candles.push({ at: rng.range(0, Math.PI * 2) + i * Math.PI, old: true });
  state.spin = (1.4 + Math.min(n, 4) * 0.25) * factor * (n % 2 === 1 ? -1 : 1);
  // Never a steady turn: the speed swells and eases (later cakes even stop and turn back for a moment), so
  // tapping to a beat does not space the candles evenly.
  state.wobble = n === 0 ? 0.7 : 1.25;
  state.phase = rng.range(0, Math.PI * 2);
  state.doneAgo = -1;
}

/** The cake's turning speed now (radians per second): later cakes speed up and slow down. */
export const spinNow = (state: CandleCakeState): number => state.spin * (1 + state.wobble * Math.sin(state.time * 2.3 + state.phase));

export function createCandleCakeSpin({ arena, params, rng }: GameSetup): MinigameLogic<CandleCakeState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const radius = Math.min(130, arena.width * 0.22);
  const cy = Math.max(HUD_SAFE_TOP + radius + 90, Math.min(arena.height * 0.42, arena.height - 330));
  const state: CandleCakeState = {
    cx: arena.width / 2,
    cy,
    radius,
    launchY: Math.min(arena.height - 110, cy + radius + 300),
    angle: 0,
    spin: 0,
    wobble: 0,
    phase: 0,
    candles: [],
    cake: 0,
    need: 5,
    flying: null,
    doneAgo: -1,
    spoiltAgo: 9,
    score: 0,
    time: 0,
  };
  setUpCake(state, rng, factor);

  const placed = (): number => state.candles.filter((c) => !c.old).length;

  function land(): void {
    const at = normal(STRIKE - state.angle);
    if (state.candles.some((c) => angleGap(c.at, at) < MIN_GAP)) {
      if (state.flying) state.flying.bounced = 0;
      state.spoiltAgo = 0;
      events.push({ type: 'hit', x: state.cx, y: state.cy + state.radius });
      // That cake starts over, its candles cleared.
      setUpCake(state, rng, factor);
      return;
    }
    state.candles.push({ at, old: false });
    state.flying = null;
    events.push({ type: 'action', x: state.cx, y: state.cy + state.radius, note: 72 + placed() * 2, voice: 'bell' });
    if (placed() >= state.need) {
      const points = state.need + CAKE_BONUS;
      state.score += points;
      state.doneAgo = 0;
      events.push({ type: 'score', x: state.cx, y: state.cy - state.radius, points });
    }
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
      state.spoiltAgo += dt;
      state.angle = normal(state.angle + spinNow(state) * dt);
      if (state.doneAgo >= 0) {
        state.doneAgo += dt;
        if (state.doneAgo >= NEXT_CAKE) {
          state.cake += 1;
          setUpCake(state, rng, factor);
        }
        return;
      }
      if (state.flying) {
        state.flying.t += dt;
        if (state.flying.bounced >= 0) {
          // The cake is cleared off before the next throw: a slip costs a moment, so aiming pays.
          state.flying.bounced += dt;
          if (state.flying.bounced > BOUNCE_PAUSE) state.flying = null;
        } else if (state.flying.t >= FLIGHT) land();
        return;
      }
      if (input.taps.length > 0) {
        state.flying = { t: 0, bounced: -1 };
        events.push({ type: 'action', x: state.cx, y: state.launchY });
      }
    },
  };
}

/** Good play: throw when the spot the candle will strike is clear of every candle on the cake. */
export function candleCakeBot(state: CandleCakeState, context: BotContext): BotMove {
  if (state.flying || state.doneAgo >= 0) return {};
  // Check the strike spot over the whole window the throw might land in (a decision lands within a step).
  const clear = [0, 0.02, 0.04].every((late) => {
    const at = normal(STRIKE - (state.angle + spinNow(state) * (FLIGHT + late)));
    return state.candles.every((c) => angleGap(c.at, at) >= MIN_GAP + 0.08);
  });
  return clear ? { tap: { x: context.arena.width / 2, y: state.launchY } } : {};
}
