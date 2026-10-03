// Nu na nu nống: friends sit in a row with their legs stretched out, and the folk rhyme counts along the legs,
// one leg for each word (tiếng), the words lighting up as they are said. The leg the last word lands on is
// pulled in. The child reads ahead and taps that leg before the rhyme gets there: a point when the right leg is
// pulled in. A wrong guess (or none) and the same lines are counted again slowly so she can see how it goes;
// then the rhyme carries on. When only a few legs are left, new friends sit down. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

/** The rhyme as children say it, one line of four words at a time. */
export const RHYME = [
  'Nu na nu nống',
  'Cái cống nằm trong',
  'Cái ong nằm ngoài',
  'Củ khoai chấm mật',
  'Phật ngồi phật khóc',
  'Con cóc nhảy ra',
  'Con gà ú ụ',
  'Nhà mụ thổi xôi',
  'Nhà tôi nấu chè',
  'Tay xòe chân rụt',
] as const;

export const FRIENDS = ['cat', 'rabbit', 'fox', 'bear', 'panda', 'monkey-face'] as const;
export type Friend = (typeof FRIENDS)[number];

export type NuNaPhase = 'chant' | 'pull' | 'replay';

export interface Leg {
  x: number;
  /** Which friend it belongs to (two legs each). */
  friend: number;
  /** Seconds since it was pulled in; -1 while stretched out. */
  pulledAgo: number;
}

export interface NuNaState {
  legs: Leg[];
  friends: Friend[];
  legTop: number;
  legBottom: number;
  legWidth: number;
  /** Lines of the rhyme counted this round (indexes into RHYME). */
  lines: number[];
  /** The words of those lines in order. */
  words: string[];
  /** The leg the first word lands on, and the leg the last word lands on. */
  startLeg: number;
  endLeg: number;
  phase: NuNaPhase;
  phaseTime: number;
  /** Seconds per word now (slower on a replay). */
  pace: number;
  /** The leg the child tapped this round, or -1. */
  guess: number;
  /** Index of the word being said (-1 before the first). */
  word: number;
  /** Leg the word is on. */
  pointer: number;
  /** Where the next round's rhyme starts. */
  nextLine: number;
  score: number;
  time: number;
}

export const PACE = 0.45;
const REPLAY_PACE = 0.8;
const PULL_SECONDS = 1.05;
const FIRST_WORD_AT = 0.5;

/** Legs still out, in order from `from` (inclusive) round the row. */
function legsFrom(legs: readonly Leg[], from: number): number[] {
  const out: number[] = [];
  for (let k = 0; k < legs.length; k += 1) {
    const i = (from + k) % legs.length;
    if ((legs[i]?.pulledAgo ?? 0) < 0) out.push(i);
  }
  return out;
}

/** Leg each word lands on, counting along the legs still out from `start`. */
export function countLegs(legs: readonly Leg[], start: number, words: number): number[] {
  const order = legsFrom(legs, start);
  return Array.from({ length: words }, (_, w) => order[w % order.length] ?? start);
}

