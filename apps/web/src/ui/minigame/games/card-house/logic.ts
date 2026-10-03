// Card house: the child builds a three-floor house of cards. She drags the top card of the deck to the dashed
// place where the next card goes (leaning cards make an A, a flat card makes the next floor). Dragging fast
// makes her hand shake and the house wobble (the meter at the side); shaking too much brings that floor down
// and it is built again. A finished floor is a point; a finished house starts a new one. Pure: no DOM.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Slot {
  x: number;
  y: number;
  /** Rotation (radians): ±LEAN for a leaning card, π/2 for a flat one. */
  angle: number;
  length: number;
  floor: number;
}

export const LEAN = (20 * Math.PI) / 180;
/** Smoothed hand speed (units per second) above which the hand shakes. */
export const STEADY_SPEED = 700;
const SHAKE_GAIN = 1.4;
const CALM = 0.5;
const SNAP = 70;
const FALL_SECONDS = 1;
const DONE_SECONDS = 1.3;

export interface CardHouseState {
  slots: Slot[];
  /** Cards placed (the first `placed` slots). */
  placed: number;
  deck: Point;
  /** The card in the hand, if any. */
  holding: boolean;
  hand: Point;
  /** Smoothed finger speed and the house's wobble (0–1). */
  speed: number;
  wobble: number;
  phase: 'build' | 'fall' | 'done';
  phaseAgo: number;
  /** Cards of the floor that fell (for its tumble). */
  fallen: number[];
  placedAt: number;
  houses: number;
  score: number;
  time: number;
}

/** The ten places of a three-floor house standing on `base`, centred on `cx`. */
export function houseSlots(cx: number, base: number, card: number): Slot[] {
  const rise = card * Math.cos(LEAN);
  const half = (card * Math.sin(LEAN)) / 2;
  const frame = (x: number, floorBase: number, floor: number): Slot[] => [
    { x: x - half, y: floorBase - rise / 2, angle: LEAN, length: card, floor },
    { x: x + half, y: floorBase - rise / 2, angle: -LEAN, length: card, floor },
  ];
  const flat = (y: number, length: number, floor: number): Slot => ({ x: cx, y, angle: Math.PI / 2, length, floor });
  const f2 = base - rise - 10;
  const f3 = f2 - rise - 10;
  return [
    ...frame(cx - card * 0.6, base, 0),
    ...frame(cx + card * 0.6, base, 0),
    flat(base - rise - 4, card * 1.6, 0),
    ...frame(cx, f2, 1),
    flat(f2 - rise - 4, card * 0.9, 1),
    ...frame(cx, f3, 2),
  ];
}

/** Cards in each finished floor: floor `k` is done once this many cards are placed. */
export const FLOOR_ENDS = [5, 8, 10] as const;

export function createCardHouse({ arena }: GameSetup): MinigameLogic<CardHouseState> {
  const events = eventQueue();
  const wide = arena.width >= arena.height;
  const tableY = wide ? arena.height - 60 : arena.height - 240;
  const card = Math.min(130, (tableY - HUD_SAFE_TOP - 40) / 3.3);
  const cx = wide ? arena.width * 0.42 : arena.width / 2;
  const deck = wide ? { x: arena.width - 110, y: arena.height - 150 } : { x: arena.width / 2, y: arena.height - 120 };
  const state: CardHouseState = {
    slots: houseSlots(cx, tableY, card),
    placed: 0,
    deck,
    holding: false,
    hand: { ...deck },
    speed: 0,
    wobble: 0,
    phase: 'build',
    phaseAgo: 0,
    fallen: [],
    placedAt: -9,
    houses: 0,
    score: 0,
    time: 0,
  };
  let last: Point | null = null;

  const floorStart = (placed: number): number => [0, ...FLOOR_ENDS].filter((e) => e <= placed).pop() ?? 0;

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
      // Hand speed, smoothed over a quarter second.
      const p = input.pointer;
      const moved = p && last ? Math.hypot(p.x - last.x, p.y - last.y) / dt : 0;
      last = p ? { ...p } : null;
      state.speed += (moved - state.speed) * Math.min(1, dt / 0.25);
      if (state.phase === 'fall') {
        if (state.phaseAgo >= FALL_SECONDS) {
          state.phase = 'build';
          state.fallen = [];
        }
        return;
      }
      if (state.phase === 'done') {
        if (state.phaseAgo >= DONE_SECONDS) {
          state.phase = 'build';
          state.placed = 0;
          state.houses += 1;
        }
        return;
      }
      if (input.pressed && p && Math.hypot(p.x - deck.x, p.y - deck.y) <= 90) state.holding = true;
      if (state.holding && p) state.hand = { ...p };
      // A shaking hand makes the house wobble; a still one calms it.
      const shaking = state.holding && state.speed > STEADY_SPEED;
      state.wobble = Math.max(0, state.wobble + (shaking ? ((state.speed - STEADY_SPEED) / STEADY_SPEED) * SHAKE_GAIN : -CALM) * dt);
      if (state.wobble >= 1) {
        const start = floorStart(state.placed);
        state.fallen = Array.from({ length: state.placed - start }, (_, i) => start + i);
        state.placed = start;
        state.wobble = 0;
        state.holding = false;
        state.hand = { ...deck };
        state.phase = 'fall';
        state.phaseAgo = 0;
        events.push({ type: 'hit', x: arena.width / 2, y: tableY - card });
        return;
      }
      if (input.released && state.holding) {
        state.holding = false;
        const slot = state.slots[state.placed];
        if (slot && Math.hypot(state.hand.x - slot.x, state.hand.y - slot.y) <= SNAP) {
          state.placed += 1;
          state.placedAt = state.time;
          const finished = (FLOOR_ENDS as readonly number[]).includes(state.placed);
          if (finished) {
            state.score += 1;
            events.push({ type: 'score', x: slot.x, y: slot.y, note: 72 + state.placed, voice: 'bell' });
            if (state.placed === state.slots.length) {
              state.phase = 'done';
              state.phaseAgo = 0;
            }
          } else events.push({ type: 'action', x: slot.x, y: slot.y, note: 64 + state.placed, voice: 'piano' });
        }
        state.hand = { ...deck };
      }
    },
  };
}

/** Good play: picks up a card and carries it steadily (well under the shaking speed) to its place. */
export function cardHouseBot(state: CardHouseState, _context: BotContext): BotMove {
  if (state.phase !== 'build') return {};
  if (!state.holding) return state.wobble > 0.3 ? {} : { touch: state.deck };
  const slot = state.slots[state.placed];
  if (!slot) return {};
  const dx = slot.x - state.hand.x;
  const dy = slot.y - state.hand.y;
  const d = Math.hypot(dx, dy);
  if (d < 4) return {};
  const step = Math.min(d, 48);
  return { touch: { x: state.hand.x + (dx / d) * step, y: state.hand.y + (dy / d) * step } };
}
