// Farmer defense (like Plants vs. Zombies, gently): birds fly along three rows of the paddy toward the rice
// sheaves at the end. The child drags farmers from the hut onto the field (or taps a spot; four farmers at
// most, and a farmer can be dragged to another spot). A farmer waves his hat at the nearest bird coming down
// his row within reach: a bird waved at enough flies off for good (a point). Tapping a bird startles it back
// a little (it is not chased off). A bird that reaches the rice carries one sheaf away (the hearts); all ten
// gone ends the round. Birds come more often as the round goes on. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const ROWS = 3;
/** Spots along each row where a farmer can stand (0 where birds come in, 1 at the rice). */
export const SPOTS = [0.3, 0.48, 0.66, 0.82] as const;
export const MAX_FARMERS = 4;
export const RICE = 10;

export interface Bird {
  row: number;
  /** How far along the row (0 → 1). */
  along: number;
  speed: number;
  hp: number;
  big: boolean;
  /** Seconds since it was startled by a tap (it flinches back), since it was chased off (-1: still coming). */
  startled: number;
  gone: number;
  /** Seconds since a farmer last waved at it. */
  wavedAgo: number;
  /** It carries a sheaf away. */
  thief: boolean;
}

export interface Farmer {
  row: number;
  spot: number;
  /** Seconds until he can wave again, and since he last waved. */
  ready: number;
  wavedAgo: number;
  waveAt: number;
}

export interface FarmerDefenseState {
  wide: boolean;
  /** The field: rows run from `start` (birds come in) to `end` (the rice), across `rowAt`. */
  field: { x: number; y: number; w: number; h: number };
  hut: { x: number; y: number; w: number; h: number };
  farmers: Farmer[];
  birds: Bird[];
  /** Sheaves left per row. */
  rice: number[];
  /** A farmer under the finger (from the hut, or lifted off a spot). */
  carrying: { at: Point; from: Farmer | null } | null;
  shooed: number;
  time: number;
}

const REACH = 0.5;
const WAVE_EVERY = 1.0;
const START_GAP = 3.0;
const END_GAP = 1.15;
const STARTLE_BACK = 0.12;

/** Screen point of a row position. */
export function fieldPoint(s: Pick<FarmerDefenseState, 'wide' | 'field'>, row: number, along: number): Point {
  const { x, y, w, h } = s.field;
  const across = (row + 0.5) / ROWS;
  return s.wide ? { x: x + w - along * w, y: y + across * h } : { x: x + across * w, y: y + along * h };
}

