// Fruit merge: fruit drops into a box where it rolls and stacks like real fruit. Two of the same fruit that
// touch merge into the next bigger one (cherry → strawberry → grapes → lemon → apple → pineapple → coconut
// → watermelon), scoring more the bigger the new fruit. The child taps where to drop the next fruit (the
// fruit after it is shown). If the pile stays over the line at the top of the box, the round stops (points
// kept). Simple circle physics, the same every time for a seed. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export const FRUITS: readonly SpriteName[] = ['cherries', 'strawberry', 'grapes', 'lemon', 'red-apple', 'pineapple', 'coconut', 'watermelon'];
/** Radius of each fruit in a full-size box (560 × 640). */
const RADII = [26, 35, 45, 55, 66, 78, 91, 106] as const;
/** Points for making each fruit. */
export const POINTS = [0, 1, 2, 4, 6, 9, 13, 20] as const;
const WATERMELON_PAIR_POINTS = 30;
const GRAVITY = 1500;
const ITERATIONS = 5;
const DROP_COOLDOWN = 0.8;
/** Seconds the pile may stay over the top line before the round stops. */
const OVERFLOW_SECONDS = 1.8;

export interface Fruit {
  id: number;
  level: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Seconds since it was dropped or made (a pop when made). */
  age: number;
}

export interface FruitMergeState {
  left: number;
  right: number;
  top: number;
  bottom: number;
  /** The line the pile must stay under. */
  lineY: number;
  /** Size of fruit in this box (1 in a full-size box). */
  scale: number;
  fruits: Fruit[];
  current: number;
  next: number;
  /** Where the next fruit hangs (follows the finger). */
  holderX: number;
  cooldown: number;
  overflow: number;
  over: boolean;
  /** Fruit just merged, for a burst: where and how long ago. */
  merges: { x: number; y: number; level: number; t: number }[];
  best: number;
  score: number;
  time: number;
}

export const radiusOf = (state: FruitMergeState, level: number): number => (RADII[level] ?? 84) * state.scale;

