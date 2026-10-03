// Hole grow: the yard is a mess of leaves, balls, boxes and bikes. The child drags a hole in the ground around
// it; anything smaller than the hole's mouth tips in, and the hole grows with what it swallows until it can take
// the big things too. Things too big for it only wobble as it passes. Each thing swallowed is a point; a yard
// cleared brings the next messy yard (and a fresh small hole). Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** Size tiers of the things in the yard: radius range and how many. */
export const TIERS: readonly { min: number; max: number; count: number }[] = [
  { min: 15, max: 20, count: 16 },
  { min: 27, max: 32, count: 12 },
  { min: 40, max: 46, count: 8 },
  { min: 56, max: 62, count: 4 },
];
export const START_RADIUS = 30;
/** Share of a swallowed thing's area the hole gains. */
const GROWTH = 0.18;
/** A thing fits when it is smaller than this share of the hole's radius. */
export const FITS = 0.95;
const HOLE_SPEED = 430;
const SWALLOW_NOTES = [60, 64, 67, 72];

export interface Thing {
  tier: number;
  /** Picture choice within the tier (draw.ts). */
  look: number;
  x: number;
  y: number;
  r: number;
  /** Seconds since swallowed; -1 while in the yard. */
  swallowed: number;
  bumpedAt: number;
}

export interface HoleState {
  hole: Point;
  radius: number;
  things: Thing[];
  /** Things in this yard, and swallowed from it. */
  total: number;
  eaten: number;
  yards: number;
  /** Seconds since this yard was laid out (things drop in). */
  yardAgo: number;
  score: number;
  time: number;
}

/** Things (and the hole) are a little smaller in a small yard, so everything fits. */
export const yardScale = (width: number, height: number): number => Math.min(1, Math.sqrt((width * height) / 520000));

/** Things scattered over the yard, none on top of another and none where the hole starts. */
export function scatterThings(rng: Rng, width: number, top: number, bottom: number, start: Point): Thing[] {
  const things: Thing[] = [];
  const k = yardScale(width, bottom - top);
  TIERS.forEach((tier, index) => {
    for (let n = 0; n < tier.count; n += 1) {
      const r = rng.range(tier.min, tier.max) * k;
      for (let tries = 0; tries < 80; tries += 1) {
        const x = rng.range(r + 12, width - r - 12);
        const y = rng.range(top + r + 10, bottom - r - 10);
        const clear = Math.hypot(x - start.x, y - start.y) > 110 + r && things.every((t) => Math.hypot(t.x - x, t.y - y) > t.r + r + 8);
        // A crowded yard leaves out what does not fit.
        if (clear) {
          things.push({ tier: index, look: rng.int(0, 2), x, y, r, swallowed: -1, bumpedAt: -9 });
          break;
        }
      }
    }
  });
  return things;
}

export function createHoleGrow({ arena, rng }: GameSetup): MinigameLogic<HoleState> {
  const events = eventQueue();
  const top = HUD_SAFE_TOP + 10;
  const start = { x: arena.width / 2, y: (top + arena.height) / 2 };
  const things = scatterThings(rng, arena.width, top, arena.height - 10, start);
  const startRadius = START_RADIUS * yardScale(arena.width, arena.height - 10 - top);
  const state: HoleState = { hole: { ...start }, radius: startRadius, things, total: things.length, eaten: 0, yards: 1, yardAgo: 0, score: 0, time: 0 };

  const newYard = (): void => {
    state.things = scatterThings(rng, arena.width, top, arena.height - 10, state.hole);
    state.total = state.things.length;
    state.eaten = 0;
    state.radius = startRadius;
    state.yards += 1;
    state.yardAgo = 0;
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
      state.yardAgo += dt;
      if (state.eaten >= state.total && state.things.every((t) => t.swallowed > 0.4)) newYard();
      const target = input.pointer ?? input.taps[0];
      if (target) {
        const dx = target.x - state.hole.x;
        const dy = target.y - state.hole.y;
        const d = Math.hypot(dx, dy);
        const move = Math.min(d, HOLE_SPEED * dt);
        if (d > 0) {
          state.hole.x += (dx / d) * move;
          state.hole.y += (dy / d) * move;
        }
        state.hole.x = Math.min(arena.width - state.radius * 0.6, Math.max(state.radius * 0.6, state.hole.x));
        state.hole.y = Math.min(arena.height - state.radius * 0.6, Math.max(top, state.hole.y));
      }
      for (const t of state.things) {
        if (t.swallowed >= 0) {
          t.swallowed += dt;
          continue;
        }
        const d = Math.hypot(t.x - state.hole.x, t.y - state.hole.y);
        if (d > state.radius + t.r) continue;
        if (t.r < state.radius * FITS) {
          if (d <= state.radius - t.r * 0.4) {
            t.swallowed = 0;
            state.eaten += 1;
            state.radius = Math.sqrt(state.radius * state.radius + GROWTH * t.r * t.r);
            state.score += 1;
            events.push({ type: 'score', x: t.x, y: t.y, note: SWALLOW_NOTES[t.tier] ?? 60, voice: 'bell' });
          }
        } else if (state.time - t.bumpedAt > 0.6) {
          t.bumpedAt = state.time;
          events.push({ type: 'miss', x: t.x, y: t.y });
        }
      }
    },
  };
}

/** Good play: to the nearest thing that fits (big ones are worth the trip once they fit). */
export function holeBot(state: HoleState, _context: BotContext): BotMove {
  let best: Thing | undefined;
  let bestD = Infinity;
  for (const t of state.things) {
    if (t.swallowed >= 0 || t.r >= state.radius * FITS) continue;
    const d = Math.hypot(t.x - state.hole.x, t.y - state.hole.y) - t.r * 2;
    if (d < bestD) {
      best = t;
      bestD = d;
    }
  }
  return best ? { touch: { x: best.x, y: best.y } } : {};
}
