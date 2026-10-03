// Block fit: the bed of a delivery truck is a 6 × 6 grid. Three parcels of different shapes wait beside it;
// the child drags one onto the bed (it shows where it will land) and lets go. A full row or column of
// parcels is driven away: a point per line. New parcels come when the three are used. When none of them fits
// anywhere, the truck leaves with what it has and an empty one backs in (no point, a short wait), so the round
// never stops early. A tap on a parcel picks it, a tap on the bed puts it there. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type Arena, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const GRID = 6;

/** Parcel shapes as [col, row] cells from the top-left. */
export const SHAPES: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [[0, 0]],
  [[0, 0], [1, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [0, 1]],
  [[0, 0], [1, 0], [1, 1]],
  [[1, 0], [0, 1], [1, 1]],
  [[0, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [0, 1], [0, 2], [0, 3]],
  [[0, 0], [1, 0], [2, 0], [1, 1]],
];

export interface Parcel {
  shape: number;
  /** Colour index for drawing. */
  colour: number;
}

export interface Slot {
  /** The tray box this parcel waits in. */
  x: number;
  y: number;
  w: number;
  h: number;
  parcel: Parcel | null;
}

export interface BlockFitState {
  /** Colour index + 1 per cell, row by row (0 empty). */
  cells: number[];
  cell: number;
  left: number;
  top: number;
  slots: Slot[];
  /** The parcel in the finger: its slot and its centre now. */
  held: { slot: number; x: number; y: number; moved: number } | null;
  selected: number;
  /** Lines being driven away: cell indexes and seconds since. */
  clearing: { cells: number[]; colours: number[]; ago: number } | null;
  /** Seconds since the truck left full (-1 while loading). */
  leaving: number;
  lines: number;
  score: number;
  time: number;
}

const LEAVE_SECONDS = 1.6;
const TAP_MOVE = 14;
/** A dragged parcel rides this many cells above the finger, so the finger does not hide it. */
export const LIFT_CELLS = 0.9;

export const shapeSize = (shape: number): { w: number; h: number } => {
  const cells = SHAPES[shape] ?? [];
  return { w: Math.max(...cells.map(([c]) => c)) + 1, h: Math.max(...cells.map(([, r]) => r)) + 1 };
};

export function layout(arena: Arena): Pick<BlockFitState, 'cell' | 'left' | 'top'> & { slots: Slot[] } {
  const top = HUD_SAFE_TOP + 20;
  if (arena.width > arena.height) {
    const cell = Math.min(72, (arena.height - top - 40) / GRID);
    const left = 100;
    const trayX = left + cell * GRID + 30;
    const trayW = arena.width - trayX - 20;
    const slotH = (arena.height - top - 30) / 3;
    const slots = [0, 1, 2].map((i) => ({ x: trayX, y: top + i * slotH, w: trayW, h: slotH - 10, parcel: null }));
    return { cell, left, top, slots };
  }
  const cell = Math.min(72, (arena.width - 120) / GRID);
  const left = 100;
  const trayY = top + cell * GRID + 30;
  const slotW = (arena.width - 40) / 3;
  const slotH = Math.min(220, arena.height - trayY - 20);
  const slots = [0, 1, 2].map((i) => ({ x: 20 + i * slotW, y: trayY, w: slotW - 10, h: slotH, parcel: null }));
  return { cell, left, top, slots };
}

/** Whether `shape` fits with its top-left cell at (col, row). */
export function fitsAt(cells: readonly number[], shape: number, col: number, row: number): boolean {
  return (SHAPES[shape] ?? []).every(([c, r]) => {
    const x = col + c;
    const y = row + r;
    return x >= 0 && y >= 0 && x < GRID && y < GRID && cells[y * GRID + x] === 0;
  });
}

const fitsAnywhere = (cells: readonly number[], shape: number): boolean => {
  for (let row = 0; row < GRID; row += 1) for (let col = 0; col < GRID; col += 1) if (fitsAt(cells, shape, col, row)) return true;
  return false;
};

/** Full rows and columns of a grid, as cell indexes (a cell in both counts once). */
export function fullLines(cells: readonly number[]): { lines: number; indexes: number[] } {
  const indexes = new Set<number>();
  let lines = 0;
  for (let i = 0; i < GRID; i += 1) {
    const row = Array.from({ length: GRID }, (_, k) => i * GRID + k);
    const col = Array.from({ length: GRID }, (_, k) => k * GRID + i);
    for (const line of [row, col]) {
      if (line.every((j) => cells[j] !== 0)) {
        lines += 1;
        for (const j of line) indexes.add(j);
      }
    }
  }
  return { lines, indexes: [...indexes] };
}

/** Where the held parcel would land: its top-left cell, from its centre. */
export function landing(state: BlockFitState, shape: number, x: number, y: number): { col: number; row: number } {
  const { w, h } = shapeSize(shape);
  return { col: Math.round((x - (w * state.cell) / 2 - state.left) / state.cell), row: Math.round((y - (h * state.cell) / 2 - state.top) / state.cell) };
}

export function createBlockFit({ arena, rng }: GameSetup): MinigameLogic<BlockFitState> {
  const events = eventQueue();
  const base = layout(arena);
  const state: BlockFitState = { cells: Array.from({ length: GRID * GRID }, () => 0), ...base, held: null, selected: -1, clearing: null, leaving: -1, lines: 0, score: 0, time: 0 };

  const deal = (r: Rng): void => {
    for (const slot of state.slots) slot.parcel = { shape: r.int(0, SHAPES.length - 1), colour: r.int(0, 3) };
  };
  deal(rng);

  const stuck = (): boolean => state.slots.every((s) => !s.parcel || !fitsAnywhere(state.cells, s.parcel.shape));

  /** Puts slot's parcel at (col, row) if it fits; clears full lines; deals new parcels when the tray is empty. */
  const place = (slotIndex: number, col: number, row: number): boolean => {
    const slot = state.slots[slotIndex];
    const parcel = slot?.parcel;
    if (!slot || !parcel || !fitsAt(state.cells, parcel.shape, col, row)) return false;
    for (const [c, r] of SHAPES[parcel.shape] ?? []) state.cells[(row + r) * GRID + col + c] = parcel.colour + 1;
    slot.parcel = null;
    const { w, h } = shapeSize(parcel.shape);
    events.push({ type: 'action', x: state.left + (col + w / 2) * state.cell, y: state.top + (row + h / 2) * state.cell });
    const full = fullLines(state.cells);
    if (full.lines > 0) {
      state.clearing = { cells: full.indexes, colours: full.indexes.map((i) => state.cells[i] ?? 0), ago: 0 };
      for (const i of full.indexes) state.cells[i] = 0;
      state.lines += full.lines;
      state.score += full.lines;
      const mid = full.indexes[Math.floor(full.indexes.length / 2)] ?? 0;
      events.push({ type: 'score', x: state.left + ((mid % GRID) + 0.5) * state.cell, y: state.top + (Math.floor(mid / GRID) + 0.5) * state.cell, points: full.lines });
    }
    if (state.slots.every((s) => !s.parcel)) deal(rng);
    if (stuck()) {
      state.leaving = 0;
      events.push({ type: 'miss', x: state.left + (GRID * state.cell) / 2, y: state.top + (GRID * state.cell) / 2 });
    }
    return true;
  };

  const slotAt = (at: Point): number => state.slots.findIndex((s) => s.parcel && at.x >= s.x && at.x <= s.x + s.w && at.y >= s.y && at.y <= s.y + s.h);

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
      if (state.clearing) {
        state.clearing.ago += dt;
        if (state.clearing.ago > 0.6) state.clearing = null;
      }
      if (state.leaving >= 0) {
        state.leaving += dt;
        state.held = null;
        if (state.leaving >= LEAVE_SECONDS) {
          state.cells.fill(0);
          state.leaving = -1;
        }
        return;
      }
      const press = input.pressed ? (input.pointer ?? input.taps[0] ?? null) : null;
      if (press && !state.held) {
        const slot = slotAt(press);
        if (slot >= 0) {
          state.held = { slot, x: press.x, y: press.y - LIFT_CELLS * state.cell, moved: 0 };
        } else if (state.selected >= 0) {
          // A tap on the bed puts the picked parcel there, centred on the tap.
          const parcel = state.slots[state.selected]?.parcel;
          if (parcel) {
            const { col, row } = landing(state, parcel.shape, press.x, press.y);
            if (!place(state.selected, col, row)) events.push({ type: 'miss', x: press.x, y: press.y });
          }
          state.selected = -1;
        }
      }
      const held = state.held;
      if (!held) return;
      if (input.pointer) {
        const x = input.pointer.x;
        const y = input.pointer.y - LIFT_CELLS * state.cell;
        held.moved += Math.hypot(x - held.x, y - held.y);
        held.x = x;
        held.y = y;
      }
      if (!input.pointer || input.released) {
        state.held = null;
        if (held.moved < TAP_MOVE) {
          state.selected = held.slot;
          return;
        }
        state.selected = -1;
        const parcel = state.slots[held.slot]?.parcel;
        if (!parcel) return;
        const { col, row } = landing(state, parcel.shape, held.x, held.y);
        if (!place(held.slot, col, row)) events.push({ type: 'miss', x: held.x, y: held.y });
      }
    },
  };
}

