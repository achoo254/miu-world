// Match three: a grid of fruit. Swiping a fruit onto its neighbour (or tapping one, then the next) swaps
// them; three or more of a kind in a row or column pop (a point a fruit), the fruit above falls in and new
// fruit drops from the top, which may pop again. A swap that pops nothing swaps back. Stuck for a few
// seconds: a fruit that can move wiggles; no move left anywhere: the grid reshuffles. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const FRUIT = ['cherries', 'strawberry', 'grapes', 'lemon', 'red-apple'] as const;

export type Match3Phase = 'idle' | 'swap' | 'unswap' | 'pop' | 'fall';

export interface Match3State {
  cols: number;
  rows: number;
  /** Fruit kind per square, row-major (-1 for an empty square during a pop). */
  grid: number[];
  /** Rows each square's fruit still has to fall (drawn above its square, shrinking to 0). */
  drop: number[];
  /** Squares popping in this pop phase. */
  popping: number[];
  /** The two squares being swapped. */
  swapping: [number, number] | null;
  phase: Match3Phase;
  phaseAgo: number;
  cell: number;
  left: number;
  top: number;
  /** A square picked by a tap, waiting for its neighbour. */
  selected: number | null;
  /** A square that has a move, wiggled after a while without one. */
  hint: number | null;
  idleAgo: number;
  shuffledAgo: number;
  /** Pops in a row from one swap (the cascade count). */
  chain: number;
  score: number;
  time: number;
}

const SWAP_SECONDS = 0.16;
const POP_SECONDS = 0.24;
const FALL_SECONDS = 0.22;
export const HINT_SECONDS = 5;

/** Every square in a run of three or more alike. */
export function findMatches(grid: readonly number[], cols: number, rows: number): number[] {
  const hit = new Set<number>();
  const run = (cells: number[]): void => {
    let start = 0;
    for (let i = 1; i <= cells.length; i += 1) {
      const a = grid[cells[start] ?? 0] ?? -1;
      if (i < cells.length && grid[cells[i] ?? 0] === a && a >= 0) continue;
      if (i - start >= 3 && a >= 0) for (let k = start; k < i; k += 1) hit.add(cells[k] ?? 0);
      start = i;
    }
  };
  for (let r = 0; r < rows; r += 1) run(Array.from({ length: cols }, (_, c) => r * cols + c));
  for (let c = 0; c < cols; c += 1) run(Array.from({ length: rows }, (_, r) => r * cols + c));
  return [...hit];
}

/** Every swap of neighbours that pops something, with how many it pops right away. */
export function findMoves(grid: readonly number[], cols: number, rows: number): { a: number; b: number; pops: number }[] {
  const moves: { a: number; b: number; pops: number }[] = [];
  const g = [...grid];
  for (let i = 0; i < g.length; i += 1) {
    for (const j of [i % cols < cols - 1 ? i + 1 : -1, i + cols < rows * cols ? i + cols : -1]) {
      if (j < 0 || g[i] === g[j]) continue;
      [g[i], g[j]] = [g[j] ?? 0, g[i] ?? 0];
      const pops = findMatches(g, cols, rows).length;
      [g[i], g[j]] = [g[j] ?? 0, g[i] ?? 0];
      if (pops > 0) moves.push({ a: i, b: j, pops });
    }
  }
  return moves;
}

