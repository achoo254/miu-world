// Word search: a 6 × 6 board of big letters hides six words, each shown beside the board with its picture
// (MÈO with a cat, VỊT with a duck…). Words run left to right or top to bottom. The child drags along a word
// (or taps its first and then its last letter): a hidden word lights up for good (a point). Finding all six
// brings a new board. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const N = 6;
export const WORDS_PER_BOARD = 6;

/** Words with their picture (index into draw.ts PICTURES). */
export const WORDS: readonly (readonly [string, number])[] = [
  ['MÈO', 0],
  ['VỊT', 1],
  ['CUA', 2],
  ['SAO', 3],
  ['HOA', 4],
  ['GẤU', 5],
  ['THỎ', 6],
  ['CÁO', 7],
  ['TÁO', 8],
  ['NHO', 9],
  ['DƯA', 10],
  ['KẸO', 11],
  ['BÓNG', 12],
  ['DIỀU', 13],
  ['TRỐNG', 14],
  ['RÙA', 15],
  ['KHỈ', 16],
  ['NẤM', 17],
  ['CHÓ', 18],
  ['ONG', 19],
  ['ẾCH', 20],
  ['BƯỚM', 21],
];
const FILLER = Array.from('ABCDEGHIKLMNOPQRSTUVXYĂÂĐÊÔƠƯ');
const NEXT_BOARD_SECONDS = 1.2;
const NOTES = [72, 74, 76, 79, 81, 84];

export const lettersOf = (word: string): string[] => Array.from(word.normalize('NFC'));

export interface Placed {
  word: number;
  /** First cell and direction (1 = across, N = down). */
  start: number;
  step: number;
  found: boolean;
  foundAt: number;
}

export interface WordSearchState {
  grid: string[];
  placed: Placed[];
  /** Cells of the drag (or of a first tapped letter) being shown. */
  selection: number[];
  anchor: number;
  dragFrom: number;
  cell: number;
  left: number;
  top: number;
  hints: Point[];
  hintSize: number;
  phase: 'search' | 'next';
  phaseAgo: number;
  lastFoundAt: number;
  boards: number;
  score: number;
  time: number;
}

/** Cells of a placed word. */
export const cellsOf = (p: Placed): number[] => lettersOf(WORDS[p.word]?.[0] ?? '').map((_, i) => p.start + i * p.step);

/** Cells from `a` to `b` along their row or column (the longer way), in reading order. */
export function lineCells(a: number, b: number): number[] {
  const ar = Math.floor(a / N);
  const ac = a % N;
  const br = Math.floor(b / N);
  const bc = b % N;
  const across = Math.abs(bc - ac) >= Math.abs(br - ar);
  const out: number[] = [];
  if (across) for (let c = Math.min(ac, bc); c <= Math.max(ac, bc); c += 1) out.push(ar * N + c);
  else for (let r = Math.min(ar, br); r <= Math.max(ar, br); r += 1) out.push(r * N + ac);
  return out;
}

export function makeBoard(rng: Rng): { grid: string[]; placed: Placed[] } {
  for (;;) {
    const grid: string[] = new Array<string>(N * N).fill('');
    const placed: Placed[] = [];
    const pool = WORDS.map((_, i) => i);
    for (let tries = 0; placed.length < WORDS_PER_BOARD && tries < 400 && pool.length > 0; tries += 1) {
      const pick = rng.int(0, pool.length - 1);
      const word = pool[pick] ?? 0;
      const letters = lettersOf(WORDS[word]?.[0] ?? '');
      const down = rng.chance(0.5);
      const step = down ? N : 1;
      const r = rng.int(0, down ? N - letters.length : N - 1);
      const c = rng.int(0, down ? N - 1 : N - letters.length);
      const start = r * N + c;
      const fits = letters.every((l, i) => {
        const g = grid[start + i * step];
        return g === '' || g === l;
      });
      if (!fits) continue;
      letters.forEach((l, i) => {
        grid[start + i * step] = l;
      });
      placed.push({ word, start, step, found: false, foundAt: -9 });
      pool.splice(pick, 1);
    }
    if (placed.length < WORDS_PER_BOARD) continue;
    for (let i = 0; i < grid.length; i += 1) if (grid[i] === '') grid[i] = FILLER[rng.int(0, FILLER.length - 1)] ?? 'A';
    return { grid, placed };
  }
}

