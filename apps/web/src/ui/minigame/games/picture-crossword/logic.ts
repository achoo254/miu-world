// Picture crossword: a small crossword of three or four words, each clued by a picture beside its first cell
// (left of a word going across, above a word going down). The first letter of every word is written in; the
// other letters wait in a tray with two extra ones. The child drags a letter into a cell (or taps the letter,
// then the cell). The right letter stays; a wrong one bounces back and the tray rests a moment. A finished
// crossword is a point and the next comes. Where two words cross they share one letter. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';
import { createPickDrop, stepPickDrop, type PickDrop } from '../hundred-chart/pick-and-drop';
import { lettersOf, PUZZLES, type Word } from './puzzles';

export interface GridCell {
  row: number;
  col: number;
  letter: string;
  /** Written in from the start (a first letter) or put in by the child. */
  filled: boolean;
  given: boolean;
}

export interface Badge {
  row: number;
  col: number;
  word: Word;
}

export interface Tile {
  letter: string;
  home: Point;
  used: boolean;
  bounced: number;
}

export interface CrosswordState {
  puzzle: number;
  cells: GridCell[];
  badges: Badge[];
  /** Grid origin (cell row 0, col 0's top-left) and cell size. */
  left: number;
  top: number;
  size: number;
  tiles: Tile[];
  tileRadius: number;
  pick: PickDrop;
  sulk: number;
  /** Seconds since the crossword was finished, -1 while filling. */
  finished: number;
  solved: number;
  score: number;
  time: number;
}

const DECOYS = ['A', 'O', 'N', 'T', 'M', 'H', 'Ê', 'Ư', 'I', 'Ơ', 'L', 'B'] as const;
export const SULK_SECONDS = 1;
const NEXT_SECONDS = 1.3;

function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    const a = items[i];
    const b = items[j];
    if (a !== undefined && b !== undefined) {
      items[i] = b;
      items[j] = a;
    }
  }
  return items;
}

/** Cells of a word: (row, col, letter). */
export function wordCells(w: Word): { row: number; col: number; letter: string }[] {
  return lettersOf(w.word).map((letter, i) => ({ row: w.row + (w.dir === 'down' ? i : 0), col: w.col + (w.dir === 'across' ? i : 0), letter }));
}

/** The letter cells of a puzzle (crossings merged) and where each word's picture goes, or null if they clash. */
export function buildPuzzle(words: readonly Word[]): { cells: GridCell[]; badges: Badge[] } | null {
  const cells = new Map<string, GridCell>();
  let clash = false;
  for (const w of words) {
    wordCells(w).forEach((c, i) => {
      const key = `${c.row},${c.col}`;
      const had = cells.get(key);
      if (had && had.letter !== c.letter) clash = true;
      cells.set(key, { ...c, filled: (had?.given ?? false) || i === 0, given: (had?.given ?? false) || i === 0 });
    });
  }
  if (clash) return null;
  const taken = new Set(cells.keys());
  const badges: Badge[] = [];
  for (const w of words) {
    const last = wordCells(w).at(-1) ?? { row: w.row, col: w.col };
    const options = w.dir === 'across' ? [{ row: w.row, col: w.col - 1 }, { row: w.row, col: last.col + 1 }] : [{ row: w.row - 1, col: w.col }, { row: last.row + 1, col: w.col }];
    const spot = options.find((o) => !taken.has(`${o.row},${o.col}`));
    if (!spot) return null;
    taken.add(`${spot.row},${spot.col}`);
    badges.push({ ...spot, word: w });
  }
  return { cells: [...cells.values()], badges };
}

export function cellCentre(state: CrosswordState, row: number, col: number): Point {
  return { x: state.left + (col + 0.5) * state.size, y: state.top + (row + 0.5) * state.size };
}

