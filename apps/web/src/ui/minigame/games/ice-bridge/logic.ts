// Ice bridge: a penguin waits on the left shore of a lake dotted with ice floes. Each tap on open water freezes
// that square and costs one snowflake; the lake gives just enough snowflakes for the shortest bridge (one to
// spare on the first two lakes). Once the ice joins the two shores the penguin walks across (a point) and the
// next lake comes; with no snowflakes left and no bridge, the ice melts and the lake starts over. Pure: no DOM.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type Cell = 'water' | 'floe' | 'frozen';

export interface IceBridgeState {
  cols: number;
  rows: number;
  cells: Cell[];
  /** The lake as dealt (to start over after melting). */
  dealt: Cell[];
  snowflakes: number;
  budget: number;
  /** The lake on screen: crossed left to right on a wide screen, bottom to top on a tall one. */
  tall: boolean;
  cell: number;
  left: number;
  top: number;
  /** Depth of the shores beside the lake, and where the snowflakes row is. */
  bank: number;
  flakesY: number;
  phase: 'build' | 'cross' | 'melt';
  phaseAgo: number;
  /** The penguin's way over, cell indexes, once the bridge is made. */
  path: number[];
  penguinRow: number;
  lastTapAt: number;
  frozenAt: number[];
  lakes: number;
  score: number;
  time: number;
}

const FLOE_SHARE = 0.36;
const CROSS_SECONDS = 1.6;
/** Lakes that come with one snowflake to spare. */
const SPARE_LAKES = 2;
const MELT_SECONDS = 1.2;
const NOTES = [76, 79, 81, 84, 86, 88];

/** Fewest squares to freeze for a bridge from the first column to the last one, with the squares (0-1 BFS). */
export function cheapestBridge(cells: readonly Cell[], cols: number, rows: number): { cost: number; path: number[] } {
  const cost = (i: number): number => (cells[i] === 'water' ? 1 : 0);
  const dist = new Array<number>(cols * rows).fill(Infinity);
  const prev = new Array<number>(cols * rows).fill(-1);
  const deque: number[] = [];
  for (let r = 0; r < rows; r += 1) {
    const i = r * cols;
    dist[i] = cost(i);
    deque.push(i);
  }
  deque.sort((a, b) => (dist[a] ?? 0) - (dist[b] ?? 0));
  while (deque.length > 0) {
    deque.sort((a, b) => (dist[a] ?? 0) - (dist[b] ?? 0));
    const i = deque.shift() ?? 0;
    const c = i % cols;
    const r = Math.floor(i / cols);
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
      const j = nr * cols + nc;
      const d = (dist[i] ?? 0) + cost(j);
      if (d < (dist[j] ?? Infinity)) {
        dist[j] = d;
        prev[j] = i;
        deque.push(j);
      }
    }
  }
  let best = -1;
  for (let r = 0; r < rows; r += 1) {
    const i = r * cols + cols - 1;
    if (best < 0 || (dist[i] ?? Infinity) < (dist[best] ?? Infinity)) best = i;
  }
  const path: number[] = [];
  for (let i = best; i >= 0; i = prev[i] ?? -1) path.unshift(i);
  return { cost: dist[best] ?? Infinity, path };
}

/** A walk over ice from the first column to the last one (fewest steps), or null. */
export function iceWalk(cells: readonly Cell[], cols: number, rows: number): number[] | null {
  const walkable = (i: number): boolean => cells[i] !== 'water';
  const prev = new Array<number>(cols * rows).fill(-2);
  const queue: number[] = [];
  for (let r = 0; r < rows; r += 1) {
    const i = r * cols;
    if (walkable(i)) {
      prev[i] = -1;
      queue.push(i);
    }
  }
  for (let head = 0; head < queue.length; head += 1) {
    const i = queue[head] ?? 0;
    const c = i % cols;
    if (c === cols - 1) {
      const path: number[] = [];
      for (let k = i; k >= 0; k = prev[k] ?? -1) path.unshift(k);
      return path;
    }
    const r = Math.floor(i / cols);
    for (const [dc, dr] of [
      [1, 0],
      [0, 1],
      [0, -1],
      [-1, 0],
    ] as const) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
      const j = nr * cols + nc;
      if (prev[j] !== -2 || !walkable(j)) continue;
      prev[j] = i;
      queue.push(j);
    }
  }
  return null;
}

/** Screen centre of square `i` (column = how far across, row = which lane). */
export function cellCentre(state: Pick<IceBridgeState, 'tall' | 'cols' | 'cell' | 'left' | 'top'>, i: number): Point {
  const c = i % state.cols;
  const r = Math.floor(i / state.cols);
  return state.tall
    ? { x: state.left + (r + 0.5) * state.cell, y: state.top + (state.cols - c - 0.5) * state.cell }
    : { x: state.left + (c + 0.5) * state.cell, y: state.top + (r + 0.5) * state.cell };
}

/** The square under a point, or -1. */
export function cellAt(state: Pick<IceBridgeState, 'tall' | 'cols' | 'rows' | 'cell' | 'left' | 'top'>, p: Point): number {
  const a = Math.floor((p.x - state.left) / state.cell);
  const b = Math.floor((p.y - state.top) / state.cell);
  const c = state.tall ? state.cols - 1 - b : a;
  const r = state.tall ? a : b;
  if (c < 0 || c >= state.cols || r < 0 || r >= state.rows) return -1;
  return r * state.cols + c;
}

