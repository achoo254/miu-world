// Hungry crocodile: two plates, each a number (up to 100) or a little group of things to count. The crocodile
// always eats the bigger plate: the child swipes its mouth toward it (or taps that side), or swipes down (or
// taps "=") when both are the same. A right answer is a point and shows the sign (<, >, =); a wrong one makes
// the crocodile yawn for a moment, longer after wrong answers in a row, so guessing does not pay. Pure: no DOM.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type Side = 'left' | 'right' | 'equal';

export interface Plate {
  /** A written number, or a group of `value` things (picture index `item`). */
  kind: 'number' | 'group';
  value: number;
  item: number;
}

export type CrocPhase = 'ask' | 'chomp' | 'yawn';

export interface CrocState {
  left: Plate;
  right: Plate;
  answer: Side;
  /** What the child chose last (the crocodile turns to it). */
  chosen: Side | null;
  phase: CrocPhase;
  phaseAgo: number;
  /** Wrong answers in a row (each makes the next yawn longer). */
  wrongStreak: number;
  leftPlate: Point;
  rightPlate: Point;
  plateRadius: number;
  croc: Point;
  crocSize: number;
  equalButton: Point;
  rounds: number;
  score: number;
  time: number;
}

/** How many different pictures draw.ts has for groups. */
export const ITEM_COUNT = 8;
const CHOMP_SECONDS = 0.6;
const YAWN_SECONDS = 1.5;
const YAWN_STEP = 0.8;
const MAX_STREAK = 3;
export const EQUAL_RADIUS = 52;

/** The answer for two plates. */
export const sideFor = (a: number, b: number): Side => (a > b ? 'left' : a < b ? 'right' : 'equal');

/** A pair of plates for round `n`: groups first, then numbers, then a number against a group. */
export function makePair(rng: Rng, n: number): { left: Plate; right: Plate } {
  const equal = rng.chance(0.2);
  const item = rng.int(0, ITEM_COUNT - 1);
  const stage = n < 6 ? 0 : n < 14 ? 1 : 2;
  const mode = stage === 0 ? 'groups' : stage === 1 ? rng.pick(['numbers', 'numbers', 'groups'] as const) : rng.pick(['numbers', 'mixed', 'groups'] as const);
  if (mode === 'groups' || mode === 'mixed') {
    const a = rng.int(2, 10);
    let b = equal ? a : rng.int(2, 10);
    if (!equal && b === a) b = a === 10 ? 9 : a + 1;
    const left: Plate = { kind: 'group', value: a, item };
    const right: Plate = { kind: mode === 'mixed' ? 'number' : 'group', value: b, item: (item + 3) % ITEM_COUNT };
    return rng.chance(0.5) ? { left, right } : { left: { ...right }, right: { ...left } };
  }
  const a = rng.int(11, 99);
  let b: number;
  if (equal) b = a;
  else {
    const tens = Math.floor(a / 10);
    const ones = a % 10;
    const roll = rng.next();
    if (roll < 0.25 && ones !== 0 && ones !== tens) b = ones * 10 + tens;
    else if (roll < 0.65) b = tens * 10 + ((ones + rng.int(1, 9)) % 10);
    else b = rng.int(10, 100);
    if (b === a) b = a + 1;
  }
  return { left: { kind: 'number', value: a, item }, right: { kind: 'number', value: b, item } };
}

export function createCrocCompare({ arena, rng }: GameSetup): MinigameLogic<CrocState> {
  const events = eventQueue();
  const free = arena.height - HUD_SAFE_TOP;
  const wide = arena.width >= arena.height;
  // Wide: plates left and right with the crocodile between; tall: plates side by side on top, crocodile below.
  const plateRadius = wide ? Math.min(135, arena.width * 0.17, free * 0.3) : Math.min(140, arena.width * 0.22);
  const plateY = wide ? HUD_SAFE_TOP + free * 0.42 : HUD_SAFE_TOP + 30 + plateRadius;
  const crocSize = wide ? Math.min(230, arena.width * 0.6 - plateRadius * 2) : Math.min(240, free * 0.3);
  const crocY = wide ? plateY + 20 : plateY + plateRadius + 30 + crocSize / 2;
  const plateX = wide ? 0.2 : 0.27;
  const first = makePair(rng, 0);
  const state: CrocState = {
    ...first,
    answer: sideFor(first.left.value, first.right.value),
    chosen: null,
    phase: 'ask',
    phaseAgo: 0,
    wrongStreak: 0,
    leftPlate: { x: Math.max(plateRadius + 16, arena.width * plateX), y: plateY },
    rightPlate: { x: Math.min(arena.width - plateRadius - 16, arena.width * (1 - plateX)), y: plateY },
    plateRadius,
    croc: { x: arena.width / 2, y: crocY },
    crocSize,
    equalButton: { x: arena.width / 2, y: wide ? arena.height - EQUAL_RADIUS - 22 : Math.min(arena.height - EQUAL_RADIUS - 24, crocY + crocSize / 2 + 80) },
    rounds: 0,
    score: 0,
    time: 0,
  };

  const next = (): void => {
    state.rounds += 1;
    const pair = makePair(rng, state.rounds);
    state.left = pair.left;
    state.right = pair.right;
    state.answer = sideFor(pair.left.value, pair.right.value);
    state.chosen = null;
    state.phase = 'ask';
    state.phaseAgo = 0;
  };

  const choose = (side: Side): void => {
    state.chosen = side;
    state.phaseAgo = 0;
    const at = side === 'left' ? state.leftPlate : side === 'right' ? state.rightPlate : state.croc;
    if (side === state.answer) {
      state.phase = 'chomp';
      state.wrongStreak = 0;
      state.score += 1;
      events.push({ type: 'score', x: at.x, y: at.y });
    } else {
      state.phase = 'yawn';
      state.wrongStreak = Math.min(MAX_STREAK, state.wrongStreak + 1);
      events.push({ type: 'miss', x: state.croc.x, y: state.croc.y });
    }
  };

  const sideOfTap = (p: Point): Side => {
    if (Math.hypot(p.x - state.equalButton.x, p.y - state.equalButton.y) <= EQUAL_RADIUS * 1.3) return 'equal';
    return p.x < arena.width / 2 ? 'left' : 'right';
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
      if (state.phase === 'chomp') {
        if (state.phaseAgo >= CHOMP_SECONDS) next();
        return;
      }
      if (state.phase === 'yawn') {
        if (state.phaseAgo >= YAWN_SECONDS + YAWN_STEP * (state.wrongStreak - 1)) {
          state.phase = 'ask';
          state.phaseAgo = 0;
          state.chosen = null;
        }
        return;
      }
      const swipe = input.swipes[0];
      if (swipe) {
        if (swipe.direction === 'left' || swipe.direction === 'right') choose(swipe.direction);
        else if (swipe.direction === 'down') choose('equal');
        return;
      }
      const tap = input.taps[0];
      if (tap) choose(sideOfTap(tap));
    },
  };
}

/** Good play: reads both plates for a moment, then swipes the right way. */
export function crocBot(state: CrocState, _context: BotContext): BotMove {
  if (state.phase !== 'ask' || state.phaseAgo < 0.4) return {};
  const from = { x: state.croc.x, y: state.croc.y - 40 };
  if (state.answer === 'equal') return { swipe: { from, dx: 0, dy: 160 } };
  return { swipe: { from, dx: state.answer === 'left' ? -180 : 180, dy: 0 } };
}
