// Hanoi tower: a stack of cake layers sits on one of three cake stands; the child moves the whole stack to the
// stand with the star, one layer at a time, never a bigger layer on a smaller one. Tap a stand to lift its top
// layer, tap another to set it down (tap the same stand to put it back). A wrong drop only wobbles the stand.
// Each solved stack is a point and a new one is laid out (two of the starting height, then one layer more).
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** Seconds a solved stack is celebrated before the next one. */
const SOLVED_SECONDS = 1.4;
/** Seconds a dropped layer takes to fall into place. */
export const DROP_SECONDS = 0.22;
const MAX_LAYERS = 5;
/** Notes of the layers (largest lowest), C major from G3 up. */
const LAYER_NOTES = [79, 76, 72, 67, 64, 60];

export interface LastMove {
  /** Layer size (1 = smallest). */
  size: number;
  from: number;
  to: number;
  /** Seconds since it was dropped. */
  t: number;
}

export interface HanoiState {
  /** Layer sizes on each stand, bottom first. */
  stands: number[][];
  /** Stand whose top layer is lifted, or null. */
  held: number | null;
  target: number;
  layers: number;
  moves: number;
  /** Fewest moves for this stack (2^n − 1). */
  best: number;
  last: LastMove | null;
  /** Stand that wobbled after a wrong drop, and seconds since. */
  wobble: { stand: number; t: number } | null;
  /** Seconds until the next stack (0 while one is being played). */
  nextIn: number;
  puzzles: number;
  lastTapAt: number;
  score: number;
  time: number;
  // Layout, arena units.
  standX: number[];
  baseY: number;
  layerH: number;
  maxW: number;
  minW: number;
}

/** Width of a layer of this size. */
export const layerWidth = (state: HanoiState, size: number): number =>
  state.minW + ((size - 1) / Math.max(1, state.layers - 1)) * (state.maxW - state.minW);

/** The next move of the shortest way from here to every layer on the target (null when solved). */
export function nextMove(stands: readonly (readonly number[])[], target: number): { from: number; to: number } | null {
  const where = new Map<number, number>();
  stands.forEach((stack, i) => stack.forEach((size) => where.set(size, i)));
  const pos = (size: number): number => where.get(size) ?? target;
  const move = (size: number, to: number): { from: number; to: number } | null => {
    if (size === 0) return null;
    const from = pos(size);
    if (from === to) return move(size - 1, to);
    const other = 3 - from - to;
    return move(size - 1, other) ?? { from, to };
  };
  return move(where.size, target);
}

export function createHanoiTower({ arena, params, rng }: GameSetup): MinigameLogic<HanoiState> {
  const startLayers = typeof params.layers === 'number' ? Math.round(Math.min(4, Math.max(3, params.layers))) : 3;
  const events = eventQueue();
  const spacing = arena.width / 3;
  const maxW = Math.min(spacing - 26, 240);
  const layerH = Math.min(52, Math.max(40, (arena.height - HUD_SAFE_TOP) / 11));
  // On a tall phone the stands sit a little above the bottom, the table filling the rest.
  const baseY = Math.min(arena.height - 80, Math.max(HUD_SAFE_TOP + 150 + layerH * (MAX_LAYERS + 2), arena.height * 0.6));
  const state: HanoiState = {
    stands: [[], [], []],
    held: null,
    target: 2,
    layers: startLayers,
    moves: 0,
    best: 1,
    last: null,
    wobble: null,
    nextIn: 0,
    puzzles: 0,
    lastTapAt: -1,
    score: 0,
    time: 0,
    standX: [0, 1, 2].map((i) => spacing * (i + 0.5)),
    baseY,
    layerH,
    maxW,
    minW: maxW * 0.38,
  };

  function layOut(): void {
    const layers = Math.min(MAX_LAYERS, startLayers + Math.floor(state.puzzles / 2));
    const start = rng.int(0, 2);
    let target = rng.int(0, 1);
    if (target >= start) target += 1;
    state.layers = layers;
    state.stands = [[], [], []];
    state.stands[start] = Array.from({ length: layers }, (_, i) => layers - i);
    state.target = target;
    state.held = null;
    state.moves = 0;
    state.best = 2 ** layers - 1;
    state.last = null;
    state.wobble = null;
  }

  const standAt = (p: Point): number => (p.y < HUD_SAFE_TOP - 20 ? -1 : Math.min(2, Math.max(0, Math.floor(p.x / spacing))));
  const top = (stand: number): number | undefined => state.stands[stand]?.at(-1);

  function tap(p: Point): void {
    const stand = standAt(p);
    if (stand < 0) return;
    state.lastTapAt = state.time;
    const x = state.standX[stand] ?? 0;
    if (state.held === null) {
      if (top(stand) === undefined) return;
      state.held = stand;
      events.push({ type: 'action', x, y: baseY - layerH * 4 });
      return;
    }
    const from = state.held;
    const size = top(from);
    if (size === undefined) {
      state.held = null;
      return;
    }
    if (stand === from) {
      state.held = null;
      return;
    }
    const under = top(stand);
    if (under !== undefined && under < size) {
      state.wobble = { stand, t: 0 };
      events.push({ type: 'miss', x, y: baseY - layerH * (state.stands[stand]?.length ?? 0) });
      return;
    }
    state.stands[from]?.pop();
    state.stands[stand]?.push(size);
    state.held = null;
    state.moves += 1;
    state.last = { size, from, to: stand, t: 0 };
    const height = state.stands[stand]?.length ?? 1;
    events.push({ type: 'action', x, y: baseY - layerH * height, note: LAYER_NOTES[size - 1] ?? 72, voice: 'bell' });
    if ((state.stands[state.target]?.length ?? 0) === state.layers) {
      state.score += 1;
      state.puzzles += 1;
      state.nextIn = SOLVED_SECONDS;
      events.push({ type: 'score', x: state.standX[state.target] ?? x, y: baseY - layerH * (state.layers + 1) });
    }
  }

  layOut();

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
      if (state.last) state.last.t += dt;
      if (state.wobble) {
        state.wobble.t += dt;
        if (state.wobble.t > 0.5) state.wobble = null;
      }
      if (state.nextIn > 0) {
        state.nextIn -= dt;
        if (state.nextIn <= 0) {
          state.nextIn = 0;
          layOut();
        }
        return;
      }
      for (const p of input.taps) tap(p);
    },
  };
}

/** Seconds the bot thinks between two taps, like a child checking the sizes. */
const BOT_PAUSE = 0.35;

/** Good play: the shortest solution, one tap at a time. */
export function hanoiBot(state: HanoiState, _context: BotContext): BotMove {
  if (state.nextIn > 0 || state.time - state.lastTapAt < BOT_PAUSE) return {};
  const move = nextMove(state.stands, state.target);
  if (!move) return {};
  const at = (stand: number): Point => ({ x: state.standX[stand] ?? 0, y: state.baseY - state.layerH * 2 });
  if (state.held === null) return { tap: at(move.from) };
  return { tap: at(state.held === move.from ? move.to : state.held) };
}
