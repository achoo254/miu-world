// Ice slide: a frozen pond with rocks on it, a penguin and its little house. A swipe sends the penguin
// sliding that way until a rock or the pond's edge stops it; sliding over the house's square takes it home.
// Every board is made from the seed and checked with a search, so it can be solved in three to six slides.
// Stuck? The reset button puts the penguin back where it began. Each penguin brought home is a point and a
// new board. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point, type SwipeDirection } from '../../types';

/** Cells per second while sliding. */
const SLIDE_SPEED = 12;
const HOME_SECONDS = 1.1;
const MIN_MOVES = 3;
const MAX_MOVES = 6;

export interface Cell {
  col: number;
  row: number;
}

export interface IceState {
  cols: number;
  rows: number;
  /** rock[row * cols + col]. */
  rocks: boolean[];
  start: Cell;
  hut: Cell;
  /** The penguin's position in cells (fractional while sliding). */
  px: number;
  py: number;
  /** Where the current slide ends, or null when standing still. */
  slide: { to: Cell; dir: SwipeDirection } | null;
  facing: SwipeDirection;
  /** Slides on this board, and the fewest it needs. */
  moves: number;
  best: number;
  /** Seconds since the penguin got home (the board changes after HOME_SECONDS), -1 while playing. */
  home: number;
  /** Seconds since the last bump into a rock (a little squash). */
  bumped: number;
  boards: number;
  lastMoveAt: number;
  score: number;
  time: number;
  // Layout, arena units.
  cell: number;
  left: number;
  top: number;
  reset: { x: number; y: number; r: number };
}

const STEP: Record<SwipeDirection, Cell> = { left: { col: -1, row: 0 }, right: { col: 1, row: 0 }, up: { col: 0, row: -1 }, down: { col: 0, row: 1 } };
const DIRECTIONS: readonly SwipeDirection[] = ['up', 'right', 'down', 'left'];

/** Where a slide from `from` going `dir` stops: before a rock or the edge, or on the hut when it passes it. */
export function slideEnd(state: Pick<IceState, 'cols' | 'rows' | 'rocks' | 'hut'>, from: Cell, dir: SwipeDirection): Cell {
  const d = STEP[dir];
  let { col, row } = from;
  for (;;) {
    const c = col + d.col;
    const r = row + d.row;
    if (c < 0 || r < 0 || c >= state.cols || r >= state.rows || state.rocks[r * state.cols + c]) return { col, row };
    col = c;
    row = r;
    if (col === state.hut.col && row === state.hut.row) return { col, row };
  }
}

/** The shortest list of slides from `from` to the hut (null when there is none). */
export function solve(state: Pick<IceState, 'cols' | 'rows' | 'rocks' | 'hut'>, from: Cell): SwipeDirection[] | null {
  const key = (c: Cell): number => c.row * state.cols + c.col;
  const seen = new Map<number, { prev: number; dir: SwipeDirection } | null>([[key(from), null]]);
  const queue: Cell[] = [from];
  const goal = key(state.hut);
  while (queue.length > 0) {
    const at = queue.shift();
    if (!at) break;
    if (key(at) === goal) {
      const path: SwipeDirection[] = [];
      let k = goal;
      for (let link = seen.get(k); link; link = seen.get(k)) {
        path.unshift(link.dir);
        k = link.prev;
      }
      return path;
    }
    for (const dir of DIRECTIONS) {
      const to = slideEnd(state, at, dir);
      if (!seen.has(key(to))) {
        seen.set(key(to), { prev: key(at), dir });
        queue.push(to);
      }
    }
  }
  return null;
}

function makeBoard(cols: number, rows: number, density: number, rng: Rng): { rocks: boolean[]; start: Cell; hut: Cell; best: number } {
  let fallback: { rocks: boolean[]; start: Cell; hut: Cell; best: number } | null = null;
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const rocks = Array.from({ length: cols * rows }, () => rng.chance(density));
    const free = (c: Cell): boolean => !rocks[c.row * cols + c.col];
    const start = { col: rng.int(0, cols - 1), row: rng.int(0, rows - 1) };
    const hut = { col: rng.int(0, cols - 1), row: rng.int(0, rows - 1) };
    if (!free(start) || !free(hut) || Math.abs(start.col - hut.col) + Math.abs(start.row - hut.row) < 3) continue;
    const path = solve({ cols, rows, rocks, hut }, start);
    if (!path) continue;
    const board = { rocks, start, hut, best: path.length };
    if (path.length >= MIN_MOVES && path.length <= MAX_MOVES) return board;
    if (path.length >= 2 && (!fallback || Math.abs(path.length - 4) < Math.abs(fallback.best - 4))) fallback = board;
  }
  if (fallback) return fallback;
  // An open pond with the hut in a corner: always two slides.
  return { rocks: Array.from({ length: cols * rows }, () => false), start: { col: 0, row: 0 }, hut: { col: cols - 1, row: rows - 1 }, best: 2 };
}

