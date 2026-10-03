// Tea slide: an iced-tea stall on the pavement with three long tables. Customers come in at the far (right)
// end and walk toward the counter on the left. A swipe to the right along a table slides a glass of tea down
// it; the first customer it meets takes it (a point) and leaves happy, then slides the empty glass back.
// Tapping an empty glass catches it back onto the tray; one that reaches the counter falls and breaks (the
// tray gets a new glass after a while). The tray holds three glasses. A customer who reaches the counter
// without tea costs one of three hearts. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export const CUSTOMERS: readonly SpriteName[] = ['cat', 'rabbit', 'fox', 'bear', 'panda', 'penguin', 'dog-face', 'monkey-face'];

export interface Customer {
  row: number;
  x: number;
  sprite: SpriteName;
  /** Seconds since served (-1 while waiting): it drinks, then leaves. */
  served: number;
  /** Reached the counter without tea: leaves sulking. */
  sulking: boolean;
}

export interface Glass {
  row: number;
  x: number;
  /** Full (going right to a customer) or empty (coming back left). */
  full: boolean;
  /** Seconds since it broke or was caught (-1 while sliding). */
  ended: number;
  caught: boolean;
  /** Seconds before an empty one starts back (its customer still drinking). */
  wait: number;
}

export interface TeaState {
  rows: number[];
  counterX: number;
  doorX: number;
  customers: Customer[];
  glasses: Glass[];
  /** Glasses ready on the tray, and seconds until a broken one is replaced. */
  tray: number;
  restock: number;
  lives: number;
  score: number;
  time: number;
}