/** The middle of the near (start) or far (end) shore beside lane `r`. */
export function shorePoint(state: Pick<IceBridgeState, 'tall' | 'cols' | 'cell' | 'left' | 'top' | 'bank'>, side: 'start' | 'end', r: number): Point {
  const lane = (r + 0.5) * state.cell;
  const length = state.cols * state.cell;
  if (state.tall) return { x: state.left + lane, y: side === 'start' ? state.top + length + state.bank / 2 : state.top - state.bank / 2 };
  return { x: side === 'start' ? state.left - state.bank / 2 : state.left + length + state.bank / 2, y: state.top + lane };
}

export function makeLake(rng: Rng, cols: number, rows: number): { cells: Cell[]; cost: number } {
  let fallback: { cells: Cell[]; cost: number } | null = null;
  for (let tries = 0; tries < 60; tries += 1) {
    const cells: Cell[] = Array.from({ length: cols * rows }, () => (rng.chance(FLOE_SHARE) ? 'floe' : 'water'));
    const { cost } = cheapestBridge(cells, cols, rows);
    if (cost >= 2 && cost <= Math.max(3, Math.ceil(cols * 0.6))) return { cells, cost };
    if (cost >= 1 && !fallback) fallback = { cells, cost };
  }
  if (fallback) return fallback;
  const cells: Cell[] = Array.from({ length: cols * rows }, () => 'water');
  return { cells, cost: cols };
}

export function createIceBridge({ arena, rng }: GameSetup): MinigameLogic<IceBridgeState> {
  const events = eventQueue();
  const tall = arena.height > arena.width;
  const free = arena.height - HUD_SAFE_TOP;
  const bank = tall ? Math.max(80, arena.height * 0.08) : Math.max(64, arena.width * 0.09);
  const along = tall ? free - 60 - bank * 2 : arena.width - bank * 2 - 10;
  const across = tall ? arena.width - 40 : free - 40;
  const cols = Math.max(4, Math.min(8, Math.floor(along / 85)));
  const rows = Math.max(3, Math.min(6, Math.floor(across / 85)));
  const cell = Math.min(along / cols, across / rows, 110);
  const lakeW = (tall ? rows : cols) * cell;
  const lakeH = (tall ? cols : rows) * cell;
  const top = tall ? HUD_SAFE_TOP + 60 + bank + (along - lakeH) / 2 : HUD_SAFE_TOP + 20 + (across - lakeH) / 2;
  const state: IceBridgeState = {
    cols,
    rows,
    cells: [],
    dealt: [],
    snowflakes: 0,
    budget: 0,
    tall,
    cell,
    left: (arena.width - lakeW) / 2,
    top,
    bank,
    flakesY: tall ? HUD_SAFE_TOP + 26 : Math.max(HUD_SAFE_TOP + 4, top - 22),
    phase: 'build',
    phaseAgo: 0,
    path: [],
    penguinRow: Math.floor(rows / 2),
    lastTapAt: -9,
    frozenAt: [],
    lakes: 0,
    score: 0,
    time: 0,
  };

  const deal = (): void => {
    const lake = makeLake(rng, cols, rows);
    state.dealt = lake.cells;
    // A spare snowflake on the first lakes; then just enough for the cheapest bridge.
    state.budget = lake.cost + (state.lakes < SPARE_LAKES ? 1 : 0);
    reset();
  };
  const reset = (): void => {
    state.cells = [...state.dealt];
    state.snowflakes = state.budget;
    state.frozenAt = state.cells.map(() => -9);
    state.path = [];
    state.phase = 'build';
    state.phaseAgo = 0;
  };

  deal();

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
      state.phaseAgo += dt;
      if (state.phase === 'cross') {
        if (state.phaseAgo >= CROSS_SECONDS) {
          state.lakes += 1;
          deal();
        }
        return;
      }
      if (state.phase === 'melt') {
        if (state.phaseAgo >= MELT_SECONDS) reset();
        return;
      }
      for (const tap of input.taps) {
        const i = cellAt(state, tap);
        if (i < 0 || state.cells[i] !== 'water' || state.snowflakes <= 0) continue;
        state.cells[i] = 'frozen';
        state.frozenAt[i] = state.time;
        state.snowflakes -= 1;
        state.lastTapAt = state.time;
        const at = cellCentre(state, i);
        events.push({ type: 'action', x: at.x, y: at.y, note: NOTES[(state.budget - state.snowflakes - 1) % NOTES.length] ?? 76, voice: 'bell' });
        const walk = iceWalk(state.cells, cols, rows);
        if (walk) {
          state.path = walk;
          state.penguinRow = Math.floor((walk[0] ?? 0) / cols);
          state.phase = 'cross';
          state.phaseAgo = 0;
          state.score += 1;
          events.push({ type: 'score', x: arena.width / 2, y: arena.height / 2 });
        } else if (state.snowflakes <= 0) {
          state.phase = 'melt';
          state.phaseAgo = 0;
          events.push({ type: 'hit', x: at.x, y: at.y });
        }
        break;
      }
    },
  };
}

/** Good play: freezes the squares of the cheapest bridge, one every quarter second. */
export function iceBridgeBot(state: IceBridgeState, _context: BotContext): BotMove {
  if (state.phase !== 'build' || state.time - state.lastTapAt < 0.25) return {};
  const { path } = cheapestBridge(state.cells, state.cols, state.rows);
  const next = path.find((i) => state.cells[i] === 'water');
  if (next === undefined) return {};
  return { tap: cellCentre(state, next) };
}
