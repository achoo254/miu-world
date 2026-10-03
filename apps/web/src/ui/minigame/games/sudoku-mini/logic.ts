// Fruit sudoku: a 4 × 4 garden bed in four 2 × 2 plots, with four kinds of fruit. Every row, every column and
// every plot must hold one of each. Some fruit are already planted; the child drags a fruit from the basket row
// into an empty square (or taps a fruit, then a square). A fruit that does not belong there shakes and goes
// back (the fruit it clashes with, if any, flashes); no penalty. A full bed is a point and a new bed comes,
// with more empty squares each time. Every bed has exactly one answer. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const SIDE = 4;

export interface Placed {
  /** Seconds since it was planted by the child (a pop), large for the dealt ones. */
  ago: number;
}

export interface SudokuState {
  solution: number[];
  /** The fruit in each square (0–3), or -1 when empty. */
  grid: number[];
  given: boolean[];
  planted: Placed[];
  /** A wrong try: the square, the fruit, how long ago, and the square it clashed with (-1 if none). */
  wrong: { cell: number; fruit: number; ago: number; clash: number } | null;
  left: number;
  top: number;
  cell: number;
  /** The basket row: where each fruit kind waits. */
  tray: (Point & { fruit: number })[];
  traySize: number;
  /** The fruit picked by a tap or carried by a drag, or -1; where the carried one is. */
  held: number;
  dragging: boolean;
  carry: Point | null;
  /** Seconds since the bed was finished (a celebration), or -1. */
  doneAgo: number;
  boards: number;
  lastMoveAt: number;
  score: number;
  time: number;
}

const NEXT_SECONDS = 1.2;
/** Empty squares on the n-th bed. */
const BLANKS = [5, 6, 7, 8, 9, 10] as const;

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

/** Squares sharing a row, column or plot with square i (not i itself). */
export function peers(i: number): number[] {
  const r = Math.floor(i / SIDE);
  const c = i % SIDE;
  const out: number[] = [];
  for (let j = 0; j < SIDE * SIDE; j += 1) {
    if (j === i) continue;
    const rj = Math.floor(j / SIDE);
    const cj = j % SIDE;
    if (rj === r || cj === c || (Math.floor(rj / 2) === Math.floor(r / 2) && Math.floor(cj / 2) === Math.floor(c / 2))) out.push(j);
  }
  return out;
}

/** A full bed: a pattern that keeps every rule, with rows, columns and fruit shuffled. */
export function makeSolution(rng: Rng): number[] {
  const symbols = shuffle([0, 1, 2, 3], rng);
  const bands = shuffle([0, 1], rng);
  const stacks = shuffle([0, 1], rng);
  const rows = bands.flatMap((b) => shuffle([b * 2, b * 2 + 1], rng));
  const cols = stacks.flatMap((s) => shuffle([s * 2, s * 2 + 1], rng));
  const flip = rng.chance(0.5);
  const grid: number[] = [];
  for (let r = 0; r < SIDE; r += 1) {
    for (let c = 0; c < SIDE; c += 1) {
      const rr = rows[flip ? c : r] ?? 0;
      const cc = cols[flip ? r : c] ?? 0;
      grid.push(symbols[(2 * (rr % 2) + Math.floor(rr / 2) + cc) % SIDE] ?? 0);
    }
  }
  return grid;
}

/** How many ways the bed can be finished (stops counting at `limit`). */
export function countSolutions(grid: number[], limit = 2): number {
  const empty = grid.indexOf(-1);
  if (empty < 0) return 1;
  let count = 0;
  const used = new Set(peers(empty).map((j) => grid[j]));
  for (let f = 0; f < SIDE && count < limit; f += 1) {
    if (used.has(f)) continue;
    grid[empty] = f;
    count += countSolutions(grid, limit - count);
    grid[empty] = -1;
  }
  return count;
}

/** A bed with `blanks` empty squares (fewer if no more can go while keeping one answer). */
export function makePuzzle(rng: Rng, solution: number[], blanks: number): number[] {
  const grid = [...solution];
  let removed = 0;
  for (const i of shuffle(solution.map((_, k) => k), rng)) {
    if (removed >= blanks) break;
    const keep = grid[i] ?? -1;
    grid[i] = -1;
    if (countSolutions([...grid]) === 1) removed += 1;
    else grid[i] = keep;
  }
  return grid;
}

