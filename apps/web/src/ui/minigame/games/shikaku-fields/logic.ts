// Shikaku fields (chia ruộng): a grid of paddy plots, some with a number. The child drags from one plot to
// another to mark a rectangle of fields; it stays if it holds exactly one number and that many plots, and does
// not cross a field already marked. Tapping a marked field takes it away. Cover the whole grid: a point, and a
// new grid (4×4 first, then 5×5). If no field is marked for a while, one right field glows as a hint.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Rect {
  c0: number;
  r0: number;
  c1: number;
  r1: number;
}

export interface Clue {
  c: number;
  r: number;
  n: number;
}

export interface ShikakuState {
  n: number;
  clues: Clue[];
  solution: Rect[];
  placed: Rect[];
  drag: { start: [number, number]; current: [number, number] } | null;
  /** Seconds since a rejected rectangle (it flashes red), and which. */
  wrong: Rect | null;
  wrongAgo: number;
  /** Seconds since the last field was marked (a hint shows after HINT_AFTER). */
  idle: number;
  grid: { x: number; y: number; cell: number };
  phase: 'play' | 'done';
  phaseTime: number;
  fields: number;
  score: number;
  time: number;
}

export const HINT_AFTER = 15;
const DONE_PAUSE = 1.3;

const area = (r: Rect): number => (r.c1 - r.c0 + 1) * (r.r1 - r.r0 + 1);
const inside = (r: Rect, c: number, rr: number): boolean => c >= r.c0 && c <= r.c1 && rr >= r.r0 && rr <= r.r1;
const overlaps = (a: Rect, b: Rect): boolean => a.c0 <= b.c1 && b.c0 <= a.c1 && a.r0 <= b.r1 && b.r0 <= a.r1;
export const sameRect = (a: Rect, b: Rect): boolean => a.c0 === b.c0 && a.c1 === b.c1 && a.r0 === b.r0 && a.r1 === b.r1;

export function rectOf(a: [number, number], b: [number, number]): Rect {
  return { c0: Math.min(a[0], b[0]), c1: Math.max(a[0], b[0]), r0: Math.min(a[1], b[1]), r1: Math.max(a[1], b[1]) };
}

/** A grid split into rectangles of 1–6 plots, each with its size written in one plot. */
export function makePuzzle(n: number, rng: Rng): { solution: Rect[]; clues: Clue[] } {
  const taken: boolean[] = Array.from({ length: n * n }, () => false);
  const solution: Rect[] = [];
  for (let i = 0; i < n * n; i += 1) {
    if (taken[i]) continue;
    const c = i % n;
    const r = Math.floor(i / n);
    const shapes: [number, number][] = [];
    for (let w = 1; w <= 3; w += 1) for (let h = 1; h <= 3; h += 1) if (w * h >= 2 && w * h <= 6) shapes.push([w, h]);
    // Try the shapes in a random order; a lone plot is the last resort.
    for (let k = shapes.length - 1; k > 0; k -= 1) {
      const j = rng.int(0, k);
      const a = shapes[k];
      const b = shapes[j];
      if (a && b) {
        shapes[k] = b;
        shapes[j] = a;
      }
    }
    shapes.push([1, 1]);
    for (const [w, h] of shapes) {
      if (c + w > n || r + h > n) continue;
      let free = true;
      for (let y = r; y < r + h && free; y += 1) for (let x = c; x < c + w && free; x += 1) if (taken[y * n + x]) free = false;
      if (!free) continue;
      for (let y = r; y < r + h; y += 1) for (let x = c; x < c + w; x += 1) taken[y * n + x] = true;
      solution.push({ c0: c, r0: r, c1: c + w - 1, r1: r + h - 1 });
      break;
    }
  }
  const clues = solution.map((s) => ({ c: rng.int(s.c0, s.c1), r: rng.int(s.r0, s.r1), n: area(s) }));
  return { solution, clues };
}

/** Whether a rectangle may be marked now. */
export function fitsField(state: ShikakuState, rect: Rect): boolean {
  const inRect = state.clues.filter((k) => inside(rect, k.c, k.r));
  return inRect.length === 1 && inRect[0]?.n === area(rect) && !state.placed.some((p) => overlaps(p, rect));
}

