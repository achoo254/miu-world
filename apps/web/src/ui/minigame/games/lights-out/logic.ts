// Lights out: the castle's windows at night, some lit, some dark. Tapping a window switches it and the windows
// just above, below, left and right of it (lit ↔ dark). Light every window and the board is won; the next one
// is bigger (3 × 3, then 4 × 4). Every board is made by switching from all-lit, so it can always be solved.
// Stuck: "Làm lại" puts the board back as it began, and after a while one window that still needs a tap
// glows as a hint (exact: the windows to tap are always the dealt ones plus the child's own taps, mod 2).
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface LightsState {
  size: number;
  lit: boolean[];
  /** The board as dealt (for "Làm lại"). */
  start: boolean[];
  /** Windows still to tap for a win (dealt taps XOR the child's taps). */
  need: boolean[];
  /** As dealt, for "Làm lại". */
  startNeed: boolean[];
  /** Top-left of the grid and one window's cell size. */
  left: number;
  top: number;
  cell: number;
  redo: Point & { r: number };
  /** Seconds since the last tap or deal (the hint shows after a while). */
  idle: number;
  /** The window that glows as a hint, or -1. */
  hint: number;
  /** Seconds since the board was won (a celebration), or -1 while it is played. */
  wonAgo: number;
  /** Seconds since each window switched (a flicker). */
  switched: number[];
  boards: number;
  score: number;
  time: number;
}

export const HINT_AFTER = 8;
const NEXT_SECONDS = 1.3;

/** Sizes of the boards in order. */
const SIZES = [3, 3, 4, 4] as const;

export function neighbours(size: number, i: number): number[] {
  const r = Math.floor(i / size);
  const c = i % size;
  const out = [i];
  if (r > 0) out.push(i - size);
  if (r < size - 1) out.push(i + size);
  if (c > 0) out.push(i - 1);
  if (c < size - 1) out.push(i + 1);
  return out;
}

export function press(lit: boolean[], size: number, i: number): void {
  for (const j of neighbours(size, i)) lit[j] = !lit[j];
}

/** A board one or more taps away from all-lit (never all-lit itself), and the taps that solve it. */
export function deal(rng: Rng, size: number, taps: number): { lit: boolean[]; need: boolean[] } {
  for (;;) {
    const lit = Array.from({ length: size * size }, () => true);
    const need = Array.from({ length: size * size }, () => false);
    for (let k = 0; k < taps; k += 1) {
      const i = rng.int(0, size * size - 1);
      need[i] = !need[i];
      press(lit, size, i);
    }
    if (lit.some((l) => !l)) return { lit, need };
  }
}

export function createLightsOut({ arena, rng }: GameSetup): MinigameLogic<LightsState> {
  const events = eventQueue();
  const landscape = arena.width > arena.height * 1.15;
  const redoR = 52;
  const state: LightsState = {
    size: 3,
    lit: [],
    start: [],
    need: [],
    startNeed: [],
    left: 0,
    top: 0,
    cell: 0,
    redo: landscape ? { x: arena.width - redoR - 30, y: arena.height - redoR - 30, r: redoR } : { x: arena.width / 2, y: arena.height - redoR - 26, r: redoR },
    idle: 0,
    hint: -1,
    wonAgo: -1,
    switched: [],
    boards: 0,
    score: 0,
    time: 0,
  };

  function next(): void {
    const size = SIZES[Math.min(state.boards, SIZES.length - 1)] ?? 4;
    const taps = size === 3 ? rng.int(2, 3) : rng.int(3, 4);
    const board = deal(rng, size, taps);
    const areaTop = HUD_SAFE_TOP + 40;
    const areaBottom = landscape ? arena.height - 24 : state.redo.y - redoR - 24;
    const areaW = landscape ? arena.width - redoR * 2 - 100 : arena.width - 40;
    state.size = size;
    state.cell = Math.min(150, areaW / size, (areaBottom - areaTop) / size);
    state.left = (landscape ? 20 + areaW / 2 : arena.width / 2) - (state.cell * size) / 2;
    state.top = areaTop + (areaBottom - areaTop - state.cell * size) / 2;
    state.lit = [...board.lit];
    state.start = [...board.lit];
    state.need = [...board.need];
    state.startNeed = [...board.need];
    state.switched = state.lit.map(() => 9);
    state.idle = 0;
    state.hint = -1;
    state.wonAgo = -1;
    state.boards += 1;
  }
  next();

  const windowCentre = (i: number): Point => ({ x: state.left + ((i % state.size) + 0.5) * state.cell, y: state.top + (Math.floor(i / state.size) + 0.5) * state.cell });

  function tap(p: Point): void {
    if (Math.hypot(p.x - state.redo.x, p.y - state.redo.y) <= state.redo.r + 10) {
      state.lit = [...state.start];
      state.need = [...state.startNeed];
      state.switched = state.lit.map(() => 0);
      state.idle = 0;
      state.hint = -1;
      events.push({ type: 'action', x: state.redo.x, y: state.redo.y });
      return;
    }
    const c = Math.floor((p.x - state.left) / state.cell);
    const r = Math.floor((p.y - state.top) / state.cell);
    if (c < 0 || r < 0 || c >= state.size || r >= state.size) return;
    const i = r * state.size + c;
    press(state.lit, state.size, i);
    state.need[i] = !state.need[i];
    for (const j of neighbours(state.size, i)) state.switched[j] = 0;
    state.idle = 0;
    state.hint = -1;
    const at = windowCentre(i);
    if (state.lit.every(Boolean)) {
      state.wonAgo = 0;
      state.score += 1;
      events.push({ type: 'score', x: arena.width / 2, y: state.top + (state.cell * state.size) / 2, note: 84, voice: 'bell' });
    } else {
      events.push({ type: 'action', ...at, note: state.lit[i] ? 76 : 69, voice: 'bell' });
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
      for (let i = 0; i < state.switched.length; i += 1) state.switched[i] = (state.switched[i] ?? 9) + dt;
      if (state.wonAgo >= 0) {
        state.wonAgo += dt;
        if (state.wonAgo >= NEXT_SECONDS) next();
        return;
      }
      state.idle += dt;
      if (state.hint < 0 && state.idle >= HINT_AFTER) state.hint = state.need.findIndex(Boolean);
      for (const p of input.taps) {
        tap(p);
        if (state.wonAgo >= 0) break;
      }
    },
  };
}

/** Seconds the bot looks before each tap. */
const BOT_PAUSE = 0.5;

/** Good play: it knows which windows still need a tap (like following the hint every time). */
export function lightsOutBot(state: LightsState, _context: BotContext): BotMove {
  if (state.wonAgo >= 0 || state.idle < BOT_PAUSE) return {};
  const i = state.need.findIndex(Boolean);
  if (i < 0) return {};
  return { tap: { x: state.left + ((i % state.size) + 0.5) * state.cell, y: state.top + (Math.floor(i / state.size) + 0.5) * state.cell } };
}
