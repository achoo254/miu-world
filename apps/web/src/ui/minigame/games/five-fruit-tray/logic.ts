// Five-fruit tray (mâm ngũ quả): a flower-shaped tray has a place in the middle and a ring of places around it.
// The child drags fruit from the five baskets onto the places. Two places side by side (and the middle with
// every place in the ring) must not hold the same fruit: a fruit put next to its twin rolls off. The tray is
// done when every place is filled and all five fruits are on it: a point, and Grandma brings the next tray.
// A fruit dropped on a filled place swaps it, so she can fix a tray that is short of one fruit.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const FRUITS = ['banana', 'mango', 'tangerine', 'grapes', 'pineapple', 'watermelon', 'coconut', 'red-apple'] as const;
export type Fruit = (typeof FRUITS)[number];

export interface Slot extends Point {
  fruit: Fruit | null;
  /** Placed by Grandma: cannot be changed. */
  fixed: boolean;
  /** Seconds since a fruit landed here (a bounce). */
  placedAgo: number;
}

export interface Pile extends Point {
  fruit: Fruit;
}

export interface TrayState {
  centre: Point;
  ringRadius: number;
  slots: Slot[];
  piles: Pile[];
  /** The fruit being dragged and where. */
  carrying: Fruit | null;
  carryAt: Point | null;
  /** A fruit that rolled off (from where), and seconds since. */
  rolled: { fruit: Fruit; at: Point; ago: number } | null;
  /** Seconds since the tray was finished (-1 while it is being laid). */
  doneAgo: number;
  trays: number;
  score: number;
  time: number;
}

export const SLOT_RADIUS = 50;
const DONE_SECONDS = 1.4;

/** Slots that touch slot i: the middle (0) touches the whole ring; ring places touch their two neighbours. */
export function neighbours(count: number, i: number): number[] {
  const ring = count - 1;
  if (i === 0) return Array.from({ length: ring }, (_, k) => k + 1);
  const k = i - 1;
  return [0, ((k + 1) % ring) + 1, ((k - 1 + ring) % ring) + 1];
}

/** Can this fruit go on slot i (no twin next to it)? */
export function fits(slots: readonly Slot[], i: number, fruit: Fruit): boolean {
  return neighbours(slots.length, i).every((n) => slots[n]?.fruit !== fruit);
}

export const isComplete = (slots: readonly Slot[], fruits: readonly Fruit[]): boolean =>
  slots.every((s, i) => s.fruit !== null && fits(slots, i, s.fruit)) && fruits.every((f) => slots.some((s) => s.fruit === f));

/** A full, valid tray that keeps the fixed fruit (backtracking), for the bot and to check a tray can be done. */
export function solveTray(slots: readonly Slot[], fruits: readonly Fruit[]): Fruit[] | null {
  const out = slots.map((s) => (s.fixed ? s.fruit : null));
  const check = (): boolean => fruits.every((f) => out.includes(f));
  const fill = (i: number): boolean => {
    if (i === out.length) return check();
    if (out[i] !== null) return fill(i + 1);
    for (const f of fruits) {
      if (neighbours(out.length, i).some((n) => out[n] === f)) continue;
      out[i] = f;
      if (fill(i + 1)) return true;
      out[i] = null;
    }
    return false;
  };
  return fill(0) ? out.map((f) => f ?? fruits[0] ?? 'banana') : null;
}

function pickFruits(rng: Rng): Fruit[] {
  const pool = [...FRUITS];
  return Array.from({ length: 5 }, () => pool.splice(rng.int(0, pool.length - 1), 1)[0] ?? 'banana');
}

