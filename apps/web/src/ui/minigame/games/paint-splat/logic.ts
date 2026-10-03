// Paint splat ("Ném màu tô tranh"): an uncoloured picture (a house, a boat, a flower, a fish) with a small dot
// of the right colour in each part. The paint ball at the bottom keeps changing colour; the child taps a part
// of the picture while the ball has that part's colour, and the ball splats it in. The wrong colour smudges the
// part (tap it again with the right one). Each part painted right is a point; a finished picture is swapped
// for the next. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** Four paints (draw.ts maps them to theme colours): red, yellow, blue, green. */
export const PAINTS = 4;

/** A part's shapes, in a 1 × 1 box (y down). */
export type PartShape = { kind: 'rect'; x: number; y: number; w: number; h: number } | { kind: 'circle'; x: number; y: number; r: number } | { kind: 'poly'; points: readonly (readonly [number, number])[] };

export interface PartDef {
  paint: number;
  shapes: readonly PartShape[];
  /** A point inside the part and not covered by a part on top (the colour dot, the bot's tap). */
  anchor: readonly [number, number];
}

const rect = (x: number, y: number, w: number, h: number): PartShape => ({ kind: 'rect', x, y, w, h });
const circle = (x: number, y: number, r: number): PartShape => ({ kind: 'circle', x, y, r });
const poly = (...points: (readonly [number, number])[]): PartShape => ({ kind: 'poly', points });

/** Pictures: parts listed bottom first (a later part covers an earlier one). */
export const PICTURES: Readonly<Record<string, readonly PartDef[]>> = {
  house: [
    { paint: 3, shapes: [rect(0, 0.88, 1, 0.12)], anchor: [0.1, 0.94] },
    { paint: 1, shapes: [circle(0.86, 0.14, 0.1)], anchor: [0.86, 0.14] },
    { paint: 2, shapes: [rect(0.18, 0.46, 0.64, 0.42)], anchor: [0.3, 0.8] },
    { paint: 0, shapes: [poly([0.1, 0.48], [0.5, 0.16], [0.9, 0.48])], anchor: [0.5, 0.36] },
    { paint: 3, shapes: [rect(0.5, 0.6, 0.16, 0.28)], anchor: [0.58, 0.74] },
    { paint: 1, shapes: [rect(0.24, 0.54, 0.16, 0.14)], anchor: [0.32, 0.61] },
  ],
  boat: [
    { paint: 2, shapes: [rect(0, 0.74, 1, 0.26)], anchor: [0.12, 0.9] },
    { paint: 1, shapes: [circle(0.16, 0.18, 0.1)], anchor: [0.16, 0.18] },
    { paint: 0, shapes: [poly([0.12, 0.6], [0.88, 0.6], [0.74, 0.8], [0.26, 0.8])], anchor: [0.5, 0.7] },
    { paint: 1, shapes: [poly([0.52, 0.14], [0.52, 0.56], [0.84, 0.56])], anchor: [0.62, 0.46] },
    { paint: 3, shapes: [poly([0.48, 0.22], [0.48, 0.56], [0.24, 0.56])], anchor: [0.41, 0.48] },
  ],
  flower: [
    { paint: 3, shapes: [rect(0.47, 0.42, 0.06, 0.4), poly([0.53, 0.66], [0.8, 0.52], [0.7, 0.7])], anchor: [0.68, 0.63] },
    { paint: 0, shapes: [circle(0.5, 0.18, 0.12), circle(0.32, 0.34, 0.12), circle(0.68, 0.34, 0.12), circle(0.5, 0.5, 0.12)], anchor: [0.5, 0.11] },
    { paint: 1, shapes: [circle(0.5, 0.34, 0.1)], anchor: [0.5, 0.34] },
    { paint: 2, shapes: [poly([0.28, 0.78], [0.72, 0.78], [0.64, 1], [0.36, 1])], anchor: [0.5, 0.9] },
  ],
  fish: [
    { paint: 2, shapes: [rect(0, 0, 1, 1)], anchor: [0.1, 0.12] },
    { paint: 3, shapes: [rect(0.08, 0.62, 0.07, 0.38), rect(0.86, 0.7, 0.07, 0.3)], anchor: [0.115, 0.85] },
    { paint: 0, shapes: [poly([0.68, 0.5], [0.94, 0.28], [0.94, 0.72])], anchor: [0.87, 0.5] },
    { paint: 1, shapes: [poly([0.2, 0.5], [0.4, 0.3], [0.62, 0.32], [0.74, 0.5], [0.62, 0.68], [0.4, 0.7])], anchor: [0.45, 0.5] },
    { paint: 3, shapes: [poly([0.42, 0.32], [0.52, 0.16], [0.6, 0.32])], anchor: [0.52, 0.26] },
  ],
};
export const PICTURE_NAMES = Object.keys(PICTURES);

export interface Part {
  def: PartDef;
  /** 'blank', smudged with a wrong colour, or painted. */
  state: 'blank' | 'smudged' | 'painted';
  smudge: number;
  changedAt: number;
}

export interface Throw {
  paint: number;
  to: Point;
  part: number;
  at: number;
}

