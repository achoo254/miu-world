// Shopping memory: Mum shows a shopping list as pictures for a few seconds, then the list goes in her pocket
// and the market street rolls by, stall after stall. The child taps the things on the list to put them in her
// basket; the basket shows how many are still to find (not which). Every thing on the list comes by again and
// again, among many things that are not. A wrong pick goes back on the stall and marks a slip; a second slip
// ends the trip and Mum shows a new list (nothing is taken away). A full basket is a point. Lists grow from
// three things to five. Stalls have two shelves of three.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** How many different things the market sells (draw.ts has a picture for each). */
export const GOODS_COUNT = 18;
/** Things per stall: two shelves of three. */
export const STALL_ITEMS = 6;
const PER_SHELF = 3;
export const MAX_SLIPS = 2;

export interface Stall {
  /** Left edge of the stall on screen. */
  x: number;
  goods: number[];
  /** Goods taken from this stall (index in `goods`), so they leave a gap. */
  taken: number[];
  /** Awning colour (stalls alternate). */
  tone: number;
}

export type Phase = 'list' | 'shop' | 'done' | 'failed';

export interface ShoppingState {
  list: number[];
  found: number[];
  slips: number;
  stalls: Stall[];
  stallW: number;
  itemSize: number;
  counterY: number;
  basket: Point;
  phase: Phase;
  phaseTime: number;
  listTime: number;
  /** A thing just picked wrongly (it shakes back onto its stall). */
  wrong: { stall: Stall; index: number; age: number } | null;
  /** A thing flying into the basket. */
  flying: { goods: number; from: Point; age: number } | null;
  trips: number;
  lastTapAt: number;
  score: number;
  time: number;
}

const SCROLL_SPEED = 150;
/** Share of a stall's places that carry something still on the list. */
const WANTED_SHARE = 0.25;
const DONE_PAUSE = 1.2;
const FAILED_PAUSE = 1.6;

function listSize(trips: number): number {
  return trips < 2 ? 3 : trips < 4 ? 4 : 5;
}

/** Centre of a thing on a stall. */
export function itemPoint(state: ShoppingState, stall: Stall, index: number): Point {
  const step = state.stallW / PER_SHELF;
  const shelf = Math.floor(index / PER_SHELF);
  return { x: stall.x + step * ((index % PER_SHELF) + 0.5), y: state.counterY - state.itemSize * (0.35 + shelf * 1.05) };
}

