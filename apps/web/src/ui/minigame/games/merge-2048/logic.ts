// Merge 2048: number tiles on a 4 × 4 board. A swipe slides every tile as far as it goes that way; two tiles
// of the same number that meet become one tile of their sum (once per move). After every move that changed
// the board a new 2 (sometimes a 4) appears in an empty cell. The score is the biggest tile; 64 wins. A board
// with no move left is cleared but for its biggest tile, so the round goes on. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type SwipeDirection } from '../../types';

export interface Tile {
  id: number;
  value: number;
  row: number;
  col: number;
  /** Where it slid from this move (for the slide), and when it was made or merged (for a pop). */
  fromRow: number;
  fromCol: number;
  bornAt: number;
  merged: boolean;
}

export interface MergeState {
  n: number;
  tiles: Tile[];
  left: number;
  top: number;
  cell: number;
  /** Round time of the last move (tiles slide for SLIDE_SECONDS after it). */
  movedAt: number;
  best: number;
  /** Seconds since the board was cleared for want of moves (a sweep), large = long ago. */
  clearedAgo: number;
  time: number;
}

export const SLIDE_SECONDS = 0.1;

const DIRS: Readonly<Record<SwipeDirection, readonly [number, number]>> = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };

/** The board as rows of values (0 = empty). */
export function grid(state: Pick<MergeState, 'n' | 'tiles'>): number[][] {
  const g = Array.from({ length: state.n }, () => Array.from({ length: state.n }, () => 0));
  for (const t of state.tiles) {
    const row = g[t.row];
    if (row) row[t.col] = t.value;
  }
  return g;
}

/**
 * The board after sliding toward `dir`: each line is pushed to that side, equal neighbours merge once.
 * Returns the new values with, for every tile that ends up somewhere, the tiles it came from.
 */
export function slide(values: readonly (readonly number[])[], dir: SwipeDirection): { values: number[][]; moved: boolean; gained: number[] } {
  const n = values.length;
  const [dr, dc] = DIRS[dir];
  const out = Array.from({ length: n }, () => Array.from({ length: n }, () => 0));
  const gained: number[] = [];
  let moved = false;
  for (let line = 0; line < n; line += 1) {
    // Cells of this line from the far side (the side tiles move to) backwards.
    const cells: [number, number][] = [];
    for (let k = 0; k < n; k += 1) {
      const along = dr + dc > 0 ? n - 1 - k : k;
      cells.push(dr !== 0 ? [along, line] : [line, along]);
    }
    const items = cells.map(([r, c]) => values[r]?.[c] ?? 0).filter((v) => v > 0);
    const merged: number[] = [];
    for (let i = 0; i < items.length; i += 1) {
      const a = items[i] ?? 0;
      if (items[i + 1] === a) {
        merged.push(a * 2);
        gained.push(a * 2);
        i += 1;
      } else merged.push(a);
    }
    cells.forEach(([r, c], k) => {
      const v = merged[k] ?? 0;
      const row = out[r];
      if (row) row[c] = v;
      if ((values[r]?.[c] ?? 0) !== v) moved = true;
    });
  }
  return { values: out, moved, gained };
}

export function canMove(values: readonly (readonly number[])[]): boolean {
  return (['up', 'down', 'left', 'right'] as const).some((d) => slide(values, d).moved);
}