export function createWordSearch({ arena, rng }: GameSetup): MinigameLogic<WordSearchState> {
  const events = eventQueue();
  const wide = arena.width >= arena.height;
  const free = arena.height - HUD_SAFE_TOP;
  const size = wide ? Math.min(free - 30, arena.width * 0.6) : Math.min(arena.width - 30, free - 260);
  const cell = size / N;
  const left = wide ? 20 : (arena.width - size) / 2;
  const top = wide ? HUD_SAFE_TOP + (free - size) / 2 : arena.height - size - 20;
  const hintSize = wide ? Math.min(110, (arena.width - left - size - 40) / 2, (free - 20) / 3) : Math.min(110, (arena.width - 20) / 3, (top - HUD_SAFE_TOP - 20) / 2);
  const hints: Point[] = Array.from({ length: WORDS_PER_BOARD }, (_, i) =>
    wide
      ? { x: left + size + 20 + hintSize * ((i % 2) + 0.5) + 10 * (i % 2), y: HUD_SAFE_TOP + 10 + (free - 20) * ((Math.floor(i / 2) + 0.5) / 3) }
      : { x: arena.width / 2 + ((i % 3) - 1) * (hintSize + 10), y: HUD_SAFE_TOP + 10 + hintSize * (Math.floor(i / 3) + 0.5) },
  );
  const board = makeBoard(rng);
  const state: WordSearchState = {
    grid: board.grid,
    placed: board.placed,
    selection: [],
    anchor: -1,
    dragFrom: -1,
    cell,
    left,
    top,
    hints,
    hintSize,
    phase: 'search',
    phaseAgo: 0,
    lastFoundAt: -9,
    boards: 0,
    score: 0,
    time: 0,
  };

  const cellAt = (p: Point): number => {
    const c = Math.floor((p.x - left) / cell);
    const r = Math.floor((p.y - top) / cell);
    return c >= 0 && c < N && r >= 0 && r < N ? r * N + c : -1;
  };

  const tryWord = (cells: number[]): void => {
    const text = cells.map((i) => state.grid[i] ?? '').join('');
    const hit = state.placed.find((p) => !p.found && (WORDS[p.word]?.[0] ?? '').normalize('NFC') === text);
    state.selection = [];
    state.anchor = -1;
    if (!hit) {
      if (cells.length > 1) events.push({ type: 'miss', x: left + size / 2, y: top + size / 2 });
      return;
    }
    // The word's own cells (it may also appear elsewhere by chance: either place counts).
    hit.found = true;
    hit.foundAt = state.time;
    hit.start = cells[0] ?? hit.start;
    hit.step = cells.length > 1 && (cells[1] ?? 0) - (cells[0] ?? 0) === N ? N : 1;
    state.score += 1;
    state.lastFoundAt = state.time;
    events.push({ type: 'score', x: left + size / 2, y: top + size / 2, note: NOTES[(state.score - 1) % NOTES.length] ?? 72, voice: 'bell' });
    if (state.placed.every((p) => p.found)) {
      state.phase = 'next';
      state.phaseAgo = 0;
    }
  };

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
      if (state.phase === 'next') {
        if (state.phaseAgo >= NEXT_BOARD_SECONDS) {
          const next = makeBoard(rng);
          state.grid = next.grid;
          state.placed = next.placed;
          state.phase = 'search';
          state.boards += 1;
        }
        return;
      }
      const swipe = input.swipes[0];
      if (swipe) {
        const a = cellAt(swipe.from);
        const b = cellAt({ x: swipe.from.x + swipe.dx, y: swipe.from.y + swipe.dy });
        state.dragFrom = -1;
        if (a >= 0 && b >= 0) tryWord(lineCells(a, b));
        return;
      }
      const p = input.pointer;
      if (input.pressed && p) state.dragFrom = cellAt(p);
      if (p && state.dragFrom >= 0) {
        const here = cellAt(p);
        if (here >= 0 && here !== state.dragFrom) state.selection = lineCells(state.dragFrom, here);
      }
      if (input.released && state.dragFrom >= 0 && state.selection.length > 1) {
        state.dragFrom = -1;
        tryWord(state.selection);
        return;
      }
      if (input.released) state.dragFrom = -1;
      // Tap the first letter, then the last.
      const tap = input.taps[0];
      if (tap) {
        const here = cellAt(tap);
        if (here < 0) return;
        if (state.anchor >= 0 && here !== state.anchor && (Math.floor(here / N) === Math.floor(state.anchor / N) || here % N === state.anchor % N)) {
          tryWord(lineCells(state.anchor, here));
        } else {
          state.anchor = here;
          state.selection = [here];
        }
      }
    },
  };
}

/** Good play: finds a word (it knows where), drags along it, then takes a breath. */
export function wordSearchBot(state: WordSearchState, _context: BotContext): BotMove {
  if (state.phase !== 'search' || state.time - state.lastFoundAt < 0.8) return {};
  const target = state.placed.find((p) => !p.found);
  if (!target) return {};
  const cells = cellsOf(target);
  const centre = (i: number): Point => ({ x: state.left + ((i % N) + 0.5) * state.cell, y: state.top + (Math.floor(i / N) + 0.5) * state.cell });
  const a = centre(cells[0] ?? 0);
  const b = centre(cells[cells.length - 1] ?? 0);
  return { swipe: { from: a, dx: b.x - a.x, dy: b.y - a.y } };
}