/** Value of putting `shape` at (col, row): lines it completes first, then how snugly it sits. */
function placementValue(cells: readonly number[], shape: number, col: number, row: number): number {
  const next = [...cells];
  for (const [c, r] of SHAPES[shape] ?? []) next[(row + r) * GRID + col + c] = 1;
  let value = fullLines(next).lines * 100;
  for (const [c, r] of SHAPES[shape] ?? []) {
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const x = col + c + dx;
      const y = row + r + dy;
      if (x < 0 || y < 0 || x >= GRID || y >= GRID || next[y * GRID + x] !== 0) value += 1;
    }
  }
  return value + (SHAPES[shape]?.length ?? 0) * 0.5;
}

function bestPlacement(state: BlockFitState, slots: readonly number[]): { slot: number; col: number; row: number } | null {
  let best: { slot: number; col: number; row: number; value: number } | null = null;
  for (const slot of slots) {
    const parcel = state.slots[slot]?.parcel;
    if (!parcel) continue;
    for (let row = 0; row < GRID; row += 1) {
      for (let col = 0; col < GRID; col += 1) {
        if (!fitsAt(state.cells, parcel.shape, col, row)) continue;
        const value = placementValue(state.cells, parcel.shape, col, row);
        if (!best || value > best.value) best = { slot, col, row, value };
      }
    }
  }
  return best;
}

/** Good play: the parcel and spot that complete the most lines (or sit most snugly), carried there. */
export function blockFitBot(state: BlockFitState, _context: BotContext): BotMove {
  if (state.leaving >= 0) return {};
  if (state.held) {
    const parcel = state.slots[state.held.slot]?.parcel;
    const plan = bestPlacement(state, [state.held.slot]);
    if (!parcel || !plan) return {};
    const { w, h } = shapeSize(parcel.shape);
    const x = state.left + (plan.col + w / 2) * state.cell;
    const y = state.top + (plan.row + h / 2) * state.cell;
    if (Math.hypot(state.held.x - x, state.held.y - y) < 2) return {};
    return { touch: { x, y: y + LIFT_CELLS * state.cell } };
  }
  const plan = bestPlacement(state, [0, 1, 2]);
  const slot = plan ? state.slots[plan.slot] : undefined;
  return slot ? { touch: { x: slot.x + slot.w / 2, y: slot.y + slot.h / 2 } } : {};
}
