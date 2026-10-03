// Cờ gánh: the Vietnamese board game on a 5 × 5 grid of points joined by lines (and diagonals on every other
// point). The child (red, below) and a friendly computer (blue, above) each start with eight pieces and take
// turns moving one piece one step along a line to an empty point. Stepping in between two enemy pieces on a
// line "carries" them (gánh): both turn red. Enemy pieces left with nowhere to move are "surrounded" (vây) and
// turn red too; the computer can do the same to hers. Pieces only change colour, so the count is always 16.
// Points are how many pieces are red: more than the computer's (9 or more) wins. If she loses every piece, a
// new game starts with a gentler computer. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const N = 5;
export type Owner = 0 | 1 | 2;
/** 1 = the child's pieces, 2 = the computer's, 0 = empty. */
export type Board = Owner[];

export const TOTAL = 16;

/** Points joined to point i by a line. */
export function links(i: number): number[] {
  const r = Math.floor(i / N);
  const c = i % N;
  const dirs: Array<[number, number]> = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ];
  if ((r + c) % 2 === 0) dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
  return dirs.map(([dr, dc]) => [r + dr, c + dc] as const).filter(([rr, cc]) => rr >= 0 && rr < N && cc >= 0 && cc < N).map(([rr, cc]) => rr * N + cc);
}

export function startBoard(): Board {
  const b: Board = Array.from({ length: N * N }, () => 0 as Owner);
  for (let c = 0; c < N; c += 1) {
    b[c] = 2;
    b[(N - 1) * N + c] = 1;
  }
  b[N] = 2;
  b[N + N - 1] = 2;
  b[2 * N + N - 1] = 2;
  b[3 * N] = 1;
  b[3 * N + N - 1] = 1;
  b[2 * N] = 1;
  return b;
}

export const count = (b: Board, who: Owner): number => b.filter((v) => v === who).length;

/** Every legal step for one side: [from, to]. */
export function movesFor(b: Board, who: Owner): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  b.forEach((v, i) => {
    if (v === who) for (const j of links(i)) if (b[j] === 0) out.push([i, j]);
  });
  return out;
}

/** Plays a step on a copy of the board, with gánh and vây; returns the new board and the pieces turned. */
export function playMove(b: Board, from: number, to: number): { board: Board; turned: number[] } {
  const board = [...b];
  const me = board[from] ?? 0;
  const enemy: Owner = me === 1 ? 2 : 1;
  board[to] = me;
  board[from] = 0;
  const turned: number[] = [];
  // Gánh: enemy on both sides of the landing point along a line through it.
  const r = Math.floor(to / N);
  const c = to % N;
  const axes: Array<[number, number]> = [
    [0, 1],
    [1, 0],
  ];
  if ((r + c) % 2 === 0) axes.push([1, 1], [1, -1]);
  for (const [dr, dc] of axes) {
    const a = [r + dr, c + dc];
    const z = [r - dr, c - dc];
    const ok = (p: number[]) => (p[0] ?? -1) >= 0 && (p[0] ?? N) < N && (p[1] ?? -1) >= 0 && (p[1] ?? N) < N;
    if (!ok(a) || !ok(z)) continue;
    const ai = (a[0] ?? 0) * N + (a[1] ?? 0);
    const zi = (z[0] ?? 0) * N + (z[1] ?? 0);
    if (board[ai] === enemy && board[zi] === enemy) {
      board[ai] = me;
      board[zi] = me;
      turned.push(ai, zi);
    }
  }
  // Vây: enemy groups with no empty point next to them.
  const seen = new Set<number>();
  board.forEach((v, i) => {
    if (v !== enemy || seen.has(i)) return;
    const group = [i];
    seen.add(i);
    let free = false;
    for (let k = 0; k < group.length; k += 1) {
      for (const j of links(group[k] ?? 0)) {
        if (board[j] === 0) free = true;
        else if (board[j] === enemy && !seen.has(j)) {
          seen.add(j);
          group.push(j);
        }
      }
    }
    if (!free) for (const g of group) {
      board[g] = me;
      turned.push(g);
    }
  });
  return { board, turned };
}

export interface GanhState {
  board: Board;
  left: number;
  top: number;
  gap: number;
  turn: 1 | 2;
  turnTime: number;
  selected: number;
  /** Seconds since each point's piece changed colour (a flip). */
  flippedAgo: number[];
  lastMove: [number, number] | null;
  movedAgo: number;
  /** How often the computer takes its best capture (lower is gentler). */
  sharpness: number;
  /** Seconds since a new game began after she lost every piece (-1 none). */
  restartAgo: number;
  games: number;
  score: number;
  time: number;
}

const THINK = 0.8;

