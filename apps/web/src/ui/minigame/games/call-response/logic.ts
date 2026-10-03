// Call and response: Vẹt claps a one-bar rhythm, then it is the child's bar: she taps the same rhythm back.
// Both bars show the rhythm as eight beat dots (the parrot's light up as it claps, hers fill as she hits
// them), so a child who cannot hold it in her head can still read it. A bar with every clap on time (a fifth
// of a second either way) and no extra taps is a point. Ten calls, simple quarter notes first, quavers
// later. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import type { BotContext, BotMove, GameInput, GameSetup, MinigameLogic } from '../../types';

/** Eight quaver slots per bar; a pattern lists the slots that are claps. */
const EASY: readonly (readonly number[])[] = [
  [0, 2, 4, 6],
  [0, 4],
  [0, 2, 4],
  [0, 4, 6],
  [0, 2, 6],
];
const HARDER: readonly (readonly number[])[] = [
  [0, 1, 2, 4],
  [0, 2, 3, 4, 6],
  [0, 4, 5, 6],
  [0, 1, 2, 3, 4],
  [0, 2, 4, 5, 6, 7],
  [0, 3, 4, 6],
];
export const CALLS = 10;
export const SLOTS = 8;
/** Seconds early or late a tap may be and still be on the beat. */
export const TOLERANCE = 0.2;
const COUNT_IN = 1.2;

export interface Call {
  pattern: readonly number[];
  /** Response slots already hit. */
  hit: boolean[];
  extra: number;
  result: 'right' | 'wrong' | null;
}

export interface CallState {
  /** Layout: the two rows of beat dots (left end, gap between dots), and the drum. */
  left: number;
  step: number;
  callY: number;
  responseY: number;
  drumX: number;
  drumY: number;
  /** Seconds per quaver slot. */
  slot: number;
  calls: Call[];
  /** Seconds since the last tap (the child's drum bounces) and since the parrot's last clap. */
  tapAgo: number;
  clapAgo: number;
  score: number;
  time: number;
}

/** Where the round is: which call, whose bar, and the position in it (in slots, fractional). */
export function position(state: CallState): { call: number; bar: 'call' | 'response' | 'before'; at: number } {
  const t = state.time - COUNT_IN;
  if (t < 0) return { call: 0, bar: 'before', at: 0 };
  const bar = SLOTS * state.slot;
  const call = Math.floor(t / (2 * bar));
  const inCall = t - call * 2 * bar;
  return inCall < bar ? { call, bar: 'call', at: inCall / state.slot } : { call, bar: 'response', at: (inCall - bar) / state.slot };
}

/** Seconds from the start of the round to a slot of a call's bar. */
const slotTime = (state: CallState, call: number, bar: 'call' | 'response', slot: number): number =>
  COUNT_IN + call * 2 * SLOTS * state.slot + (bar === 'response' ? SLOTS * state.slot : 0) + slot * state.slot;

/** The call whose response bar (widened by the tolerance) the clock is in, or -1. */
function respondingCall(state: CallState): number {
  const { call } = position(state);
  for (const index of [call, call - 1]) {
    if (index < 0 || index >= CALLS) continue;
    if (state.time >= slotTime(state, index, 'response', 0) - TOLERANCE && state.time <= slotTime(state, index, 'response', SLOTS) + TOLERANCE) return index;
  }
  return -1;
}

function makeCalls(rng: Rng): Call[] {
  const calls: Call[] = [];
  for (let i = 0; i < CALLS; i += 1) {
    const pool = i < 4 ? EASY : HARDER;
    let pattern = pool[rng.int(0, pool.length - 1)] ?? EASY[0] ?? [0];
    // Never the same rhythm twice in a row.
    if (calls.at(-1)?.pattern === pattern) pattern = pool[(pool.indexOf(pattern) + 1) % pool.length] ?? pattern;
    calls.push({ pattern, hit: pattern.map(() => false), extra: 0, result: null });
  }
  return calls;
}

export function createCallResponse({ arena, params, rng }: GameSetup): MinigameLogic<CallState> {
  const tempo = typeof params.tempo === 'number' ? Math.min(1.3, Math.max(0.7, params.tempo)) : 1;
  const events = eventQueue();
  const width = Math.min(arena.width - 260, 600);
  const middle = Math.max(arena.height * 0.5, 330);
  const state: CallState = {
    left: (arena.width - width) / 2 + 50,
    step: width / (SLOTS - 1),
    callY: middle - 110,
    responseY: middle + 50,
    drumX: arena.width / 2,
    drumY: Math.min(arena.height - 90, middle + 290),
    slot: 0.3 / tempo, calls: makeCalls(rng), tapAgo: 9, clapAgo: 9, score: 0, time: 0 };
  let judged = 0;
  let clapped = -1;

  function tap(): void {
    state.tapAgo = 0;
    const now = state.time;
    // The response being tapped: the one whose bar, give or take the tolerance, is now (a clap a moment
    // early for its first beat or late for its last still counts).
    const index = respondingCall(state);
    const call = state.calls[index];
    events.push({ type: 'action', x: state.drumX, y: state.drumY - 40, note: 50, voice: 'drum' });
    if (!call || call.result) return;
    const slot = call.pattern.findIndex((s, i) => !call.hit[i] && Math.abs(slotTime(state, index, 'response', s) - now) <= TOLERANCE);
    if (slot >= 0) call.hit[slot] = true;
    else call.extra += 1;
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return judged >= CALLS;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.tapAgo += dt;
      state.clapAgo += dt;
      for (let i = 0; i < input.taps.length; i += 1) tap();

      // The parrot claps its bar.
      const pos = position(state);
      if (pos.bar === 'call') {
        const call = state.calls[pos.call];
        const slot = Math.floor(pos.at);
        const key = pos.call * SLOTS + slot;
        if (call && key !== clapped && call.pattern.includes(slot)) {
          clapped = key;
          state.clapAgo = 0;
          events.push({ type: 'action', x: state.left + slot * state.step, y: state.callY, note: 67, voice: 'clap' });
        }
      }
      // Each response is judged once its bar (and a late clap's grace) is over.
      const call = state.calls[judged];
      if (call && state.time > slotTime(state, judged, 'response', SLOTS) + TOLERANCE) {
        call.result = call.hit.every(Boolean) && call.extra === 0 ? 'right' : 'wrong';
        if (call.result === 'right') {
          state.score += 1;
          events.push({ type: 'score', x: arena.width / 2, y: state.responseY, note: 72, voice: 'bell' });
        } else events.push({ type: 'miss', x: arena.width / 2, y: state.responseY });
        judged += 1;
      }
    },
  };
}

/** Good play: tap on every clap of the response bar (to the tenth of a second it decides on). */
export function callResponseBot(state: CallState, _context: BotContext): BotMove {
  const index = respondingCall(state);
  const call = state.calls[index];
  if (!call) return {};
  const due = call.pattern.some((s, i) => !call.hit[i] && Math.abs(slotTime(state, index, 'response', s) - state.time) <= 0.06);
  return due ? { tap: { x: 300, y: 400 } } : {};
}
