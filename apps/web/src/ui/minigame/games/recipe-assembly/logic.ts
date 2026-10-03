// Recipe assembly (bánh mì stall): a customer shows an order, the fillings in order. The child drags each
// filling from its tray onto the open bread (or taps the tray), in the order shown. A wrong filling hops
// back and the customer grows a little less patient. A finished bánh mì is a point; a customer who waits
// too long leaves (one of three hearts). Orders get longer and customers less patient as the round goes on.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const FILLINGS = ['cut-of-meat', 'cucumber', 'egg', 'herb', 'carrot', 'hot-pepper'] as const;
export const CUSTOMERS = ['rabbit', 'panda', 'penguin', 'owl', 'frog', 'monkey-face', 'turtle'] as const;

export type CustomerPhase = 'arrive' | 'wait' | 'happy' | 'leave';

export interface RecipeState {
  customer: (typeof CUSTOMERS)[number];
  order: number[];
  /** Fillings already on the bread. */
  made: number;
  phase: CustomerPhase;
  phaseAgo: number;
  patience: number;
  patienceMax: number;
  /** Trays' centres, the bread's centre, the customer's spot. */
  trays: Point[];
  tray: number;
  bread: Point;
  customerAt: Point;
  /** The filling the finger carries and where it is (null when none). */
  carrying: { filling: number; at: Point } | null;
  /** A wrong filling hopping back to its tray. */
  bounce: { filling: number; ago: number } | null;
  served: number;
  lives: number;
  score: number;
  time: number;
}

const LIVES = 3;
const ARRIVE_SECONDS = 0.6;
const HAPPY_SECONDS = 1.0;
const LEAVE_SECONDS = 0.9;
const WRONG_COST = 2;

export function createRecipeAssembly({ arena, duration, params, rng }: GameSetup): MinigameLogic<RecipeState> {
  const factor = typeof params.patience === 'number' ? Math.min(1.6, Math.max(0.6, params.patience)) : 1;
  const events = eventQueue();
  const wide = arena.width >= arena.height;
  const tray = wide ? Math.min(118, (arena.width - 60) / 6) : Math.min(150, (arena.width - 60) / 3);
  const trays: Point[] = FILLINGS.map((_, i) =>
    wide ? { x: arena.width / 2 + (i - 2.5) * (tray + 10), y: arena.height - tray / 2 - 16 } : { x: arena.width / 2 + ((i % 3) - 1) * (tray + 14), y: arena.height - 20 - tray / 2 - (1 - Math.floor(i / 3)) * (tray + 14) },
  );
  const traysTop = Math.min(...trays.map((t) => t.y)) - tray / 2;
  const customerAt = wide ? { x: arena.width * 0.22, y: HUD_SAFE_TOP + 110 } : { x: arena.width * 0.24, y: HUD_SAFE_TOP + 120 };
  const state: RecipeState = {
    customer: 'rabbit',
    order: [],
    made: 0,
    phase: 'arrive',
    phaseAgo: 0,
    patience: 1,
    patienceMax: 1,
    trays,
    tray,
    bread: { x: arena.width / 2 + (wide ? 90 : 0), y: (customerAt.y + 90 + traysTop) / 2 + (wide ? -10 : 30) },
    customerAt,
    carrying: null,
    bounce: null,
    served: 0,
    lives: LIVES,
    score: 0,
    time: 0,
  };
  const progress = (): number => Math.min(1, state.time / duration);

  function newCustomer(): void {
    state.customer = rng.pick(CUSTOMERS);
    const length = Math.min(4, 2 + Math.floor(state.served / 3));
    const order: number[] = [];
    while (order.length < length) {
      const f = rng.int(0, FILLINGS.length - 1);
      if (!order.includes(f)) order.push(f);
    }
    state.order = order;
    state.made = 0;
    state.patienceMax = (9 + length * 3.5) * (1 - 0.25 * progress()) * factor;
    state.patience = state.patienceMax;
    state.phase = 'arrive';
    state.phaseAgo = 0;
  }
  newCustomer();

  function add(filling: number): void {
    if (state.phase !== 'wait') return;
    if (state.order[state.made] === filling) {
      state.made += 1;
      events.push({ type: 'action', x: state.bread.x, y: state.bread.y - state.made * 12 });
      if (state.made === state.order.length) {
        state.score += 1;
        state.served += 1;
        state.phase = 'happy';
        state.phaseAgo = 0;
        events.push({ type: 'score', ...state.bread });
      }
    } else {
      state.bounce = { filling, ago: 0 };
      state.patience = Math.max(0.1, state.patience - WRONG_COST);
      events.push({ type: 'miss', ...state.bread });
    }
  }
  const trayAt = (p: Point): number => state.trays.findIndex((t) => Math.abs(t.x - p.x) <= tray / 2 + 4 && Math.abs(t.y - p.y) <= tray / 2 + 4);
  const overBread = (p: Point): boolean => Math.abs(p.x - state.bread.x) < 190 && Math.abs(p.y - state.bread.y) < 120;

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
      state.phaseAgo += dt;
      if (state.bounce) {
        state.bounce.ago += dt;
        if (state.bounce.ago > 0.5) state.bounce = null;
      }

      // Dragging a filling from a tray onto the bread.
      if (input.pressed && input.pointer) {
        const i = trayAt(input.pointer);
        state.carrying = i >= 0 ? { filling: i, at: input.pointer } : null;
      }
      if (state.carrying && input.pointer) state.carrying.at = input.pointer;
      if (input.released && state.carrying) {
        if (overBread(state.carrying.at)) add(state.carrying.filling);
        state.carrying = null;
      }
      // Tapping a tray puts its filling on.
      for (const tap of input.taps) {
        const i = trayAt(tap);
        if (i >= 0) add(i);
      }

      switch (state.phase) {
        case 'arrive':
          if (state.phaseAgo >= ARRIVE_SECONDS) {
            state.phase = 'wait';
            state.phaseAgo = 0;
          }
          break;
        case 'wait':
          state.patience -= dt;
          if (state.patience <= 0) {
            state.lives -= 1;
            state.phase = 'leave';
            state.phaseAgo = 0;
            events.push({ type: 'hit', ...state.customerAt });
          }
          break;
        case 'happy':
          if (state.phaseAgo >= HAPPY_SECONDS) newCustomer();
          break;
        case 'leave':
          if (state.phaseAgo >= LEAVE_SECONDS) newCustomer();
          break;
      }
    },
  };
}

/** Good play: the next filling of the order, a tap on its tray a few times a second. */
export function recipeAssemblyBot(state: RecipeState, _context: BotContext): BotMove {
  if (state.phase !== 'wait' || Math.round(state.time * 10) % 4 !== 0) return {};
  const tray = state.trays[state.order[state.made] ?? 0];
  return tray ? { tap: tray } : {};
}