export function createShoppingMemory({ arena, rng }: GameSetup): MinigameLogic<ShoppingState> {
  const events = eventQueue();
  const itemSize = Math.max(TOUCH_RADIUS * 2.1, Math.min(100, arena.width / 7));
  const stallW = itemSize * PER_SHELF * 1.25;
  const counterY = HUD_SAFE_TOP + itemSize * 2.6 + (arena.height - HUD_SAFE_TOP - itemSize * 2.6 - 200) * 0.45;
  const basket = { x: arena.width / 2, y: arena.height - Math.max(70, (arena.height - counterY) * 0.35) };
  const state: ShoppingState = {
    list: [],
    found: [],
    slips: 0,
    stalls: [],
    stallW,
    itemSize,
    counterY,
    basket,
    phase: 'list',
    phaseTime: 0,
    listTime: 0,
    wrong: null,
    flying: null,
    trips: 0,
    lastTapAt: -1,
    score: 0,
    time: 0,
  };

  let built = 0;

  function newList(): void {
    const all = Array.from({ length: GOODS_COUNT }, (_, i) => i);
    const list: number[] = [];
    while (list.length < listSize(state.trips)) {
      const g = all[rng.int(0, all.length - 1)] ?? 0;
      if (!list.includes(g)) list.push(g);
    }
    state.list = list;
    state.found = [];
    state.slips = 0;
    state.phase = 'list';
    state.phaseTime = 0;
    state.listTime = 3 + 0.6 * list.length;
  }

  /** A new stall: a few of its places carry something still on the list, the rest other things. */
  function makeStall(x: number): Stall {
    const goods: number[] = [];
    const wanted = state.list.filter((g) => !state.found.includes(g));
    const others = Array.from({ length: GOODS_COUNT }, (_, i) => i).filter((g) => !state.list.includes(g));
    while (goods.length < STALL_ITEMS) {
      const g = wanted.length > 0 && rng.chance(WANTED_SHARE) ? (wanted[rng.int(0, wanted.length - 1)] ?? 0) : (others[rng.int(0, others.length - 1)] ?? 0);
      if (!goods.includes(g)) goods.push(g);
    }
    built += 1;
    return { x, goods, taken: [], tone: built % 2 };
  }

  function fillStreet(): void {
    const gap = stallW + 26;
    let right = state.stalls.reduce((max, s) => Math.max(max, s.x), -Infinity);
    if (!Number.isFinite(right)) right = arena.width * 0.15 - gap;
    while (right < arena.width + gap) {
      right += gap;
      state.stalls.push(makeStall(right));
    }
    state.stalls = state.stalls.filter((s) => s.x + stallW > -40);
  }

  function pick(stall: Stall, index: number): void {
    const goods = stall.goods[index];
    if (goods === undefined) return;
    state.lastTapAt = state.time;
    const at = itemPoint(state, stall, index);
    if (state.list.includes(goods) && !state.found.includes(goods)) {
      stall.taken.push(index);
      state.found.push(goods);
      state.flying = { goods, from: at, age: 0 };
      events.push({ type: 'action', ...at });
      if (state.found.length === state.list.length) {
        state.phase = 'done';
        state.phaseTime = 0;
        state.score += 1;
        state.trips += 1;
        events.push({ type: 'score', x: basket.x, y: basket.y - 60 });
      }
      return;
    }
    state.slips += 1;
    state.wrong = { stall, index, age: 0 };
    events.push({ type: 'hit', ...at });
    if (state.slips >= MAX_SLIPS) {
      state.phase = 'failed';
      state.phaseTime = 0;
    }
  }

  newList();
  fillStreet();

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
      state.phaseTime += dt;
      if (state.wrong) {
        state.wrong.age += dt;
        if (state.wrong.age > 0.5) state.wrong = null;
      }
      if (state.flying) {
        state.flying.age += dt;
        if (state.flying.age > 0.45) state.flying = null;
      }
      switch (state.phase) {
        case 'list':
          // A tap starts the shopping early, once the list has been seen for a moment.
          if (state.phaseTime >= state.listTime || (input.taps.length > 0 && state.phaseTime > 2.5)) {
            state.phase = 'shop';
            state.phaseTime = 0;
            state.stalls = [];
            fillStreet();
          }
          return;
        case 'done':
        case 'failed':
          if (state.phaseTime >= (state.phase === 'done' ? DONE_PAUSE : FAILED_PAUSE)) newList();
          return;
        case 'shop':
          break;
      }
      for (const s of state.stalls) s.x -= SCROLL_SPEED * dt;
      fillStreet();
      for (const tap of input.taps) {
        let best: { stall: Stall; index: number; d: number } | null = null;
        for (const s of state.stalls) {
          for (let i = 0; i < s.goods.length; i += 1) {
            if (s.taken.includes(i)) continue;
            const p = itemPoint(state, s, i);
            const d = Math.hypot(tap.x - p.x, tap.y - p.y);
            if (d <= itemSize * 0.75 && (!best || d < best.d)) best = { stall: s, index: i, d };
          }
        }
        if (best) {
          pick(best.stall, best.index);
          break;
        }
      }
    },
  };
}

/** Good play: remembers the list and taps the next thing on it that is well on screen. */
export function shoppingBot(state: ShoppingState, context: BotContext): BotMove {
  if (state.phase === 'list') return state.phaseTime > 2.5 ? { tap: { x: context.arena.width / 2, y: context.arena.height / 2 } } : {};
  if (state.phase !== 'shop' || state.time - state.lastTapAt < 0.45) return {};
  for (const s of state.stalls) {
    for (let i = 0; i < s.goods.length; i += 1) {
      const g = s.goods[i];
      if (g === undefined || s.taken.includes(i) || !state.list.includes(g) || state.found.includes(g)) continue;
      const p = itemPoint(state, s, i);
      if (p.x > 50 && p.x < context.arena.width - 50) return { tap: p };
    }
  }
  return {};
}
