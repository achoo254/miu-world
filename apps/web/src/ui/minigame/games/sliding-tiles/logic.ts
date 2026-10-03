// Sliding tiles (the 15 puzzle, 3 × 3): a picture cut into eight tiles and a gap, shuffled. Tapping a tile
// in the gap's row or column slides it (and any between) into the gap. Back in order, the picture is
// complete (a point) and the next, more shuffled, picture comes. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const SIZE = 3;
const GAP = SIZE * SIZE - 1;
export const SCENE_COUNT = 4;

export interface SlidingTilesState {
  /** Tile number at each square (row-major); the gap is tile 8. Solved when tiles[i] === i. */
  tiles: number[];
  /** The board's top-left corner and side; the small finished picture beside it. */
  boardX: number;
  boardY: number;
  board: number;
  previewX: number;
  previewY: number;
  preview: number;
  scene: number;
  /** Seconds since the last slide (tiles glide), and which squares it moved from → to. */
  slideAgo: number;
  slid: { from: number; to: number }[];
  /** Seconds since the picture was finished (-1 while playing); the next comes after SOLVED_SECONDS. */
  solvedAgo: number;
  moves: number;
  score: number;
  time: number;
}

export const SOLVED_SECONDS = 1.6;
const FIRST_SHUFFLE = 14;
const MORE_SHUFFLE = 6;
const MAX_SHUFFLE = 30;

export const isSolved = (tiles: readonly number[]): boolean => tiles.every((t, i) => t === i);

/** Squares next to square i. */
function neighbours(i: number): number[] {
  const r = Math.floor(i / SIZE);
  const c = i % SIZE;
  const out: number[] = [];
  if (r > 0) out.push(i - SIZE);
  if (r < SIZE - 1) out.push(i + SIZE);
  if (c > 0) out.push(i - 1);
  if (c < SIZE - 1) out.push(i + 1);
  return out;
}

export function createSlidingTiles({ arena, rng }: GameSetup): MinigameLogic<SlidingTilesState> {
  const events = eventQueue();
  const landscape = arena.width >= arena.height;
  const top = HUD_SAFE_TOP + 20;
  let board: number;
  let preview: number;
  let boardX: number;
  let boardY: number;
  let previewX: number;
  let previewY: number;
  if (landscape) {
    board = Math.min(440, arena.height - top - 56);
    preview = Math.min(200, arena.width - board - 100);
    const total = preview + 40 + board;
    previewX = (arena.width - total) / 2;
    boardX = previewX + preview + 40;
    boardY = top + (arena.height - top - 10 - board) / 2;
    previewY = boardY;
  } else {
    board = Math.min(arena.width - 60, 560);
    preview = Math.min(200, arena.height - top - board - 70);
    const total = preview + 30 + board;
    previewY = top + Math.max(0, (arena.height - top - 20 - total) / 2);
    boardY = previewY + preview + 30;
    previewX = (arena.width - preview) / 2;
    boardX = (arena.width - board) / 2;
  }
  const state: SlidingTilesState = { tiles: [], boardX, boardY, board, previewX, previewY, preview, scene: rng.int(0, SCENE_COUNT - 1), slideAgo: 9, slid: [], solvedAgo: -1, moves: 0, score: 0, time: 0 };

  function shuffle(steps: number): void {
    const tiles = Array.from({ length: SIZE * SIZE }, (_, i) => i);
    let gap = GAP;
    let previous = -1;
    for (let n = 0; n < steps || isSolved(tiles); n += 1) {
      const options = neighbours(gap).filter((i) => i !== previous);
      const next = options[rng.int(0, options.length - 1)] ?? gap;
      tiles[gap] = tiles[next] ?? GAP;
      tiles[next] = GAP;
      previous = gap;
      gap = next;
    }
    state.tiles = tiles;
    state.moves = 0;
  }
  shuffle(FIRST_SHUFFLE);

  const squareAt = (p: Point): number => {
    const tile = state.board / SIZE;
    const c = Math.floor((p.x - state.boardX) / tile);
    const r = Math.floor((p.y - state.boardY) / tile);
    return c < 0 || r < 0 || c >= SIZE || r >= SIZE ? -1 : r * SIZE + c;
  };

  /** Slides the tiles between the gap and square i (same row or column) toward the gap. */
  function slide(i: number): void {
    const gap = state.tiles.indexOf(GAP);
    if (i < 0 || i === gap) return;
    const sameRow = Math.floor(i / SIZE) === Math.floor(gap / SIZE);
    const sameCol = i % SIZE === gap % SIZE;
    if (!sameRow && !sameCol) {
      events.push({ type: 'miss', x: state.boardX + ((i % SIZE) + 0.5) * (state.board / SIZE), y: state.boardY + (Math.floor(i / SIZE) + 0.5) * (state.board / SIZE) });
      return;
    }
    const step = sameRow ? (i > gap ? 1 : -1) : i > gap ? SIZE : -SIZE;
    state.slid = [];
    for (let at = gap; at !== i; at += step) {
      state.tiles[at] = state.tiles[at + step] ?? GAP;
      state.slid.push({ from: at + step, to: at });
    }
    state.tiles[i] = GAP;
    state.slideAgo = 0;
    state.moves += 1;
    const tile = state.board / SIZE;
    events.push({ type: 'action', x: state.boardX + ((gap % SIZE) + 0.5) * tile, y: state.boardY + (Math.floor(gap / SIZE) + 0.5) * tile });
    if (isSolved(state.tiles)) {
      state.solvedAgo = 0;
      state.score += 1;
      events.push({ type: 'score', x: state.boardX + state.board / 2, y: state.boardY + state.board / 2 });
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
      state.slideAgo += dt;
      if (state.solvedAgo >= 0) {
        state.solvedAgo += dt;
        if (state.solvedAgo >= SOLVED_SECONDS) {
          state.solvedAgo = -1;
          state.scene = (state.scene + 1) % SCENE_COUNT;
          shuffle(Math.min(MAX_SHUFFLE, FIRST_SHUFFLE + MORE_SHUFFLE * state.score));
        }
        return;
      }
      for (const tap of input.taps) slide(squareAt(tap));
    },
  };
}

