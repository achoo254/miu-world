// Tile flood: a board of coloured tiles; the patch in the top-left corner is the child's. Tapping a colour (on
// the palette, or any tile of that colour) paints the whole patch that colour, and it swallows every touching
// tile of the same colour. Fill the board with one colour within the steps allowed for a point; out of steps,
// a new board. The step limit is what a careful greedy player needs plus a little slack, so every board can be
// won. Boards grow from 6×6. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const COLOURS = 4;
/** Steps given beyond what the greedy player needs. */
const SLACK = 2;
const PAUSE_SECONDS = 1.2;

export interface PaletteButton extends Point {
  colour: number;
  r: number;
}

export interface TileFloodState {
  n: number;
  /** Colour of every tile, row by row. */
  cells: number[];
  /** Tiles of the child's patch (1) and when each joined (seconds), for the ripple. */
  joinedAt: number[];
  stepsLeft: number;
  stepsGiven: number;
  board: { x: number; y: number; cell: number };
  palette: PaletteButton[];
  phase: 'play' | 'won' | 'lost';
  phaseTime: number;
  boards: number;
  lastTapAt: number;
  score: number;
  time: number;
}

/** The tiles connected to the top-left one through tiles of its colour. */
export function patchOf(cells: readonly number[], n: number): Set<number> {
  const colour = cells[0];
  const seen = new Set<number>([0]);
  const queue = [0];
  while (queue.length > 0) {
    const i = queue.pop() ?? 0;
    const x = i % n;
    const y = Math.floor(i / n);
    for (const [nx, ny] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ] as const) {
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      const j = ny * n + nx;
      if (!seen.has(j) && cells[j] === colour) {
        seen.add(j);
        queue.push(j);
      }
    }
  }
  return seen;
}

/** Paints the patch `colour` (returns a new board). */
export function flood(cells: readonly number[], n: number, colour: number): number[] {
  const patch = patchOf(cells, n);
  return cells.map((c, i) => (patch.has(i) ? colour : c));
}

const uniform = (cells: readonly number[]): boolean => cells.every((c) => c === cells[0]);

