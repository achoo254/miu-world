// Flow connect: pairs of coloured dots on a 5 × 5 board. The child drags from a dot to draw a pipe through
// the squares to the other dot of the same colour. Pipes may not cross; drawing over another pipe cuts it
// back. A board is done when every pair is joined and every square is filled (a point), and a new board
// comes. Boards are made by laying one random path through every square and cutting it into pieces, so
// every board can be solved. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type Cell = number;

export interface FlowState {
  size: number;
  cellPx: number;
  left: number;
  top: number;
  /** Each colour's two dots and the solution the board was made from. */
  dots: [Cell, Cell][];
  solution: Cell[][];
  /** Each colour's pipe as drawn, starting at one of its dots. */
  paths: Cell[][];
  /** The colour being drawn, and whether a finger is down. */
  active: number | null;
  fingerDown: boolean;
  /** All pairs joined but squares left empty: show where. */
  gaps: boolean;
  /** Seconds since the board was finished (-1 while playing). */
  solvedAgo: number;
  boards: number;
  score: number;
  time: number;
}

/**
 * A random path through every square of a `cols` × `rows` grid (cells numbered row by row), made by backbite
 * moves from a snake. Also lays the lawn-mower boards.
 */
export function randomFullPath(cols: number, rng: Rng, rows = cols): Cell[] {
  const path: Cell[] = [];
  for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) path.push(r * cols + (r % 2 === 0 ? c : cols - 1 - c));
  const near = (a: Cell, b: Cell): boolean => Math.abs((a % cols) - (b % cols)) + Math.abs(Math.floor(a / cols) - Math.floor(b / cols)) === 1;
  for (let move = 0; move < cols * rows * 30; move += 1) {
    // Reverse to work on either end.
    if (rng.chance(0.5)) path.reverse();
    const end = path[path.length - 1];
    if (end === undefined) break;
    const options = path.slice(0, -2).map((cell, i) => ({ cell, i })).filter(({ cell }) => near(cell, end));
    const pick = options[rng.int(0, options.length - 1)];
    if (!pick) continue;
    // Join the end to that square and flip the tail after it.
    const tail = path.splice(pick.i + 1).reverse();
    path.push(...tail);
  }
  return path;
}

function makeBoard(state: FlowState, rng: Rng): void {
  const n = state.size * state.size;
  const colours = rng.int(4, 5);
  const path = randomFullPath(state.size, rng);
  // Cut the path into pieces of at least three squares.
  const lengths = Array.from({ length: colours }, () => 3);
  for (let left = n - 3 * colours; left > 0; left -= 1) {
    const i = rng.int(0, colours - 1);
    lengths[i] = (lengths[i] ?? 3) + 1;
  }
  state.solution = [];
  let at = 0;
  for (const length of lengths) {
    state.solution.push(path.slice(at, at + length));
    at += length;
  }
  state.dots = state.solution.map((piece) => [piece[0] ?? 0, piece[piece.length - 1] ?? 0]);
  state.paths = state.solution.map(() => []);
  state.active = null;
  state.gaps = false;
  state.solvedAgo = -1;
}

export const cellCentre = (state: FlowState, cell: Cell): Point => ({
  x: state.left + ((cell % state.size) + 0.5) * state.cellPx,
  y: state.top + (Math.floor(cell / state.size) + 0.5) * state.cellPx,
});

export const complete = (state: FlowState, colour: number): boolean => {
  const path = state.paths[colour];
  const dots = state.dots[colour];
  if (!path || !dots || path.length < 2) return false;
  const ends = [path[0], path[path.length - 1]];
  return ends.includes(dots[0]) && ends.includes(dots[1]);
};

