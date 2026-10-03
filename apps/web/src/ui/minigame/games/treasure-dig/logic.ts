// Treasure dig: a beach of sand squares with a treasure buried under one. The child taps a square to dig it;
// the hole shows how close the treasure is (fire right next to it, sun near, leaf farther, snow far: the
// distance counts diagonal steps, so the clues form square rings). Eight digs to find it: found is a point,
// out of digs shows where it was. Then a new beach. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** Clue of a dug square: 0 = the treasure, 1 hot … 4 cold (4 and farther). */
export type Clue = 0 | 1 | 2 | 3 | 4;
const FOUND_SECONDS = 1.3;
const LOST_SECONDS = 1.8;
/** Treasures in turn (draw.ts shows them). */
export const TREASURES = ['gift', 'gem', 'coin', 'crown'] as const;

export interface Dug {
  col: number;
  row: number;
  clue: Clue;
  /** Seconds since it was dug (a pop). */
  t: number;
}

export interface TreasureState {
  cols: number;
  rows: number;
  treasure: { col: number; row: number };
  dug: Dug[];
  digsLeft: number;
  digs: number;
  /** 'found' or 'lost' with seconds since, while the round's end is shown; null while digging. */
  ended: { how: 'found' | 'lost'; t: number } | null;
  round: number;
  lastDigAt: number;
  score: number;
  time: number;
  // Layout.
  cell: number;
  left: number;
  top: number;
  /** Where the legend (clue colours) and the digs left are drawn. */
  side: 'right' | 'below';
}

export const clueFor = (col: number, row: number, t: { col: number; row: number }): Clue => Math.min(4, Math.max(Math.abs(col - t.col), Math.abs(row - t.row))) as Clue;

export function createTreasureDig({ arena, params, rng }: GameSetup): MinigameLogic<TreasureState> {
  const digs = typeof params.digs === 'number' ? Math.round(Math.min(12, Math.max(5, params.digs))) : 8;
  const events = eventQueue();
  const landscape = arena.width > arena.height * 1.15;
  const tall = arena.height / arena.width > 1.8;
  const cols = landscape ? 8 : 6;
  const rows = landscape ? 5 : tall ? 9 : 8;
  const legend = 170;
  const availW = arena.width - 40 - (landscape ? legend : 0);
  const availH = arena.height - HUD_SAFE_TOP - 30 - (landscape ? 0 : legend * 0.8);
  const cell = Math.floor(Math.min(availW / cols, availH / rows, 120));
  const left = (availW - cols * cell) / 2 + 20;
  const top = HUD_SAFE_TOP + 14 + (availH - rows * cell) / 2;
  const state: TreasureState = {
    cols,
    rows,
    treasure: { col: 0, row: 0 },
    dug: [],
    digsLeft: digs,
    digs,
    ended: null,
    round: 0,
    lastDigAt: -1,
    score: 0,
    time: 0,
    cell,
    left,
    top,
    side: landscape ? 'right' : 'below',
  };

  function bury(): void {
    state.treasure = { col: rng.int(0, cols - 1), row: rng.int(0, rows - 1) };
    state.dug = [];
    state.digsLeft = digs;
    state.ended = null;
    state.round += 1;
  }

  function dig(p: Point): void {
    const col = Math.floor((p.x - left) / cell);
    const row = Math.floor((p.y - top) / cell);
    if (col < 0 || row < 0 || col >= cols || row >= rows) return;
    if (state.dug.some((d) => d.col === col && d.row === row)) return;
    const clue = clueFor(col, row, state.treasure);
    state.dug.push({ col, row, clue, t: 0 });
    state.digsLeft -= 1;
    state.lastDigAt = state.time;
    const x = left + (col + 0.5) * cell;
    const y = top + (row + 0.5) * cell;
    if (clue === 0) {
      state.score += 1;
      state.ended = { how: 'found', t: 0 };
      events.push({ type: 'score', x, y });
      return;
    }
    // Hotter clues ring higher.
    events.push({ type: 'action', x, y, note: [0, 79, 74, 67, 60][clue], voice: 'bell' });
    if (state.digsLeft <= 0) {
      state.ended = { how: 'lost', t: 0 };
      events.push({ type: 'miss', x: left + (state.treasure.col + 0.5) * cell, y: top + (state.treasure.row + 0.5) * cell });
    }
  }

  bury();

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
      for (const d of state.dug) d.t += dt;
      if (state.ended) {
        state.ended.t += dt;
        if (state.ended.t >= (state.ended.how === 'found' ? FOUND_SECONDS : LOST_SECONDS)) bury();
        return;
      }
      const tap = input.taps[0];
      if (tap) dig(tap);
    },
  };
}

/** Squares where the treasure could still be, given every clue so far. */
export function candidates(state: TreasureState): { col: number; row: number }[] {
  const out: { col: number; row: number }[] = [];
  for (let row = 0; row < state.rows; row += 1) {
    for (let col = 0; col < state.cols; col += 1) {
      if (state.dug.every((d) => clueFor(d.col, d.row, { col, row }) === d.clue)) out.push({ col, row });
    }
  }
  return out;
}

const BOT_PAUSE = 0.5;

/** Good play: digs the square that leaves the fewest possible places whatever its clue says. */
export function treasureBot(state: TreasureState, _context: BotContext): BotMove {
  if (state.ended || state.time - state.lastDigAt < BOT_PAUSE) return {};
  const left = candidates(state);
  const at = (c: { col: number; row: number }): Point => ({ x: state.left + (c.col + 0.5) * state.cell, y: state.top + (c.row + 0.5) * state.cell });
  const only = left[0];
  if (left.length <= 1 || state.digsLeft === 1) return only ? { tap: at(only) } : {};
  let best: { col: number; row: number; worst: number } | null = null;
  for (let row = 0; row < state.rows; row += 1) {
    for (let col = 0; col < state.cols; col += 1) {
      if (state.dug.some((d) => d.col === col && d.row === row)) continue;
      const groups = new Map<number, number>();
      for (const c of left) {
        const clue = clueFor(col, row, c);
        groups.set(clue, (groups.get(clue) ?? 0) + 1);
      }
      // A candidate square itself may be the treasure: that outcome leaves nothing to search.
      groups.delete(0);
      // Ties go to a square that may itself be the treasure.
      const worst = Math.max(0, ...groups.values()) - (left.some((c) => c.col === col && c.row === row) ? 0.5 : 0);
      if (!best || worst < best.worst) best = { col, row, worst };
    }
  }
  return best ? { tap: at(best) } : {};
}