const manhattan = (tiles: readonly number[]): number =>
  tiles.reduce((sum, t, i) => (t === GAP ? sum : sum + Math.abs((t % SIZE) - (i % SIZE)) + Math.abs(Math.floor(t / SIZE) - Math.floor(i / SIZE))), 0);

/** The squares to tap, in order, to solve the board (IDA* with Manhattan distance). */
export function solve(start: readonly number[]): number[] {
  const tiles = [...start];
  const path: number[] = [];
  let found = false;
  const search = (gap: number, g: number, bound: number, previous: number): number => {
    const f = g + manhattan(tiles);
    if (f > bound) return f;
    if (isSolved(tiles)) {
      found = true;
      return f;
    }
    let min = Infinity;
    for (const next of neighbours(gap)) {
      if (next === previous) continue;
      tiles[gap] = tiles[next] ?? GAP;
      tiles[next] = GAP;
      path.push(next);
      const t = search(next, g + 1, bound, gap);
      if (found) return t;
      path.pop();
      tiles[next] = tiles[gap] ?? GAP;
      tiles[gap] = GAP;
      min = Math.min(min, t);
    }
    return min;
  };
  let bound = manhattan(tiles);
  for (let i = 0; i < 40 && !found; i += 1) bound = search(tiles.indexOf(GAP), 0, bound, -1);
  return found ? path : [];
}

/** Good play: the next tile of the shortest solution, a few slides a second. */
export function slidingTilesBot(state: SlidingTilesState, _context: BotContext): BotMove {
  if (state.solvedAgo >= 0 || state.slideAgo < 0.25) return {};
  const next = solve(state.tiles)[0];
  if (next === undefined) return {};
  const tile = state.board / SIZE;
  return { tap: { x: state.boardX + ((next % SIZE) + 0.5) * tile, y: state.boardY + (Math.floor(next / SIZE) + 0.5) * tile } };
}
