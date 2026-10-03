// What's missing (Kim's game): a tray of things to look at for a few seconds, then the light goes out; when it
// comes back one thing is gone (from the fourth round on the rest are shuffled too). Three choices below: tap
// the one that went missing. Right answers score; a wrong one shows the answer, no other penalty. Eight
// rounds. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** Everyday things a tray may hold. */
export const THINGS: readonly SpriteName[] = [
  'red-apple', 'banana', 'carrot', 'strawberry', 'grapes', 'lemon', 'cookie', 'lollipop', 'doughnut', 'teddy-bear',
  'balloon', 'soccer-ball', 'kite', 'key', 'bell', 'gift', 'egg', 'mushroom', 'sunflower', 'bicycle', 'drum',
  'basketball', 'candy', 'spiral-shell', 'feather', 'cherries', 'watermelon', 'pineapple',
];

export type Phase = 'look' | 'dark' | 'pick' | 'reveal';

export interface WhatsMissingState {
  phase: Phase;
  /** Seconds into the phase, and how long the look lasts this round. */
  phaseTime: number;
  lookTime: number;
  round: number;
  /** The tray as shown in the look phase. */
  tray: SpriteName[];
  /** The tray as shown after the dark: one gone (null where it was, when not shuffled). */
  after: Array<SpriteName | null>;
  missing: SpriteName;
  choices: SpriteName[];
  /** The choice tapped this round, or null. */
  picked: SpriteName | null;
  slots: Point[];
  choiceSlots: Point[];
  correct: number;
  score: number;
  time: number;
}

export const ROUNDS = 8;
const DARK = 0.9;
const REVEAL = 1.3;
export const CHOICE_REACH = TOUCH_RADIUS + 30;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

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

/** Slots for n things on the tray: one row on a wide screen, two rows of three on a narrow one. */
function traySlots(n: number, width: number, top: number): Point[] {
  const perRow = width > 760 || n <= 4 ? n : Math.ceil(n / 2);
  const gap = Math.min(150, (width - 80) / perRow);
  const slots: Point[] = [];
  for (let i = 0; i < n; i += 1) {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const inRow = Math.min(perRow, n - row * perRow);
    slots.push({ x: width / 2 + (col - (inRow - 1) / 2) * gap, y: top + row * 140 });
  }
  return slots;
}

export function createWhatsMissing({ arena, params, rng }: GameSetup): MinigameLogic<WhatsMissingState> {
  const look = typeof params.lookSeconds === 'number' ? clamp(params.lookSeconds, 3, 8) : 5;
  const events = eventQueue();
  const trayTop = HUD_SAFE_TOP + 110;
  const choiceY = arena.height - 130;
  const state: WhatsMissingState = {
    phase: 'look',
    phaseTime: 0,
    lookTime: look,
    round: 0,
    tray: [],
    after: [],
    missing: 'red-apple',
    choices: [],
    picked: null,
    slots: [],
    choiceSlots: [-1, 0, 1].map((k) => ({ x: arena.width / 2 + k * Math.min(200, arena.width / 3.4), y: choiceY })),
    correct: 0,
    score: 0,
    time: 0,
  };

  function deal(): void {
    const n = state.round < 3 ? 5 : 6;
    const pool = shuffle([...THINGS], rng);
    state.tray = pool.slice(0, n);
    const gone = rng.int(0, n - 1);
    state.missing = state.tray[gone] ?? 'red-apple';
    const rest = state.tray.filter((_, i) => i !== gone);
    // Early rounds keep everything in place (a gap shows); later ones shuffle what is left.
    state.after = state.round < 3 ? state.tray.map((t, i) => (i === gone ? null : t)) : shuffle(rest, rng);
    // Decoys: one from the tray that is still there (harder), one never shown.
    const stayed = rest[rng.int(0, rest.length - 1)] ?? 'banana';
    const never = pool[n] ?? 'kite';
    state.choices = shuffle([state.missing, state.round < 2 ? never : stayed, pool[n + 1] ?? never], rng);
    state.slots = traySlots(n, arena.width, trayTop);
    state.picked = null;
    state.phase = 'look';
    state.phaseTime = 0;
    state.lookTime = Math.max(3, look - state.round * 0.2);
  }
  deal();

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.round >= ROUNDS;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.phaseTime += dt;
      switch (state.phase) {
        case 'look':
          // A tap skips the rest of the look: ready.
          if (state.phaseTime >= state.lookTime || (state.phaseTime > 1.5 && input.taps.length > 0)) {
            state.phase = 'dark';
            state.phaseTime = 0;
          }
          break;
        case 'dark':
          if (state.phaseTime >= DARK) {
            state.phase = 'pick';
            state.phaseTime = 0;
          }
          break;
        case 'pick': {
          const tap = input.taps[0];
          if (!tap) break;
          const index = state.choiceSlots.findIndex((p) => Math.hypot(p.x - tap.x, p.y - tap.y) < CHOICE_REACH);
          const choice = state.choices[index];
          const slot = state.choiceSlots[index];
          if (!choice || !slot) break;
          state.picked = choice;
          state.phase = 'reveal';
          state.phaseTime = 0;
          if (choice === state.missing) {
            state.correct += 1;
            state.score += 1;
            events.push({ type: 'score', x: slot.x, y: slot.y - 40 });
          } else events.push({ type: 'hit', x: slot.x, y: slot.y });
          break;
        }
        case 'reveal':
          if (state.phaseTime >= REVEAL) {
            state.round += 1;
            if (state.round < ROUNDS) deal();
          }
          break;
      }
    },
  };
}

/** Good play: it remembers the tray and taps the missing thing. */
export function whatsMissingBot(state: WhatsMissingState, _context: BotContext): BotMove {
  if (state.phase !== 'pick' || state.phaseTime < 0.3) return {};
  const slot = state.choiceSlots[state.choices.indexOf(state.missing)];
  return slot ? { tap: slot } : {};
}
