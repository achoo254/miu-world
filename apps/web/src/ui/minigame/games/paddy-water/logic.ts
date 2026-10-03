// Paddy water ("Mở cống ruộng bậc thang"): four rice terraces step down a hillside beside a mountain stream.
// Each terrace has a sluice gate from the stream; the child taps a gate to open it and taps again to close it.
// Water rises while the gate is open (each terrace fills at its own speed). A terrace closed with its water at
// the marked line has enough: the rice grows green (a point). Too full, and the water is let out below the
// line, to be filled again; overflowing, it spills into the terrace below. All four done: a new hillside. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const TERRACES = 4;
/** The marked band of "enough water". */
export const LOW = 0.64;
export const HIGH = 0.78;

export interface Terrace {
  level: number;
  /** Rise per second with the gate open. */
  rate: number;
  open: boolean;
  /** Too full: letting water out until it is under the line again. */
  draining: boolean;
  done: boolean;
  doneAt: number;
  gate: Point;
  /** The terrace's box. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PaddyWaterState {
  terraces: Terrace[];
  nextIn: number;
  hillsides: number;
  score: number;
  time: number;
}

const DRAIN = 0.3;
const NEXT_SECONDS = 1.3;

export function createPaddyWater({ arena, rng }: GameSetup): MinigameLogic<PaddyWaterState> {
  const events = eventQueue();
  const top = HUD_SAFE_TOP + 20;
  const rowH = (arena.height - top - 20) / TERRACES;
  const state: PaddyWaterState = { terraces: [], nextIn: 0, hillsides: 0, score: 0, time: 0 };
  const deal = (r: Rng): void => {
    const faster = Math.min(0.12, state.hillsides * 0.04);
    state.terraces = Array.from({ length: TERRACES }, (_, i) => {
      const x = 110 + i * Math.min(40, arena.width * 0.04);
      return {
        level: r.range(0, 0.25),
        rate: r.range(0.28, 0.42) + faster,
        open: false,
        draining: false,
        done: false,
        doneAt: -9,
        gate: { x: 62, y: top + rowH * (i + 0.5) },
        x,
        y: top + rowH * i + 8,
        w: arena.width - x - 20,
        h: rowH - 16,
      };
    });
  };
  deal(rng);

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
      if (state.nextIn > 0) {
        state.nextIn -= dt;
        if (state.nextIn <= 0) {
          state.hillsides += 1;
          deal(rng);
        }
        return;
      }
      for (const tap of input.taps) {
        // The gate, or anywhere on the terrace's row near the stream.
        const t = state.terraces.find((x) => Math.abs(tap.y - x.gate.y) <= x.h / 2 + 8 && tap.x < x.x + 80);
        if (!t || t.done) continue;
        t.open = !t.open;
        events.push({ type: 'action', x: t.gate.x, y: t.gate.y, note: t.open ? 67 : 72, voice: 'clap' });
      }
      state.terraces.forEach((t, i) => {
        if (t.done) return;
        if (t.open) {
          t.level += t.rate * dt;
          t.draining = false;
        } else if (t.level > HIGH) t.draining = true;
        if (t.draining) {
          // Let out through the bottom, down past the line: it has to be filled again.
          t.level -= DRAIN * dt;
          if (t.level < LOW - 0.15) t.draining = false;
          return;
        }
        if (t.level > 1) {
          const spill = t.level - 1;
          t.level = 1;
          const below = state.terraces[i + 1];
          if (below && !below.done) below.level += spill;
        }
        if (!t.open && t.level >= LOW && t.level <= HIGH) {
          t.done = true;
          t.doneAt = state.time;
          state.score += 1;
          events.push({ type: 'score', x: t.x + t.w / 2, y: t.y + t.h / 2, note: 72 + i * 3, voice: 'bell' });
        }
      });
      if (state.terraces.every((t) => t.done)) state.nextIn = NEXT_SECONDS;
    },
  };
}

/** Good play: open each dry terrace and close it as the water reaches the middle of the band. */
export function paddyWaterBot(state: PaddyWaterState, _context: BotContext): BotMove {
  if (state.nextIn > 0) return {};
  for (const t of state.terraces) {
    if (t.done) continue;
    const soon = t.level + t.rate * 0.12;
    if (t.open && soon >= (LOW + HIGH) / 2) return { tap: t.gate };
    if (!t.open && t.level < LOW) return { tap: t.gate };
  }
  return {};
}