export function createMerge2048({ arena, params, rng }: GameSetup): MinigameLogic<MergeState> {
  const n = typeof params.size === 'number' ? Math.round(Math.min(5, Math.max(3, params.size))) : 4;
  const events = eventQueue();
  const side = Math.min(arena.width - 40, arena.height - HUD_SAFE_TOP - 50, 560);
  const state: MergeState = {
    n,
    tiles: [],
    left: (arena.width - side) / 2,
    top: HUD_SAFE_TOP + 20 + (arena.height - HUD_SAFE_TOP - 50 - side) / 2,
    cell: side / n,
    movedAt: -1,
    best: 0,
    clearedAgo: 99,
    time: 0,
  };
  let nextId = 1;

  function spawn(): void {
    const g = grid(state);
    const empty: [number, number][] = [];
    g.forEach((row, r) => row.forEach((v, c) => v === 0 && empty.push([r, c])));
    const at = empty[rng.int(0, empty.length - 1)];
    if (!at) return;
    const value = rng.chance(0.1) ? 4 : 2;
    state.tiles.push({ id: nextId++, value, row: at[0], col: at[1], fromRow: at[0], fromCol: at[1], bornAt: state.time, merged: false });
    state.best = Math.max(state.best, value);
  }

  /** Moves tiles to match `values`, keeping each tile's identity for the slide (nearest same-line source). */
  function apply(dir: SwipeDirection): void {
    const before = grid(state);
    const { values, moved, gained } = slide(before, dir);
    if (!moved) return;
    const [dr, dc] = DIRS[dir];
    const next: Tile[] = [];
    const old = [...state.tiles];
    for (let line = 0; line < n; line += 1) {
      const cells: [number, number][] = [];
      for (let k = 0; k < n; k += 1) {
        const along = dr + dc > 0 ? n - 1 - k : k;
        cells.push(dr !== 0 ? [along, line] : [line, along]);
      }
      const sources = cells.map(([r, c]) => old.find((t) => t.row === r && t.col === c)).filter((t): t is Tile => t !== undefined);
      let s = 0;
      for (const [r, c] of cells) {
        const v = values[r]?.[c] ?? 0;
        if (v === 0) continue;
        const a = sources[s];
        if (!a) break;
        if (a.value === v) {
          next.push({ ...a, row: r, col: c, fromRow: a.row, fromCol: a.col, merged: false });
          s += 1;
        } else {
          // A merge: the first source carries on as the sum.
          next.push({ ...a, value: v, row: r, col: c, fromRow: a.row, fromCol: a.col, merged: true, bornAt: state.time });
          s += 2;
        }
      }
    }
    state.tiles = next;
    state.movedAt = state.time;
    for (const v of gained) {
      state.best = Math.max(state.best, v);
      const t = next.find((x) => x.merged && x.value === v);
      const x = state.left + ((t?.col ?? 0) + 0.5) * state.cell;
      const y = state.top + ((t?.row ?? 0) + 0.5) * state.cell;
      events.push(v >= 16 ? { type: 'score', x, y, points: v } : { type: 'action', x, y, note: 60 + Math.log2(v) * 2, voice: 'bell' });
    }
    spawn();
    if (!canMove(grid(state))) {
      // Stuck: keep only the biggest tile and go on.
      const biggest = state.tiles.reduce((a, b) => (b.value > a.value ? b : a));
      state.tiles = [{ ...biggest, fromRow: biggest.row, fromCol: biggest.col, merged: false }];
      state.clearedAgo = 0;
      spawn();
      spawn();
      events.push({ type: 'miss', x: arena.width / 2, y: state.top + side / 2 });
    }
  }

  spawn();
  spawn();

  return {
    state,
    get score() {
      return state.best;
    },
    get done() {
      return false;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.clearedAgo += dt;
      if (state.time - state.movedAt < SLIDE_SECONDS) return;
      const swipe = input.swipes[0];
      if (swipe) apply(swipe.direction);
    },
  };
}

const ORDER: readonly SwipeDirection[] = ['down', 'left', 'right', 'up'];

/** How good a board is for the corner plan: free cells, big tiles in the bottom-left, neighbours that match. */
function boardValue(values: number[][]): number {
  const n = values.length;
  let score = 0;
  values.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v === 0) score += 30;
      else score += v * (r + 1) * (n - c);
      if (v > 0 && row[c + 1] === v) score += v * 2;
      if (v > 0 && values[r + 1]?.[c] === v) score += v * 2;
    }),
  );
  return score;
}

/** Good play: the corner plan (keep big tiles down and to the left), looking one move ahead. */
export function merge2048Bot(state: MergeState, context: BotContext): BotMove {
  if (state.time - state.movedAt < SLIDE_SECONDS + 0.05) return {};
  const values = grid(state);
  let best: SwipeDirection | null = null;
  let bestValue = -Infinity;
  for (const dir of ORDER) {
    const { values: next, moved } = slide(values, dir);
    if (!moved) continue;
    const value = boardValue(next) - (dir === 'up' ? 1e6 : 0);
    if (value > bestValue) {
      bestValue = value;
      best = dir;
    }
  }
  if (!best) return {};
  const [dr, dc] = DIRS[best];
  const from = { x: context.arena.width / 2, y: context.arena.height / 2 };
  return { swipe: { from, dx: dc * 120, dy: dr * 120 } };
}
