// Fruit slice: fruit is tossed up from below the board; a swipe through a fruit cuts it in two (a point
// each). A cactus is tossed now and then: cutting one costs one of three hearts. The blade follows the finger
// as it moves (several fruit in one stroke all count); a flick too quick for the screen to see still cuts
// along its straight line. A fruit that falls back uncut is only missed. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const FRUITS = ['watermelon', 'pineapple', 'banana', 'lemon', 'strawberry', 'grapes', 'red-apple', 'coconut'] as const;
export type FruitKind = (typeof FRUITS)[number] | 'cactus';

export interface Thrown {
  kind: FruitKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Radius of the picture; the blade cuts a little wider than that. */
  r: number;
  /** Spin (radians) and spin speed. */
  angle: number;
  spin: number;
  /** Seconds since it was cut (-1 while whole), and the angle of the cut. */
  cut: number;
  cutAngle: number;
}

export interface Splat {
  x: number;
  y: number;
  kind: FruitKind;
  age: number;
}

export interface FruitSliceState {
  items: Thrown[];
  splats: Splat[];
  /** Recent blade points (newest last) with their age, for the streak. */
  blade: { x: number; y: number; age: number }[];
  lives: number;
  score: number;
  time: number;
  gravity: number;
  /** Seconds since a cactus was cut (the board flashes). */
  ouchAgo: number;
}

const LIVES = 3;
const RADIUS = 46;
/** The blade cuts this much wider than the picture (children's swipes are loose). */
const CUT_SLACK = 1.3;
const CACTUS_SHARE = 0.16;
/** Seconds a tossed thing stays up (its rise and fall), whatever the screen's height. */
const HANG_SECONDS = 2.7;
const GAP_START = 1.0;
const GAP_END = 0.8;
const BLADE_SECONDS = 0.16;
/** Blade moves shorter than this (units) in a step do not cut: a finger resting on the board is not a knife. */
const MIN_STROKE = 8;

