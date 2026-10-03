// Flip stones (Reversi on a 6 × 6 board) against Cú, the owl. The child taps a square where her stone traps a
// line of the owl's stones (across, down or slanting) between it and one of hers: the trapped stones flip to
// her side. The owl answers after a moment. When neither can play, more stones than the owl is a win (a point);
// after a lost game the owl plays more carelessly. Squares she can play are dotted. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const N = 6;
export const CHILD = 1;
export const OWL = 2;
const THINK_SECONDS = 0.7;
const OVER_SECONDS = 2.2;
const PASS_SECONDS = 1;
const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const;
/** How good a square is to hold: corners best, the squares next to them worst. */
const WEIGHTS = [100, -20, 10, 10, -20, 100, -20, -30, 1, 1, -30, -20, 10, 1, 2, 2, 1, 10, 10, 1, 2, 2, 1, 10, -20, -30, 1, 1, -30, -20, 100, -20, 10, 10, -20, 100];

export interface ReversiState {
  board: number[];
  turn: 'child' | 'owl' | 'over';
  turnAgo: number;
  /** Someone had no move and passed (shown for a moment). */
  passed: number;
  /** When each square last changed (flip animation). */
  changedAt: number[];
  lastMove: number;
  /** How often the owl plays its best move (0–1). */
  skill: number;
  cell: number;
  left: number;
  top: number;
  badge: Point;
  games: number;
  score: number;
  time: number;
}

/** The squares `who` would flip by playing at `i` (empty when it may not play there). */
export function flipsFor(board: readonly number[], who: number, i: number): number[] {
  if (board[i] !== 0) return [];
  const other = who === CHILD ? OWL : CHILD;
  const c = i % N;
  const r = Math.floor(i / N);
  const out: number[] = [];
  for (const [dc, dr] of DIRS) {
    const line: number[] = [];
    let x = c + dc;
    let y = r + dr;
    while (x >= 0 && x < N && y >= 0 && y < N && board[y * N + x] === other) {
      line.push(y * N + x);
      x += dc;
      y += dr;
    }
    if (line.length > 0 && x >= 0 && x < N && y >= 0 && y < N && board[y * N + x] === who) out.push(...line);
  }
  return out;
}

export const legalMoves = (board: readonly number[], who: number): number[] => board.map((_, i) => i).filter((i) => flipsFor(board, who, i).length > 0);
export const countOf = (board: readonly number[], who: number): number => board.filter((v) => v === who).length;

export function startBoard(): number[] {
  const board = new Array<number>(N * N).fill(0);
  const m = N / 2;
  board[(m - 1) * N + (m - 1)] = OWL;
  board[m * N + m] = OWL;
  board[(m - 1) * N + m] = CHILD;
  board[m * N + (m - 1)] = CHILD;
  return board;
}

/** A sensible move: good squares, more flips, and not handing the other side a corner. */
export function bestMove(board: readonly number[], who: number): number {
  const other = who === CHILD ? OWL : CHILD;
  let best = -1;
  let bestValue = -Infinity;
  for (const i of legalMoves(board, who)) {
    const next = [...board];
    next[i] = who;
    for (const f of flipsFor(board, who, i)) next[f] = who;
    const givesCorner = legalMoves(next, other).some((j) => (WEIGHTS[j] ?? 0) >= 100);
    const value = (WEIGHTS[i] ?? 0) + flipsFor(board, who, i).length - (givesCorner ? 60 : 0);
    if (value > bestValue) {
      best = i;
      bestValue = value;
    }
  }
  return best;
}

