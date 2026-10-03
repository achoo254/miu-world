// Reef sweeper (dò đá ngầm): a 5 × 5 patch of sand hides a few sharp rocks. Tapping a square digs it: a safe
// square shows how many rocks touch it (sideways or corner to corner), and a square with none opens all its
// neighbours too. Holding a square plants a flag on a rock you have worked out (hold again to take it away);
// flags are only a help. Digging a rock costs a heart (it shows, and the patch goes on). All safe squares
// dug: the patch is cleared (a point) and a new one comes. The first dig is always safe and open, and every
// patch can be cleared by reasoning alone, no guessing. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const SIDE = 5;

export interface Cell {
  rock: boolean;
  /** Rocks around it. */
  count: number;
  open: boolean;
  flag: boolean;
  /** A rock dug by mistake. */
  hit: boolean;
  /** Seconds since it was opened (a pop), large when not lately. */
  openedAgo: number;
}

export interface ReefState {
  cells: Cell[];
  /** Rocks are placed on the first dig (so it is always safe). */
  laid: boolean;
  rocks: number;
  left: number;
  top: number;
  size: number;
  /** Seconds since the patch was cleared (-1 while digging). */
  clearedAgo: number;
  lives: number;
  /** The square a held finger is on, since when, and whether that hold already planted/lifted a flag. */
  holding: { cell: number; since: number; flagged: boolean } | null;
  boards: number;
  lastMoveAt: number;
  score: number;
  time: number;
}

export const FLAG_HOLD = 0.45;
const LIVES = 3;
const NEXT_SECONDS = 1.2;

export function neighbours(i: number): number[] {
  const r = Math.floor(i / SIDE);
  const c = i % SIDE;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const rr = r + dr;
      const cc = c + dc;
      if (rr >= 0 && cc >= 0 && rr < SIDE && cc < SIDE) out.push(rr * SIDE + cc);
    }
  }
  return out;
}

/** Opens a square (and the zero area around it) in a plain list of cells. */
function openIn(cells: Pick<Cell, 'rock' | 'count' | 'open'>[], start: number): void {
  const todo = [start];
  while (todo.length > 0) {
    const i = todo.pop() ?? 0;
    const cell = cells[i];
    if (!cell || cell.open || cell.rock) continue;
    cell.open = true;
    if (cell.count === 0) todo.push(...neighbours(i));
  }
}

/**
 * What can be worked out from the open squares: squares known safe and squares known to be rocks, by the two
 * rules a child uses (a number already met by known rocks frees the rest; a number needing all its unknown
 * neighbours makes them rocks), applied until nothing changes.
 */
export function deduce(cells: readonly (Pick<Cell, 'count' | 'open'> & { hit?: boolean })[]): { safe: Set<number>; rocks: Set<number> } {
  const safe = new Set<number>();
  // A rock dug by mistake is a known rock.
  const rocks = new Set(cells.flatMap((c, i) => (c.hit ? [i] : [])));
  const hidden = (j: number): boolean => !cells[j]?.open || cells[j]?.hit === true;
  let changed = true;
  while (changed) {
    changed = false;
    cells.forEach((cell, i) => {
      if (!cell.open || cell.hit) return;
      const around = neighbours(i).filter(hidden);
      const known = around.filter((j) => rocks.has(j)).length;
      const unknown = around.filter((j) => !rocks.has(j) && !safe.has(j));
      if (unknown.length === 0) return;
      if (known === cell.count) {
        for (const j of unknown) safe.add(j);
        changed = true;
      } else if (cell.count - known === unknown.length) {
        for (const j of unknown) rocks.add(j);
        changed = true;
      }
    });
  }
  return { safe, rocks };
}

/** Safe squares a first dig at `start` leaves closed (a patch that opens all at once is no game). */
export function leftAfterFirst(rocksAt: Set<number>, start: number): number {
  const cells = Array.from({ length: SIDE * SIDE }, (_, i) => ({ rock: rocksAt.has(i), count: neighbours(i).filter((j) => rocksAt.has(j)).length, open: false }));
  openIn(cells, start);
  return cells.filter((c) => !c.open && !c.rock).length;
}

/** Whether a board opened at `start` can be cleared by reasoning alone. */
export function solvable(rocksAt: Set<number>, start: number): boolean {
  const cells = Array.from({ length: SIDE * SIDE }, (_, i) => ({ rock: rocksAt.has(i), count: neighbours(i).filter((j) => rocksAt.has(j)).length, open: false }));
  openIn(cells, start);
  for (;;) {
    const { safe } = deduce(cells);
    const next = [...safe].filter((i) => !cells[i]?.open);
    if (next.length === 0) break;
    for (const i of next) openIn(cells, i);
  }
  return cells.every((c) => c.open || c.rock);
}

