// Customer memory ("Nhớ món khách gọi"): a little market stall with three stools. A customer sits down and says
// what they want in a speech bubble (one dish, later two), and then the bubble goes away. The child taps the
// customer and then the dish on the counter (or the dish, then the customer). Everything right: the customer
// leaves happy (a point) and someone new sits down. A wrong dish: the customer says the order once more. A
// customer kept waiting too long leaves (no harm). Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const SEATS = 3;
export const DISHES = 6;
export const FACES = 8;

export interface Customer {
  face: number;
  /** Dishes still wanted (indexes into the counter). */
  wants: number[];
  /** When they sat down, until when the bubble shows, and whether they may repeat the order. */
  satAt: number;
  sayUntil: number;
  canRepeat: boolean;
  /** Seconds since they left (−1 while seated), happy or not. */
  leftAgo: number;
  happy: boolean;
}

export interface CustomerMemoryState {
  seats: (Customer | null)[];
  seatAt: Point[];
  dishAt: Point[];
  selectedSeat: number;
  selectedDish: number;
  /** Seconds until each empty seat gets a customer. */
  refill: number[];
  /** A dish flying to a customer: from, seat, when. */
  served: { dish: number; seat: number; at: number } | null;
  customers: number;
  score: number;
  time: number;
}

const SAY_SECONDS = 2.4;
const REPEAT_SECONDS = 1.4;
const PATIENCE = 16;
const LEAVE_SECONDS = 0.8;

export function createCustomerMemory({ arena, rng }: GameSetup): MinigameLogic<CustomerMemoryState> {
  const events = eventQueue();
  const seatGap = Math.min(250, (arena.width - 40) / SEATS);
  const seatY = HUD_SAFE_TOP + (arena.height - HUD_SAFE_TOP) * 0.36;
  const counterY = arena.height - Math.max(110, (arena.height - HUD_SAFE_TOP) * 0.2);
  const perRow = arena.width >= 760 ? DISHES : 3;
  const dishGap = Math.min(135, (arena.width - 30) / perRow);
  const state: CustomerMemoryState = {
    seats: Array.from({ length: SEATS }, () => null),
    seatAt: Array.from({ length: SEATS }, (_, i) => ({ x: arena.width / 2 + (i - 1) * seatGap, y: seatY })),
    dishAt: Array.from({ length: DISHES }, (_, i) => {
      const row = Math.floor(i / perRow);
      const rows = Math.ceil(DISHES / perRow);
      return { x: arena.width / 2 + ((i % perRow) - (perRow - 1) / 2) * dishGap, y: counterY - (rows - 1 - row) * 120 };
    }),
    selectedSeat: -1,
    selectedDish: -1,
    refill: [0.4, 1.6, 2.8],
    served: null,
    customers: 0,
    score: 0,
    time: 0,
  };

  const seat = (r: Rng, i: number): void => {
    const two = state.customers >= 3 && r.chance(0.5);
    const first = r.int(0, DISHES - 1);
    const wants = two ? [first, (first + r.int(1, DISHES - 1)) % DISHES] : [first];
    state.seats[i] = { face: r.int(0, FACES - 1), wants, satAt: state.time, sayUntil: state.time + SAY_SECONDS + (two ? 0.8 : 0), canRepeat: true, leftAgo: -1, happy: false };
    state.customers += 1;
  };

  const give = (seatIndex: number, dish: number): void => {
    const c = state.seats[seatIndex];
    const at = state.seatAt[seatIndex] ?? { x: 0, y: 0 };
    if (!c || c.leftAgo >= 0) return;
    state.served = { dish, seat: seatIndex, at: state.time };
    const k = c.wants.indexOf(dish);
    if (k >= 0) {
      c.wants.splice(k, 1);
      events.push({ type: 'action', x: at.x, y: at.y, note: 76, voice: 'bell' });
      if (c.wants.length === 0) {
        c.leftAgo = 0;
        c.happy = true;
        state.score += 1;
        events.push({ type: 'score', x: at.x, y: at.y - 60 });
      }
    } else {
      events.push({ type: 'miss', x: at.x, y: at.y });
      if (c.canRepeat) {
        c.canRepeat = false;
        c.sayUntil = state.time + REPEAT_SECONDS;
      }
    }
    state.selectedSeat = -1;
    state.selectedDish = -1;
  };

  const near = (p: Point, q: Point, rx: number, ry: number): boolean => Math.abs(p.x - q.x) <= rx && Math.abs(p.y - q.y) <= ry;

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
      for (let i = 0; i < SEATS; i += 1) {
        const c = state.seats[i];
        if (c && c.leftAgo < 0 && state.time - c.satAt > PATIENCE) {
          c.leftAgo = 0;
          c.happy = false;
        }
        if (c && c.leftAgo >= 0) {
          c.leftAgo += dt;
          if (c.leftAgo >= LEAVE_SECONDS) {
            state.seats[i] = null;
            state.refill[i] = 0.6;
            if (state.selectedSeat === i) state.selectedSeat = -1;
          }
        }
        if (!state.seats[i]) {
          state.refill[i] = (state.refill[i] ?? 0) - dt;
          if ((state.refill[i] ?? 0) <= 0) seat(rng, i);
        }
      }
      for (const tap of input.taps) {
        const s = state.seatAt.findIndex((p) => near(tap, p, 90, 110));
        const d = state.dishAt.findIndex((p) => near(tap, p, 62, 62));
        if (s >= 0 && state.seats[s] && (state.seats[s]?.leftAgo ?? 0) < 0) {
          if (state.selectedDish >= 0) give(s, state.selectedDish);
          else state.selectedSeat = s === state.selectedSeat ? -1 : s;
        } else if (d >= 0) {
          if (state.selectedSeat >= 0) give(state.selectedSeat, d);
          else state.selectedDish = d === state.selectedDish ? -1 : d;
        }
      }
    },
  };
}

/** Good play (with a perfect memory): the customer waiting longest, then their dish. */
export function customerMemoryBot(state: CustomerMemoryState, _context: BotContext): BotMove {
  if (state.served && state.time - state.served.at < 0.4) return {};
  if (state.selectedSeat >= 0) {
    const c = state.seats[state.selectedSeat];
    const dish = state.dishAt[c?.wants[0] ?? -1];
    return dish ? { tap: dish } : {};
  }
  let best = -1;
  state.seats.forEach((c, i) => {
    if (!c || c.leftAgo >= 0 || state.time < c.sayUntil - 1) return;
    if (best < 0 || c.satAt < (state.seats[best]?.satAt ?? 0)) best = i;
  });
  const at = state.seatAt[best];
  return at ? { tap: at } : {};
}