export function createShikaku({ arena, rng }: GameSetup): MinigameLogic<ShikakuState> {
  const events = eventQueue();
  const state: ShikakuState = { n: 4, clues: [], solution: [], placed: [], drag: null, wrong: null, wrongAgo: 9, idle: 0, grid: { x: 0, y: 0, cell: 0 }, phase: 'play', phaseTime: 0, fields: 0, score: 0, time: 0 };

  function deal(): void {
    state.n = state.fields < 2 ? 4 : 5;
    const { solution, clues } = makePuzzle(state.n, rng);
    state.solution = solution;
    state.clues = clues;
    state.placed = [];
    state.drag = null;
    state.idle = 0;
    state.phase = 'play';
    state.phaseTime = 0;
    const top = HUD_SAFE_TOP + 30;
    const side = Math.min(arena.width - 60, arena.height - top - 40);
    const cell = side / state.n;
    state.grid = { x: (arena.width - side) / 2, y: top + (arena.height - top - 40 - side) / 2, cell };
  }

  const cellAt = (p: Point): [number, number] | null => {
    const c = Math.floor((p.x - state.grid.x) / state.grid.cell);
    const r = Math.floor((p.y - state.grid.y) / state.grid.cell);
    return c < 0 || r < 0 || c >= state.n || r >= state.n ? null : [c, r];
  };
  const centreOf = (rect: Rect): Point => ({ x: state.grid.x + ((rect.c0 + rect.c1 + 1) / 2) * state.grid.cell, y: state.grid.y + ((rect.r0 + rect.r1 + 1) / 2) * state.grid.cell });

  function finish(rect: Rect): void {
    const marked = state.placed.find((p) => inside(p, rect.c0, rect.r0));
    // A tap on a marked field takes it away.
    if (marked && area(rect) === 1) {
      state.placed = state.placed.filter((p) => p !== marked);
      events.push({ type: 'action', ...centreOf(marked) });
      return;
    }
    if (!fitsField(state, rect)) {
      state.wrong = rect;
      state.wrongAgo = 0;
      events.push({ type: 'miss', ...centreOf(rect) });
      return;
    }
    state.placed.push(rect);
    state.idle = 0;
    events.push({ type: 'action', ...centreOf(rect), note: 64 + state.placed.length * 2, voice: 'bell' });
    const covered = state.placed.reduce((sum, p) => sum + area(p), 0);
    if (covered === state.n * state.n) {
      state.phase = 'done';
      state.phaseTime = 0;
      state.score += 1;
      state.fields += 1;
      events.push({ type: 'score', x: arena.width / 2, y: state.grid.y + (state.grid.cell * state.n) / 2 });
    }
  }

  deal();

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
      state.phaseTime += dt;
      state.wrongAgo += dt;
      state.idle += dt;
      if (state.phase === 'done') {
        if (state.phaseTime >= DONE_PAUSE) deal();
        return;
      }
      if (input.pressed && input.pointer) {
        const at = cellAt(input.pointer);
        state.drag = at ? { start: at, current: at } : null;
      }
      if (input.pointer && state.drag) {
        const at = cellAt(input.pointer);
        if (at) state.drag.current = at;
      }
      if (input.released && state.drag) {
        finish(rectOf(state.drag.start, state.drag.current));
        state.drag = null;
      }
    },
  };
}

/** The first right field not marked yet (the hint, and the bot's next move). */
export function nextField(state: ShikakuState): Rect | undefined {
  return state.solution.find((s) => !state.placed.some((p) => sameRect(p, s)));
}

/** Good play: marks the right fields one by one, dragging corner to corner. */
export function shikakuBot(state: ShikakuState, _context: BotContext): BotMove {
  if (state.phase !== 'play') return {};
  const target = nextField(state);
  if (!target) return {};
  const at = (c: number, r: number): Point => ({ x: state.grid.x + (c + 0.5) * state.grid.cell, y: state.grid.y + (r + 0.5) * state.grid.cell });
  if (!state.drag) return { touch: at(target.c0, target.r0) };
  const [c, r] = state.drag.current;
  if (c === target.c1 && r === target.r1) return {};
  return { touch: at(target.c1, target.r1) };
}