export interface PaintSplatState {
  picture: string;
  parts: Part[];
  /** The picture's box. */
  box: { x: number; y: number; size: number };
  ball: Point;
  /** Paint the ball has now, and seconds per colour. */
  paint: number;
  paintFor: number;
  paintSince: number;
  throws: Throw[];
  nextIn: number;
  pictures: number;
  score: number;
  time: number;
}

const COLOUR_SECONDS = 1.0;
const FLIGHT = 0.25;
const NEXT_SECONDS = 1.2;

function inShape(s: PartShape, x: number, y: number): boolean {
  if (s.kind === 'rect') return x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h;
  if (s.kind === 'circle') return Math.hypot(x - s.x, y - s.y) <= s.r;
  let inside = false;
  const pts = s.points;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
    const [xi, yi] = pts[i] ?? [0, 0];
    const [xj, yj] = pts[j] ?? [0, 0];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** The topmost part of a picture under a point of its box (0 … 1 coordinates), or -1. */
export function partAt(parts: readonly PartDef[], x: number, y: number): number {
  for (let i = parts.length - 1; i >= 0; i -= 1) if (parts[i]?.shapes.some((s) => inShape(s, x, y))) return i;
  return -1;
}

export function createPaintSplat({ arena, rng }: GameSetup): MinigameLogic<PaintSplatState> {
  const events = eventQueue();
  const size = Math.min(arena.width - 40, arena.height - HUD_SAFE_TOP - 200, 480);
  const box = { x: (arena.width - size) / 2, y: HUD_SAFE_TOP + 20 + (arena.height - HUD_SAFE_TOP - 200 - size) / 2, size };
  const state: PaintSplatState = {
    picture: 'house',
    parts: [],
    box,
    ball: { x: arena.width / 2, y: arena.height - 85 },
    paint: 0,
    paintFor: COLOUR_SECONDS,
    paintSince: 0,
    throws: [],
    nextIn: 0,
    pictures: 0,
    score: 0,
    time: 0,
  };
  const order = [...PICTURE_NAMES];
  const start = rng.int(0, order.length - 1);
  const newPicture = (): void => {
    state.picture = order[(start + state.pictures) % order.length] ?? 'house';
    state.parts = (PICTURES[state.picture] ?? []).map((def) => ({ def, state: 'blank', smudge: 0, changedAt: -9 }));
  };
  newPicture();

  const nextPaint = (r: Rng): void => {
    // Never the same colour twice running; colours still needed come more often.
    const needed = state.parts.filter((p) => p.state !== 'painted').map((p) => p.def.paint);
    let next = r.chance(0.7) && needed.length > 0 ? (needed[r.int(0, needed.length - 1)] ?? 0) : r.int(0, PAINTS - 1);
    if (next === state.paint) next = (next + 1 + r.int(0, PAINTS - 2)) % PAINTS;
    state.paint = next;
    state.paintSince = 0;
  };

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
      state.paintSince += dt;
      if (state.paintSince >= state.paintFor) nextPaint(rng);
      for (const t of state.throws) {
        if (state.time - t.at < FLIGHT) continue;
        const part = state.parts[t.part];
        if (!part || part.state === 'painted') continue;
        part.changedAt = state.time;
        if (part.def.paint === t.paint) {
          part.state = 'painted';
          state.score += 1;
          events.push({ type: 'score', x: t.to.x, y: t.to.y, note: 72 + t.paint * 3, voice: 'bell' });
          if (state.parts.every((p) => p.state === 'painted')) state.nextIn = NEXT_SECONDS;
        } else {
          part.state = 'smudged';
          part.smudge = t.paint;
          events.push({ type: 'miss', x: t.to.x, y: t.to.y });
        }
      }
      state.throws = state.throws.filter((t) => state.time - t.at < FLIGHT);
      if (state.nextIn > 0) {
        state.nextIn -= dt;
        if (state.nextIn <= 0) {
          state.pictures += 1;
          newPicture();
        }
        return;
      }
      for (const tap of input.taps) {
        const i = partAt(
          state.parts.map((p) => p.def),
          (tap.x - box.x) / box.size,
          (tap.y - box.y) / box.size,
        );
        const part = state.parts[i];
        if (!part || part.state === 'painted' || state.throws.some((t) => t.part === i)) continue;
        state.throws.push({ paint: state.paint, to: tap, part: i, at: state.time });
        events.push({ type: 'action', x: state.ball.x, y: state.ball.y });
      }
    },
  };
}

/** Good play: a part that wants the ball's colour, while the colour has a moment left. */
export function paintSplatBot(state: PaintSplatState, _context: BotContext): BotMove {
  if (state.nextIn > 0 || state.paintFor - state.paintSince < 0.12 || state.paintSince < 0.15) return {};
  const i = state.parts.findIndex((p, k) => p.state !== 'painted' && p.def.paint === state.paint && !state.throws.some((t) => t.part === k));
  const part = state.parts[i];
  if (!part) return {};
  const [ax, ay] = part.def.anchor;
  return { tap: { x: state.box.x + ax * state.box.size, y: state.box.y + ay * state.box.size } };
}