export function createFruitMerge({ arena, rng }: GameSetup): MinigameLogic<FruitMergeState> {
  const events = eventQueue();
  const width = Math.min(arena.width - 40, 640);
  const bottom = arena.height - 30;
  const top = Math.max(HUD_SAFE_TOP + 90, bottom - 760);
  const state: FruitMergeState = {
    left: (arena.width - width) / 2,
    right: (arena.width + width) / 2,
    top,
    bottom,
    lineY: top + 30,
    // Fruit sized to the box's room, so a short wide box holds as much as a tall one.
    scale: Math.min(1, Math.sqrt((width * (bottom - top)) / (560 * 640))),
    fruits: [],
    current: 0,
    next: 1,
    holderX: arena.width / 2,
    cooldown: 0,
    overflow: 0,
    over: false,
    merges: [],
    best: 0,
    score: 0,
    time: 0,
  };
  let nextId = 0;
  /** The five smallest fruit come to the holder, small ones more often. */
  const nextFruit = (): number => {
    const roll = rng.next();
    return roll < 0.3 ? 0 : roll < 0.55 ? 1 : roll < 0.75 ? 2 : roll < 0.9 ? 3 : 4;
  };

  const clampX = (x: number, level: number): number => {
    const r = radiusOf(state, level);
    return Math.min(state.right - r, Math.max(state.left + r, x));
  };

  function drop(x: number): void {
    if (state.cooldown > 0 || state.over) return;
    const level = state.current;
    state.fruits.push({ id: (nextId += 1), level, x: clampX(x, level), y: state.top - radiusOf(state, level) - 6, vx: 0, vy: 0, age: 0 });
    state.current = state.next;
    state.next = nextFruit();
    state.cooldown = DROP_COOLDOWN;
    events.push({ type: 'action', x, y: state.top });
  }

  function merge(a: Fruit, b: Fruit): void {
    state.fruits = state.fruits.filter((f) => f !== a && f !== b);
    const x = (a.x + b.x) / 2;
    const y = (a.y + b.y) / 2;
    if (a.level >= FRUITS.length - 1) {
      state.score += WATERMELON_PAIR_POINTS;
      events.push({ type: 'score', x, y, points: WATERMELON_PAIR_POINTS, note: 84, voice: 'bell' });
      return;
    }
    const level = a.level + 1;
    state.fruits.push({ id: (nextId += 1), level, x, y, vx: (a.vx + b.vx) / 2, vy: Math.min(a.vy, b.vy) - 120, age: 0 });
    state.merges.push({ x, y, level, t: 0 });
    state.best = Math.max(state.best, level);
    const points = POINTS[level] ?? 1;
    state.score += points;
    events.push({ type: 'score', x, y, points, note: 60 + level * 2, voice: 'bell' });
  }

  function physics(dt: number): void {
    for (const f of state.fruits) {
      f.age += dt;
      f.vy += GRAVITY * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
    }
    for (let it = 0; it < ITERATIONS; it += 1) {
      const fruits = state.fruits;
      for (let i = 0; i < fruits.length; i += 1) {
        const a = fruits[i];
        if (!a) continue;
        for (let j = i + 1; j < fruits.length; j += 1) {
          const b = fruits[j];
          if (!b) continue;
          const ra = radiusOf(state, a.level);
          const rb = radiusOf(state, b.level);
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 0.01;
          const overlap = ra + rb - d;
          if (overlap <= 0) continue;
          if (a.level === b.level) {
            merge(a, b);
            return physics(0);
          }
          // Push apart, the lighter one more; take out the speed along the contact.
          const nx = dx / d;
          const ny = dy / d;
          const ma = ra * ra;
          const mb = rb * rb;
          const share = mb / (ma + mb);
          a.x -= nx * overlap * share;
          a.y -= ny * overlap * share;
          b.x += nx * overlap * (1 - share);
          b.y += ny * overlap * (1 - share);
          const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rel < 0) {
            const impulse = rel * 1.1;
            a.vx += nx * impulse * share;
            a.vy += ny * impulse * share;
            b.vx -= nx * impulse * (1 - share);
            b.vy -= ny * impulse * (1 - share);
          }
        }
      }
      for (const f of state.fruits) {
        const r = radiusOf(state, f.level);
        if (f.x - r < state.left) {
          f.x = state.left + r;
          f.vx = Math.abs(f.vx) * 0.3;
        }
        if (f.x + r > state.right) {
          f.x = state.right - r;
          f.vx = -Math.abs(f.vx) * 0.3;
        }
        if (f.y + r > state.bottom) {
          f.y = state.bottom - r;
          f.vy = -Math.abs(f.vy) * 0.15;
          f.vx *= 0.96;
        }
      }
    }
    // A little air drag keeps the pile calm.
    for (const f of state.fruits) {
      f.vx *= 0.995;
      f.vy *= 0.998;
    }
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.over;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.cooldown = Math.max(0, state.cooldown - dt);
      if (input.pointer) state.holderX = clampX(input.pointer.x, state.current);
      for (const tap of input.taps) {
        if (tap.y <= HUD_SAFE_TOP) continue;
        state.holderX = clampX(tap.x, state.current);
        drop(tap.x);
      }
      physics(dt);
      for (const m of state.merges) m.t += dt;
      state.merges = state.merges.filter((m) => m.t < 0.4);
      // Overflow: settled fruit poking above the line for a while.
      const above = state.fruits.some((f) => f.age > 1 && f.y - radiusOf(state, f.level) < state.lineY);
      state.overflow = above ? state.overflow + dt : 0;
      if (state.overflow >= OVERFLOW_SECONDS) state.over = true;
    },
  };
}

/** Good play: drop where the fruit lands on its own kind; otherwise next to its own kind, or low and to the side. */
export function fruitMergeBot(state: FruitMergeState, _context: BotContext): BotMove {
  if (state.cooldown > 0) return {};
  const level = state.current;
  const r = radiusOf(state, level);
  let bestX = state.left + r;
  let bestValue = -Infinity;
  for (let i = 0; i <= 20; i += 1) {
    const x = state.left + r + ((state.right - state.left - 2 * r) * i) / 20;
    // The first fruit the drop would land on: the highest one under it.
    const under = state.fruits.filter((f) => Math.abs(f.x - x) < radiusOf(state, f.level) + r * 0.8).sort((a, b) => a.y - radiusOf(state, a.level) - (b.y - radiusOf(state, b.level)))[0];
    const landY = under ? under.y - radiusOf(state, under.level) : state.bottom;
    let value = landY * 0.05;
    if (under?.level === level) value += 100;
    else if (under && under.level < level) value -= 20;
    // Big fruit to the sides, small ones toward the middle of the pile.
    value -= Math.abs(x - (state.left + state.right) / 2) * (level >= 3 ? -0.02 : 0.01);
    if (value > bestValue) {
      bestValue = value;
      bestX = x;
    }
  }
  return { tap: { x: bestX, y: state.top + 40 } };
}
