// Cake decorate: a customer shows an order ("3 strawberries, 5 candles, 2 sweets"). The child taps a topping
// bin (or drags from it) to put one more of that topping on the cake, and taps a topping on the cake to take it
// off. Too many of something, or something not ordered, and the customer shakes its head; exactly the order and
// the cake is served (a point) and the next customer comes. Counting to 5, a few kinds at once. Pure: no DOM.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** Topping kinds (draw.ts has a picture for each): strawberry, candle, sweet, cherries. */
export const TOPPING_COUNT = 4;
/** Places on the cake top. */
export const SPOTS = 12;
const SERVE_SECONDS = 1.1;

export interface OrderLine {
  topping: number;
  count: number;
}

export interface Topping {
  topping: number;
  spot: number;
  /** When it was put on (it drops in). */
  at: number;
}

export interface CakeState {
  order: OrderLine[];
  toppings: Topping[];
  /** Bins available this order (always every kind ordered, sometimes one more). */
  bins: number[];
  binPoints: Point[];
  binRadius: number;
  cake: Point;
  /** Half-width and half-height of the cake's top. */
  rx: number;
  ry: number;
  spots: Point[];
  /** The topping being dragged from a bin, and where. */
  carrying: number;
  carryAt: Point | null;
  frownAt: number;
  phase: 'decorate' | 'served';
  phaseAgo: number;
  customer: number;
  lastActAt: number;
  cakes: number;
  score: number;
  time: number;
}

export const countOf = (state: Pick<CakeState, 'toppings'>, topping: number): number => state.toppings.filter((t) => t.topping === topping).length;
export const wantOf = (state: Pick<CakeState, 'order'>, topping: number): number => state.order.find((o) => o.topping === topping)?.count ?? 0;

/** An order for cake number `n`: two kinds first, then three; never more toppings than spots. */
export function makeOrder(rng: Rng, n: number): OrderLine[] {
  const kinds = n < 2 ? 2 : rng.chance(0.6) ? 3 : 2;
  const pool = Array.from({ length: TOPPING_COUNT }, (_, i) => i);
  const out: OrderLine[] = [];
  let left = 10;
  for (let k = 0; k < kinds; k += 1) {
    const index = rng.int(0, pool.length - 1);
    const topping = pool.splice(index, 1)[0] ?? 0;
    const most = Math.min(5, left - (kinds - k - 1));
    const count = rng.int(1, Math.max(1, most));
    left -= count;
    out.push({ topping, count });
  }
  return out;
}

