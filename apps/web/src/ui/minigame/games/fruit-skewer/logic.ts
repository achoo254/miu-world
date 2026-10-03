// Fruit skewer: a skewer shows the start of a pattern (strawberry-banana, or banana-banana-grape, or three
// fruits) and empty places after it. Fruit rides past on a belt; the child taps the fruit that comes next in the
// pattern and it flies onto the skewer. A full skewer is a point and a new pattern. A wrong fruit slides the
// skewer back to its start (that skewer is made again), so tapping at random gets nowhere. The belt always
// carries the fruit that is needed, among others, and a taken fruit's place is filled again from the hopper.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** Fruit kinds (draw.ts has a picture for each). */
export const KINDS = 8;
export const SLOTS = 6;

export interface BeltFruit {
  kind: number;
  x: number;
  /** Seconds since it was taken (flying to the skewer), or -1 on the belt. */
  taken: number;
  /** The skewer place it flies to once taken. */
  slot: number;
  /** Seconds since it dropped onto the belt (a taken fruit's place is refilled from the hopper). */
  age: number;
}

export interface FruitSkewerState {
  /** The repeating unit, e.g. [0, 1] for A-B. */
  unit: number[];
  /** Fruit on the skewer so far (starts with one unit). */
  skewer: number[];
  belt: BeltFruit[];
  beltY: number;
  fruitSize: number;
  skewerAt: { x: number; y: number; w: number };
  /** Seconds left before the hand can take fruit again after a wrong one. */
  lock: number;
  /** Seconds since the skewer was finished (it slides away), or -1. */
  finished: number;
  /** Seconds since a wrong fruit (the skewer shakes). */
  wrongAgo: number;
  skewers: number;
  lastTapAt: number;
  score: number;
  time: number;
}

const BELT_SPEED = 150;
const GAP = 105;
const WRONG_LOCK = 0.7;
const FINISH_SECONDS = 0.9;

/** The kind the skewer needs next. */
export const nextKind = (state: FruitSkewerState): number => state.unit[state.skewer.length % state.unit.length] ?? 0;

function makeUnit(rng: Rng, skewers: number): number[] {
  const kinds: number[] = [];
  while (kinds.length < 3) {
    const k = rng.int(0, KINDS - 1);
    if (!kinds.includes(k)) kinds.push(k);
  }
  const [a = 0, b = 1, c = 2] = kinds;
  if (skewers < 2) return [a, b];
  const shapes = [
    [a, b],
    [a, a, b],
    [a, b, b],
    [a, b, c],
  ];
  return shapes[rng.int(0, shapes.length - 1)] ?? [a, b];
}

/** Centre of a place on the skewer (the handle is on the left). */
export const slotPoint = (state: FruitSkewerState, i: number): Point => ({ x: state.skewerAt.x + 50 + (i + 0.5) * ((state.skewerAt.w - 70) / SLOTS), y: state.skewerAt.y });

export function createFruitSkewer({ arena, params, rng }: GameSetup): MinigameLogic<FruitSkewerState> {
  const speed = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const fruitSize = Math.max(TOUCH_RADIUS * 2, Math.min(100, arena.width / 7.5));
  const skewerW = Math.min(arena.width - 60, SLOTS * fruitSize * 1.05 + 60);
  const skewerAt = { x: (arena.width - skewerW) / 2, y: HUD_SAFE_TOP + 40 + fruitSize / 2 + (arena.height - HUD_SAFE_TOP) * 0.08, w: skewerW };
  const beltY = Math.max(skewerAt.y + fruitSize * 2.4, arena.height * 0.66);
  const state: FruitSkewerState = {
    unit: [],
    skewer: [],
    belt: [],
    beltY,
    fruitSize,
    skewerAt,
    lock: 0,
    finished: -1,
    wrongAgo: 9,
    skewers: 0,
    lastTapAt: -1,
    score: 0,
    time: 0,
  };

  function newSkewer(): void {
    state.unit = makeUnit(rng, state.skewers);
    state.skewer = [...state.unit];
    state.finished = -1;
  }

  /**
   * What rides onto the belt: mostly the pattern's own fruit (each is needed again soon, and fruit takes a few
   * seconds to cross), sometimes the very next one, sometimes something else.
   */
  function spawnKind(): number {
    const roll = rng.next();
    if (roll < 0.3) return nextKind(state);
    if (roll < 0.85) return state.unit[rng.int(0, state.unit.length - 1)] ?? 0;
    return rng.int(0, KINDS - 1);
  }

  newSkewer();
  for (let x = arena.width - GAP / 2; x > -GAP; x -= GAP) state.belt.push({ kind: spawnKind(), x, taken: -1, slot: -1, age: 9 });


  function take(fruit: BeltFruit): void {
    state.lastTapAt = state.time;
    if (fruit.kind === nextKind(state)) {
      fruit.taken = 0;
      fruit.slot = state.skewer.length;
      state.skewer.push(fruit.kind);
      // The hopper drops a new fruit into the gap.
      state.belt.push({ kind: spawnKind(), x: fruit.x, taken: -1, slot: -1, age: 0 });
      events.push({ type: 'action', x: fruit.x, y: beltY });
      if (state.skewer.length >= SLOTS) {
        state.finished = 0;
        state.score += 1;
        state.skewers += 1;
        events.push({ type: 'score', ...slotPoint(state, SLOTS / 2) });
      }
      return;
    }
    // Wrong fruit: this skewer starts again from its pattern.
    state.skewer = [...state.unit];
    state.lock = WRONG_LOCK;
    state.wrongAgo = 0;
    events.push({ type: 'hit', x: fruit.x, y: beltY });
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
      state.lock = Math.max(0, state.lock - dt);
      state.wrongAgo += dt;
      // The belt.
      for (const f of state.belt) {
        f.age += dt;
        if (f.taken >= 0) f.taken += dt;
        else f.x += BELT_SPEED * speed * dt;
      }
      state.belt = state.belt.filter((f) => f.x < arena.width + GAP && f.taken < 0.4);
      const first = state.belt.reduce((min, f) => (f.taken < 0 ? Math.min(min, f.x) : min), Infinity);
      if (first > -GAP / 2) state.belt.push({ kind: spawnKind(), x: (Number.isFinite(first) ? first : 0) - GAP, taken: -1, slot: -1, age: 9 });

      if (state.finished >= 0) {
        state.finished += dt;
        if (state.finished >= FINISH_SECONDS) newSkewer();
        return;
      }
      if (state.lock > 0) return;
      for (const tap of input.taps) {
        if (Math.abs(tap.y - beltY) > fruitSize * 0.9) continue;
        let best: BeltFruit | null = null;
        for (const f of state.belt) {
          if (f.taken >= 0) continue;
          const d = Math.abs(f.x - tap.x);
          if (d <= fruitSize * 0.75 && (!best || d < Math.abs(best.x - tap.x))) best = f;
        }
        if (best) {
          take(best);
          break;
        }
      }
    },
  };
}

/** Good play: the needed fruit that is fully on screen and furthest along, a breath between picks. */
export function fruitSkewerBot(state: FruitSkewerState, context: BotContext): BotMove {
  if (state.finished >= 0 || state.lock > 0 || state.time - state.lastTapAt < 0.35) return {};
  const want = nextKind(state);
  const options = state.belt.filter((f) => f.taken < 0 && f.kind === want && f.x > 60 && f.x < context.arena.width - 80);
  options.sort((a, b) => b.x - a.x);
  const pick = options[0];
  return pick ? { tap: { x: pick.x + 10, y: state.beltY } } : {};
}
