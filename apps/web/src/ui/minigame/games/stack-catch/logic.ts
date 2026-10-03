// Stack catch: pancakes drop one at a time, and the child slides the plate (drag, or tap where to go) to catch
// each on top of the stack. A pancake lands where it touches the top layer, so an off-centre catch leaves the
// stack staggered; the stack also sways like a spring when the plate speeds up or brakes, more the taller it
// is. Too much lean, or a stack too staggered, and it topples: the layers fly off and stacking starts again
// from the plate. The score is the tallest stack reached. Pancakes drop on alternating sides, so nobody wins by
// holding still. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

/** One layer's thickness and half width (arena units). */
export const LAYER = 22;
export const HALF_WIDTH = 62;
/** A pancake further than this from the top layer's centre misses. */
export const CATCH_HALF = 70;
/** A landing off centre staggers the new layer by this share of the miss. */
const STAGGER = 0.4;
/** The stack topples when its average stagger or its sway passes these. */
export const COM_LIMIT = 42;
export const SWAY_LIMIT = 72;
/** Sway spring: stiffness, damping, and how much the plate's acceleration pushes a ten-layer stack. */
const SWAY_K = 38;
const SWAY_C = 3.2;
const SWAY_PUSH = 0.07;
const PLATE_MAX_SPEED = 1150;
const PLATE_ACCEL = 3000;
/** Seconds a pancake falls (from the top of the view to the stack), at the start and the end of the round. */
const FALL_START = 1.7;
const FALL_END = 1.15;
const GAP_SECONDS = 0.3;

export interface Layer {
  /** Centre offset from the plate's centre (before sway). */
  dx: number;
  /** Topping on this layer (every few layers): a strawberry or cherries, for show. */
  topping: 0 | 1 | 2;
}

export interface Falling {
  x: number;
  /** Height above the plate (world units, up). */
  h: number;
  vh: number;
  /** Seconds since it hit the ground (missed), -1 while falling. */
  missed: number;
  missedY: number;
}

export interface Debris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  angle: number;
  life: number;
}

export interface StackState {
  plateX: number;
  plateV: number;
  /** Screen y of the plate's top. */
  plateY: number;
  layers: Layer[];
  /** The top's sideways sway (units) and its speed. */
  sway: number;
  swayV: number;
  /** Camera lift: how many world units the view has scrolled up. */
  camera: number;
  falling: Falling | null;
  /** Seconds until the next pancake drops (while none falls). */
  nextIn: number;
  lastX: number;
  debris: Debris[];
  /** Seconds since the stack toppled, or since the last catch (a squash). */
  toppledAgo: number;
  caughtAgo: number;
  best: number;
  time: number;
}

/** Where the top layer's centre is on screen (x). */
export const topX = (s: StackState): number => s.plateX + (s.layers.at(-1)?.dx ?? 0) + s.sway;
/** Average stagger of the layers (how far the stack's weight sits off the plate's centre). */
export const comOffset = (s: StackState): number => (s.layers.length ? s.layers.reduce((sum, l) => sum + l.dx, 0) / s.layers.length : 0);