export function createCakeDecorate({ arena, rng }: GameSetup): MinigameLogic<CakeState> {
  const events = eventQueue();
  const free = arena.height - HUD_SAFE_TOP;
  const binRadius = Math.max(TOUCH_RADIUS + 12, Math.min(62, arena.width / 10));
  const lowest = arena.height - binRadius - 22;
  const rx = Math.min(arena.width * 0.36, 240, free * 0.4);
  const ry = rx * 0.38;
  const cake = { x: arena.width / 2, y: Math.min(lowest - binRadius - rx * 0.55 - 30, HUD_SAFE_TOP + 130 + ry + free * 0.12) };
  // Bins under the cake, not far below it on a tall screen.
  const binY = Math.min(lowest, cake.y + rx * 0.55 + binRadius + 90);
  const spots: Point[] = [];
  for (let i = 0; i < 8; i += 1) spots.push({ x: cake.x + Math.cos((i / 8) * Math.PI * 2) * rx * 0.74, y: cake.y + Math.sin((i / 8) * Math.PI * 2) * ry * 0.7 });
  for (let i = 0; i < 4; i += 1) spots.push({ x: cake.x + Math.cos((i / 4) * Math.PI * 2 + 0.4) * rx * 0.34, y: cake.y + Math.sin((i / 4) * Math.PI * 2 + 0.4) * ry * 0.32 });
  const state: CakeState = {
    order: [],
    toppings: [],
    bins: [],
    binPoints: [],
    binRadius,
    cake,
    rx,
    ry,
    spots,
    carrying: -1,
    carryAt: null,
    frownAt: -9,
    phase: 'decorate',
    phaseAgo: 0,
    customer: 0,
    lastActAt: -9,
    cakes: 0,
    score: 0,
    time: 0,
  };

  const newOrder = (): void => {
    state.order = makeOrder(rng, state.cakes);
    const kinds = state.order.map((o) => o.topping);
    const extra = Array.from({ length: TOPPING_COUNT }, (_, i) => i).filter((i) => !kinds.includes(i));
    if (extra.length > 0 && rng.chance(0.7)) kinds.push(extra[rng.int(0, extra.length - 1)] ?? 0);
    state.bins = kinds.sort((a, b) => a - b);
    const gap = Math.min(binRadius * 2.6, (arena.width - 40) / state.bins.length);
    state.binPoints = state.bins.map((_, i) => ({ x: arena.width / 2 + (i - (state.bins.length - 1) / 2) * gap, y: binY }));
    state.toppings = [];
    state.customer = rng.int(0, 5);
    state.phase = 'decorate';
    state.phaseAgo = 0;
  };

  const check = (): void => {
    const over = state.toppings.some((t) => countOf(state, t.topping) > wantOf(state, t.topping));
    if (over) {
      if (state.time - state.frownAt > 0.5) events.push({ type: 'miss', x: cake.x, y: HUD_SAFE_TOP + 60 });
      state.frownAt = state.time;
      return;
    }
    if (state.order.every((o) => countOf(state, o.topping) === o.count)) {
      state.phase = 'served';
      state.phaseAgo = 0;
      state.score += 1;
      events.push({ type: 'score', x: cake.x, y: cake.y });
    }
  };

  const add = (topping: number): void => {
    const used = new Set(state.toppings.map((t) => t.spot));
    const spot = state.spots.findIndex((_, i) => !used.has(i));
    if (spot < 0) return;
    state.toppings.push({ topping, spot, at: state.time });
    state.lastActAt = state.time;
    const p = state.spots[spot] ?? cake;
    events.push({ type: 'action', x: p.x, y: p.y, note: 72 + countOf(state, topping) * 2, voice: 'bell' });
    check();
  };

  const binAt = (p: Point): number => state.binPoints.findIndex((b) => Math.hypot(p.x - b.x, p.y - b.y) <= binRadius * 1.25);
  const onCake = (p: Point): boolean => ((p.x - cake.x) / (rx + 30)) ** 2 + ((p.y - cake.y) / (ry + 60)) ** 2 <= 1;

  newOrder();

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
      state.phaseAgo += dt;
      if (state.phase === 'served') {
        if (state.phaseAgo >= SERVE_SECONDS) {
          state.cakes += 1;
          newOrder();
        }
        return;
      }
      // Dragging from a bin.
      if (input.pressed && input.pointer) {
        const bin = binAt(input.pointer);
        state.carrying = bin >= 0 ? (state.bins[bin] ?? -1) : -1;
      }
      if (state.carrying >= 0 && input.pointer) state.carryAt = input.pointer;
      if (input.released && state.carrying >= 0) {
        const at = state.carryAt;
        const kind = state.carrying;
        state.carrying = -1;
        state.carryAt = null;
        if (at && onCake(at)) {
          add(kind);
          return;
        }
      }
      for (const tap of input.taps) {
        const bin = binAt(tap);
        if (bin >= 0) {
          add(state.bins[bin] ?? 0);
          return;
        }
        // A tap on a topping takes it off.
        const hit = state.toppings.findIndex((t) => {
          const p = state.spots[t.spot];
          return p ? Math.hypot(tap.x - p.x, tap.y - p.y) <= Math.max(TOUCH_RADIUS, rx * 0.16) : false;
        });
        if (hit >= 0) {
          const [gone] = state.toppings.splice(hit, 1);
          state.lastActAt = state.time;
          const p = gone ? state.spots[gone.spot] : undefined;
          events.push({ type: 'action', x: p?.x ?? cake.x, y: p?.y ?? cake.y });
          check();
          return;
        }
      }
    },
  };
}

/** Good play: takes off what is too many, else adds what is missing, one move a fifth of a second. */
export function cakeBot(state: CakeState, _context: BotContext): BotMove {
  if (state.phase !== 'decorate' || state.time - state.lastActAt < 0.2) return {};
  const extra = state.toppings.find((t) => countOf(state, t.topping) > wantOf(state, t.topping));
  if (extra) {
    const p = state.spots[extra.spot];
    return p ? { tap: p } : {};
  }
  const missing = state.order.find((o) => countOf(state, o.topping) < o.count);
  if (!missing) return {};
  const bin = state.bins.indexOf(missing.topping);
  const p = state.binPoints[bin];
  return p ? { tap: p } : {};
}
