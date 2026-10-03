// Knight hop: a horse stands on a 5 × 5 castle floor with stars scattered about. It moves like the knight in
// chess: two squares one way and one square to the side (an L); the squares it can reach glow. Tapping one
// hops the horse there and picks up any star on it (a point). Tapping elsewhere does nothing but show the L.
// When the stars are gone a new floor comes with more stars. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const SIZE = 5;
const L_MOVES = [
  [1, 2],
  [2, 1],
  [2, -1],
  [1, -2],
  [-1, -2],
  [-2, -1],
  [-2, 1],
  [-1, 2],
] as const;

export interface KnightState {
  left: number;
  top: number;
  cell: number;
  /** The horse's square (col, row), and where it hopped from. */
  at: { col: number; row: number };
  from: { col: number; row: number };
  hopAgo: number;
  /** Squares with a star (index row * SIZE + col). */
  stars: Set<number>;
  /** Seconds since a star was picked up (and where). */
  pickedAgo: number;
  picked: number;
  /** Seconds since a tap on a square it cannot reach. */
  wrongAgo: number;
  wrongAt: number;
  /** Seconds since the floor was cleared (-1 while playing). */
  clearedAgo: number;
  boards: number;
  score: number;
  time: number;
}

const HOP_SECONDS = 0.28;
const CLEAR_SECONDS = 1.2;
/** Stars on each floor, in order (then 6). */
export const STARS_PER_BOARD = [3, 4, 5, 5, 6] as const;

/** Squares the horse can hop to from (col, row). */
export function knightMoves(col: number, row: number): Array<{ col: number; row: number }> {
  return L_MOVES.map(([dc, dr]) => ({ col: col + dc, row: row + dr })).filter((m) => m.col >= 0 && m.col < SIZE && m.row >= 0 && m.row < SIZE);
}

/** Fewest hops from a square to every square (breadth-first). */
export function hopDistances(col: number, row: number): number[] {
  const dist = Array.from({ length: SIZE * SIZE }, () => Infinity);
  dist[row * SIZE + col] = 0;
  const queue = [{ col, row }];
  for (let q = queue.shift(); q; q = queue.shift()) {
    const d = dist[q.row * SIZE + q.col] ?? 0;
    for (const m of knightMoves(q.col, q.row)) {
      const i = m.row * SIZE + m.col;
      if ((dist[i] ?? 0) > d + 1) {
        dist[i] = d + 1;
        queue.push(m);
      }
    }
  }
  return dist;
}

export function createKnightHop({ arena, rng }: GameSetup): MinigameLogic<KnightState> {
  const events = eventQueue();
  const board = Math.min(arena.width - 40, arena.height - HUD_SAFE_TOP - 70);
  const cell = board / SIZE;
  const state: KnightState = {
    left: (arena.width - board) / 2,
    top: HUD_SAFE_TOP + 20 + (arena.height - HUD_SAFE_TOP - 70 - board) / 2 + 30,
    cell,
    at: { col: 0, row: 0 },
    from: { col: 0, row: 0 },
    hopAgo: 9,
    stars: new Set(),
    pickedAgo: 9,
    picked: -1,
    wrongAgo: 9,
    wrongAt: -1,
    clearedAgo: -1,
    boards: 0,
    score: 0,
    time: 0,
  };

  function newBoard(): void {
    const start = { col: rng.int(0, SIZE - 1), row: rng.int(0, SIZE - 1) };
    state.at = start;
    state.from = start;
    state.stars = new Set();
    const count = STARS_PER_BOARD[state.boards] ?? 6;
    while (state.stars.size < count) {
      const i = rng.int(0, SIZE * SIZE - 1);
      if (i !== start.row * SIZE + start.col) state.stars.add(i);
    }
    state.clearedAgo = -1;
  }

  function tap(p: Point): void {
    const col = Math.floor((p.x - state.left) / state.cell);
    const row = Math.floor((p.y - state.top) / state.cell);
    if (col < 0 || col >= SIZE || row < 0 || row >= SIZE) return;
    const legal = knightMoves(state.at.col, state.at.row).some((m) => m.col === col && m.row === row);
    const centre = { x: state.left + (col + 0.5) * state.cell, y: state.top + (row + 0.5) * state.cell };
    if (!legal) {
      state.wrongAgo = 0;
      state.wrongAt = row * SIZE + col;
      events.push({ type: 'miss', ...centre });
      return;
    }
    state.from = state.at;
    state.at = { col, row };
    state.hopAgo = 0;
    events.push({ type: 'action', ...centre });
    const i = row * SIZE + col;
    if (state.stars.delete(i)) {
      state.score += 1;
      state.picked = i;
      state.pickedAgo = 0;
      events.push({ type: 'score', x: centre.x, y: centre.y - 30 });
      if (state.stars.size === 0) state.clearedAgo = 0;
    }
  }

  newBoard();

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
      state.hopAgo += dt;
      state.pickedAgo += dt;
      state.wrongAgo += dt;
      if (state.clearedAgo >= 0) {
        state.clearedAgo += dt;
        if (state.clearedAgo > CLEAR_SECONDS) {
          state.boards += 1;
          newBoard();
        }
        return;
      }
      if (state.hopAgo < HOP_SECONDS) return;
      for (const p of input.taps) tap(p);
    },
  };
}

/** Good play: hops along the shortest way to the nearest star, a beat between hops. */
export function knightBot(state: KnightState, _context: BotContext): BotMove {
  if (state.clearedAgo >= 0 || state.hopAgo < 0.45) return {};
  let best: { col: number; row: number } | null = null;
  let bestD = Infinity;
  for (const m of knightMoves(state.at.col, state.at.row)) {
    const dist = hopDistances(m.col, m.row);
    const d = Math.min(...[...state.stars].map((s) => dist[s] ?? Infinity));
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  if (!best) return {};
  return { tap: { x: state.left + (best.col + 0.5) * state.cell, y: state.top + (best.row + 0.5) * state.cell } };
}