export function createFlowConnect({ arena, rng }: GameSetup): MinigameLogic<FlowState> {
  const events = eventQueue();
  const size = 5;
  const boardPx = Math.min(arena.width - 40, arena.height - HUD_SAFE_TOP - 60, 620);
  const state: FlowState = {
    size,
    cellPx: boardPx / size,
    left: (arena.width - boardPx) / 2,
    top: HUD_SAFE_TOP + 20 + (arena.height - HUD_SAFE_TOP - 40 - boardPx) / 2,
    dots: [],
    solution: [],
    paths: [],
    active: null,
    fingerDown: false,
    gaps: false,
    solvedAgo: -1,
    boards: 0,
    score: 0,
    time: 0,
  };
  makeBoard(state, rng);

  const cellAt = (p: Point): Cell | null => {
    const c = Math.floor((p.x - state.left) / state.cellPx);
    const r = Math.floor((p.y - state.top) / state.cellPx);
    return c >= 0 && r >= 0 && c < size && r < size ? r * size + c : null;
  };
  const dotColour = (cell: Cell): number => state.dots.findIndex(([a, b]) => a === cell || b === cell);
  const pathColour = (cell: Cell): number => state.paths.findIndex((p) => p.includes(cell));

  function press(cell: Cell): void {
    const dot = dotColour(cell);
    if (dot >= 0) {
      state.paths[dot] = [cell];
      state.active = dot;
      return;
    }
    const on = pathColour(cell);
    if (on >= 0) {
      const path = state.paths[on] ?? [];
      state.paths[on] = path.slice(0, path.indexOf(cell) + 1);
      state.active = on;
    }
  }

  /** One square further along the pipe being drawn (or back). Returns false when it cannot go there. */
  function extend(next: Cell): boolean {
    const colour = state.active;
    if (colour === null) return false;
    const path = state.paths[colour] ?? [];
    const last = path[path.length - 1];
    if (last === undefined) return false;
    if (path[path.length - 2] === next) {
      path.pop();
      return true;
    }
    if (path.includes(next)) {
      state.paths[colour] = path.slice(0, path.indexOf(next) + 1);
      return true;
    }
    if (complete(state, colour)) return false;
    const dot = dotColour(next);
    if (dot >= 0 && dot !== colour) return false;
    // Over another pipe: that pipe is cut back to before this square.
    const other = pathColour(next);
    if (other >= 0 && other !== colour) {
      const cut = state.paths[other] ?? [];
      state.paths[other] = cut.slice(0, cut.indexOf(next));
    }
    path.push(next);
    events.push({ type: 'action', x: cellCentre(state, next).x, y: cellCentre(state, next).y });
    if (complete(state, colour)) events.push({ type: 'action', x: cellCentre(state, next).x, y: cellCentre(state, next).y, note: 64 + colour * 3, voice: 'bell' });
    return true;
  }

  function dragTo(cell: Cell): void {
    for (let guard = 0; guard < size * 2; guard += 1) {
      const colour = state.active;
      if (colour === null) return;
      const path = state.paths[colour] ?? [];
      const last = path[path.length - 1];
      if (last === undefined || last === cell) return;
      const dr = Math.floor(cell / size) - Math.floor(last / size);
      const dc = (cell % size) - (last % size);
      const steps: Cell[] = [];
      if (Math.abs(dc) >= Math.abs(dr)) {
        if (dc !== 0) steps.push(last + Math.sign(dc));
        if (dr !== 0) steps.push(last + Math.sign(dr) * size);
      } else {
        if (dr !== 0) steps.push(last + Math.sign(dr) * size);
        if (dc !== 0) steps.push(last + Math.sign(dc));
      }
      if (!steps.some((s) => extend(s))) return;
    }
  }

  function check(): void {
    const all = state.dots.every((_, c) => complete(state, c));
    if (!all) {
      state.gaps = false;
      return;
    }
    const filled = new Set(state.paths.flat()).size === size * size;
    state.gaps = !filled;
    if (filled) {
      state.solvedAgo = 0;
      state.boards += 1;
      state.score += 1;
      state.active = null;
      events.push({ type: 'score', x: arena.width / 2, y: state.top + (state.cellPx * size) / 2 });
    }
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
      state.fingerDown = input.pointer !== null;
      if (state.solvedAgo >= 0) {
        state.solvedAgo += dt;
        if (state.solvedAgo >= 0.9 && !input.pointer) makeBoard(state, rng);
        return;
      }
      const cell = input.pointer ? cellAt(input.pointer) : null;
      if (input.pressed && cell !== null) press(cell);
      else if (input.pointer && state.active !== null && cell !== null) dragTo(cell);
      if (!input.pointer) state.active = null;
      check();
    },
  };
}

/** Good play: draw each pipe of the board's own solution, one square per decision, lifting between pipes. */
export function flowConnectBot(state: FlowState, _context: BotContext): BotMove {
  if (state.solvedAgo >= 0) return {};
  const colour = state.solution.findIndex((piece, c) => !complete(state, c) || (state.paths[c]?.length ?? 0) !== piece.length);
  const piece = state.solution[colour];
  if (!piece) return {};
  if (state.active === colour) {
    const path = state.paths[colour] ?? [];
    const next = piece[path.length] ?? piece[piece.length - 1] ?? 0;
    return { touch: cellCentre(state, next) };
  }
  if (state.fingerDown) return {};
  return { touch: cellCentre(state, piece[0] ?? 0) };
}
