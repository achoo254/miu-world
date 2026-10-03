// Pottery wheel (nặn gốm Bát Tràng): a lump of clay spins on the wheel; a dashed outline shows the pot to
// make. The child drags along the side of the clay: wherever her finger is, the clay at that height eases
// toward it (in toward the middle, or out), so sliding up and down the outline shapes the pot. When the clay
// matches the outline closely enough (80 %), the pot is glazed blue and white and goes on the shelf (a point),
// and new clay comes with a new shape. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const SLICES = 14;
/** Match needed for a finished pot, and how far off (units, on average) counts as no match at all. */
export const MATCH_NEEDED = 0.8;
const MATCH_SPAN = 45;
/** Units per second the clay moves toward the finger. */
const SHAPE_SPEED = 320;
const FIRE_SECONDS = 1.3;

/** Pot shapes as (height 0–1, radius) points, radius on a 0–130 scale. */
const SHAPES: readonly (readonly [number, number])[][] = [
  [
    [0, 60],
    [0.35, 118],
    [0.7, 62],
    [0.86, 42],
    [1, 66],
  ],
  [
    [0, 46],
    [0.5, 96],
    [1, 130],
  ],
  [
    [0, 72],
    [0.4, 122],
    [0.8, 92],
    [1, 60],
  ],
  [
    [0, 96],
    [0.45, 102],
    [0.66, 48],
    [1, 34],
  ],
  [
    [0, 52],
    [0.5, 84],
    [1, 70],
  ],
];

/** Radius of a shape at height y (smooth between its points). */
function shapeAt(points: readonly (readonly [number, number])[], y: number): number {
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    if (y <= b[0]) {
      const t = (y - a[0]) / Math.max(1e-6, b[0] - a[0]);
      const s = (1 - Math.cos(t * Math.PI)) / 2;
      return a[1] + (b[1] - a[1]) * s;
    }
  }
  return points[points.length - 1]?.[1] ?? 60;
}

export function matchOf(profile: readonly number[], target: readonly number[]): number {
  let off = 0;
  for (let k = 0; k < target.length; k += 1) off += Math.abs((profile[k] ?? 0) - (target[k] ?? 0));
  return Math.max(0, 1 - off / target.length / MATCH_SPAN);
}

export interface PotteryState {
  /** The wheel's axis, the pot's base and top. */
  axisX: number;
  baseY: number;
  topY: number;
  /** Clay radius at each slice, bottom first, and the outline to match. */
  profile: number[];
  target: number[];
  maxRadius: number;
  match: number;
  finger: Point | null;
  /** Seconds since the pot was finished (glazing and going to the shelf), -1 while shaping. */
  firedAgo: number;
  /** Finished pots (their outlines, for the shelf). */
  shelf: number[][];
  shapes: number;
  score: number;
  time: number;
}

export function makeTarget(rng: Rng, scale: number, start: number): number[] {
  for (;;) {
    const shape = SHAPES[rng.int(0, SHAPES.length - 1)] ?? SHAPES[0] ?? [];
    const grow = rng.range(0.9, 1.08);
    const target = Array.from({ length: SLICES }, (_, k) => shapeAt(shape, k / (SLICES - 1)) * scale * grow);
    // Never a shape the plain lump already nearly is.
    if (matchOf(Array.from({ length: SLICES }, () => start), target) < 0.55) return target;
  }
}

export function createPotteryWheel({ arena, rng }: GameSetup): MinigameLogic<PotteryState> {
  const events = eventQueue();
  const maxRadius = Math.min(140, (arena.width - 120) / 2);
  const scale = maxRadius / 135;
  const start = 85 * scale;
  const baseY = arena.height - 120;
  // Below the shelf and the match bar.
  const height = Math.min(400, baseY - HUD_SAFE_TOP - 200);
  const state: PotteryState = {
    axisX: arena.width / 2,
    baseY,
    topY: baseY - height,
    profile: [],
    target: [],
    maxRadius,
    match: 0,
    finger: null,
    firedAgo: -1,
    shelf: [],
    shapes: 0,
    score: 0,
    time: 0,
  };

  function newClay(): void {
    state.profile = Array.from({ length: SLICES }, () => start);
    state.target = makeTarget(rng, scale, start);
    state.match = matchOf(state.profile, state.target);
    state.firedAgo = -1;
    state.shapes += 1;
  }
  newClay();

  const sliceAt = (y: number): number => ((state.baseY - y) / (state.baseY - state.topY)) * (SLICES - 1);
  let last: Point | null = null;

  const radiusFor = (p: Point): number => Math.min(state.maxRadius + 10, Math.max(22, Math.abs(p.x - state.axisX)));

  /** Clay at every slice the finger passed since the last step eases toward the finger's line there. */
  function shape(p: Point, dt: number): void {
    const prev = last ?? p;
    const from = sliceAt(prev.y);
    const to = sliceAt(p.y);
    const lo = Math.max(0, Math.round(Math.min(from, to)));
    const hi = Math.min(SLICES - 1, Math.round(Math.max(from, to)));
    const stepMax = SHAPE_SPEED * dt;
    for (let k = lo; k <= hi; k += 1) {
      const r = state.profile[k];
      if (r === undefined) continue;
      const along = to === from ? 1 : Math.min(1, Math.max(0, (k - from) / (to - from)));
      const want = radiusFor(prev) + (radiusFor(p) - radiusFor(prev)) * along;
      state.profile[k] = r + Math.max(-stepMax, Math.min(stepMax, want - r));
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
      state.finger = input.pointer;
      if (state.firedAgo >= 0) {
        state.firedAgo += dt;
        if (state.firedAgo >= FIRE_SECONDS) newClay();
        last = null;
        return;
      }
      const p = input.pointer;
      if (p && p.y >= state.topY - 40 && p.y <= state.baseY + 20) shape(p, dt);
      last = p;
      state.match = matchOf(state.profile, state.target);
      if (state.match >= MATCH_NEEDED) {
        state.firedAgo = 0;
        state.score += 1;
        state.shelf.push([...state.profile]);
        events.push({ type: 'score', x: state.axisX, y: (state.baseY + state.topY) / 2, note: 79, voice: 'bell' });
      }
    },
  };
}

/** Good play: runs a finger up and down the outline's right side, a slice or two per decision. */
export function potteryBot(state: PotteryState, context: BotContext): BotMove {
  if (state.firedAgo >= 0) return {};
  // Where the clay is furthest off is where the finger goes, sweeping nearby.
  const sweep = Math.floor(context.time * 10) % (SLICES * 2 - 2);
  const k = sweep < SLICES ? sweep : SLICES * 2 - 2 - sweep;
  const r = state.target[k] ?? 60;
  const y = state.baseY - (k / (SLICES - 1)) * (state.baseY - state.topY);
  return { touch: { x: state.axisX + r, y } };
}