export function createStackCatch({ arena, duration, params, rng }: GameSetup): MinigameLogic<StackState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const margin = 80;
  const plateY = arena.height - 90;
  const state: StackState = {
    plateX: arena.width / 2,
    plateV: 0,
    plateY,
    layers: [],
    sway: 0,
    swayV: 0,
    camera: 0,
    falling: null,
    nextIn: 0.8,
    lastX: arena.width / 2,
    debris: [],
    toppledAgo: 99,
    caughtAgo: 99,
    best: 0,
    time: 0,
  };
  /** Height of the view above the plate (world units) where pancakes appear. */
  const viewTop = plateY - HUD_SAFE_TOP - 40;
  const stackHeight = (): number => state.layers.length * LAYER;

  function drop(): void {
    // The other side of the screen from the last one, at least 150 units away, never in the middle band (so
    // a plate left in the middle catches nothing).
    const mid = arena.width / 2;
    const left = state.lastX > mid;
    const lo = left ? margin : Math.max(mid + 60, state.lastX + 150);
    const hi = left ? Math.min(mid - 60, state.lastX - 150) : arena.width - margin;
    const x = Math.min(arena.width - margin, Math.max(margin, rng.range(Math.min(lo, hi), Math.max(lo, hi))));
    state.lastX = x;
    const progress = Math.min(1, state.time / duration);
    const h = state.camera + viewTop;
    const fall = (FALL_START + (FALL_END - FALL_START) * progress) / factor;
    state.falling = { x, h, vh: (h - stackHeight()) / fall, missed: -1, missedY: 0 };
  }

  function topple(): void {
    state.layers.forEach((layer, i) => {
      const y = plateY - (i + 0.5) * LAYER + state.camera;
      state.debris.push({ x: state.plateX + layer.dx + state.sway * ((i + 1) / state.layers.length), y, vx: (state.sway >= 0 ? 1 : -1) * rng.range(120, 420), vy: -rng.range(150, 450), spin: rng.range(-8, 8), angle: 0, life: 1.4 });
    });
    events.push({ type: 'hit', x: topX(state), y: plateY - stackHeight() + state.camera });
    state.layers = [];
    state.sway = 0;
    state.swayV = 0;
    state.toppledAgo = 0;
  }

  return {
    state,
    get score() {
      return state.best;
    },
    get done() {
      return false;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.toppledAgo += dt;
      state.caughtAgo += dt;

      // The plate heads for the finger with limited speed and acceleration (smooth, so the sway is fair).
      const target = input.pointer?.x ?? input.taps.at(-1)?.x;
      const before = state.plateV;
      const wanted = target === undefined ? 0 : Math.max(-PLATE_MAX_SPEED, Math.min(PLATE_MAX_SPEED, (Math.min(arena.width - 70, Math.max(70, target)) - state.plateX) * 6));
      const dv = Math.max(-PLATE_ACCEL * dt, Math.min(PLATE_ACCEL * dt, wanted - state.plateV));
      state.plateV += dv;
      state.plateX = Math.min(arena.width - 70, Math.max(70, state.plateX + state.plateV * dt));
      const accel = (state.plateV - before) / dt;

      // The sway: a spring pushed opposite to the plate's acceleration, harder the taller the stack.
      const n = state.layers.length;
      state.swayV += (-SWAY_K * state.sway - SWAY_C * state.swayV - SWAY_PUSH * accel * n) * dt * 6;
      state.sway += state.swayV * dt;
      if (n === 0) {
        state.sway = 0;
        state.swayV = 0;
      } else if (Math.abs(state.sway) > SWAY_LIMIT || Math.abs(comOffset(state)) > COM_LIMIT) topple();

      // The camera keeps the top of the stack in the lower part of the view.
      const want = Math.max(0, stackHeight() - viewTop * 0.45);
      state.camera += (want - state.camera) * Math.min(1, dt * 3);

      const f = state.falling;
      if (f && f.missed < 0) {
        f.h -= f.vh * dt;
        const top = stackHeight();
        if (f.h <= top) {
          const off = f.x - topX(state);
          if (Math.abs(off) <= CATCH_HALF) {
            const baseDx = (state.layers.at(-1)?.dx ?? 0) + (n > 0 ? state.sway : 0);
            const count = state.layers.length + 1;
            state.layers.push({ dx: baseDx + off * STAGGER - (n > 0 ? state.sway : 0), topping: count % 5 === 0 ? 1 : count % 7 === 0 ? 2 : 0 });
            state.caughtAgo = 0;
            state.falling = null;
            state.nextIn = GAP_SECONDS;
            const screenY = plateY - top + state.camera;
            if (state.layers.length > state.best) {
              state.best = state.layers.length;
              events.push({ type: 'score', x: f.x, y: screenY, note: 60 + Math.min(24, state.best * 2), voice: 'bell' });
            } else events.push({ type: 'action', x: f.x, y: screenY });
          } else if (f.h <= 0) {
            f.missed = 0;
            f.missedY = plateY + 40;
            events.push({ type: 'miss', x: f.x, y: plateY + 40 });
          }
        }
      } else if (f) {
        f.missed += dt;
        if (f.missed > 0.6) {
          state.falling = null;
          state.nextIn = GAP_SECONDS;
        }
      } else {
        state.nextIn -= dt;
        if (state.nextIn <= 0) drop();
      }

      for (const d of state.debris) {
        d.vy += 1400 * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.angle += d.spin * dt;
        d.life -= dt;
      }
      state.debris = state.debris.filter((d) => d.life > 0);
    },
  };
}

/** Good play: brings the stack's top under the pancake early, with the finger moving smoothly (no jerks). */
export function stackCatchBot(state: StackState, context: BotContext): BotMove {
  const f = state.falling;
  const topDx = (state.layers.at(-1)?.dx ?? 0) + state.sway;
  // Lean back toward the middle when the stack is staggered: aim the landing to the other side of its weight.
  const correction = -Math.max(-25, Math.min(25, (state.layers.length ? (state.layers.reduce((s, l) => s + l.dx, 0) / state.layers.length) : 0) * 1.2));
  const goal = f && f.missed < 0 ? f.x - topDx - correction : state.plateX;
  // The finger moves at most this far per decision: a steady hand.
  const reach = Math.max(30, 70 - state.layers.length * 2);
  const x = state.plateX + Math.max(-reach, Math.min(reach, goal - state.plateX));
  return { touch: { x: Math.min(context.arena.width - 70, Math.max(70, x)), y: state.plateY } };
}