export function createMatch3({ arena, rng }: GameSetup): MinigameLogic<Match3State> {
  const events = eventQueue();
  const landscape = arena.width >= arena.height;
  const top0 = HUD_SAFE_TOP + 14;
  const cols = landscape ? 8 : 6;
  const availH = arena.height - top0 - 24;
  const cell0 = Math.min(104, (arena.width - 40) / cols);
  const rows = landscape ? 5 : Math.max(7, Math.min(9, Math.floor(availH / cell0)));
  const cell = Math.min(cell0, availH / rows);
  const state: Match3State = {
    cols,
    rows,
    grid: [],
    drop: Array.from({ length: cols * rows }, () => 0),
    popping: [],
    swapping: null,
    phase: 'idle',
    phaseAgo: 0,
    cell,
    left: (arena.width - cols * cell) / 2,
    top: top0 + (availH - rows * cell) / 2,
    selected: null,
    hint: null,
    idleAgo: 0,
    shuffledAgo: 9,
    chain: 0,
    score: 0,
    time: 0,
  };
  const randomFruit = (): number => rng.int(0, FRUIT.length - 1);

  /** A fresh grid with nothing to pop and at least one move. */
  function fill(): void {
    for (let tries = 0; tries < 100; tries += 1) {
      const grid: number[] = [];
      for (let i = 0; i < cols * rows; i += 1) {
        let f = randomFruit();
        for (let k = 0; k < 10; k += 1) {
          const left2 = i % cols >= 2 && grid[i - 1] === f && grid[i - 2] === f;
          const up2 = i >= cols * 2 && grid[i - cols] === f && grid[i - cols * 2] === f;
          if (!left2 && !up2) break;
          f = randomFruit();
        }
        grid.push(f);
      }
      if (findMatches(grid, cols, rows).length === 0 && findMoves(grid, cols, rows).length > 0) {
        state.grid = grid;
        return;
      }
    }
  }
  fill();

  const setPhase = (phase: Match3Phase): void => {
    state.phase = phase;
    state.phaseAgo = 0;
  };
  const centre = (i: number): Point => ({ x: state.left + ((i % cols) + 0.5) * cell, y: state.top + (Math.floor(i / cols) + 0.5) * cell });
  const squareAt = (p: Point): number => {
    const c = Math.floor((p.x - state.left) / cell);
    const r = Math.floor((p.y - state.top) / cell);
    return c < 0 || r < 0 || c >= cols || r >= rows ? -1 : r * cols + c;
  };
  const neighbour = (i: number, dx: number, dy: number): number => {
    const c = (i % cols) + dx;
    const r = Math.floor(i / cols) + dy;
    return c < 0 || r < 0 || c >= cols || r >= rows ? -1 : r * cols + c;
  };
  const swapGrid = (a: number, b: number): void => {
    [state.grid[a], state.grid[b]] = [state.grid[b] ?? 0, state.grid[a] ?? 0];
  };

  function trySwap(a: number, b: number): void {
    if (state.phase !== 'idle' || a < 0 || b < 0) return;
    state.selected = null;
    state.hint = null;
    state.idleAgo = 0;
    state.chain = 0;
    state.swapping = [a, b];
    swapGrid(a, b);
    events.push({ type: 'action', ...centre(a) });
    setPhase('swap');
  }

  /** Pops what matches now; true if anything popped. */
  function popMatches(): boolean {
    const hit = findMatches(state.grid, cols, rows);
    if (hit.length === 0) return false;
    state.chain += 1;
    state.popping = hit;
    const points = hit.length;
    state.score += points;
    const x = hit.reduce((s, i) => s + centre(i).x, 0) / hit.length;
    const y = hit.reduce((s, i) => s + centre(i).y, 0) / hit.length;
    events.push({ type: 'score', x, y, points });
    setPhase('pop');
    return true;
  }

  /** Empties popped squares, lets fruit fall and drops new fruit in from the top. */
  function collapse(): void {
    for (const i of state.popping) state.grid[i] = -1;
    state.popping = [];
    for (let c = 0; c < cols; c += 1) {
      let write = rows - 1;
      for (let r = rows - 1; r >= 0; r -= 1) {
        const f = state.grid[r * cols + c] ?? -1;
        if (f < 0) continue;
        state.grid[write * cols + c] = f;
        state.drop[write * cols + c] = write - r;
        write -= 1;
      }
      for (let r = write; r >= 0; r -= 1) {
        state.grid[r * cols + c] = randomFruit();
        state.drop[r * cols + c] = write + 1;
      }
    }
    setPhase('fall');
  }

  let dragFrom = -1;
  let dragged = false;

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
      state.idleAgo += dt;
      state.shuffledAgo += dt;

      // A finger dragged half a square away from where it went down swaps right then.
      if (input.pressed) {
        dragged = false;
        dragFrom = input.pointer ? squareAt(input.pointer) : -1;
      }
      if (input.pointer && dragFrom >= 0 && !dragged) {
        const from = centre(dragFrom);
        const dx = input.pointer.x - from.x;
        const dy = input.pointer.y - from.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) > cell * 0.5 && state.phase === 'idle') {
          dragged = true;
          trySwap(dragFrom, Math.abs(dx) > Math.abs(dy) ? neighbour(dragFrom, Math.sign(dx), 0) : neighbour(dragFrom, 0, Math.sign(dy)));
        }
      }
      for (const swipe of input.swipes) {
        if (dragged) continue;
        const from = squareAt(swipe.from);
        if (from < 0) continue;
        const d = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[swipe.direction];
        trySwap(from, neighbour(from, d[0] ?? 0, d[1] ?? 0));
      }
      for (const tap of input.taps) {
        if (state.phase !== 'idle') continue;
        const i = squareAt(tap);
        if (i < 0) continue;
        const s = state.selected;
        const next = s !== null && (Math.abs(s - i) === cols || (Math.abs(s - i) === 1 && Math.floor(s / cols) === Math.floor(i / cols)));
        if (s !== null && next) trySwap(s, i);
        else state.selected = s === i ? null : i;
      }
      if (input.released) dragFrom = -1;

      switch (state.phase) {
        case 'idle':
          if (state.idleAgo > HINT_SECONDS && state.hint === null) state.hint = findMoves(state.grid, cols, rows)[0]?.a ?? null;
          break;
        case 'swap':
          if (state.phaseAgo >= SWAP_SECONDS && !popMatches()) {
            const pair = state.swapping;
            if (pair) swapGrid(pair[0], pair[1]);
            events.push({ type: 'miss', ...centre(pair?.[0] ?? 0) });
            setPhase('unswap');
          }
          break;
        case 'unswap':
          if (state.phaseAgo >= SWAP_SECONDS) {
            state.swapping = null;
            setPhase('idle');
          }
          break;
        case 'pop':
          if (state.phaseAgo >= POP_SECONDS) {
            state.swapping = null;
            collapse();
          }
          break;
        case 'fall':
          if (state.phaseAgo >= FALL_SECONDS) {
            state.drop.fill(0);
            if (!popMatches()) {
              setPhase('idle');
              state.idleAgo = 0;
              if (findMoves(state.grid, cols, rows).length === 0) {
                fill();
                state.shuffledAgo = 0;
              }
            }
          }
          break;
      }
    },
  };
}

/** Good play: the swap that pops the most, as a swipe from one fruit toward the other. */
export function match3Bot(state: Match3State, _context: BotContext): BotMove {
  if (state.phase !== 'idle' || state.idleAgo < 0.8) return {};
  const best = findMoves(state.grid, state.cols, state.rows).sort((m, n) => n.pops - m.pops)[0];
  if (!best) return {};
  const from = { x: state.left + ((best.a % state.cols) + 0.5) * state.cell, y: state.top + (Math.floor(best.a / state.cols) + 0.5) * state.cell };
  const horizontal = best.b === best.a + 1;
  return { swipe: { from, dx: horizontal ? state.cell : 0, dy: horizontal ? 0 : state.cell } };
}