/** Distance from point p to the segment a–b. */
export function segmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function createFruitSlice({ arena, duration, params, rng }: GameSetup): MinigameLogic<FruitSliceState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const launchY = arena.height + RADIUS + 10;
  const apexLow = HUD_SAFE_TOP + 70;
  const apexHigh = HUD_SAFE_TOP + (arena.height - HUD_SAFE_TOP) * 0.4;
  const rise = launchY - (apexLow + apexHigh) / 2;
  const state: FruitSliceState = { items: [], splats: [], blade: [], lives: LIVES, score: 0, time: 0, gravity: (8 * rise) / (HANG_SECONDS * HANG_SECONDS), ouchAgo: 9 };
  let nextWave = 0.6;
  let last: Point | null = null;
  /** The finger was seen moving during this touch (then its release flick is not cut twice). */
  let traced = false;

  function toss(): void {
    const count = rng.chance(0.25 + 0.35 * Math.min(1, state.time / duration)) ? rng.int(2, 3) : 1;
    let cactusThisWave = false;
    for (let i = 0; i < count; i += 1) {
      const cactus = !cactusThisWave && rng.chance(CACTUS_SHARE);
      if (cactus) cactusThisWave = true;
      const x = rng.range(arena.width * 0.18, arena.width * 0.82);
      const apex = rng.range(apexLow, apexHigh);
      const vy = -Math.sqrt(2 * state.gravity * (launchY - apex));
      // Drift toward the middle so it stays on screen.
      const flight = (2 * -vy) / state.gravity;
      const landX = rng.range(arena.width * 0.2, arena.width * 0.8);
      state.items.push({
        kind: cactus ? 'cactus' : rng.pick(FRUITS),
        x,
        y: launchY,
        vx: (landX - x) / flight,
        vy,
        r: RADIUS,
        angle: rng.range(0, Math.PI * 2),
        spin: rng.range(-3, 3),
        cut: -1,
        cutAngle: 0,
      });
    }
  }

  /** Cuts everything whole along the stroke a–b. */
  function slash(a: Point, b: Point): void {
    if (Math.hypot(b.x - a.x, b.y - a.y) < MIN_STROKE) return;
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    for (const item of state.items) {
      if (item.cut >= 0 || segmentDistance(item, a, b) > Math.max(TOUCH_RADIUS, item.r * CUT_SLACK)) continue;
      item.cut = 0;
      item.cutAngle = angle;
      if (item.kind === 'cactus') {
        state.lives -= 1;
        state.ouchAgo = 0;
        events.push({ type: 'hit', x: item.x, y: item.y });
      } else {
        state.score += 1;
        state.splats.push({ x: item.x, y: item.y, kind: item.kind, age: 0 });
        events.push({ type: 'score', x: item.x, y: item.y });
      }
    }
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.lives <= 0;
    },
    get lives() {
      return state.lives;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.ouchAgo += dt;

      // The blade: along the finger's path while it moves; a flick nobody saw move cuts along its line.
      if (input.pressed) traced = false;
      if (input.pointer) {
        if (last) {
          if (Math.hypot(input.pointer.x - last.x, input.pointer.y - last.y) >= MIN_STROKE) traced = true;
          slash(last, input.pointer);
        }
        state.blade.push({ ...input.pointer, age: 0 });
        last = input.pointer;
      } else last = null;
      for (const swipe of input.swipes) {
        if (traced) continue;
        const end = { x: swipe.from.x + swipe.dx, y: swipe.from.y + swipe.dy };
        slash(swipe.from, end);
        state.blade.push({ ...swipe.from, age: 0 }, { ...end, age: 0 });
      }
      if (input.released) traced = false;
      for (const p of state.blade) p.age += dt;
      state.blade = state.blade.filter((p) => p.age < BLADE_SECONDS);

      nextWave -= dt;
      if (nextWave <= 0) {
        toss();
        nextWave += (GAP_START + (GAP_END - GAP_START) * Math.min(1, state.time / duration)) / factor;
      }
      for (const item of state.items) {
        item.vy += state.gravity * dt;
        item.x += item.vx * dt;
        item.y += item.vy * dt;
        item.angle += item.spin * dt;
        if (item.cut >= 0) item.cut += dt;
        else if (item.vy > 0 && item.y > launchY && item.kind !== 'cactus') {
          item.cut = 99;
          events.push({ type: 'miss', x: item.x, y: arena.height - 20 });
        }
      }
      state.items = state.items.filter((i) => i.y < launchY + 40 && i.cut < 1.2);
      for (const s of state.splats) s.age += dt;
      state.splats = state.splats.filter((s) => s.age < 1.5);
    },
  };
}

const STROKES: readonly Point[] = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: 0.7, y: 0.7 },
  { x: 0.7, y: -0.7 },
];

/** Good play: a short stroke through a fruit in view, the way that cuts the most fruit and no cactus. */
export function fruitSliceBot(state: FruitSliceState, { arena }: BotContext): BotMove {
  const whole = state.items.filter((i) => i.cut < 0 && i.y > HUD_SAFE_TOP + 20 && i.y < arena.height - 20);
  const cacti = whole.filter((i) => i.kind === 'cactus');
  let best: { from: Point; dx: number; dy: number; fruit: number } | null = null;
  for (const target of whole) {
    if (target.kind === 'cactus') continue;
    for (const d of STROKES) {
      const from = { x: target.x - d.x * 80, y: target.y - d.y * 80 };
      const to = { x: target.x + d.x * 80, y: target.y + d.y * 80 };
      if (cacti.some((c) => segmentDistance(c, from, to) < c.r * CUT_SLACK + 30)) continue;
      const fruit = whole.filter((f) => f.kind !== 'cactus' && segmentDistance(f, from, to) < f.r).length;
      if (!best || fruit > best.fruit) best = { from, dx: to.x - from.x, dy: to.y - from.y, fruit };
    }
  }
  return best ? { swipe: { from: best.from, dx: best.dx, dy: best.dy } } : {};
}