/** The colour a careful player picks: the biggest patch after this step, then after the best next one. */
export function bestColour(cells: readonly number[], n: number): number {
  let best = -1;
  let bestScore = -1;
  for (let c = 0; c < COLOURS; c += 1) {
    if (c === cells[0]) continue;
    const after = flood(cells, n, c);
    if (uniform(after)) return c;
    let next = 0;
    for (let d = 0; d < COLOURS; d += 1) if (d !== c) next = Math.max(next, patchOf(flood(after, n, d), n).size);
    const score = patchOf(after, n).size * 1000 + next;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return Math.max(0, best);
}

export function greedySteps(cells: readonly number[], n: number): number {
  let board = [...cells];
  let steps = 0;
  while (!uniform(board) && steps < 100) {
    board = flood(board, n, bestColour(board, n));
    steps += 1;
  }
  return steps;
}

function makeBoard(n: number, rng: Rng): number[] {
  return Array.from({ length: n * n }, () => rng.int(0, COLOURS - 1));
}

export function createTileFlood({ arena, rng }: GameSetup): MinigameLogic<TileFloodState> {
  const events = eventQueue();
  const top = HUD_SAFE_TOP + 16;
  const landscape = arena.width > arena.height;
  const paletteR = Math.max(TOUCH_RADIUS * 1.3, 56);
  const state: TileFloodState = {
    n: 6,
    cells: [],
    joinedAt: [],
    stepsLeft: 0,
    stepsGiven: 0,
    board: { x: 0, y: 0, cell: 0 },
    palette: [],
    phase: 'play',
    phaseTime: 0,
    boards: 0,
    lastTapAt: -1,
    score: 0,
    time: 0,
  };

  function layout(): void {
    const n = state.n;
    if (landscape) {
      const side = Math.min(arena.height - top - 24, arena.width - paletteR * 2 - 90);
      const cell = side / n;
      const x = (arena.width - side - paletteR * 2 - 40) / 2;
      state.board = { x, y: top + (arena.height - top - 24 - side) / 2, cell };
      // Four buttons down the side, as big as the board's height allows.
      const r = Math.max(TOUCH_RADIUS * 1.1, Math.min(paletteR, (side - 3 * 16) / (2 * COLOURS)));
      const px = x + side + 40 + paletteR;
      const gap = (side - COLOURS * r * 2) / (COLOURS - 1);
      state.palette = Array.from({ length: COLOURS }, (_, c) => ({ colour: c, r, x: px, y: state.board.y + r + c * (r * 2 + gap) }));
    } else {
      const side = Math.min(arena.width - 40, arena.height - top - paletteR * 2 - 90);
      const cell = side / n;
      const x = (arena.width - side) / 2;
      const y = top + Math.max(0, (arena.height - top - side - paletteR * 2 - 60) / 3);
      state.board = { x, y, cell };
      const gap = (arena.width - 40 - COLOURS * paletteR * 2) / (COLOURS - 1);
      const py = Math.min(arena.height - paletteR - 24, y + side + 40 + paletteR);
      state.palette = Array.from({ length: COLOURS }, (_, c) => ({ colour: c, r: paletteR, x: 20 + paletteR + c * (paletteR * 2 + gap), y: py }));
    }
  }

  function deal(): void {
    state.n = Math.min(8, 6 + Math.floor(state.boards / 2));
    let cells = makeBoard(state.n, rng);
    // Never a board that is already nearly done.
    while (greedySteps(cells, state.n) < 5) cells = makeBoard(state.n, rng);
    state.cells = cells;
    state.stepsGiven = greedySteps(cells, state.n) + SLACK;
    state.stepsLeft = state.stepsGiven;
    const patch = patchOf(cells, state.n);
    state.joinedAt = cells.map((_, i) => (patch.has(i) ? 0 : -1));
    state.phase = 'play';
    state.phaseTime = 0;
    layout();
  }

  function choose(colour: number): void {
    if (colour === state.cells[0]) return;
    const before = patchOf(state.cells, state.n);
    state.cells = flood(state.cells, state.n, colour);
    const after = patchOf(state.cells, state.n);
    for (const i of after) if (!before.has(i)) state.joinedAt[i] = state.time;
    state.stepsLeft -= 1;
    state.lastTapAt = state.time;
    const { x, y, cell } = state.board;
    events.push({ type: 'action', x: x + cell / 2, y: y + cell / 2 });
    if (uniform(state.cells)) {
      state.phase = 'won';
      state.phaseTime = 0;
      state.score += 1;
      events.push({ type: 'score', x: x + (cell * state.n) / 2, y: y + (cell * state.n) / 2 });
    } else if (state.stepsLeft <= 0) {
      state.phase = 'lost';
      state.phaseTime = 0;
      events.push({ type: 'miss', x: x + (cell * state.n) / 2, y: y + (cell * state.n) / 2 });
    }
  }

  function colourAt(p: Point): number | null {
    const button = state.palette.find((b) => Math.hypot(p.x - b.x, p.y - b.y) <= b.r * 1.2);
    if (button) return button.colour;
    const { x, y, cell } = state.board;
    const cx = Math.floor((p.x - x) / cell);
    const cy = Math.floor((p.y - y) / cell);
    if (cx < 0 || cy < 0 || cx >= state.n || cy >= state.n) return null;
    return state.cells[cy * state.n + cx] ?? null;
  }

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
      state.phaseTime += dt;
      if (state.phase !== 'play') {
        if (state.phaseTime >= PAUSE_SECONDS) {
          if (state.phase === 'won') state.boards += 1;
          deal();
        }
        return;
      }
      for (const p of input.taps) {
        const colour = colourAt(p);
        if (colour !== null) choose(colour);
        if (state.phase !== 'play') break;
      }
    },
  };
}

/** Good play: the greedy colour, a breath between steps. */
export function tileFloodBot(state: TileFloodState, _context: BotContext): BotMove {
  if (state.phase !== 'play' || state.time - state.lastTapAt < 0.4) return {};
  const button = state.palette[bestColour(state.cells, state.n)];
  return button ? { tap: { x: button.x, y: button.y } } : {};
}
