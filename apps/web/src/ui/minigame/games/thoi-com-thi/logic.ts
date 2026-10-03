// Thổi cơm thi (the village rice-cooking contest): a clay pot of rice over a small wood fire. The fire burns
// down by itself, and gusts of wind knock it lower now and then; each tap throws on a stick, and the heat comes
// up over a moment. Rice only cooks while the fire is in the "just right" band of the heat gauge; above it the
// rice scorches (khê) instead. A cooked pot is two points, one that scorched too long only one; then a fresh pot
// goes on. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** The "just right" band of the fire (0 … 1). */
export const BAND_LOW = 0.42;
export const BAND_HIGH = 0.7;
/** Seconds in the band that cook a pot. */
export const COOK_SECONDS = 8;
/** Seconds of scorching after which a pot counts half. */
export const BURN_LIMIT = 1.2;

export interface ThoiComState {
  /** Fire now and the heat still to come from sticks thrown on. */
  fire: number;
  pending: number;
  /** Cooking (0 … 1) and scorching (seconds) of the pot on the fire. */
  cooked: number;
  burnt: number;
  pots: number;
  /** Seconds since the last pot came off (0 … SERVE), -1 while cooking. */
  serving: number;
  lastGood: boolean;
  /** When the last stick went on and the last gust blew. */
  stickAt: number;
  gustAt: number;
  pot: Point;
  /** Where the wood pile is (a big button; a tap anywhere also works). */
  pile: Point;
  score: number;
  time: number;
}

const DECAY = 0.075;
const STICK = 0.15;
/** Heat from a stick arrives at this share per second of what is pending. */
const RISE = 3.2;
const SERVE_SECONDS = 1.3;

export function createThoiComThi({ arena, duration, rng }: GameSetup): MinigameLogic<ThoiComState> {
  const events = eventQueue();
  const pot = { x: arena.width / 2, y: HUD_SAFE_TOP + (arena.height - HUD_SAFE_TOP) * 0.42 };
  const state: ThoiComState = {
    fire: 0.3,
    pending: 0,
    cooked: 0,
    burnt: 0,
    pots: 0,
    serving: -1,
    lastGood: true,
    stickAt: -9,
    gustAt: -9,
    pot,
    pile: { x: arena.width / 2, y: arena.height - Math.max(80, arena.height * 0.1) },
    score: 0,
    time: 0,
  };
  let nextGust = rng.range(4, 7);

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
      const progress = Math.min(1, state.time / duration);
      for (const tap of input.taps) {
        if (tap.y < HUD_SAFE_TOP) continue;
        state.pending += STICK;
        state.stickAt = state.time;
        events.push({ type: 'action', x: pot.x, y: pot.y + 120 });
      }
      const rise = Math.min(state.pending, state.pending * RISE * dt + 0.002);
      state.pending -= rise;
      state.fire = Math.min(1, Math.max(0, state.fire + rise - (DECAY + 0.03 * progress) * dt));
      nextGust -= dt;
      if (nextGust <= 0) {
        state.fire = Math.max(0, state.fire - rng.range(0.1, 0.18));
        state.gustAt = state.time;
        nextGust = rng.range(4.5 - 1.5 * progress, 7 - 2 * progress);
      }

      if (state.serving >= 0) {
        state.serving += dt;
        if (state.serving >= SERVE_SECONDS) {
          state.serving = -1;
          state.cooked = 0;
          state.burnt = 0;
        }
        return;
      }
      if (state.fire > BAND_HIGH) state.burnt += dt;
      else if (state.fire >= BAND_LOW) state.cooked += dt / COOK_SECONDS;
      if (state.cooked >= 1) {
        const good = state.burnt < BURN_LIMIT;
        state.score += good ? 2 : 1;
        state.pots += 1;
        state.lastGood = good;
        state.serving = 0;
        events.push({ type: 'score', x: pot.x, y: pot.y - 80, points: good ? 2 : 1 });
      }
    },
  };
}

/** Good play: a stick whenever the fire (with what is already coming) drops toward the band's bottom. */
export function thoiComBot(state: ThoiComState, _context: BotContext): BotMove {
  const coming = state.fire + state.pending;
  return coming < BAND_LOW + 0.1 ? { tap: state.pile } : {};
}