export function createIceSlide({ arena, params, rng }: GameSetup): MinigameLogic<IceState> {
  const density = typeof params.rocks === 'number' ? Math.min(0.28, Math.max(0.08, params.rocks)) : 0.18;
  const events = eventQueue();
  const cols = 7;
  const tall = arena.height / arena.width > 1.8;
  const rows = tall ? 9 : 7;
  const landscape = arena.width > arena.height;
  // The reset button sits beside the pond on a wide screen, under it on a tall one.
  const resetR = 52;
  const availW = arena.width - (landscape ? resetR * 2 + 80 : 80);
  const availH = arena.height - HUD_SAFE_TOP - 30 - (landscape ? 0 : resetR * 2 + 30);
  const cell = Math.floor(Math.min(availW / cols, availH / rows));
  const left = landscape ? (arena.width - resetR * 2 - 40 - cols * cell) / 2 : (arena.width - cols * cell) / 2;
  const top = HUD_SAFE_TOP + 14 + (availH - rows * cell) / 2;
  const reset = landscape ? { x: left + cols * cell + 40 + resetR, y: top + rows * cell - resetR, r: resetR } : { x: left + cols * cell - resetR, y: top + rows * cell + 26 + resetR, r: resetR };

  const state: IceState = {
    cols,
    rows,
    rocks: [],
    start: { col: 0, row: 0 },
    hut: { col: 0, row: 0 },
    px: 0,
    py: 0,
    slide: null,
    facing: 'right',
    moves: 0,
    best: 1,
    home: -1,
    bumped: 9,
    boards: 0,
    lastMoveAt: -1,
    score: 0,
    time: 0,
    cell,
    left,
    top,
    reset,
  };

  function newBoard(): void {
    const board = makeBoard(cols, rows, density, rng);
    state.rocks = board.rocks;
    state.start = board.start;
    state.hut = board.hut;
    state.best = board.best;
    state.px = board.start.col;
    state.py = board.start.row;
    state.slide = null;
    state.moves = 0;
    state.home = -1;
    state.boards += 1;
  }

  const centre = (col: number, row: number): Point => ({ x: left + (col + 0.5) * cell, y: top + (row + 0.5) * cell });

  function push(dir: SwipeDirection): void {
    const from = { col: Math.round(state.px), row: Math.round(state.py) };
    const to = slideEnd(state, from, dir);
    state.facing = dir;
    state.lastMoveAt = state.time;
    if (to.col === from.col && to.row === from.row) {
      state.bumped = 0;
      const p = centre(from.col, from.row);
      events.push({ type: 'miss', x: p.x, y: p.y });
      return;
    }
    state.slide = { to, dir };
    state.moves += 1;
    const p = centre(from.col, from.row);
    events.push({ type: 'action', x: p.x, y: p.y });
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
      state.bumped += dt;
      if (state.home >= 0) {
        state.home += dt;
        if (state.home >= HOME_SECONDS) newBoard();
        return;
      }
      const slide = state.slide;
      if (slide) {
        const d = STEP[slide.dir];
        const step = SLIDE_SPEED * dt;
        state.px += d.col * step;
        state.py += d.row * step;
        const past = (state.px - slide.to.col) * d.col + (state.py - slide.to.row) * d.row;
        if (past >= 0) {
          state.px = slide.to.col;
          state.py = slide.to.row;
          state.slide = null;
          state.bumped = 0;
          const p = centre(slide.to.col, slide.to.row);
          if (slide.to.col === state.hut.col && slide.to.row === state.hut.row) {
            state.home = 0;
            state.score += 1;
            events.push({ type: 'score', x: p.x, y: p.y });
          }
        }
        return;
      }
      for (const tap of input.taps) {
        if (Math.hypot(tap.x - reset.x, tap.y - reset.y) <= reset.r + 16 && state.moves > 0) {
          state.px = state.start.col;
          state.py = state.start.row;
          state.moves = 0;
          state.lastMoveAt = state.time;
          events.push({ type: 'action', x: reset.x, y: reset.y });
          return;
        }
      }
      const swipe = input.swipes[0];
      if (swipe) push(swipe.direction);
    },
  };
}

/** Seconds the bot looks before the next slide. */
const BOT_PAUSE = 0.45;
const SWIPE: Record<SwipeDirection, { dx: number; dy: number }> = { left: { dx: -160, dy: 0 }, right: { dx: 160, dy: 0 }, up: { dx: 0, dy: -160 }, down: { dx: 0, dy: 160 } };

/** Good play: the shortest way home from where the penguin stands (a reset if there is none). */
export function iceSlideBot(state: IceState, context: BotContext): BotMove {
  if (state.slide || state.home >= 0 || state.time - state.lastMoveAt < BOT_PAUSE) return {};
  const path = solve(state, { col: Math.round(state.px), row: Math.round(state.py) });
  const dir = path?.[0];
  if (!dir) return { tap: { x: state.reset.x, y: state.reset.y } };
  const from = { x: context.arena.width / 2, y: context.arena.height / 2 };
  return { swipe: { from, ...SWIPE[dir] } };
}
