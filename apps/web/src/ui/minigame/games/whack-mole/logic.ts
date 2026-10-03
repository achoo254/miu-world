// Whack-a-mole: moles pop out of a grid of holes for a moment; a tap on a mole bonks it (a crowned mole is
// worth three), a tap on a rabbit that pops up instead takes two points back. Moles come faster and stay up
// shorter as the round goes on. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type CritterKind = 'mole' | 'golden' | 'rabbit';

export interface Hole {
  x: number;
  y: number;
  critter: CritterKind | null;
  /** Seconds since the critter started to rise. */
  age: number;
  /** Seconds it stays fully up. */
  stay: number;
  /** Seconds since it was bonked (-1 when not): it shows stars and sinks. */
  bonked: number;
}

export interface Swing {
  x: number;
  y: number;
  age: number;
}

export interface WhackState {
  holes: Hole[];
  /** Size of a critter picture; the tap area is wider. */
  size: number;
  swings: Swing[];
  score: number;
  time: number;
}

export const RISE_SECONDS = 0.16;
const STAY_START = 1.15;
const STAY_END = 0.72;
const GAP_START = 0.78;
const GAP_END = 0.42;
const RABBIT_SHARE = 0.18;
const GOLDEN_SHARE = 0.08;
const RABBIT_PENALTY = 2;

/** How far up the critter is, 0 (in the hole) to 1. */
export function lift(hole: Hole): number {
  if (!hole.critter) return 0;
  if (hole.bonked >= 0) return Math.max(0, 1 - hole.bonked / 0.35);
  if (hole.age < RISE_SECONDS) return hole.age / RISE_SECONDS;
  const down = hole.age - RISE_SECONDS - hole.stay;
  return down <= 0 ? 1 : Math.max(0, 1 - down / RISE_SECONDS);
}

/** The point to tap for a hole: the critter's head when it is up. */
export const headOf = (hole: Hole, size: number): Point => ({ x: hole.x, y: hole.y - size * 0.45 });

export function createWhackMole({ arena, duration, params, rng }: GameSetup): MinigameLogic<WhackState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.6, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const wide = arena.width > arena.height;
  const cols = wide ? 4 : 3;
  const rows = wide ? 3 : 4;
  const top = HUD_SAFE_TOP + 40;
  const bottom = arena.height - 30;
  const rowGap = Math.min(220, (bottom - top) / rows);
  const colGap = Math.min(230, (arena.width - 40) / cols);
  const gridTop = top + (bottom - top - rowGap * rows) / 2;
  const holes: Hole[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      holes.push({ x: arena.width / 2 + (c - (cols - 1) / 2) * colGap, y: gridTop + rowGap * (r + 0.78), critter: null, age: 0, stay: 0, bonked: -1 });
    }
  }
  const state: WhackState = { holes, size: Math.min(118, rowGap * 0.62, colGap * 0.6), swings: [], score: 0, time: 0 };
  let nextPop = 0.8;

  const progress = (): number => Math.min(1, state.time / duration);

  function pop(): void {
    const free = state.holes.filter((h) => !h.critter);
    if (free.length === 0) return;
    const hole = free[rng.int(0, free.length - 1)] ?? free[0];
    if (!hole) return;
    const roll = rng.next();
    hole.critter = roll < RABBIT_SHARE ? 'rabbit' : roll < RABBIT_SHARE + GOLDEN_SHARE ? 'golden' : 'mole';
    hole.age = 0;
    hole.bonked = -1;
    hole.stay = (STAY_START + (STAY_END - STAY_START) * progress()) / factor + (hole.critter === 'rabbit' ? 0.3 : 0);
  }

  function whack(at: Point): void {
    state.swings.push({ x: at.x, y: at.y, age: 0 });
    // The nearest critter that is up enough to see, within a tap area wider than its picture.
    let best: Hole | null = null;
    let bestDistance = Infinity;
    for (const hole of state.holes) {
      if (!hole.critter || hole.bonked >= 0 || lift(hole) < 0.35) continue;
      const head = headOf(hole, state.size);
      const d = Math.hypot(at.x - head.x, at.y - head.y);
      if (d < Math.max(TOUCH_RADIUS, state.size * 0.75) && d < bestDistance) {
        best = hole;
        bestDistance = d;
      }
    }
    if (!best) {
      events.push({ type: 'action', x: at.x, y: at.y });
      return;
    }
    best.bonked = 0;
    const head = headOf(best, state.size);
    if (best.critter === 'rabbit') {
      state.score = Math.max(0, state.score - RABBIT_PENALTY);
      events.push({ type: 'hit', x: head.x, y: head.y });
    } else {
      const points = best.critter === 'golden' ? 3 : 1;
      state.score += points;
      events.push({ type: 'score', x: head.x, y: head.y, points });
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
      for (const tap of input.taps) whack(tap);
      for (const swing of state.swings) swing.age += dt;
      state.swings = state.swings.filter((s) => s.age < 0.3);

      for (const hole of state.holes) {
        if (!hole.critter) continue;
        hole.age += dt;
        if (hole.bonked >= 0) hole.bonked += dt;
        const gone = hole.bonked >= 0.45 || hole.age > RISE_SECONDS * 2 + hole.stay;
        if (gone) {
          if (hole.bonked < 0 && hole.critter !== 'rabbit') events.push({ type: 'miss', x: hole.x, y: hole.y });
          hole.critter = null;
        }
      }
      nextPop -= dt;
      if (nextPop <= 0) {
        pop();
        // Later on, now and then two at once.
        if (progress() > 0.4 && rng.chance(0.25)) pop();
        nextPop += (GAP_START + (GAP_END - GAP_START) * progress()) / factor;
      }
    },
  };
}

/** A quick child sees a mole about this long after it starts to rise. */
const BOT_REACTION = 0.4;

/** Good play: bonk the mole that will hide soonest, after a child's reaction time; leave rabbits alone. */
export function whackMoleBot(state: WhackState, _context: BotContext): BotMove {
  const up = state.holes
    .filter((h) => h.critter && h.critter !== 'rabbit' && h.bonked < 0 && h.age >= BOT_REACTION && lift(h) >= 0.5)
    .sort((a, b) => a.stay - a.age - (b.stay - b.age));
  const target = up[0];
  return target ? { tap: headOf(target, state.size) } : {};
}
