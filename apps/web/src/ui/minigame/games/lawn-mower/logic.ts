// Lawn mower: a lawn of grass squares with a few flowerbeds and rocks to go round. The child steers the
// mower square by square (drag along, or swipe, or tap the next square) and must cut every grass square
// in one go: the mower cannot drive over grass it has already cut. A mower with nowhere left to go is
// stuck: the "làm lại" button (pulsing then) lays the same lawn again. A finished lawn is a point and a
// bigger lawn comes. Every lawn is made from one random path through it, so it can always be done.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';
import { randomFullPath } from '../flow-connect/logic';

export interface MowerState {
  cols: number;
  rows: number;
  cellPx: number;
  left: number;
  top: number;
  /** Squares the mower cannot cross (flowerbeds, rocks), and the start square. */
  blocked: Set<number>;
  start: number;
  /** The lawn's own solution (the path it was made from). */
  solution: number[];
  /** Squares cut so far, in order: the last one is where the mower is. */
  cut: number[];
  /** Seconds since the last move (the mower bounces), since the lawn was finished (-1 while mowing). */
  movedAgo: number;
  doneAgo: number;
  /** The redo button. */
  redo: Point;
  lawns: number;
  score: number;
  time: number;
}

/** Lawn sizes (columns × rows) and how many squares are not grass, one after another. */
const LAWNS: readonly (readonly [number, number, number])[] = [
  [4, 4, 1],
  [5, 4, 2],
  [5, 5, 2],
  [6, 5, 3],
  [6, 6, 3],
];
const REDO_RADIUS = Math.max(TOUCH_RADIUS * 1.2, 50);

function layLawn(state: MowerState, rng: Rng, arena: { width: number; height: number }): void {
  const [cols, rows, rocks] = LAWNS[Math.min(state.lawns, LAWNS.length - 1)] ?? [5, 5, 2];
  const path = randomFullPath(cols, rng, rows);
  state.cols = cols;
  state.rows = rows;
  state.solution = path.slice(0, path.length - rocks);
  state.blocked = new Set(path.slice(path.length - rocks));
  state.start = path[0] ?? 0;
  state.cut = [state.start];
  state.doneAgo = -1;
  const room = Math.min(arena.width - 40, arena.height - HUD_SAFE_TOP - 170);
  state.cellPx = Math.min(120, room / Math.max(cols, rows));
  state.left = (arena.width - cols * state.cellPx) / 2;
  state.top = HUD_SAFE_TOP + 30 + Math.max(0, (arena.height - HUD_SAFE_TOP - 170 - rows * state.cellPx) / 2);
  state.redo = { x: arena.width / 2, y: Math.min(arena.height - 60, state.top + rows * state.cellPx + 70) };
}

export const cellCentre = (state: MowerState, cell: number): Point => ({
  x: state.left + ((cell % state.cols) + 0.5) * state.cellPx,
  y: state.top + (Math.floor(cell / state.cols) + 0.5) * state.cellPx,
});

/** Grass squares the mower could drive onto next. */
export function moves(state: MowerState): number[] {
  const at = state.cut[state.cut.length - 1] ?? 0;
  const c = at % state.cols;
  const r = Math.floor(at / state.cols);
  const out: number[] = [];
  if (c > 0) out.push(at - 1);
  if (c < state.cols - 1) out.push(at + 1);
  if (r > 0) out.push(at - state.cols);
  if (r < state.rows - 1) out.push(at + state.cols);
  return out.filter((cell) => !state.blocked.has(cell) && !state.cut.includes(cell));
}

export const stuck = (state: MowerState): boolean => state.doneAgo < 0 && moves(state).length === 0;

export function createLawnMower({ arena, rng }: GameSetup): MinigameLogic<MowerState> {
  const events = eventQueue();
  const state: MowerState = {
    cols: 4,
    rows: 4,
    cellPx: 100,
    left: 0,
    top: 0,
    blocked: new Set(),
    start: 0,
    solution: [],
    cut: [],
    movedAgo: 9,
    doneAgo: -1,
    redo: { x: 0, y: 0 },
    lawns: 0,
    score: 0,
    time: 0,
  };
  layLawn(state, rng, arena);

  const cellAt = (p: Point): number | null => {
    const c = Math.floor((p.x - state.left) / state.cellPx);
    const r = Math.floor((p.y - state.top) / state.cellPx);
    return c >= 0 && r >= 0 && c < state.cols && r < state.rows ? r * state.cols + c : null;
  };

  function drive(cell: number): boolean {
    if (!moves(state).includes(cell)) return false;
    state.cut.push(cell);
    state.movedAgo = 0;
    const p = cellCentre(state, cell);
    events.push({ type: 'action', x: p.x, y: p.y });
    if (state.cut.length === state.cols * state.rows - state.blocked.size) {
      state.doneAgo = 0;
      state.lawns += 1;
      state.score += 1;
      events.push({ type: 'score', x: arena.width / 2, y: state.top + (state.rows * state.cellPx) / 2 });
    }
    return true;
  }

  /** Drives toward a square, one square at a time, as far as it can. */
  function driveToward(cell: number): void {
    for (let guard = 0; guard < 12; guard += 1) {
      const at = state.cut[state.cut.length - 1] ?? 0;
      if (at === cell || state.doneAgo >= 0) return;
      const dc = (cell % state.cols) - (at % state.cols);
      const dr = Math.floor(cell / state.cols) - Math.floor(at / state.cols);
      const options: number[] = [];
      if (Math.abs(dc) >= Math.abs(dr)) {
        if (dc !== 0) options.push(at + Math.sign(dc));
        if (dr !== 0) options.push(at + Math.sign(dr) * state.cols);
      } else {
        if (dr !== 0) options.push(at + Math.sign(dr) * state.cols);
        if (dc !== 0) options.push(at + Math.sign(dc));
      }
      if (!options.some((o) => drive(o))) return;
    }
  }

  function redo(): void {
    state.cut = [state.start];
    events.push({ type: 'miss', x: state.redo.x, y: state.redo.y });
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
      state.movedAgo += dt;
      if (state.doneAgo >= 0) {
        state.doneAgo += dt;
        if (state.doneAgo >= 0.9) layLawn(state, rng, arena);
        return;
      }
      for (const tap of input.taps) {
        if (Math.hypot(tap.x - state.redo.x, tap.y - state.redo.y) <= REDO_RADIUS) redo();
        else {
          const cell = cellAt(tap);
          if (cell !== null) driveToward(cell);
        }
      }
      for (const swipe of input.swipes) {
        const at = state.cut[state.cut.length - 1] ?? 0;
        const step = swipe.direction === 'left' ? -1 : swipe.direction === 'right' ? 1 : swipe.direction === 'up' ? -state.cols : state.cols;
        const sameRow = swipe.direction === 'up' || swipe.direction === 'down' || Math.floor((at + step) / state.cols) === Math.floor(at / state.cols);
        if (sameRow) drive(at + step);
      }
      if (input.pointer) {
        const cell = cellAt(input.pointer);
        if (cell !== null) driveToward(cell);
      }
    },
  };
}

/** Good play: drive along the lawn's own path, one square per decision. */
export function lawnMowerBot(state: MowerState, _context: BotContext): BotMove {
  if (state.doneAgo >= 0) return {};
  const next = state.solution[state.cut.length];
  if (next === undefined) return {};
  // Off the path (it never is when the bot drives from the start): start the lawn again.
  if (state.cut.some((cell, i) => state.solution[i] !== cell)) return { tap: state.redo };
  return { touch: cellCentre(state, next) };
}
