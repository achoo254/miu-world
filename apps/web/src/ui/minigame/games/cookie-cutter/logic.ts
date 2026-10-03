// Cookie cutter: a sheet of rolled dough lies on the table; the child taps to press the cutter (round, star,
// heart in turn) into it. A cookie that overlaps one already cut comes out squashed and does not count, but it
// still takes up dough, so careful packing makes the most cookies. When no cutter fits anywhere the tray goes
// into the oven and a second sheet comes; after two sheets the baking is done. Each good cookie is a point.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Cookie extends Point {
  shape: number;
  good: boolean;
  age: number;
}

export interface CookieState {
  dough: { x: number; y: number; w: number; h: number };
  /** Footprint radius of every cutter. */
  r: number;
  cookies: Cookie[];
  /** Cutter shape for the next press (0 round, 1 star, 2 heart). */
  shape: number;
  sheet: number;
  /** Seconds the press still needs (no new press until then). */
  pressing: number;
  /** Seconds since the sheet filled (the tray slides out), or -1. */
  full: number;
  finished: boolean;
  score: number;
  time: number;
}

export const SHEETS = 2;
export const SHAPES = 3;
const PRESS_SECONDS = 0.3;
const FULL_SECONDS = 1.2;

/** Where a press at `p` puts the cutter: kept wholly on the dough. */
export function clampToDough(state: CookieState, p: Point): Point {
  const { x, y, w, h } = state.dough;
  return { x: Math.min(x + w - state.r, Math.max(x + state.r, p.x)), y: Math.min(y + h - state.r, Math.max(y + state.r, p.y)) };
}

export const fits = (state: CookieState, p: Point): boolean => state.cookies.every((c) => Math.hypot(c.x - p.x, c.y - p.y) >= state.r * 2 * 0.97);

/** The first free place scanning row by row (the bot's packing, and the "is there room" check). */
export function firstFit(state: CookieState): Point | null {
  const { x, y, w, h } = state.dough;
  const step = state.r / 4;
  for (let cy = y + state.r; cy <= y + h - state.r + 0.01; cy += step) {
    for (let cx = x + state.r; cx <= x + w - state.r + 0.01; cx += step) {
      if (fits(state, { x: cx, y: cy })) return { x: cx, y: cy };
    }
  }
  return null;
}

export function createCookieCutter({ arena }: GameSetup): MinigameLogic<CookieState> {
  const events = eventQueue();
  const top = HUD_SAFE_TOP + 30;
  const dough = { x: 40, y: top, w: arena.width - 80, h: Math.min(arena.height - top - 120, (arena.width - 80) * 1.3) };
  dough.y = top + (arena.height - top - 100 - dough.h) / 2;
  // A cutter size that lets careful packing fit about ten cookies on a sheet.
  const r = Math.max(48, Math.sqrt((dough.w * dough.h) / (14 * 2 * Math.sqrt(3))));
  const state: CookieState = { dough, r, cookies: [], shape: 0, sheet: 0, pressing: 0, full: -1, finished: false, score: 0, time: 0 };

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.finished;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.pressing = Math.max(0, state.pressing - dt);
      for (const c of state.cookies) c.age += dt;
      if (state.full >= 0) {
        state.full += dt;
        if (state.full >= FULL_SECONDS) {
          state.sheet += 1;
          state.full = -1;
          state.cookies = [];
          if (state.sheet >= SHEETS) state.finished = true;
        }
        return;
      }
      const tap = input.taps[0];
      if (!tap || state.pressing > 0) return;
      const { x, y, w, h } = dough;
      if (tap.x < x - 30 || tap.x > x + w + 30 || tap.y < y - 30 || tap.y > y + h + 30) return;
      const at = clampToDough(state, tap);
      const good = fits(state, at);
      state.cookies.push({ ...at, shape: state.shape, good, age: 0 });
      state.shape = (state.shape + 1) % SHAPES;
      state.pressing = PRESS_SECONDS;
      if (good) {
        state.score += 1;
        events.push({ type: 'score', x: at.x, y: at.y });
      } else {
        events.push({ type: 'hit', x: at.x, y: at.y });
      }
      if (!firstFit(state)) {
        state.full = 0;
        events.push({ type: 'action', x: x + w / 2, y: y + h / 2 });
      }
    },
  };
}

/** Good play: packs cookies edge to edge from the top-left corner. */
export function cookieBot(state: CookieState, _context: BotContext): BotMove {
  if (state.pressing > 0 || state.full >= 0) return {};
  const p = firstFit(state);
  return p ? { tap: p } : {};
}
