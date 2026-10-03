// Cờ caro (four in a row) on a 6 × 6 board against Cún, an easy computer player. The child taps an empty
// square to put her piece down, then Cún plays. Four in a row (across, down or diagonal) wins the game: a
// point for the child. After a lost game Cún plays a little worse; a full board is a draw. Games follow one
// another until the time is up. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const N = 6;
export const LINE = 4;
export const CHILD = 1;
export const CUN = 2;

export type CaroTurn = 'child' | 'cun' | 'over';

export interface CoCaroState {
  board: number[];
  turn: CaroTurn;
  /** Seconds in this turn (Cún thinks a moment; a finished game shows its line). */
  turnAgo: number;
  winner: number;
  line: number[];
  lastMove: number;
  /** How often Cún plays its best move (0–1): lower after each game it wins. */
  skill: number;
  cell: number;
  left: number;
  top: number;
  /** Where the turn badge goes (beside the board on a wide screen, above it on a tall one). */
  badge: Point;
  games: number;
  cunWins: number;
  score: number;
  time: number;
}

/** Every run of four squares on the board (rows, columns, both diagonals). */
export const WINDOWS: readonly number[][] = (() => {
  const out: number[][] = [];
  const dirs = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < N; r += 1) {
    for (let c = 0; c < N; c += 1) {
      for (const [dc, dr] of dirs) {
        const endC = c + (dc ?? 0) * (LINE - 1);
        const endR = r + (dr ?? 0) * (LINE - 1);
        if (endC < 0 || endC >= N || endR < 0 || endR >= N) continue;
        out.push(Array.from({ length: LINE }, (_, k) => (r + (dr ?? 0) * k) * N + c + (dc ?? 0) * k));
      }
    }
  }
  return out;
})();

/** The four squares of a won line for `who`, or null. */
export function winningLine(board: readonly number[], who: number): number[] | null {
  return WINDOWS.find((w) => w.every((i) => board[i] === who)) ?? null;
}

const OWN = [1, 5, 30, 1000, 0];
const BLOCK = [0, 3, 18, 600, 0];

/** How good an empty square is for `who`: building its own lines and blocking the other's. */
export function squareValue(board: readonly number[], i: number, who: number): number {
  const other = who === CHILD ? CUN : CHILD;
  let value = 0;
  for (const w of WINDOWS) {
    if (!w.includes(i)) continue;
    const mine = w.filter((k) => board[k] === who).length;
    const theirs = w.filter((k) => board[k] === other).length;
    if (theirs === 0) value += OWN[mine] ?? 0;
    if (mine === 0) value += BLOCK[theirs] ?? 0;
  }
  // A little preference for the middle.
  const r = Math.floor(i / N);
  const c = i % N;
  return value + (5 - Math.abs(r - 2.5) - Math.abs(c - 2.5)) * 0.5;
}

/** The best empty square for `who`, or -1 on a full board. */
export function bestSquare(board: readonly number[], who: number): number {
  let best = -1;
  let bestValue = -Infinity;
  board.forEach((v, i) => {
    if (v !== 0) return;
    const value = squareValue(board, i, who);
    if (value > bestValue) {
      best = i;
      bestValue = value;
    }
  });
  return best;
}

/** Cún's move: its best square as often as its skill says, otherwise an empty square near the pieces. */
function cunMove(board: readonly number[], skill: number, rng: Rng): number {
  if (rng.chance(skill)) return bestSquare(board, CUN);
  const near = board
    .map((v, i) => (v === 0 && board.some((o, k) => o !== 0 && Math.abs((k % N) - (i % N)) <= 1 && Math.abs(Math.floor(k / N) - Math.floor(i / N)) <= 1) ? i : -1))
    .filter((i) => i >= 0);
  const empty = board.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0);
  const pool = near.length > 0 ? near : empty;
  return pool[rng.int(0, pool.length - 1)] ?? -1;
}

const THINK_SECONDS = 0.7;
const OVER_SECONDS = 2;
const START_SKILL = 0.6;

export function createCoCaro({ arena, rng }: GameSetup): MinigameLogic<CoCaroState> {
  const events = eventQueue();
  const landscape = arena.width >= arena.height;
  const top0 = HUD_SAFE_TOP + 12;
  let size: number;
  let left: number;
  let top: number;
  let badge: Point;
  if (landscape) {
    size = Math.min(arena.height - top0 - 20, arena.width - 260);
    left = arena.width - size - Math.max(30, (arena.width - size - 220) / 2);
    top = top0 + (arena.height - top0 - 10 - size) / 2;
    badge = { x: left / 2, y: top + size / 2 };
  } else {
    size = Math.min(arena.width - 40, arena.height - top0 - 200);
    left = (arena.width - size) / 2;
    top = top0 + 160 + Math.max(0, (arena.height - top0 - 180 - size) / 2);
    badge = { x: arena.width / 2, y: top - 90 };
  }
  const state: CoCaroState = {
    board: Array.from({ length: N * N }, () => 0),
    turn: 'child',
    turnAgo: 0,
    winner: 0,
    line: [],
    lastMove: -1,
    skill: START_SKILL,
    cell: size / N,
    left,
    top,
    badge,
    games: 0,
    cunWins: 0,
    score: 0,
    time: 0,
  };
  const centre = (i: number): Point => ({ x: state.left + ((i % N) + 0.5) * state.cell, y: state.top + (Math.floor(i / N) + 0.5) * state.cell });

  function place(i: number, who: number): void {
    state.board[i] = who;
    state.lastMove = i;
    state.turnAgo = 0;
    const line = winningLine(state.board, who);
    if (line) {
      state.turn = 'over';
      state.winner = who;
      state.line = line;
      if (who === CHILD) {
        state.score += 1;
        events.push({ type: 'score', ...centre(i) });
      } else {
        state.cunWins += 1;
        state.skill = Math.max(0.15, state.skill - 0.15);
        events.push({ type: 'hit', ...centre(i) });
      }
      return;
    }
    if (state.board.every((v) => v !== 0)) {
      state.turn = 'over';
      state.winner = 0;
      state.line = [];
      return;
    }
    state.turn = who === CHILD ? 'cun' : 'child';
    events.push({ type: 'action', ...centre(i) });
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
      state.turnAgo += dt;
      switch (state.turn) {
        case 'child':
          for (const tap of input.taps) {
            const c = Math.floor((tap.x - state.left) / state.cell);
            const r = Math.floor((tap.y - state.top) / state.cell);
            if (c < 0 || r < 0 || c >= N || r >= N || state.board[r * N + c] !== 0) continue;
            place(r * N + c, CHILD);
            break;
          }
          break;
        case 'cun':
          if (state.turnAgo >= THINK_SECONDS) {
            const i = cunMove(state.board, state.skill, rng);
            if (i >= 0) place(i, CUN);
          }
          break;
        case 'over':
          if (state.turnAgo >= OVER_SECONDS) {
            state.board.fill(0);
            state.turn = 'child';
            state.turnAgo = 0;
            state.winner = 0;
            state.line = [];
            state.lastMove = -1;
            state.games += 1;
          }
          break;
      }
    },
  };
}

/** Good play: win now, else block Cún's win, else the square that builds and blocks the most. */
export function coCaroBot(state: CoCaroState, _context: BotContext): BotMove {
  if (state.turn !== 'child' || state.turnAgo < 0.5) return {};
  const i = bestSquare(state.board, CHILD);
  if (i < 0) return {};
  return { tap: { x: state.left + ((i % N) + 0.5) * state.cell, y: state.top + (Math.floor(i / N) + 0.5) * state.cell } };
}
