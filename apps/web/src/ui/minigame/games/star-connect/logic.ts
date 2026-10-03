// Star connect: numbered stars in the night sky; the child taps them in order (or drags a finger across
// them) and a line joins each to the last. When the last joins the first, the picture they outline lights up
// (a fish, a house, a kite…) and a new one appears. A wrong star only wobbles. Each star rings a note up the
// scale. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';
import type { SpriteRef } from '../../sprites';

/** A picture's outline in a unit box (y down) and what lights up when it is joined. */
export interface Figure {
  picture: SpriteRef;
  outline: readonly (readonly [number, number])[];
}

export const FIGURES: readonly Figure[] = [
  { picture: 'fish', outline: [[0.02, 0.5], [0.3, 0.18], [0.62, 0.2], [0.8, 0.42], [1, 0.12], [1, 0.88], [0.8, 0.58], [0.62, 0.8], [0.3, 0.82]] },
  { picture: 'house', outline: [[0.12, 1], [0.12, 0.45], [0, 0.45], [0.5, 0], [1, 0.45], [0.88, 0.45], [0.88, 1]] },
  { picture: 'kite', outline: [[0.5, 0], [0.95, 0.38], [0.5, 1], [0.05, 0.38]] },
  { picture: 'heart', outline: [[0.5, 0.25], [0.68, 0.04], [0.92, 0.06], [1, 0.3], [0.85, 0.6], [0.5, 1], [0.15, 0.6], [0, 0.3], [0.08, 0.06], [0.32, 0.04]] },
  { picture: 'butterfly', outline: [[0.5, 0.3], [0.2, 0], [0, 0.3], [0.2, 0.55], [0.05, 0.9], [0.35, 1], [0.5, 0.7], [0.65, 1], [0.95, 0.9], [0.8, 0.55], [1, 0.3], [0.8, 0]] },
  { picture: 'evergreen-tree', outline: [[0.5, 0], [0.95, 0.74], [0.6, 0.74], [0.6, 1], [0.4, 1], [0.4, 0.74], [0.05, 0.74]] },
  { picture: 'balloon', outline: [[0.5, 0], [0.88, 0.15], [1, 0.45], [0.8, 0.78], [0.5, 1], [0.2, 0.78], [0, 0.45], [0.12, 0.15]] },
  { picture: 'glowing-star', outline: Array.from({ length: 10 }, (_, i): [number, number] => {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? 0.5 : 0.24;
      return [0.5 + Math.cos(a) * r, 0.52 + Math.sin(a) * r];
    }) },
];

/** Seconds a finished picture glows before the next. */
const DONE_SECONDS = 1.7;
/** How near (arena units) a tap or a dragging finger must come to a star. */
export const STAR_HIT = 52;
const NOTES = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79];

export interface Dot extends Point {
  /** Seconds since a wrong tap on it (a wobble); large = long ago. */
  wrong: number;
}

export interface StarState {
  figure: Figure;
  dots: Dot[];
  /** Stars joined so far (the next to touch is dots[joined]). */
  joined: number;
  /** Seconds since the picture was finished, -1 while joining. */
  done: number;
  box: { x: number; y: number; w: number; h: number };
  pictures: number;
  lastJoinAt: number;
  score: number;
  time: number;
}

/** `count` points spread evenly along the closed outline, starting at its first corner. */
export function sampleOutline(outline: readonly (readonly [number, number])[], count: number): [number, number][] {
  const edges = outline.map((a, i) => {
    const b = outline[(i + 1) % outline.length] ?? a;
    return { a, b, len: Math.hypot(b[0] - a[0], b[1] - a[1]) };
  });
  const total = edges.reduce((sum, e) => sum + e.len, 0);
  const out: [number, number][] = [];
  for (let k = 0; k < count; k += 1) {
    let d = (total * k) / count;
    for (const e of edges) {
      if (d <= e.len || e === edges[edges.length - 1]) {
        const t = e.len > 0 ? Math.min(1, d / e.len) : 0;
        out.push([e.a[0] + (e.b[0] - e.a[0]) * t, e.a[1] + (e.b[1] - e.a[1]) * t]);
        break;
      }
      d -= e.len;
    }
  }
  return out;
}