export function createFarmerDefense({ arena, duration, params, rng }: GameSetup): MinigameLogic<FarmerDefenseState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const wide = arena.width >= arena.height;
  const top = HUD_SAFE_TOP + 10;
  const hutSize = wide ? 110 : 130;
  const field = wide ? { x: 120, y: top, w: arena.width - 150, h: arena.height - top - hutSize - 20 } : { x: 20, y: top, w: arena.width - 40, h: arena.height - top - hutSize - 130 };
  const hut = wide ? { x: 20, y: arena.height - hutSize - 10, w: arena.width - 40, h: hutSize } : { x: 20, y: arena.height - hutSize - 10, w: arena.width - 40, h: hutSize };
  const state: FarmerDefenseState = { wide, field, hut, farmers: [], birds: [], rice: [4, 3, 3], carrying: null, shooed: 0, time: 0 };
  let nextBird = 1.5;
  const at = (row: number, along: number): Point => fieldPoint(state, row, along);
  const riceLeft = (): number => state.rice.reduce((a, b) => a + b, 0);
  const inHut = (p: Point): boolean => p.x >= hut.x && p.x <= hut.x + hut.w && p.y >= hut.y && p.y <= hut.y + hut.h;

  /** The free spot nearest a point (within reach of a finger), or null. */
  function spotAt(p: Point, except: Farmer | null): { row: number; spot: number } | null {
    let best: { row: number; spot: number } | null = null;
    let bestD = Math.max(TOUCH_RADIUS * 1.6, (wide ? field.h : field.w) / ROWS / 2);
    for (let row = 0; row < ROWS; row += 1) {
      for (let spot = 0; spot < SPOTS.length; spot += 1) {
        if (state.farmers.some((f) => f !== except && f.row === row && f.spot === spot)) continue;
        const q = at(row, SPOTS[spot] ?? 0);
        const d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d < bestD) {
          bestD = d;
          best = { row, spot };
        }
      }
    }
    return best;
  }
  const farmerAt = (p: Point): Farmer | null => state.farmers.find((f) => {
    const q = at(f.row, SPOTS[f.spot] ?? 0);
    return Math.hypot(q.x - p.x, q.y - p.y) < TOUCH_RADIUS * 1.3;
  }) ?? null;
  const birdAt = (p: Point): Bird | null => {
    let best: Bird | null = null;
    let bestD = TOUCH_RADIUS * 1.4;
    for (const b of state.birds) {
      if (b.gone >= 0) continue;
      const q = at(b.row, b.along);
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    return best;
  };

  function place(spot: { row: number; spot: number }, existing: Farmer | null): void {
    if (existing) {
      existing.row = spot.row;
      existing.spot = spot.spot;
    } else if (state.farmers.length < MAX_FARMERS) state.farmers.push({ row: spot.row, spot: spot.spot, ready: 0.5, wavedAgo: 9, waveAt: 0 });
    else return;
    events.push({ type: 'action', ...at(spot.row, SPOTS[spot.spot] ?? 0) });
  }

  function spawn(): void {
    const big = rng.chance(Math.min(0.35, 0.1 + state.time / duration / 3));
    const row = rng.int(0, ROWS - 1);
    state.birds.push({ row, along: 0, speed: (big ? 0.06 : 0.075) * factor, hp: big ? 2 : 1, big, startled: 9, gone: -1, wavedAgo: 9, thief: false });
  }

  return {
    state,
    get score() {
      return state.shooed;
    },
    get done() {
      return riceLeft() <= 0;
    },
    get lives() {
      return riceLeft();
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;

      // Dragging farmers.
      if (input.pressed && input.pointer) {
        const lifted = farmerAt(input.pointer);
        if (lifted) state.carrying = { at: input.pointer, from: lifted };
        else if (inHut(input.pointer) && state.farmers.length < MAX_FARMERS) state.carrying = { at: input.pointer, from: null };
      }
      if (state.carrying && input.pointer) state.carrying.at = input.pointer;
      if (input.released && state.carrying) {
        const spot = spotAt(state.carrying.at, state.carrying.from);
        if (spot) place(spot, state.carrying.from);
        state.carrying = null;
      }
      // Taps: startle a bird, or put a farmer from the hut on a free spot.
      for (const tap of input.taps) {
        const bird = birdAt(tap);
        if (bird) {
          bird.startled = 0;
          bird.along = Math.max(0, bird.along - STARTLE_BACK);
          events.push({ type: 'action', ...at(bird.row, bird.along) });
          continue;
        }
        if (farmerAt(tap)) continue;
        const spot = spotAt(tap, null);
        if (spot) place(spot, null);
      }

      nextBird -= dt;
      if (nextBird <= 0) {
        spawn();
        if (state.time > duration * 0.4 && rng.chance(0.3)) spawn();
        nextBird += START_GAP + (END_GAP - START_GAP) * Math.min(1, state.time / duration);
      }

      for (const f of state.farmers) {
        f.ready -= dt;
        f.wavedAgo += dt;
        if (f.ready > 0) continue;
        const from = SPOTS[f.spot] ?? 0;
        // The nearest bird still coming down his row, within reach in front of him (or just past him).
        let target: Bird | null = null;
        for (const b of state.birds) {
          if (b.gone >= 0 || b.row !== f.row || b.along > from + 0.06 || b.along < from - REACH) continue;
          if (!target || b.along > target.along) target = b;
        }
        if (!target) continue;
        f.ready = WAVE_EVERY;
        f.wavedAgo = 0;
        f.waveAt = target.along;
        target.hp -= 1;
        target.wavedAgo = 0;
        if (target.hp <= 0) {
          target.gone = 0;
          state.shooed += 1;
          events.push({ type: 'score', ...at(target.row, target.along) });
        } else events.push({ type: 'action', ...at(target.row, target.along) });
      }

      for (const b of state.birds) {
        b.startled += dt;
        b.wavedAgo += dt;
        if (b.gone >= 0) {
          b.gone += dt;
          continue;
        }
        // A startled bird hovers a moment before coming on again.
        if (b.startled > 0.8) b.along += b.speed * dt;
        if (b.along >= 1) {
          let row = b.row;
          if ((state.rice[row] ?? 0) <= 0) row = state.rice.findIndex((n) => n > 0);
          if (row >= 0) state.rice[row] = (state.rice[row] ?? 1) - 1;
          b.gone = 0;
          b.thief = true;
          events.push({ type: 'hit', ...at(b.row, 1) });
        }
      }
      state.birds = state.birds.filter((b) => b.gone < 1);
    },
  };
}

/** Good play: a farmer at the far spot of every row, the fourth where most birds come; startle the bird nearest the rice. */
export function farmerDefenseBot(state: FarmerDefenseState, _context: BotContext): BotMove {
  const spotPoint = (row: number, spot: number): Point => fieldPoint(state, row, SPOTS[spot] ?? 0);
  for (let row = 0; row < ROWS; row += 1) if (!state.farmers.some((f) => f.row === row)) return { tap: spotPoint(row, 3) };
  if (state.farmers.length < MAX_FARMERS) {
    const busy = [0, 1, 2].sort((a, b) => state.birds.filter((x) => x.row === b && x.gone < 0).length - state.birds.filter((x) => x.row === a && x.gone < 0).length)[0] ?? 1;
    return { tap: spotPoint(busy, 1) };
  }
  const danger = state.birds.filter((b) => b.gone < 0 && b.along > 0.86 && b.startled > 0.8).sort((a, b) => b.along - a.along)[0];
  return danger ? { tap: fieldPoint(state, danger.row, danger.along) } : {};
}