export function createFiveFruitTray({ arena, rng }: GameSetup): MinigameLogic<TrayState> {
  const events = eventQueue();
  const wide = arena.width > arena.height;
  const pileGap = 104;
  const areaBottom = wide ? arena.height - 20 : arena.height - 150;
  const areaRight = wide ? arena.width - 150 : arena.width;
  const ringRadius = Math.max(SLOT_RADIUS * 2.1, Math.min((areaRight - 40) / 2, (areaBottom - HUD_SAFE_TOP - 40) / 2) - SLOT_RADIUS - 20);
  const centre = { x: areaRight / 2 + (wide ? 10 : 0), y: (HUD_SAFE_TOP + 20 + areaBottom) / 2 };
  const state: TrayState = {
    centre,
    ringRadius,
    slots: [],
    piles: [],
    carrying: null,
    carryAt: null,
    rolled: null,
    doneAgo: -1,
    trays: 0,
    score: 0,
    time: 0,
  };
  let fruits: Fruit[] = [];

  function newTray(): void {
    const ring = state.trays % 2 === 0 ? 5 : 6;
    fruits = pickFruits(rng);
    state.slots = [{ ...centre, fruit: null, fixed: false, placedAgo: 9 }];
    for (let k = 0; k < ring; k += 1) {
      const a = -Math.PI / 2 + (k / ring) * Math.PI * 2;
      state.slots.push({ x: centre.x + Math.cos(a) * ringRadius, y: centre.y + Math.sin(a) * ringRadius, fruit: null, fixed: false, placedAgo: 9 });
    }
    // From the third tray Grandma has already put down a fruit or two.
    if (state.trays >= 2) {
      const solved = solveTray(state.slots, fruits);
      for (let n = 0; n < (state.trays >= 4 ? 2 : 1) && solved; n += 1) {
        const i = rng.int(1, ring);
        const slot = state.slots[i];
        if (slot) {
          slot.fruit = solved[i] ?? null;
          slot.fixed = true;
        }
      }
    }
    state.piles = fruits.map((fruit, i) =>
      wide ? { fruit, x: arena.width - 80, y: HUD_SAFE_TOP + 40 + i * Math.min(pileGap, (arena.height - HUD_SAFE_TOP - 125) / 4) } : { fruit, x: arena.width / 2 + (i - 2) * Math.min(pileGap + 8, (arena.width - 90) / 4.4), y: arena.height - 80 },
    );
    state.doneAgo = -1;
  }

  function drop(at: Point, fruit: Fruit): void {
    let best = -1;
    let bestD = SLOT_RADIUS + 26;
    state.slots.forEach((s, i) => {
      const d = Math.hypot(s.x - at.x, s.y - at.y);
      if (d < bestD) {
        best = i;
        bestD = d;
      }
    });
    const slot = state.slots[best];
    if (!slot || slot.fixed) return;
    if (!fits(state.slots, best, fruit)) {
      state.rolled = { fruit, at: { x: slot.x, y: slot.y }, ago: 0 };
      events.push({ type: 'miss', x: slot.x, y: slot.y });
      return;
    }
    slot.fruit = fruit;
    slot.placedAgo = 0;
    events.push({ type: 'action', x: slot.x, y: slot.y });
    if (isComplete(state.slots, fruits)) {
      state.doneAgo = 0;
      state.score += 1;
      events.push({ type: 'score', x: centre.x, y: centre.y - 40 });
    }
  }

  newTray();

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
      for (const s of state.slots) s.placedAgo += dt;
      if (state.rolled) {
        state.rolled.ago += dt;
        if (state.rolled.ago > 0.8) state.rolled = null;
      }
      if (state.doneAgo >= 0) {
        state.doneAgo += dt;
        state.carrying = null;
        if (state.doneAgo > DONE_SECONDS) {
          state.trays += 1;
          newTray();
        }
        return;
      }
      const p = input.pointer;
      if (p && input.pressed && !state.carrying) {
        const pile = state.piles.find((q) => Math.hypot(q.x - p.x, q.y - p.y) <= TOUCH_RADIUS + 16);
        if (pile) state.carrying = pile.fruit;
      }
      if (p && state.carrying) state.carryAt = p;
      if (!p && state.carrying) {
        if (state.carryAt) drop(state.carryAt, state.carrying);
        state.carrying = null;
        state.carryAt = null;
      }
    },
  };
}

/** Good play: works out a full tray and carries each missing or wrong fruit across, one at a time. */
export function fiveFruitBot(state: TrayState, _context: BotContext): BotMove {
  if (state.doneAgo >= 0) return {};
  const fruits = state.piles.map((p) => p.fruit);
  // Keep what is already right when possible: solve with the current fruit fixed, else from Grandma's only.
  const keep = state.slots.map((s) => ({ ...s, fixed: s.fixed || s.fruit !== null }));
  const plan = solveTray(keep, fruits) ?? solveTray(state.slots, fruits);
  if (!plan) return {};
  const i = state.slots.findIndex((s, k) => !s.fixed && s.fruit !== plan[k]);
  const slot = state.slots[i];
  const want = plan[i];
  if (!slot || !want) return {};
  if (state.carrying === want && state.carryAt) {
    const there = Math.hypot(state.carryAt.x - slot.x, state.carryAt.y - slot.y) < 4;
    return there ? {} : { touch: { x: slot.x, y: slot.y } };
  }
  if (state.carrying) return {};
  const pile = state.piles.find((p) => p.fruit === want);
  return pile ? { touch: { x: pile.x, y: pile.y } } : {};
}