/** The box the pictures fill: as big as the screen allows below the HUD, a little taller on a tall phone. */
export function figureBox(arena: { width: number; height: number }): StarState['box'] {
  const w = Math.min(arena.width - 110, 600);
  const free = arena.height - HUD_SAFE_TOP - 70;
  const h = Math.min(free, w * 1.25);
  const side = Math.min(w, h);
  const bw = arena.width > arena.height ? Math.min(w, side * 1.3) : side;
  return { x: (arena.width - bw) / 2, y: HUD_SAFE_TOP + 36 + (free - h) / 2, w: bw, h };
}

function order(rng: Rng): Figure[] {
  const list = [...FIGURES];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    const a = list[i];
    const b = list[j];
    if (a && b) {
      list[i] = b;
      list[j] = a;
    }
  }
  return list;
}

export function createStarConnect({ arena, params, rng }: GameSetup): MinigameLogic<StarState> {
  const count = typeof params.stars === 'number' ? Math.round(Math.min(10, Math.max(6, params.stars))) : 10;
  const events = eventQueue();
  const box = figureBox(arena);
  let deck = order(rng);
  const first = deck[0] ?? FIGURES[0];
  if (!first) throw new Error('star-connect has no figures');
  const state: StarState = { figure: first, dots: [], joined: 0, done: -1, box, pictures: 0, lastJoinAt: -1, score: 0, time: 0 };

  function show(figure: Figure): void {
    state.figure = figure;
    state.dots = sampleOutline(figure.outline, count).map(([u, v]) => ({ x: box.x + u * box.w, y: box.y + v * box.h, wrong: 9 }));
    state.joined = 0;
    state.done = -1;
  }

  function next(): void {
    deck = deck.slice(1);
    if (deck.length === 0) deck = order(rng);
    const figure = deck[0];
    if (figure) show(figure);
  }

  function join(): void {
    const dot = state.dots[state.joined];
    if (!dot) return;
    state.joined += 1;
    state.lastJoinAt = state.time;
    events.push({ type: 'action', x: dot.x, y: dot.y, note: NOTES[state.joined - 1] ?? 72, voice: 'bell' });
    if (state.joined === state.dots.length) {
      state.done = 0;
      state.score += 1;
      state.pictures += 1;
      events.push({ type: 'score', x: box.x + box.w / 2, y: box.y + box.h / 2 });
    }
  }

  const near = (p: Point, d: Point): boolean => Math.hypot(p.x - d.x, p.y - d.y) <= STAR_HIT;

  function tap(p: Point): void {
    const target = state.dots[state.joined];
    if (target && near(p, target)) {
      join();
      return;
    }
    const wrong = state.dots.find((d, i) => i > state.joined && near(p, d));
    if (wrong) {
      wrong.wrong = 0;
      events.push({ type: 'miss', x: wrong.x, y: wrong.y });
    }
  }

  show(first);

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
      for (const d of state.dots) d.wrong += dt;
      if (state.done >= 0) {
        state.done += dt;
        if (state.done >= DONE_SECONDS) next();
        return;
      }
      for (const p of input.taps) tap(p);
      // A finger sliding over the next star joins it too (and the one after, if it reaches it).
      const finger = input.pointer;
      const target = state.dots[state.joined];
      if (finger && target && state.done < 0 && near(finger, target)) join();
    },
  };
}

/** Seconds the bot looks for the next number. */
const BOT_PAUSE = 0.3;

export function starConnectBot(state: StarState, _context: BotContext): BotMove {
  if (state.done >= 0 || state.time - state.lastJoinAt < BOT_PAUSE) return {};
  const target = state.dots[state.joined];
  return target ? { tap: { x: target.x, y: target.y } } : {};
}
