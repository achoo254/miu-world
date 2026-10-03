// One-stroke drawing: a dotted picture (the envelope house, a fish, a boat, a star…) made of dots and lines.
// The child puts a finger on a dot and draws along the lines from dot to dot, going over every line exactly
// once without lifting. All the lines drawn is a finished picture (a point) and the next comes. Lifting too
// early fades the ink and the picture starts over; after a slip the dots where a stroke can start glow.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Figure {
  /** Dots in a unit square (y down). */
  dots: readonly (readonly [number, number])[];
  lines: readonly (readonly [number, number])[];
}

/** The pictures, easiest first; each has an Euler path (no more than two dots with an odd number of lines). */
export const FIGURES: readonly Figure[] = [
  // Triangle.
  { dots: [[0.5, 0.05], [0.95, 0.9], [0.05, 0.9]], lines: [[0, 1], [1, 2], [2, 0]] },
  // House: square and roof.
  { dots: [[0.1, 0.95], [0.9, 0.95], [0.9, 0.45], [0.1, 0.45], [0.5, 0.05]], lines: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 2]] },
  // Square with one diagonal.
  { dots: [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]], lines: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2]] },
  // Bow tie.
  { dots: [[0.05, 0.15], [0.05, 0.85], [0.5, 0.5], [0.95, 0.15], [0.95, 0.85]], lines: [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 2]] },
  // Envelope with its flap.
  { dots: [[0.05, 0.2], [0.95, 0.2], [0.95, 0.85], [0.05, 0.85], [0.5, 0.55]], lines: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [4, 1]] },
  // Kite with its long stick.
  { dots: [[0.5, 0.05], [0.9, 0.45], [0.5, 0.95], [0.1, 0.45]], lines: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2]] },
  // The envelope house: square, both diagonals and the roof.
  {
    dots: [[0.1, 0.95], [0.9, 0.95], [0.9, 0.45], [0.1, 0.45], [0.5, 0.05]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [1, 3], [3, 4], [4, 2]],
  },
  // Fish: a diamond body and a tail.
  {
    dots: [[0.05, 0.5], [0.4, 0.15], [0.4, 0.85], [0.7, 0.5], [0.95, 0.2], [0.95, 0.8]],
    lines: [[0, 1], [1, 3], [3, 2], [2, 0], [3, 4], [4, 5], [5, 3]],
  },
  // Sailing boat: hull, mast and sail.
  {
    dots: [[0.05, 0.65], [0.5, 0.65], [0.95, 0.65], [0.78, 0.95], [0.22, 0.95], [0.5, 0.05], [0.88, 0.55]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [1, 5], [5, 6], [6, 1]],
  },
  // Five-pointed star.
  {
    dots: [[0.5, 0.03], [0.97, 0.37], [0.79, 0.93], [0.21, 0.93], [0.03, 0.37]],
    lines: [[0, 2], [2, 4], [4, 1], [1, 3], [3, 0]],
  },
];
/** The first pictures always come in this order (gentle start); the rest are shuffled. */
const EASY_FIRST = 2;
const DONE_SECONDS = 1.1;
const FADE_SECONDS = 0.6;
const LINE_NOTES = [60, 62, 64, 65, 67, 69, 71, 72, 74];

export interface OneStrokeState {
  figure: number;
  /** Dots on screen. */
  dots: Point[];
  used: boolean[];
  /** The dot the stroke is at, or -1 when the finger is up. */
  at: number;
  /** Dots visited in order (the ink). */
  trail: number[];
  finger: Point | null;
  phase: 'draw' | 'done' | 'fade';
  phaseAgo: number;
  /** Slipped on this picture: the start dots glow. */
  hint: boolean;
  queue: number[];
  pictures: number;
  score: number;
  time: number;
}

/** Dots with an odd number of lines (where a one-stroke drawing must start, if there are any). */
export function oddDots(figure: Figure): number[] {
  const degree = figure.dots.map(() => 0);
  for (const [a, b] of figure.lines) {
    degree[a] = (degree[a] ?? 0) + 1;
    degree[b] = (degree[b] ?? 0) + 1;
  }
  return degree.map((d, i) => (d % 2 === 1 ? i : -1)).filter((i) => i >= 0);
}

/** A one-stroke order of dots for the lines not yet drawn, starting at `from` (Hierholzer). */
export function eulerPath(figure: Figure, used: readonly boolean[], from: number): number[] {
  const left = figure.lines.map((_, i) => !used[i]);
  const stack = [from];
  const path: number[] = [];
  while (stack.length > 0) {
    const v = stack[stack.length - 1] ?? 0;
    const edge = figure.lines.findIndex(([a, b], i) => left[i] && (a === v || b === v));
    if (edge < 0) {
      path.push(stack.pop() ?? v);
      continue;
    }
    left[edge] = false;
    const [a, b] = figure.lines[edge] ?? [v, v];
    stack.push(a === v ? b : a);
  }
  return path.reverse();
}

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