function bestFor(b: Board, who: Owner): { move: [number, number]; gain: number } | null {
  let best: { move: [number, number]; gain: number } | null = null;
  for (const m of movesFor(b, who)) {
    const gain = playMove(b, m[0], m[1]).turned.length;
    if (!best || gain > best.gain) best = { move: m, gain };
  }
  return best;
}

export function createCoGanh({ arena, rng }: GameSetup): MinigameLogic<GanhState> {
  const events = eventQueue();
  const size = Math.min(arena.width - 80, arena.height - HUD_SAFE_TOP - 110, 520);
  const state: GanhState = {
    board: startBoard(),
    left: (arena.width - size) / 2,
    top: HUD_SAFE_TOP + 50 + (arena.height - HUD_SAFE_TOP - 110 - size) / 2,
    gap: size / (N - 1),
    turn: 1,
    turnTime: 0,
    selected: -1,
    flippedAgo: Array.from({ length: N * N }, () => 9),
    lastMove: null,
    movedAgo: 9,
    sharpness: 0.45,
    restartAgo: -1,
    games: 0,
    score: 8,
    time: 0,
  };

  const pointAt = (p: Point): number => {
    const c = Math.round((p.x - state.left) / state.gap);
    const r = Math.round((p.y - state.top) / state.gap);
    if (c < 0 || c >= N || r < 0 || r >= N) return -1;
    const centre = { x: state.left + c * state.gap, y: state.top + r * state.gap };
    return Math.hypot(centre.x - p.x, centre.y - p.y) <= state.gap * 0.48 ? r * N + c : -1;
  };

  function apply(from: number, to: number): void {
    const { board, turned } = playMove(state.board, from, to);
    state.board = board;
    state.lastMove = [from, to];
    state.movedAgo = 0;
    for (const t of turned) state.flippedAgo[t] = 0;
    const at = { x: state.left + (to % N) * state.gap, y: state.top + Math.floor(to / N) * state.gap };
    const mover = board[to];
    if (turned.length > 0) events.push(mover === 1 ? { type: 'score', ...at, points: turned.length } : { type: 'hit', ...at });
    else events.push({ type: 'action', ...at });
    state.score = count(state.board, 1);
    state.turn = mover === 1 ? 2 : 1;
    state.turnTime = 0;
    state.selected = -1;
    // Out of moves: the other side plays again.
    if (movesFor(state.board, state.turn).length === 0) state.turn = state.turn === 1 ? 2 : 1;
    if (count(state.board, 1) === 0) {
      state.restartAgo = 0;
      state.sharpness = Math.max(0.05, state.sharpness - 0.2);
    }
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return count(state.board, 2) === 0;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.turnTime += dt;
      state.movedAgo += dt;
      state.flippedAgo = state.flippedAgo.map((a) => a + dt);
      if (state.restartAgo >= 0) {
        state.restartAgo += dt;
        if (state.restartAgo > 1.6) {
          state.board = startBoard();
          state.score = 8;
          state.turn = 1;
          state.restartAgo = -1;
          state.games += 1;
        }
        return;
      }
      if (state.turn === 2) {
        if (state.turnTime < THINK) return;
        const moves = movesFor(state.board, 2);
        const best = bestFor(state.board, 2);
        const pick = best && best.gain > 0 && rng.chance(state.sharpness) ? best.move : moves[rng.int(0, Math.max(0, moves.length - 1))];
        if (pick) apply(pick[0], pick[1]);
        return;
      }
      for (const p of input.taps) {
        const i = pointAt(p);
        if (i < 0) continue;
        if (state.board[i] === 1) {
          state.selected = i;
          events.push({ type: 'action', x: p.x, y: p.y });
        } else if (state.selected >= 0 && state.board[i] === 0 && links(state.selected).includes(i)) {
          apply(state.selected, i);
        }
        break;
      }
    },
  };
}

/** Good play: the step that turns the most pieces, minus what the computer could turn back next. */
export function coGanhBot(state: GanhState, _context: BotContext): BotMove {
  if (state.turn !== 1 || state.restartAgo >= 0 || state.turnTime < 0.3) return {};
  let best: { move: [number, number]; value: number } | null = null;
  for (const m of movesFor(state.board, 1)) {
    const after = playMove(state.board, m[0], m[1]);
    const reply = bestFor(after.board, 2)?.gain ?? 0;
    const value = after.turned.length - reply * 0.9;
    if (!best || value > best.value) best = { move: m, value };
  }
  if (!best) return {};
  const [from, to] = best.move;
  const at = (i: number): Point => ({ x: state.left + (i % N) * state.gap, y: state.top + Math.floor(i / N) * state.gap });
  return { tap: state.selected === from ? at(to) : at(from) };
}