export function createReversi({ arena, rng }: GameSetup): MinigameLogic<ReversiState> {
  const events = eventQueue();
  const wide = arena.width >= arena.height;
  const free = arena.height - HUD_SAFE_TOP;
  const size = wide ? Math.min(free - 30, arena.width - 300, 540) : Math.min(arena.width - 40, free - 200, 540);
  const cell = size / N;
  const left = wide ? Math.max(20, (arena.width - size - 240) / 2) : (arena.width - size) / 2;
  const top = wide ? HUD_SAFE_TOP + (free - size) / 2 : HUD_SAFE_TOP + 150 + (free - 150 - size) / 2;
  const state: ReversiState = {
    board: startBoard(),
    turn: 'child',
    turnAgo: 0,
    passed: 0,
    changedAt: new Array<number>(N * N).fill(-9),
    lastMove: -1,
    skill: 0.45,
    cell,
    left,
    top,
    badge: wide ? { x: left + size + 130, y: top + size / 2 } : { x: arena.width / 2, y: HUD_SAFE_TOP + 70 },
    games: 0,
    score: 0,
    time: 0,
  };

  const play = (who: number, i: number): void => {
    const flips = flipsFor(state.board, who, i);
    state.board[i] = who;
    state.changedAt[i] = state.time;
    flips.forEach((f, k) => {
      state.board[f] = who;
      state.changedAt[f] = state.time + k * 0.05;
    });
    state.lastMove = i;
    const at = { x: left + ((i % N) + 0.5) * cell, y: top + (Math.floor(i / N) + 0.5) * cell };
    events.push({ type: 'action', x: at.x, y: at.y, note: who === CHILD ? 72 + Math.min(12, flips.length * 2) : 60, voice: who === CHILD ? 'bell' : 'piano' });
  };

  /** Hands the turn on, passing when the next player has no move and ending when neither has. */
  const nextTurn = (justMoved: number): void => {
    const other = justMoved === CHILD ? OWL : CHILD;
    state.turnAgo = 0;
    if (legalMoves(state.board, other).length > 0) {
      state.turn = other === CHILD ? 'child' : 'owl';
      return;
    }
    if (legalMoves(state.board, justMoved).length > 0) {
      state.passed = other;
      state.turn = justMoved === CHILD ? 'child' : 'owl';
      return;
    }
    state.turn = 'over';
    const mine = countOf(state.board, CHILD);
    const owl = countOf(state.board, OWL);
    if (mine > owl) {
      state.score += 1;
      events.push({ type: 'score', x: left + (N * cell) / 2, y: top + (N * cell) / 2 });
    } else {
      state.skill = Math.max(0, state.skill - 0.2);
      events.push({ type: 'miss', x: left + (N * cell) / 2, y: top + (N * cell) / 2 });
    }
  };

  const owlMove = (r: Rng): number => {
    const moves = legalMoves(state.board, OWL);
    if (r.chance(state.skill)) return bestMove(state.board, OWL);
    return moves[r.int(0, moves.length - 1)] ?? -1;
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
      state.turnAgo += dt;
      if (state.passed && state.turnAgo >= PASS_SECONDS) state.passed = 0;
      if (state.turn === 'over') {
        if (state.turnAgo >= OVER_SECONDS) {
          state.games += 1;
          state.board = startBoard();
          state.changedAt.fill(-9);
          state.lastMove = -1;
          state.turn = 'child';
          state.turnAgo = 0;
        }
        return;
      }
      if (state.turn === 'owl') {
        if (state.turnAgo < THINK_SECONDS) return;
        const move = owlMove(rng);
        if (move >= 0) play(OWL, move);
        nextTurn(OWL);
        return;
      }
      for (const tap of input.taps) {
        const c = Math.floor((tap.x - left) / cell);
        const r = Math.floor((tap.y - top) / cell);
        if (c < 0 || c >= N || r < 0 || r >= N) continue;
        const i = r * N + c;
        if (flipsFor(state.board, CHILD, i).length === 0) {
          events.push({ type: 'miss', x: tap.x, y: tap.y });
          continue;
        }
        play(CHILD, i);
        nextTurn(CHILD);
        return;
      }
    },
  };
}

/** Good play: corners, edges and big flips, never opening a corner to the owl; a breath before each move. */
export function reversiBot(state: ReversiState, _context: BotContext): BotMove {
  if (state.turn !== 'child' || state.turnAgo < 0.3) return {};
  const move = bestMove(state.board, CHILD);
  if (move < 0) return {};
  return { tap: { x: state.left + ((move % N) + 0.5) * state.cell, y: state.top + (Math.floor(move / N) + 0.5) * state.cell } };
}
