// Gem code: a treasure chest is locked by a row of three different gems. The child taps gems from the tray to
// make a guess (tap a gem in the guess to take it back); the chest answers how many gems are in the right place
// (stars) and how many are the right colour in the wrong place (rings). The right row opens the chest (a point)
// and a new one comes; after eight guesses the chest shows its code and a new one comes. Pure: no DOM.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const COLOURS = 4;
export const SLOTS = 3;
export const MAX_GUESSES = 8;
const CHECK_SECONDS = 0.35;
const OPEN_SECONDS = 1.6;
const REVEAL_SECONDS = 2;

export interface Feedback {
  /** Right gem in the right place. */
  exact: number;
  /** Right gem in the wrong place. */
  near: number;
}

export interface Guess {
  gems: number[];
  feedback: Feedback;
}

export interface CodeState {
  code: number[];
  guess: number[];
  history: Guess[];
  phase: 'guess' | 'check' | 'open' | 'reveal';
  phaseAgo: number;
  slots: Point[];
  palette: Point[];
  slotRadius: number;
  paletteRadius: number;
  chest: Point;
  /** Top-left of the guess list and the height of a row. */
  list: { x: number; y: number; row: number; width: number };
  lastTapAt: number;
  chests: number;
  score: number;
  time: number;
}

export function feedbackFor(code: readonly number[], guess: readonly number[]): Feedback {
  let exact = 0;
  let near = 0;
  guess.forEach((g, i) => {
    if (code[i] === g) exact += 1;
    else if (code.includes(g)) near += 1;
  });
  return { exact, near };
}

/** Every code: three different gems of the four. */
export const ALL_CODES: readonly number[][] = (() => {
  const out: number[][] = [];
  for (let a = 0; a < COLOURS; a += 1) for (let b = 0; b < COLOURS; b += 1) for (let c = 0; c < COLOURS; c += 1) if (a !== b && b !== c && a !== c) out.push([a, b, c]);
  return out;
})();

/** Codes that agree with every answer so far. */
export const consistentCodes = (history: readonly Guess[]): number[][] =>
  ALL_CODES.filter((code) =>
    history.every((h) => {
      const f = feedbackFor(code, h.gems);
      return f.exact === h.feedback.exact && f.near === h.feedback.near;
    }),
  );

const newCode = (rng: Rng): number[] => [...(ALL_CODES[rng.int(0, ALL_CODES.length - 1)] ?? [0, 1, 2])];

export function createMastermind({ arena, rng }: GameSetup): MinigameLogic<CodeState> {
  const events = eventQueue();
  const wide = arena.width >= arena.height;
  const free = arena.height - HUD_SAFE_TOP;
  const slotRadius = Math.max(TOUCH_RADIUS + 4, 46);
  const paletteRadius = Math.max(TOUCH_RADIUS + 6, 48);
  const rowH = wide ? Math.min(44, (free - 150) / MAX_GUESSES) : Math.min(56, (free - 430) / MAX_GUESSES);
  const listW = 250;
  const leftCol = wide ? 30 + listW / 2 : arena.width / 2;
  const rightCol = wide ? (arena.width + 30 + listW) / 2 : arena.width / 2;
  const chest = wide ? { x: leftCol, y: HUD_SAFE_TOP + 62 } : { x: arena.width / 2, y: HUD_SAFE_TOP + 62 };
  const listY = HUD_SAFE_TOP + 130;
  const slotsY = wide ? HUD_SAFE_TOP + free * 0.42 : listY + rowH * MAX_GUESSES + 30 + slotRadius;
  const paletteY = wide ? HUD_SAFE_TOP + free * 0.78 : Math.min(arena.height - paletteRadius - 24, slotsY + slotRadius + 60 + paletteRadius);
  const spread = (count: number, gap: number, x: number): number[] => Array.from({ length: count }, (_, i) => x + (i - (count - 1) / 2) * gap);
  const state: CodeState = {
    code: newCode(rng),
    guess: [],
    history: [],
    phase: 'guess',
    phaseAgo: 0,
    slots: spread(SLOTS, slotRadius * 2.5, rightCol).map((x) => ({ x, y: slotsY })),
    palette: spread(COLOURS, Math.min(paletteRadius * 2.5, (arena.width - (wide ? listW + 60 : 40)) / COLOURS), rightCol).map((x) => ({ x, y: paletteY })),
    slotRadius,
    paletteRadius,
    chest,
    list: { x: leftCol - listW / 2, y: listY, row: rowH, width: listW },
    lastTapAt: -9,
    chests: 0,
    score: 0,
    time: 0,
  };

  const nextChest = (): void => {
    state.code = newCode(rng);
    state.guess = [];
    state.history = [];
    state.phase = 'guess';
    state.phaseAgo = 0;
  };

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
      if (state.phase === 'open' || state.phase === 'reveal') {
        if (state.phaseAgo >= (state.phase === 'open' ? OPEN_SECONDS : REVEAL_SECONDS)) {
          state.chests += 1;
          nextChest();
        }
        return;
      }
      if (state.phase === 'check') {
        if (state.phaseAgo < CHECK_SECONDS) return;
        const feedback = feedbackFor(state.code, state.guess);
        state.history.push({ gems: [...state.guess], feedback });
        state.guess = [];
        state.phaseAgo = 0;
        if (feedback.exact === SLOTS) {
          state.phase = 'open';
          state.score += 1;
          events.push({ type: 'score', x: state.chest.x, y: state.chest.y });
        } else if (state.history.length >= MAX_GUESSES) {
          state.phase = 'reveal';
          events.push({ type: 'miss', x: state.chest.x, y: state.chest.y });
        } else {
          state.phase = 'guess';
          events.push({ type: 'action', x: state.chest.x, y: state.chest.y, note: 60 + feedback.exact * 4 + feedback.near * 2, voice: 'bell' });
        }
        return;
      }
      for (const tap of input.taps) {
        const gem = state.palette.findIndex((p) => Math.hypot(tap.x - p.x, tap.y - p.y) <= state.paletteRadius * 1.15);
        if (gem >= 0) {
          if (state.guess.includes(gem)) continue;
          state.guess.push(gem);
          state.lastTapAt = state.time;
          const slot = state.slots[state.guess.length - 1] ?? tap;
          events.push({ type: 'action', x: slot.x, y: slot.y, note: 72 + gem * 3, voice: 'bell' });
          if (state.guess.length === SLOTS) {
            state.phase = 'check';
            state.phaseAgo = 0;
          }
          return;
        }
        const slot = state.slots.findIndex((p) => Math.hypot(tap.x - p.x, tap.y - p.y) <= state.slotRadius * 1.15);
        if (slot >= 0 && slot < state.guess.length) {
          state.guess.splice(slot, 1);
          state.lastTapAt = state.time;
          return;
        }
      }
    },
  };
}

/** Good play: always guesses a code that fits every answer so far, one gem every few tenths of a second. */
export function mastermindBot(state: CodeState, _context: BotContext): BotMove {
  if (state.phase !== 'guess' || state.time - state.lastTapAt < 0.3 || state.phaseAgo < 0.3) return {};
  const plan = consistentCodes(state.history)[0];
  if (!plan) return {};
  // Take back a gem that does not fit the plan.
  const wrong = state.guess.findIndex((g, i) => plan[i] !== g);
  if (wrong >= 0) {
    const slot = state.slots[wrong];
    return slot ? { tap: slot } : {};
  }
  const gem = plan[state.guess.length];
  const button = gem === undefined ? undefined : state.palette[gem];
  return button ? { tap: button } : {};
}