const LIVES = 3;
export const TRAY = 3;
const FULL_SPEED = 620;
const EMPTY_SPEED = 170;
const DRINK = 1.1;
const RESTOCK = 2.2;
const WALK_START = 34;
const WALK_END = 56;
const GAP_START = 2.4;
const GAP_END = 1.3;
export const GLASS_REACH = TOUCH_RADIUS + 30;
/** Half the height of a table's band: a swipe starting in it serves that table. */
export const ROW_HALF = 70;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function createTeaSlide({ arena, duration, params, rng }: GameSetup): MinigameLogic<TeaState> {
  const factor = typeof params.speed === 'number' ? clamp(params.speed, 0.6, 1.5) : 1;
  const events = eventQueue();
  const top = HUD_SAFE_TOP + 90;
  const bottom = arena.height - 70;
  const gap = Math.min(220, (bottom - top) / 2);
  const middle = (top + bottom) / 2;
  const state: TeaState = {
    rows: [middle - gap, middle, middle + gap],
    counterX: 110,
    doorX: arena.width - 40,
    customers: [],
    glasses: [],
    tray: TRAY,
    restock: 0,
    lives: LIVES,
    score: 0,
    time: 0,
  };
  let nextCustomer = 0.6;

  const rowAt = (y: number): number => state.rows.findIndex((r) => Math.abs(r - y) <= ROW_HALF);

  function serve(row: number): void {
    if (state.tray <= 0) {
      events.push({ type: 'miss', x: state.counterX, y: state.rows[row] ?? 0 });
      return;
    }
    state.tray -= 1;
    state.glasses.push({ row, x: state.counterX + 30, full: true, ended: -1, caught: false, wait: 0 });
    events.push({ type: 'action', x: state.counterX, y: state.rows[row] ?? 0 });
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
      const progress = Math.min(1, state.time / duration);

      for (const s of input.swipes) {
        if (s.dx <= 0 || Math.abs(s.dx) < Math.abs(s.dy)) continue;
        const row = rowAt(s.from.y);
        if (row >= 0) serve(row);
      }
      for (const tap of input.taps) {
        const g = state.glasses.find((k) => !k.full && k.ended < 0 && k.wait <= 0 && Math.hypot(k.x - tap.x, (state.rows[k.row] ?? 0) - 20 - tap.y) < GLASS_REACH);
        if (!g) continue;
        g.ended = 0;
        g.caught = true;
        state.tray = Math.min(TRAY, state.tray + 1);
        events.push({ type: 'action', x: g.x, y: (state.rows[g.row] ?? 0) - 20 });
      }

      if (state.tray + state.glasses.filter((g) => g.ended < 0).length < TRAY) {
        state.restock += dt;
        if (state.restock >= RESTOCK) {
          state.restock = 0;
          state.tray += 1;
        }
      } else state.restock = 0;

      nextCustomer -= dt;
      if (nextCustomer <= 0) {
        // A table whose last customer has walked a little way in.
        const free = [0, 1, 2].filter((row) => !state.customers.some((c) => c.row === row && c.served < 0 && c.x > state.doorX - 160));
        const row = free[rng.int(0, Math.max(0, free.length - 1))];
        if (row !== undefined) state.customers.push({ row, x: state.doorX, sprite: rng.pick(CUSTOMERS as [SpriteName, ...SpriteName[]]), served: -1, sulking: false });
        nextCustomer = (GAP_START + (GAP_END - GAP_START) * progress) * rng.range(0.8, 1.2) / factor;
      }
      const walk = (WALK_START + (WALK_END - WALK_START) * progress) * factor;
      for (const c of state.customers) {
        if (c.served >= 0) {
          c.served += dt;
          if (c.served > DRINK) c.x += 260 * dt;
          continue;
        }
        c.x -= walk * dt;
        if (c.x <= state.counterX + 50) {
          c.served = DRINK;
          c.sulking = true;
          state.lives -= 1;
          events.push({ type: 'hit', x: c.x, y: state.rows[c.row] ?? 0 });
        }
      }

      for (const g of state.glasses) {
        if (g.ended >= 0) {
          g.ended += dt;
          continue;
        }
        if (g.full) {
          g.x += FULL_SPEED * dt;
          // The first waiting customer on the table takes it.
          const c = state.customers.filter((k) => k.row === g.row && k.served < 0 && k.x <= g.x + 30).sort((a, b) => a.x - b.x)[0];
          if (c) {
            c.served = 0;
            g.ended = 0;
            g.caught = true;
            state.score += 1;
            events.push({ type: 'score', x: c.x, y: (state.rows[c.row] ?? 0) - 60 });
            // The empty comes back once the drink is done.
            state.glasses.push({ row: g.row, x: c.x - 20, full: false, ended: -1, caught: false, wait: DRINK });
          } else if (g.x > state.doorX + 20) {
            g.ended = 0;
            state.restock = 0;
            events.push({ type: 'miss', x: state.doorX, y: state.rows[g.row] ?? 0 });
          }
        } else if (g.wait > 0) g.wait -= dt;
        else {
          g.x -= EMPTY_SPEED * dt;
          if (g.x <= state.counterX + 10) {
            g.ended = 0;
            events.push({ type: 'miss', x: g.x, y: state.rows[g.row] ?? 0 });
          }
        }
      }
      state.glasses = state.glasses.filter((g) => g.ended < 0.4);
      state.customers = state.customers.filter((c) => c.x < arena.width + 80);
    },
  };
}

/** Good play: catch an empty glass coming close, else serve the table whose customer is nearest the counter. */
export function teaBot(state: TeaState, _context: BotContext): BotMove {
  const sliding = state.glasses.filter((g) => !g.full && g.ended < 0 && g.wait <= 0);
  const urgent = sliding.sort((a, b) => a.x - b.x)[0];
  if (urgent && (urgent.x < state.counterX + 220 || state.tray === 0)) return { tap: { x: urgent.x, y: (state.rows[urgent.row] ?? 0) - 20 } };
  if (state.tray > 0) {
    const coming = new Set(state.glasses.filter((g) => g.full && g.ended < 0).map((g) => g.row));
    const waiting = state.customers.filter((c) => c.served < 0 && !coming.has(c.row)).sort((a, b) => a.x - b.x)[0];
    if (waiting) return { swipe: { from: { x: state.counterX + 40, y: state.rows[waiting.row] ?? 0 }, dx: 150, dy: 0 } };
  }
  if (urgent) return { tap: { x: urgent.x, y: (state.rows[urgent.row] ?? 0) - 20 } };
  return {};
}