export function createPictureCrossword({ arena, rng }: GameSetup): MinigameLogic<CrosswordState> {
  const events = eventQueue();
  const landscape = arena.width > arena.height * 1.1;
  const tileRadius = Math.max(TOUCH_RADIUS + 4, 46);
  const trayW = landscape ? tileRadius * 4 + 50 : 0;
  const trayH = landscape ? 0 : tileRadius * 4 + 50;
  const area = { x: 16, y: HUD_SAFE_TOP + 16, w: arena.width - 32 - trayW, h: arena.height - HUD_SAFE_TOP - 32 - trayH };
  const state: CrosswordState = { puzzle: 0, cells: [], badges: [], left: 0, top: 0, size: 80, tiles: [], tileRadius, pick: createPickDrop(), sulk: 0, finished: -1, solved: 0, score: 0, time: 0 };
  let deck: number[] = [];

  function trayHomes(n: number): Point[] {
    const perLine = Math.ceil(n / 2);
    const step = tileRadius * 2 + 12;
    return Array.from({ length: n }, (_, i) => {
      const line = Math.floor(i / perLine);
      const k = i % perLine;
      const inLine = line === 1 ? n - perLine : perLine;
      if (landscape) {
        const x = arena.width - trayW / 2 - 16 + (line - 0.5) * step;
        const span = Math.min(arena.height - HUD_SAFE_TOP - 40, inLine * step);
        return { x, y: HUD_SAFE_TOP + 20 + (arena.height - HUD_SAFE_TOP - 40 - span) / 2 + (k + 0.5) * (span / inLine) };
      }
      const y = arena.height - trayH + 10 + tileRadius + line * step;
      const span = Math.min(arena.width - 20, inLine * step);
      return { x: (arena.width - span) / 2 + (k + 0.5) * (span / inLine), y };
    });
  }

  function nextPuzzle(): void {
    if (deck.length === 0) deck = shuffle(PUZZLES.map((_, i) => i).filter((i) => i !== state.puzzle || state.solved === 0), rng);
    state.puzzle = deck.pop() ?? 0;
    const built = buildPuzzle(PUZZLES[state.puzzle] ?? []) ?? { cells: [], badges: [] };
    const all = [...built.cells.map((c) => ({ row: c.row, col: c.col })), ...built.badges];
    const minR = Math.min(...all.map((c) => c.row));
    const maxR = Math.max(...all.map((c) => c.row));
    const minC = Math.min(...all.map((c) => c.col));
    const maxC = Math.max(...all.map((c) => c.col));
    const rows = maxR - minR + 1;
    const cols = maxC - minC + 1;
    const size = Math.min(110, area.w / cols, area.h / rows);
    state.size = size;
    state.left = area.x + (area.w - cols * size) / 2 - minC * size;
    state.top = area.y + (area.h - rows * size) / 2 - minR * size;
    state.cells = built.cells;
    state.badges = built.badges;
    const needed = built.cells.filter((c) => !c.given).map((c) => c.letter);
    const decoys = shuffle(
      DECOYS.filter((d) => !built.cells.some((c) => c.letter === d)),
      rng,
    ).slice(0, 2);
    const letters = shuffle([...needed, ...decoys], rng);
    const homes = trayHomes(letters.length);
    state.tiles = letters.map((letter, i) => ({ letter, home: homes[i] ?? { x: 0, y: 0 }, used: false, bounced: 99 }));
    state.pick = createPickDrop();
    state.finished = -1;
  }

  const tileAt = (p: Point): number => (state.sulk > 0 ? -1 : state.tiles.findIndex((t) => !t.used && Math.hypot(t.home.x - p.x, t.home.y - p.y) <= tileRadius * 1.15));

  const cellAt = (p: Point): GridCell | undefined => {
    const col = Math.floor((p.x - state.left) / state.size);
    const row = Math.floor((p.y - state.top) / state.size);
    return state.cells.find((c) => c.row === row && c.col === col && !c.filled);
  };

  function drop(index: number, at: Point): boolean {
    const tile = state.tiles[index];
    const cell = cellAt(at);
    if (!tile || !cell || state.sulk > 0) return false;
    const c = cellCentre(state, cell.row, cell.col);
    if (tile.letter === cell.letter) {
      cell.filled = true;
      tile.used = true;
      events.push({ type: 'action', x: c.x, y: c.y });
      if (state.cells.every((x) => x.filled)) {
        state.score += 1;
        state.solved += 1;
        state.finished = 0;
        events.push({ type: 'score', x: c.x, y: c.y - state.size / 2 });
      }
      return true;
    }
    tile.bounced = 0;
    state.sulk = SULK_SECONDS;
    events.push({ type: 'miss', x: c.x, y: c.y });
    return false;
  }

  nextPuzzle();

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
      state.sulk = Math.max(0, state.sulk - dt);
      for (const t of state.tiles) t.bounced += dt;
      if (state.finished >= 0) {
        state.finished += dt;
        if (state.finished >= NEXT_SECONDS) nextPuzzle();
        return;
      }
      stepPickDrop(state.pick, input, tileAt, drop);
    },
  };
}

/** Good play: reads the pictures, knows the words; taps a letter, then its cell. */
export function pictureCrosswordBot(state: CrosswordState, _context: BotContext): BotMove {
  if (state.finished >= 0 || state.sulk > 0 || Math.floor(state.time * 10) % 4 !== 0) return {};
  const chosen = state.tiles[state.pick.selected];
  if (chosen && !chosen.used) {
    const cell = state.cells.find((c) => !c.filled && c.letter === chosen.letter);
    if (cell) return { tap: cellCentre(state, cell.row, cell.col) };
  }
  const cell = state.cells.find((c) => !c.filled);
  const tile = state.tiles.find((t) => !t.used && t.letter === cell?.letter);
  return tile ? { tap: tile.home } : {};
}