/** Rocks for a patch first dug at `start`: never on it or around it, a few squares left to work out, and clearable without guessing. */
export function layRocks(rng: Rng, start: number, rocks: number): Set<number> {
  const banned = new Set([start, ...neighbours(start)]);
  const free = Array.from({ length: SIDE * SIDE }, (_, i) => i).filter((i) => !banned.has(i));
  let last = new Set<number>();
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const pool = [...free];
    const chosen = new Set<number>();
    while (chosen.size < rocks && pool.length > 0) chosen.add(pool.splice(rng.int(0, pool.length - 1), 1)[0] ?? 0);
    last = chosen;
    if (leftAfterFirst(chosen, start) >= 4 && solvable(chosen, start)) return chosen;
  }
  return last;
}

export function createReefSweeper({ arena, rng }: GameSetup): MinigameLogic<ReefState> {
  const events = eventQueue();
  const top = HUD_SAFE_TOP + 70;
  const size = Math.min(120, (arena.width - 40) / SIDE, (arena.height - top - 30) / SIDE);
  const state: ReefState = {
    cells: [],
    laid: false,
    rocks: 3,
    left: (arena.width - size * SIDE) / 2,
    top: top + (arena.height - top - 30 - size * SIDE) / 2,
    size,
    clearedAgo: -1,
    lives: LIVES,
    holding: null,
    boards: 0,
    lastMoveAt: 0,
    score: 0,
    time: 0,
  };

  function newBoard(): void {
    state.cells = Array.from({ length: SIDE * SIDE }, () => ({ rock: false, count: 0, open: false, flag: false, hit: false, openedAgo: 99 }));
    state.laid = false;
    state.rocks = state.boards < 2 ? 3 : 4;
    state.clearedAgo = -1;
    state.boards += 1;
    state.lastMoveAt = state.time;
  }
  newBoard();

  const cellAt = (p: Point): number => {
    const c = Math.floor((p.x - state.left) / state.size);
    const r = Math.floor((p.y - state.top) / state.size);
    return c >= 0 && r >= 0 && c < SIDE && r < SIDE ? r * SIDE + c : -1;
  };
  const centre = (i: number): Point => ({ x: state.left + ((i % SIDE) + 0.5) * state.size, y: state.top + (Math.floor(i / SIDE) + 0.5) * state.size });

  function dig(i: number): void {
    const cell = state.cells[i];
    if (!cell || cell.open) return;
    if (cell.flag) {
      cell.flag = false;
      return;
    }
    state.lastMoveAt = state.time;
    if (!state.laid) {
      const rocks = layRocks(rng, i, state.rocks);
      state.cells.forEach((c, j) => {
        c.rock = rocks.has(j);
      });
      state.cells.forEach((c, j) => {
        c.count = neighbours(j).filter((k) => state.cells[k]?.rock).length;
      });
      state.laid = true;
    }
    if (cell.rock) {
      cell.open = true;
      cell.hit = true;
      cell.openedAgo = 0;
      state.lives -= 1;
      events.push({ type: 'hit', ...centre(i) });
      return;
    }
    const before = state.cells.map((c) => c.open);
    openIn(state.cells, i);
    state.cells.forEach((c, j) => {
      if (c.open && !before[j]) c.openedAgo = 0;
    });
    events.push({ type: 'action', ...centre(i), note: 64 + cell.count * 3, voice: 'bell' });
    if (state.cells.every((c) => c.open || c.rock)) {
      state.clearedAgo = 0;
      state.score += 1;
      events.push({ type: 'score', x: state.left + (state.size * SIDE) / 2, y: state.top + (state.size * SIDE) / 2 });
    }
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.lives <= 0;
    },
    get lives() {
      return state.lives;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      for (const c of state.cells) c.openedAgo += dt;
      if (state.clearedAgo >= 0) {
        state.clearedAgo += dt;
        if (state.clearedAgo >= NEXT_SECONDS) newBoard();
        return;
      }
      // Hold to flag.
      if (input.pressed && input.pointer) state.holding = { cell: cellAt(input.pointer), since: state.time, flagged: false };
      if (!input.pointer) state.holding = null;
      const hold = state.holding;
      if (hold && input.pointer && cellAt(input.pointer) !== hold.cell) state.holding = null;
      if (hold && !hold.flagged && input.holdTime >= FLAG_HOLD) {
        hold.flagged = true;
        const cell = state.cells[hold.cell];
        if (cell && !cell.open) {
          cell.flag = !cell.flag;
          state.lastMoveAt = state.time;
          events.push({ type: 'action', ...centre(hold.cell) });
        }
      }
      for (const p of input.taps) dig(cellAt(p));
    },
  };
}

/** Good play: digs a square it has worked out is safe, a short think between digs. */
export function reefSweeperBot(state: ReefState, _context: BotContext): BotMove {
  if (state.clearedAgo >= 0 || state.time - state.lastMoveAt < 0.5) return {};
  const middle = Math.floor((SIDE * SIDE) / 2);
  const centre = (i: number): Point => ({ x: state.left + ((i % SIDE) + 0.5) * state.size, y: state.top + (Math.floor(i / SIDE) + 0.5) * state.size });
  if (!state.laid) return { tap: centre(middle) };
  const { safe } = deduce(state.cells);
  const next = [...safe].find((i) => !state.cells[i]?.open && !state.cells[i]?.flag);
  return next === undefined ? {} : { tap: centre(next) };
}
