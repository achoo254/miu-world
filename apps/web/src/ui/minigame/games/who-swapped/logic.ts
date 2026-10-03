// Who swapped: goods sit on a market stall. The child looks for a few seconds, a curtain drops and rises, and
// two goods have traded places: she taps both. Both right is a point and a new stall; a wrong pick shows the
// swap again slowly (the two glide back and forth), then a new stall, with nothing taken away. Stalls grow
// from six goods to eight. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';
import { layout } from '../odd-one-out/logic';

export const GOODS: readonly SpriteName[] = [
  'red-apple',
  'banana',
  'watermelon',
  'grapes',
  'lemon',
  'pineapple',
  'carrot',
  'tomato',
  'ear-of-corn',
  'teddy-bear',
  'balloon',
  'kite',
  'doughnut',
  'cookie',
  'candy',
  'egg',
  'fish',
  'gift',
  'basket',
  'coconut',
];

export type Phase = 'look' | 'blink' | 'find' | 'replay' | 'solved';

export interface Slot {
  x: number;
  y: number;
  sprite: SpriteName;
  /** Tapped and right (glows). */
  found: boolean;
  /** Seconds since a wrong tap here (a shake). */
  shook: number;
}

export interface SwapState {
  phase: Phase;
  /** Seconds in this phase. */
  inPhase: number;
  slots: Slot[];
  /** The two slots that traded goods this round. */
  swapped: readonly [number, number];
  size: number;
  reach: number;
  /** Seconds of looking this round. */
  look: number;
  rounds: number;
  score: number;
  time: number;
}

export const BLINK_SECONDS = 0.7;
export const REPLAY_SECONDS = 2.4;
const SOLVED_SECONDS = 0.7;

function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    const a = items[i];
    const b = items[j];
    if (a !== undefined && b !== undefined) {
      items[i] = b;
      items[j] = a;
    }
  }
  return items;
}

export function createWhoSwapped({ arena, duration, params, rng }: GameSetup): MinigameLogic<SwapState> {
  const baseLook = typeof params.look === 'number' ? Math.min(5, Math.max(1.5, params.look)) : 3;
  const events = eventQueue();
  const area = { x: 40, y: HUD_SAFE_TOP + 150, w: arena.width - 80, h: arena.height - HUD_SAFE_TOP - 196 };
  const state: SwapState = { phase: 'look', inPhase: 0, slots: [], swapped: [0, 1], size: 100, reach: TOUCH_RADIUS * 1.5, look: baseLook, rounds: 0, score: 0, time: 0 };

  function deal(): void {
    const count = state.time > duration * 0.55 ? 8 : state.time > duration * 0.25 ? 7 : 6;
    const { points, size } = layout(count, area);
    const goods = shuffle([...GOODS], rng).slice(0, count);
    state.slots = goods.map((sprite, i) => ({ x: points[i]?.x ?? 0, y: points[i]?.y ?? 0, sprite, found: false, shook: 99 }));
    state.size = Math.min(130, size * 0.7);
    state.reach = Math.max(TOUCH_RADIUS * 1.5, size * 0.5);
    const a = rng.int(0, count - 1);
    let b = rng.int(0, count - 2);
    if (b >= a) b += 1;
    state.swapped = [a, b];
    state.look = baseLook;
    state.phase = 'look';
    state.inPhase = 0;
    state.rounds += 1;
  }

  function swap(): void {
    const [a, b] = state.swapped;
    const sa = state.slots[a];
    const sb = state.slots[b];
    if (sa && sb) [sa.sprite, sb.sprite] = [sb.sprite, sa.sprite];
  }

  const slotAt = (p: Point): number => {
    let best = -1;
    let bestD = state.reach;
    state.slots.forEach((s, i) => {
      const d = Math.hypot(s.x - p.x, s.y - p.y);
      if (d <= bestD) {
        best = i;
        bestD = d;
      }
    });
    return best;
  };

  deal();

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
      state.inPhase += dt;
      for (const s of state.slots) s.shook += dt;
      switch (state.phase) {
        case 'look':
          if (state.inPhase >= state.look) {
            state.phase = 'blink';
            state.inPhase = 0;
          }
          return;
        case 'blink':
          // The goods trade places while the curtain is down.
          if (state.inPhase >= BLINK_SECONDS / 2 && state.inPhase - dt < BLINK_SECONDS / 2) swap();
          if (state.inPhase >= BLINK_SECONDS) {
            state.phase = 'find';
            state.inPhase = 0;
          }
          return;
        case 'replay':
        case 'solved':
          if (state.inPhase >= (state.phase === 'replay' ? REPLAY_SECONDS : SOLVED_SECONDS)) deal();
          return;
        case 'find':
          for (const tap of input.taps) {
            const i = slotAt(tap);
            const slot = state.slots[i];
            if (!slot || slot.found) continue;
            if (state.swapped.includes(i)) {
              slot.found = true;
              events.push({ type: 'action', x: slot.x, y: slot.y });
              if (state.swapped.every((j) => state.slots[j]?.found)) {
                state.score += 1;
                state.phase = 'solved';
                state.inPhase = 0;
                events.push({ type: 'score', x: slot.x, y: slot.y - state.size / 2 });
                return;
              }
            } else {
              slot.shook = 0;
              state.phase = 'replay';
              state.inPhase = 0;
              events.push({ type: 'miss', x: slot.x, y: slot.y });
              return;
            }
          }
      }
    },
  };
}

/** Where a slot's picture is drawn: during the slow replay the two swapped goods glide back and forth. */
export function slotPosition(state: SwapState, index: number): Point {
  const slot = state.slots[index];
  if (!slot) return { x: 0, y: 0 };
  if (state.phase !== 'replay' || !state.swapped.includes(index)) return { x: slot.x, y: slot.y };
  const other = state.slots[state.swapped[0] === index ? state.swapped[1] : state.swapped[0]];
  if (!other) return { x: slot.x, y: slot.y };
  // There (where it was before) and back again, slowly: 0 → 1 → 0.
  const t = Math.sin(Math.min(1, state.inPhase / REPLAY_SECONDS) * Math.PI);
  const ease = t * t * (3 - 2 * t);
  return { x: slot.x + (other.x - slot.x) * ease, y: slot.y + (other.y - slot.y) * ease - Math.sin(ease * Math.PI) * 40 };
}

/** Good play: remembers the stall and taps the two goods that moved. */
export function whoSwappedBot(state: SwapState, _context: BotContext): BotMove {
  if (state.phase !== 'find' || state.inPhase < 0.3) return {};
  const next = state.swapped.map((i) => state.slots[i]).find((s) => s && !s.found);
  return next ? { tap: { x: next.x, y: next.y } } : {};
}