export function createOneStrokeHouse({ arena, rng }: GameSetup): MinigameLogic<OneStrokeState> {
  const events = eventQueue();
  const free = arena.height - HUD_SAFE_TOP;
  const size = Math.min(arena.width - 90, free - 90, 520);
  const box = { x: (arena.width - size) / 2, y: HUD_SAFE_TOP + (free - size) / 2 };
  const reach = Math.max(TOUCH_RADIUS + 6, 46);
  const state: OneStrokeState = {
    figure: 0,
    dots: [],
    used: [],
    at: -1,
    trail: [],
    finger: null,
    phase: 'draw',
    phaseAgo: 0,
    hint: false,
    queue: [],
    pictures: 0,
    score: 0,
    time: 0,
  };

  const nextFigure = (): void => {
    if (state.queue.length === 0) {
      const rest = shuffle(
        FIGURES.map((_, i) => i).filter((i) => i >= EASY_FIRST),
        rng,
      );
      state.queue = state.pictures === 0 ? [...FIGURES.slice(0, EASY_FIRST).map((_, i) => i), ...rest] : rest;
    }
    state.figure = state.queue.shift() ?? 0;
    const figure = FIGURES[state.figure] ?? FIGURES[0];
    state.dots = (figure?.dots ?? []).map(([x, y]) => ({ x: box.x + x * size, y: box.y + y * size }));
    state.used = (figure?.lines ?? []).map(() => false);
    state.hint = false;
    restart();
  };
  const restart = (): void => {
    state.used = state.used.map(() => false);
    state.at = -1;
    state.trail = [];
    state.phase = 'draw';
    state.phaseAgo = 0;
  };
  const dotNear = (p: Point, except = -1): number => {
    let best = -1;
    let bestD = reach;
    state.dots.forEach((d, i) => {
      const dist = Math.hypot(p.x - d.x, p.y - d.y);
      if (i !== except && dist <= bestD) {
        best = i;
        bestD = dist;
      }
    });
    return best;
  };

  nextFigure();

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
      state.finger = input.pointer;
      if (state.phase === 'done') {
        if (state.phaseAgo >= DONE_SECONDS) {
          state.pictures += 1;
          nextFigure();
        }
        return;
      }
      if (state.phase === 'fade') {
        if (state.phaseAgo >= FADE_SECONDS) restart();
        return;
      }
      const figure = FIGURES[state.figure];
      if (!figure) return;
      const p = input.pointer;
      if (p && state.at < 0 && input.pressed) {
        const start = dotNear(p);
        if (start >= 0) {
          state.at = start;
          state.trail = [start];
          events.push({ type: 'action', x: state.dots[start]?.x ?? p.x, y: state.dots[start]?.y ?? p.y });
        }
      }
      if (p && state.at >= 0) {
        const next = dotNear(p, state.at);
        const line = next < 0 ? -1 : figure.lines.findIndex(([a, b], i) => !state.used[i] && ((a === state.at && b === next) || (b === state.at && a === next)));
        if (line >= 0) {
          state.used[line] = true;
          state.at = next;
          state.trail.push(next);
          const drawn = state.used.filter(Boolean).length;
          const dot = state.dots[next] ?? p;
          if (drawn === state.used.length) {
            state.phase = 'done';
            state.phaseAgo = 0;
            state.score += 1;
            events.push({ type: 'score', x: arena.width / 2, y: box.y + size / 2, note: 79, voice: 'bell' });
          } else events.push({ type: 'action', x: dot.x, y: dot.y, note: LINE_NOTES[(drawn - 1) % LINE_NOTES.length] ?? 72, voice: 'bell' });
        }
      }
      if (input.released && state.at >= 0 && state.phase === 'draw') {
        if (state.trail.length > 1) {
          state.phase = 'fade';
          state.phaseAgo = 0;
          state.hint = true;
          events.push({ type: 'miss', x: state.dots[state.at]?.x ?? 0, y: state.dots[state.at]?.y ?? 0 });
        } else state.at = -1;
      }
    },
  };
}

/** Good play: plans the whole stroke from an odd dot, then goes dot to dot, one dot a decision. */
export function oneStrokeBot(state: OneStrokeState, _context: BotContext): BotMove {
  if (state.phase !== 'draw') return {};
  const figure = FIGURES[state.figure];
  if (!figure) return {};
  if (state.at < 0) {
    const start = oddDots(figure)[0] ?? 0;
    const dot = state.dots[start];
    return dot ? { touch: dot } : {};
  }
  const path = eulerPath(figure, state.used, state.at);
  const next = state.dots[path[1] ?? -1];
  return next ? { touch: next } : {};
}