export function createNuNa({ arena, rng }: GameSetup): MinigameLogic<NuNaState> {
  const events = eventQueue();
  const legCount = arena.width >= 760 ? 8 : 6;
  const margin = 30;
  const legWidth = (arena.width - margin * 2) / legCount;
  const legBottom = arena.height - 40;
  const legTop = Math.max(HUD_SAFE_TOP + 300, legBottom - Math.min(420, Math.max(260, (legBottom - HUD_SAFE_TOP) * 0.4)));
  const state: NuNaState = {
    legs: [],
    friends: [],
    legTop,
    legBottom,
    legWidth,
    lines: [],
    words: [],
    startLeg: 0,
    endLeg: 0,
    phase: 'chant',
    phaseTime: 0,
    pace: PACE,
    guess: -1,
    word: -1,
    pointer: 0,
    nextLine: 0,
    score: 0,
    time: 0,
  };

  function seat(): void {
    const pool = [...FRIENDS];
    state.friends = Array.from({ length: legCount / 2 }, () => pool.splice(rng.int(0, pool.length - 1), 1)[0] ?? 'cat');
    state.legs = Array.from({ length: legCount }, (_, i) => ({ x: margin + legWidth * (i + 0.5), friend: Math.floor(i / 2), pulledAgo: -1 }));
  }

  function newRound(start: number): void {
    // Two lines of the rhyme each round; three once she is good at it.
    const count = state.score >= 4 ? 3 : 2;
    state.lines = Array.from({ length: count }, (_, k) => (state.nextLine + k) % RHYME.length);
    state.nextLine = (state.nextLine + count) % RHYME.length;
    state.words = state.lines.flatMap((l) => (RHYME[l] ?? '').split(' '));
    state.startLeg = start;
    state.endLeg = countLegs(state.legs, start, state.words.length).at(-1) ?? start;
    state.phase = 'chant';
    state.phaseTime = 0;
    state.pace = PACE;
    state.guess = -1;
    state.word = -1;
    state.pointer = start;
  }

  const legAt = (x: number, y: number): number => {
    if (y < state.legTop - 120 || y > state.legBottom + 20) return -1;
    const i = Math.floor((x - margin) / legWidth);
    return i >= 0 && i < state.legs.length && (state.legs[i]?.pulledAgo ?? 0) < 0 ? i : -1;
  };

  function finishChant(): void {
    if (state.phase === 'chant' && state.guess !== state.endLeg) {
      // Count the same lines again, slowly.
      state.phase = 'replay';
      state.phaseTime = 0;
      state.pace = REPLAY_PACE;
      state.word = -1;
      events.push({ type: 'miss', x: state.legs[state.endLeg]?.x ?? 0, y: state.legTop });
      return;
    }
    const leg = state.legs[state.endLeg];
    if (leg) leg.pulledAgo = 0;
    if (state.phase === 'chant') {
      state.score += 1;
      events.push({ type: 'score', x: leg?.x ?? 0, y: state.legTop - 40 });
    }
    state.phase = 'pull';
    state.phaseTime = 0;
  }

  seat();
  newRound(0);

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
      for (const leg of state.legs) if (leg.pulledAgo >= 0) leg.pulledAgo += dt;
      if (state.phase === 'pull') {
        if (state.phaseTime >= PULL_SECONDS) {
          const left = state.legs.filter((l) => l.pulledAgo < 0).length;
          if (left <= 3) {
            seat();
            newRound(0);
          } else {
            newRound(legsFrom(state.legs, state.endLeg + 1)[0] ?? 0);
          }
        }
        return;
      }
      // The child guesses during the first count only, before the last word is said.
      if (state.phase === 'chant' && state.guess < 0 && state.word < state.words.length - 1) {
        for (const tap of input.taps) {
          const leg = legAt(tap.x, tap.y);
          if (leg >= 0) {
            state.guess = leg;
            events.push({ type: 'action', x: state.legs[leg]?.x ?? tap.x, y: state.legTop });
            break;
          }
        }
      }
      const word = Math.floor((state.phaseTime - FIRST_WORD_AT) / state.pace);
      if (word > state.word && word < state.words.length) {
        state.word = word;
        state.pointer = countLegs(state.legs, state.startLeg, word + 1).at(-1) ?? state.startLeg;
        const leg = state.legs[state.pointer];
        events.push({ type: 'action', x: leg?.x ?? 0, y: state.legBottom - 30, note: word === state.words.length - 1 ? 72 : 64 + (word % 2) * 3, voice: 'clap' });
      }
      if (state.phaseTime >= FIRST_WORD_AT + state.pace * state.words.length) finishChant();
    },
  };
}

/** Good play: counts the words along the legs and taps the last one's leg early in the rhyme. */
export function nuNaBot(state: NuNaState, _context: BotContext): BotMove {
  if (state.phase !== 'chant' || state.guess >= 0 || state.word < 1) return {};
  const leg = state.legs[state.endLeg];
  return leg ? { tap: { x: leg.x, y: (state.legTop + state.legBottom) / 2 } } : {};
}
