// Lift numbers ("Thang máy số", tens and ones): a tall building whose six floors carry two-digit numbers
// (like 34, 41, 47…), with a lift running up and down. Friends arrive in the lobby holding a card such as
// "4 chục 7" (4 tens 7 ones). The lift takes in up to four people at the lobby; the child taps a floor to send
// it there, and everyone whose card is that floor's number steps out (a point each). Tap the lobby to fetch
// more. Someone left waiting too long walks up the stairs instead (no harm). Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export const FLOORS = 6;
export const CAPACITY = 4;

export interface Rider {
  /** The floor number they want (its tens and ones are on their card). */
  want: number;
  face: number;
  arrivedAt: number;
}

export interface LiftNumbersState {
  /** Number of each floor, bottom up (index 0 = first floor above the lobby). */
  numbers: number[];
  /** Where the lift is (row: 0 = lobby, 1… = floors) and where it is going. */
  at: number;
  target: number;
  riders: Rider[];
  lobby: Rider[];
  /** Row height and the lobby's y (rows go up from it). */
  rowH: number;
  lobbyY: number;
  shaftX: number;
  /** Last floor someone got off at, and when. */
  dropAt: number;
  dropRow: number;
  score: number;
  time: number;
}

const LIFT_SPEED = 3.2;
const ARRIVE_EVERY = 2.6;
const PATIENCE = 20;
const LOBBY_MAX = 5;
const FACES = 6;

export function rowY(state: Pick<LiftNumbersState, 'lobbyY' | 'rowH'>, row: number): number {
  return state.lobbyY - row * state.rowH;
}

export function createLiftNumbers({ arena, rng }: GameSetup): MinigameLogic<LiftNumbersState> {
  const events = eventQueue();
  const rowH = (arena.height - HUD_SAFE_TOP - 30) / (FLOORS + 1);
  const lobbyY = arena.height - 20 - rowH / 2;
  // Six numbers from a stretch of about two tens, so both digits matter.
  const base = rng.int(2, 7) * 10 + rng.int(0, 5);
  const pool = Array.from({ length: 18 }, (_, i) => base + i).filter((n) => n < 100);
  const picked: number[] = [];
  while (picked.length < FLOORS) {
    const n = pool[rng.int(0, pool.length - 1)] ?? base;
    if (!picked.includes(n)) picked.push(n);
  }
  const state: LiftNumbersState = {
    numbers: picked.sort((a, b) => a - b),
    at: 0,
    target: 0,
    riders: [],
    lobby: [],
    rowH,
    lobbyY,
    shaftX: Math.min(arena.width * 0.42, arena.width - 220),
    dropAt: -9,
    dropRow: 0,
    score: 0,
    time: 0,
  };
  let nextArrival = 0.5;
  const arrive = (r: Rng): void => {
    state.lobby.push({ want: state.numbers[r.int(0, FLOORS - 1)] ?? base, face: r.int(0, FACES - 1), arrivedAt: state.time });
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
      nextArrival -= dt;
      if (nextArrival <= 0) {
        if (state.lobby.length < LOBBY_MAX) arrive(rng);
        nextArrival += ARRIVE_EVERY;
      }
      state.lobby = state.lobby.filter((p) => state.time - p.arrivedAt < PATIENCE);
      for (const tap of input.taps) {
        if (tap.y < HUD_SAFE_TOP) continue;
        const row = Math.round((lobbyY - tap.y) / rowH);
        if (row >= 0 && row <= FLOORS) {
          state.target = row;
          events.push({ type: 'action', x: state.shaftX, y: rowY(state, row) });
        }
      }
      const step = LIFT_SPEED * dt;
      const before = state.at;
      state.at += Math.max(-step, Math.min(step, state.target - state.at));
      if (state.at !== state.target) return;
      if (before !== state.at || state.target === state.at) {
        const row = state.target;
        if (row === 0) {
          while (state.riders.length < CAPACITY && state.lobby.length > 0) {
            const p = state.lobby.shift();
            if (p) state.riders.push(p);
          }
          return;
        }
        const number = state.numbers[row - 1];
        const out = state.riders.filter((p) => p.want === number);
        if (out.length === 0) return;
        state.riders = state.riders.filter((p) => p.want !== number);
        state.score += out.length;
        state.dropAt = state.time;
        state.dropRow = row;
        events.push({ type: 'score', x: state.shaftX + 80, y: rowY(state, row), points: out.length, note: 72 + row * 2, voice: 'bell' });
      }
    },
  };
}

/** Good play: to the nearest floor someone inside wants; back to the lobby when empty. */
export function liftNumbersBot(state: LiftNumbersState, context: BotContext): BotMove {
  if (state.at !== state.target) return {};
  let row = 0;
  if (state.riders.length > 0 && (state.lobby.length === 0 || state.riders.length >= CAPACITY || state.at !== 0)) {
    const rows = state.riders.map((p) => state.numbers.indexOf(p.want) + 1);
    row = rows.reduce((best, r) => (Math.abs(r - state.at) < Math.abs(best - state.at) ? r : best), rows[0] ?? 0);
  } else if (state.riders.length > 0 && state.at === 0) {
    const rows = state.riders.map((p) => state.numbers.indexOf(p.want) + 1);
    row = Math.min(...rows);
  }
  if (row === state.at) return {};
  return { tap: { x: context.arena.width / 2, y: rowY(state, row) } };
}
