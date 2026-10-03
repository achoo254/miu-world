// Snap match: cards are turned over one at a time onto a pile. When the new card shows the same picture as
// the one just before it, the child taps (anywhere on the table) before the monkey across the table does:
// the pile is hers, a point. A tap when the two cards differ costs a card (a point, never below zero) and
// her hand is slow for a moment. The monkey gets quicker and the cards come faster as the round goes on.
// Faces are numbers; draw.ts picks the map's pictures. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export const FACE_COUNT = 6;
/** Chance the next card repeats the one before (a snap). */
const SNAP_CHANCE = 0.45;
/** Seconds between cards and the monkey's reaction to a snap, at the start and the end of the round. */
const FLIP_START = 1.3;
const FLIP_END = 1.0;
const MONKEY_START = 1.0;
const MONKEY_END = 0.7;
/** Seconds the child's hand is slow after a wrong tap (taps are ignored). */
export const SLOW_SECONDS = 0.5;

export interface SnapState {
  /** The card on top and the one just before it (-1: none yet, after a pile was taken). */
  top: number;
  previous: number;
  /** Seconds since the top card was turned. */
  age: number;
  /** Seconds until the next card. */
  nextIn: number;
  /** The top card is a snap nobody has claimed yet. */
  open: boolean;
  /** Who took the last pile and how long ago (a sweep animation). */
  taker: 'child' | 'monkey' | null;
  takenAgo: number;
  /** Seconds left of a slow hand after a wrong tap. */
  slow: number;
  /** Seconds since the last wrong tap (a shake). */
  wrongAgo: number;
  monkeyScore: number;
  flips: number;
  score: number;
  time: number;
  /** Where taps count: the table under the HUD. */
  tableTop: number;
  /** Centre of the pile. */
  pileX: number;
  pileY: number;
}

export function createSnapMatch({ arena, duration, params, rng }: GameSetup): MinigameLogic<SnapState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const state: SnapState = { top: -1, previous: -1, age: 0, nextIn: 1, open: false, taker: null, takenAgo: 9, slow: 0, wrongAgo: 9, monkeyScore: 0, flips: 0, score: 0, time: 0, tableTop: HUD_SAFE_TOP, pileX: arena.width / 2, pileY: HUD_SAFE_TOP + (arena.height - HUD_SAFE_TOP) * 0.55 };
  const progress = (): number => Math.min(1, state.time / duration);

  function flip(): void {
    const repeat = state.top >= 0 && rng.chance(SNAP_CHANCE);
    let face = state.top;
    if (!repeat) {
      face = rng.int(0, FACE_COUNT - 2);
      if (face >= state.top && state.top >= 0) face += 1;
    }
    state.previous = state.top;
    state.top = face;
    state.open = repeat;
    state.age = 0;
    state.flips += 1;
    state.nextIn = (FLIP_START + (FLIP_END - FLIP_START) * progress()) / factor;
    events.push({ type: 'action', x: state.pileX, y: state.pileY, note: 72 + (face % 5), voice: 'bell' });
  }

  function take(taker: 'child' | 'monkey'): void {
    state.taker = taker;
    state.takenAgo = 0;
    state.open = false;
    // A fresh pile: the next card cannot snap with the taken ones.
    state.previous = -1;
    state.top = -1;
    state.nextIn = 0.7 / factor;
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
      state.age += dt;
      state.takenAgo += dt;
      state.wrongAgo += dt;
      state.slow = Math.max(0, state.slow - dt);
      const tapped = state.slow <= 0 && input.taps.some((t) => t.y >= state.tableTop);
      if (tapped) {
        if (state.open) {
          state.score += 1;
          take('child');
          events.push({ type: 'score', x: state.pileX, y: state.pileY });
        } else {
          state.score = Math.max(0, state.score - 1);
          state.slow = SLOW_SECONDS;
          state.wrongAgo = 0;
          events.push({ type: 'hit', x: state.pileX, y: state.pileY });
        }
      }
      if (state.open && state.age >= (MONKEY_START + (MONKEY_END - MONKEY_START) * progress()) / factor) {
        state.monkeyScore += 1;
        take('monkey');
        events.push({ type: 'miss', x: state.pileX, y: state.pileY });
      }
      state.nextIn -= dt;
      if (state.nextIn <= 0) flip();
    },
  };
}

/** Good play: watches each card and taps as soon as it repeats the last one (a quick child, not a machine). */
export function snapMatchBot(state: SnapState, context: BotContext): BotMove {
  if (!state.open || state.age < 0.15) return {};
  return { tap: { x: context.arena.width / 2, y: context.arena.height * 0.6 } };
}