export function createSudokuMini({ arena, rng }: GameSetup): MinigameLogic<SudokuState> {
  const events = eventQueue();
  const landscape = arena.width > arena.height * 1.15;
  const traySize = 104;
  const areaTop = HUD_SAFE_TOP + 20;
  const cell = landscape ? Math.min(118, (arena.height - areaTop - 30) / SIDE) : Math.min(132, (arena.width - 50) / SIDE, (arena.height - areaTop - traySize - 90) / SIDE);
  const gridW = cell * SIDE;
  const left = landscape ? (arena.width - traySize - 60 - gridW) / 2 : (arena.width - gridW) / 2;
  const top = landscape ? areaTop + (arena.height - areaTop - 20 - gridW) / 2 : areaTop + (arena.height - areaTop - traySize - 60 - gridW) / 2;
  const tray = [0, 1, 2, 3].map((fruit) =>
    landscape
      ? { fruit, x: arena.width - traySize / 2 - 40, y: top + gridW / 2 + (fruit - 1.5) * (traySize + 14) }
      : { fruit, x: arena.width / 2 + (fruit - 1.5) * (traySize + 18), y: arena.height - traySize / 2 - 40 },
  );
  const state: SudokuState = {
    solution: [],
    grid: [],
    given: [],
    planted: [],
    wrong: null,
    left,
    top,
    cell,
    tray,
    traySize,
    held: -1,
    dragging: false,
    carry: null,
    doneAgo: -1,
    boards: 0,
    lastMoveAt: -9,
    score: 0,
    time: 0,
  };

  function deal(): void {
    state.solution = makeSolution(rng);
    state.grid = makePuzzle(rng, state.solution, BLANKS[Math.min(state.boards, BLANKS.length - 1)] ?? 10);
    state.given = state.grid.map((f) => f >= 0);
    state.planted = state.grid.map(() => ({ ago: 99 }));
    state.wrong = null;
    state.held = -1;
    state.dragging = false;
    state.carry = null;
    state.doneAgo = -1;
    state.boards += 1;
  }
  deal();

  const cellAt = (p: Point): number => {
    const c = Math.floor((p.x - left) / cell);
    const r = Math.floor((p.y - top) / cell);
    return c >= 0 && r >= 0 && c < SIDE && r < SIDE ? r * SIDE + c : -1;
  };
  const trayAt = (p: Point): number => tray.find((t) => Math.abs(p.x - t.x) <= traySize / 2 + 8 && Math.abs(p.y - t.y) <= traySize / 2 + 8)?.fruit ?? -1;
  const centreOf = (i: number): Point => ({ x: left + ((i % SIDE) + 0.5) * cell, y: top + (Math.floor(i / SIDE) + 0.5) * cell });

  function plant(i: number, fruit: number): void {
    state.held = -1;
    state.dragging = false;
    state.carry = null;
    if (i < 0 || state.grid[i] !== -1) return;
    state.lastMoveAt = state.time;
    if (state.solution[i] === fruit) {
      state.grid[i] = fruit;
      const placed = state.planted[i];
      if (placed) placed.ago = 0;
      if (state.grid.every((f) => f >= 0)) {
        state.doneAgo = 0;
        state.score += 1;
        events.push({ type: 'score', x: left + gridW / 2, y: top + gridW / 2, note: 84, voice: 'bell' });
      } else {
        events.push({ type: 'action', ...centreOf(i), note: 67 + fruit * 2, voice: 'bell' });
      }
      return;
    }
    const clash = peers(i).find((j) => state.grid[j] === fruit) ?? -1;
    state.wrong = { cell: i, fruit, ago: 0, clash };
    events.push({ type: 'miss', ...centreOf(i) });
  }

  let lastPointer: Point | null = null;

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
      for (const p of state.planted) p.ago += dt;
      if (state.wrong) {
        state.wrong.ago += dt;
        if (state.wrong.ago > 0.8) state.wrong = null;
      }
      if (state.doneAgo >= 0) {
        state.doneAgo += dt;
        if (state.doneAgo >= NEXT_SECONDS) deal();
        lastPointer = input.pointer;
        return;
      }
      // Drag: a fruit picked up from the basket follows the finger and is planted where it is let go.
      if (input.pressed && input.pointer && trayAt(input.pointer) >= 0) {
        state.held = trayAt(input.pointer);
        state.dragging = true;
        state.carry = { ...input.pointer };
      }
      if (state.dragging && input.pointer) state.carry = { ...input.pointer };
      if (input.released && state.dragging) {
        const at = lastPointer ?? state.carry;
        const square = at ? cellAt(at) : -1;
        if (square >= 0) plant(square, state.held);
        else {
          // Let go off the bed (a tap on the basket included): the fruit stays picked for a tap on a square.
          state.dragging = false;
          state.carry = null;
        }
      }
      // Taps: a fruit in the basket, then a square.
      for (const p of input.taps) {
        const fruit = trayAt(p);
        if (fruit >= 0) {
          state.held = fruit;
          state.lastMoveAt = state.time;
        } else if (state.held >= 0 && cellAt(p) >= 0) plant(cellAt(p), state.held);
      }
      lastPointer = input.pointer;
    },
  };
}

/** Seconds the bot looks before a move. */
const BOT_PAUSE = 0.4;

/** Good play: it sees the answer square by square, taps the fruit, then the square. */
export function sudokuMiniBot(state: SudokuState, _context: BotContext): BotMove {
  if (state.doneAgo >= 0 || state.time - state.lastMoveAt < BOT_PAUSE) return {};
  const i = state.grid.findIndex((f) => f < 0);
  const fruit = state.solution[i];
  if (i < 0 || fruit === undefined) return {};
  const t = state.tray[fruit];
  if (!t) return {};
  if (state.held !== fruit || state.dragging) return { tap: { x: t.x, y: t.y } };
  return { tap: { x: state.left + ((i % SIDE) + 0.5) * state.cell, y: state.top + (Math.floor(i / SIDE) + 0.5) * state.cell } };
}
