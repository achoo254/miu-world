// Pay exact: at the market stall a thing has its price on a tag ("8 nghìn"). The child taps notes in her
// wallet (1, 2, 5 and 10 nghìn) to put them in the seller's tray, which adds them up. The exact price buys the
// thing: a point, and the next one comes. Too much: the seller counts it out and hands the whole tray back, so
// tapping notes at random is slow. Prices stay small (2–20 nghìn, the easy end of class 2 money).
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const NOTES = [1, 2, 5, 10] as const;
export type Note = (typeof NOTES)[number];

export interface NoteButton extends Point {
  value: Note;
  w: number;
  h: number;
}

/** A note on its way into the tray, or back out. */
export interface Flying {
  value: Note;
  from: Point;
  to: Point;
  age: number;
}

export type Phase = 'pay' | 'bought' | 'over';

export interface PayExactState {
  price: number;
  /** Which thing is for sale (draw.ts picks the picture). */
  goods: number;
  tray: Note[];
  flying: Flying[];
  buttons: NoteButton[];
  trayAt: Point;
  stall: Point;
  phase: Phase;
  phaseTime: number;
  bought: number;
  lastTapAt: number;
  score: number;
  time: number;
}

export const FLY_SECONDS = 0.3;
const BOUGHT_PAUSE = 1.0;
const OVER_PAUSE = 2.6;
export const GOODS_COUNT = 12;

export const paid = (state: PayExactState): number => state.tray.reduce((sum, n) => sum + n, 0);

/** Fewest notes for an amount, largest first (what a careful payer hands over). */
export function fewestNotes(amount: number): Note[] {
  const out: Note[] = [];
  let left = amount;
  for (const n of [...NOTES].reverse()) {
    while (left >= n) {
      out.push(n);
      left -= n;
    }
  }
  return out;
}

function priceFor(rng: Rng, bought: number, previous: number): number {
  const max = bought < 3 ? 10 : bought < 7 ? 15 : 20;
  for (;;) {
    const p = rng.int(2, max);
    // Not a single note's worth too often, and never the same twice running.
    if (p !== previous && (!(NOTES as readonly number[]).includes(p) || rng.chance(0.3))) return p;
  }
}

export function createPayExact({ arena, rng }: GameSetup): MinigameLogic<PayExactState> {
  const events = eventQueue();
  const landscape = arena.width > arena.height;
  // The wallet's notes along the bottom.
  const noteW = Math.max(TOUCH_RADIUS * 2.6, Math.min(190, (arena.width - 50) / 4 - 14));
  const noteH = Math.max(TOUCH_RADIUS * 2, noteW * 0.55);
  const rowY = arena.height - noteH / 2 - 26;
  const gap = (arena.width - 4 * noteW) / 5;
  const buttons: NoteButton[] = NOTES.map((value, i) => ({ value, w: noteW, h: noteH, x: gap + noteW / 2 + i * (noteW + gap), y: rowY }));
  const stall = landscape ? { x: arena.width * 0.3, y: HUD_SAFE_TOP + (rowY - noteH - HUD_SAFE_TOP) * 0.45 } : { x: arena.width / 2, y: HUD_SAFE_TOP + (rowY - noteH - HUD_SAFE_TOP) * 0.3 };
  const trayAt = landscape ? { x: arena.width * 0.72, y: stall.y + 30 } : { x: arena.width / 2, y: HUD_SAFE_TOP + (rowY - noteH - HUD_SAFE_TOP) * 0.76 };
  const state: PayExactState = {
    price: 0,
    goods: 0,
    tray: [],
    flying: [],
    buttons,
    trayAt,
    stall,
    phase: 'pay',
    phaseTime: 0,
    bought: 0,
    lastTapAt: -1,
    score: 0,
    time: 0,
  };

  function nextThing(): void {
    state.price = priceFor(rng, state.bought, state.price);
    state.goods = rng.int(0, GOODS_COUNT - 1);
    state.tray = [];
    state.phase = 'pay';
    state.phaseTime = 0;
  }

  function tapNote(button: NoteButton): void {
    state.lastTapAt = state.time;
    state.tray.push(button.value);
    state.flying.push({ value: button.value, from: { x: button.x, y: button.y }, to: trayAt, age: 0 });
    events.push({ type: 'action', x: button.x, y: button.y });
    const total = paid(state);
    if (total === state.price) {
      state.phase = 'bought';
      state.phaseTime = 0;
      state.score += 1;
      state.bought += 1;
      events.push({ type: 'score', x: stall.x, y: stall.y - 60 });
    } else if (total > state.price) {
      state.phase = 'over';
      state.phaseTime = 0;
      events.push({ type: 'hit', x: trayAt.x, y: trayAt.y });
    }
  }

  nextThing();

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
      for (const f of state.flying) f.age += dt;
      state.flying = state.flying.filter((f) => f.age < FLY_SECONDS);
      if (state.phase === 'bought') {
        if (state.phaseTime >= BOUGHT_PAUSE) nextThing();
        return;
      }
      if (state.phase === 'over') {
        if (state.phaseTime >= OVER_PAUSE) {
          // The whole tray goes back to the wallet.
          for (const value of state.tray) {
            const home = buttons.find((b) => b.value === value);
            if (home) state.flying.push({ value, from: trayAt, to: { x: home.x, y: home.y }, age: 0 });
          }
          state.tray = [];
          state.phase = 'pay';
          state.phaseTime = 0;
        }
        return;
      }
      // One note at a time: the hand waits for the last one to land.
      if (state.flying.some((f) => f.to === trayAt)) return;
      for (const tap of input.taps) {
        const button = buttons.find((b) => Math.abs(tap.x - b.x) <= b.w / 2 + 10 && Math.abs(tap.y - b.y) <= b.h / 2 + 14);
        if (button) {
          tapNote(button);
          return;
        }
      }
    },
  };
}

/** Good play: hands over the fewest notes for what is still owed, one by one. */
export function payExactBot(state: PayExactState, _context: BotContext): BotMove {
  if (state.phase !== 'pay' || state.flying.length > 0 || state.time - state.lastTapAt < 0.45) return {};
  const owed = state.price - paid(state);
  const note = fewestNotes(owed)[0];
  const button = state.buttons.find((b) => b.value === note);
  return button ? { tap: { x: button.x, y: button.y } } : {};
}
