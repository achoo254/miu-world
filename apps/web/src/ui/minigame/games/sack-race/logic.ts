// Sack race: four racers hop in sacks to the finish. The child's racer hops when she taps. A tap just as the
// sack lands (a little before counts too: it is remembered) hops again at once and quicker, building a rhythm
// (up to four hops in a row); a tap while still high in the air trips her over for a second. Waiting on the
// ground loses the rhythm. Points by place at the finish: first 5, second 3, third 2, last 1; the goal of 3 is
// first or second. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export const RIVALS: readonly SpriteName[] = ['rabbit', 'frog', 'kangaroo'];

/** Seconds a hop lasts in the air. */
export const HOP_SECONDS = 0.5;
/** A tap this long before landing is remembered and hops again on landing; earlier than that trips. */
export const EARLY_OK = 0.14;
/** A tap within this long after landing still keeps the rhythm. */
export const LATE_OK = 0.22;
const FALL_SECONDS = 1;
const HOP_METRES = 2.2;
const COMBO_BONUS = 0.16;
const MAX_COMBO = 4;
const PLACE_POINTS = [5, 3, 2, 1] as const;
const FINISH_HOLD = 1.2;

export interface Racer {
  /** Metres from the start. */
  at: number;
  /** Seconds into the current hop (-1 on the ground). */
  hop: number;
  hopFrom: number;
  hopTo: number;
  /** Seconds left lying down after a trip. */
  down: number;
  finishedAt: number;
}

export interface SackState {
  length: number;
  child: Racer;
  rivals: (Racer & { rhythm: number; wait: number; sprite: SpriteName })[];
  combo: number;
  /** Seconds the child has been standing since landing (-1 while hopping). */
  standing: number;
  /** A tap remembered for the landing. */
  buffered: boolean;
  place: number;
  finishedFor: number;
  laneTop: number;
  laneHeight: number;
  startX: number;
  finishX: number;
  score: number;
  time: number;
}

const newRacer = (): Racer => ({ at: 0, hop: -1, hopFrom: 0, hopTo: 0, down: 0, finishedAt: -1 });

export function createSackRace({ arena, params, rng }: GameSetup): MinigameLogic<SackState> {
  const length = typeof params.length === 'number' ? Math.min(160, Math.max(60, params.length)) : 100;
  const events = eventQueue();
  const laneTop = HUD_SAFE_TOP + 60;
  const laneHeight = Math.min(150, (arena.height - laneTop - 30) / 4);
  // Rivals' rhythms: seconds on the ground between hops (they finish in about 19, 22 and 25 s on 100 m).
  const waits = [0.08, 0.2, 0.32];
  const state: SackState = {
    length,
    child: newRacer(),
    rivals: RIVALS.map((sprite, i) => ({ ...newRacer(), sprite, rhythm: (waits[i] ?? 0.2) * rng.range(0.9, 1.1), wait: rng.range(0.1, 0.5) })),
    combo: 0,
    standing: 99,
    buffered: false,
    place: 0,
    finishedFor: 0,
    laneTop,
    laneHeight,
    startX: 70,
    finishX: arena.width - 60,
    score: 0,
    time: 0,
  };

  const childPoint = (): { x: number; y: number } => ({ x: racerX(state, state.child), y: laneTop + 3.5 * laneHeight });

  function hop(r: Racer, metres: number): void {
    r.hop = 0;
    r.hopFrom = r.at;
    r.hopTo = Math.min(state.length + 4, r.at + metres);
  }

  /** Moves a hop along; returns true on the step it lands. */
  function fly(r: Racer, dt: number): boolean {
    if (r.hop < 0) return false;
    r.hop += dt;
    const t = Math.min(1, r.hop / HOP_SECONDS);
    r.at = r.hopFrom + (r.hopTo - r.hopFrom) * t;
    if (r.finishedAt < 0 && r.at >= state.length) r.finishedAt = state.time;
    if (t >= 1) {
      r.hop = -1;
      return true;
    }
    return false;
  }

  const childHop = (): void => {
    hop(state.child, HOP_METRES * (1 + COMBO_BONUS * state.combo));
    events.push({ type: 'action', ...childPoint(), note: 60 + state.combo * 3, voice: 'drum' });
    state.standing = -1;
  };

  return {
    state,
    get score() {
      return state.place > 0 ? (PLACE_POINTS[state.place - 1] ?? 1) : 0;
    },
    get done() {
      return state.place > 0 && state.finishedFor >= FINISH_HOLD;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      const c = state.child;
      const tapped = input.taps.length > 0;
      if (state.place > 0) state.finishedFor += dt;
      if (c.down > 0) {
        c.down = Math.max(0, c.down - dt);
        if (c.down === 0) state.standing = 99;
      } else if (c.hop >= 0) {
        if (tapped && c.finishedAt < 0) {
          const left = HOP_SECONDS - c.hop;
          if (left <= EARLY_OK) state.buffered = true;
          else {
            // Too early: trips over.
            c.down = FALL_SECONDS;
            c.hop = -1;
            c.at = c.hopTo;
            state.combo = 0;
            state.buffered = false;
            events.push({ type: 'hit', ...childPoint() });
          }
        }
        if (c.hop >= 0 && fly(c, dt)) {
          state.standing = 0;
          if (state.buffered && c.finishedAt < 0) {
            state.buffered = false;
            state.combo = Math.min(MAX_COMBO, state.combo + 1);
            childHop();
          }
        }
      } else if (c.finishedAt < 0) {
        state.standing += dt;
        if (tapped) {
          if (state.standing <= LATE_OK) state.combo = Math.min(MAX_COMBO, state.combo + 1);
          else state.combo = 0;
          childHop();
        } else if (state.standing > LATE_OK) state.combo = 0;
      }
      for (const r of state.rivals) {
        if (r.hop >= 0) {
          if (fly(r, dt)) r.wait = r.rhythm;
        } else if (r.finishedAt < 0) {
          r.wait -= dt;
          if (r.wait <= 0) hop(r, HOP_METRES * 1.3);
        }
      }
      if (c.finishedAt >= 0 && state.place === 0) {
        // Racers who crossed the line before her, by time.
        state.place = [state.child, ...state.rivals].filter((r) => r.finishedAt >= 0 && r.finishedAt <= c.finishedAt).length;
        events.push({ type: 'score', ...childPoint(), points: PLACE_POINTS[state.place - 1] ?? 1 });
      }
    },
  };
}

/** Where a racer is drawn across the screen. */
export function racerX(state: Pick<SackState, 'startX' | 'finishX' | 'length'>, r: Racer): number {
  return state.startX + (state.finishX - state.startX) * Math.min(1.04, r.at / state.length);
}

/** Good play: hops, and taps again just before each landing. */
export function sackRaceBot(state: SackState, context: BotContext): BotMove {
  const c = state.child;
  const at = { x: context.arena.width / 2, y: context.arena.height / 2 };
  if (c.finishedAt >= 0 || c.down > 0) return {};
  if (c.hop < 0) return { tap: at };
  const left = HOP_SECONDS - c.hop;
  return left <= 0.11 && !state.buffered ? { tap: at } : {};
}
