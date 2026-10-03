// Chi chi chành chành: a friend holds out an open hand. The child puts a finger in the palm and keeps it there
// while the friend chants the rhyme, a word at a time, shown big. On the last word, "ập!", the hand snaps shut:
// lift the finger then and she escapes (a point). Lift too early, or on a word that only looks like it ("ấp",
// "ạp", "áp", "ầm"), and she is out for that round; keep the finger down too long and the hand catches it.
// Ten rounds; each starts once the finger is in the palm. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** The rhyme, word by word (the last word is the snap). */
export const RHYME = ['Chi', 'chi', 'chành', 'chành', 'cái', 'đanh', 'thổi', 'lửa', 'con', 'ngựa', 'chết', 'trương', 'ba', 'vương', 'ngũ', 'đế', 'chấp', 'chế', 'đi', 'tìm', 'ù', 'à', 'ù', 'ập'] as const;
export const SNAP = 'ập';
/** Words that look like the snap but are not. */
export const FAKES = ['ấp', 'ạp', 'áp', 'ầm'] as const;
/** Where each line of the rhyme starts (a round may start at any line). */
const LINE_STARTS = [0, 4, 8, 12, 16] as const;
export const ROUNDS = 10;

export type Phase = 'wait' | 'chant' | 'snap' | 'result';
export type Outcome = 'escaped' | 'early' | 'caught';

export interface ChiChiState {
  palm: Point & { r: number };
  phase: Phase;
  /** The words of this round and the one being said. */
  words: string[];
  index: number;
  /** Seconds left of this word (chant), of the snap, or of the result. */
  timer: number;
  wordSeconds: number;
  snapSeconds: number;
  /** Seconds the finger has been in the palm before the round starts. */
  settled: number;
  finger: Point | null;
  outcome: Outcome | null;
  rounds: number;
  results: Outcome[];
  score: number;
  time: number;
}

const SETTLE_SECONDS = 0.4;
const RESULT_SECONDS = 1.1;
/** The chant's tune: a note for each word, round and round. */
const TUNE = [67, 67, 69, 67, 64, 67, 69, 72, 67, 64, 62, 64] as const;

/** The words of a round: from some line of the rhyme to the end, with fakes tucked in before the snap. */
export function roundWords(rng: Rng, round: number): string[] {
  const start = LINE_STARTS[rng.int(round < 3 ? 3 : 0, LINE_STARTS.length - 1)] ?? 12;
  const words: string[] = RHYME.slice(start, RHYME.length - 1);
  const fakes = round < 2 ? 0 : rng.int(0, round < 6 ? 1 : 2);
  for (let k = 0; k < fakes; k += 1) words.push(rng.pick(FAKES), 'ù', 'à', 'ù');
  words.push(SNAP);
  return words;
}

export function createChiChi({ arena, rng }: GameSetup): MinigameLogic<ChiChiState> {
  const events = eventQueue();
  const r = Math.min(150, arena.width * 0.24, (arena.height - HUD_SAFE_TOP) * 0.24);
  const state: ChiChiState = {
    palm: { x: arena.width / 2, y: arena.height - r - 50, r },
    phase: 'wait',
    words: [],
    index: 0,
    timer: 0,
    wordSeconds: 0.34,
    snapSeconds: 0.5,
    settled: 0,
    finger: null,
    outcome: null,
    rounds: 0,
    results: [],
    score: 0,
    time: 0,
  };

  const onPalm = (p: Point | null): boolean => p !== null && Math.hypot(p.x - state.palm.x, p.y - state.palm.y) <= state.palm.r;

  function finish(outcome: Outcome): void {
    state.phase = 'result';
    state.outcome = outcome;
    state.timer = RESULT_SECONDS;
    state.rounds += 1;
    state.results.push(outcome);
    if (outcome === 'escaped') {
      state.score += 1;
      events.push({ type: 'score', x: state.palm.x, y: state.palm.y - state.palm.r });
    } else events.push({ type: outcome === 'caught' ? 'hit' : 'miss', x: state.palm.x, y: state.palm.y });
  }

  function say(): void {
    const snap = state.index === state.words.length - 1;
    events.push({ type: 'action', x: state.palm.x, y: state.palm.y - state.palm.r - 110, note: snap ? 76 : (TUNE[state.index % TUNE.length] ?? 67), voice: snap ? 'clap' : 'whistle' });
    if (snap) {
      state.phase = 'snap';
      state.timer = state.snapSeconds;
    } else state.timer = state.wordSeconds;
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.rounds >= ROUNDS && state.phase === 'result' && state.timer <= 0;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.finger = input.pointer;
      const down = onPalm(input.pointer);
      switch (state.phase) {
        case 'wait':
          state.settled = down ? state.settled + dt : 0;
          if (state.settled >= SETTLE_SECONDS) {
            // Quicker and trickier as the rounds go by.
            state.wordSeconds = 0.34 - state.rounds * 0.008;
            state.snapSeconds = 0.5 - state.rounds * 0.012;
            state.words = roundWords(rng, state.rounds);
            state.index = 0;
            state.phase = 'chant';
            say();
          }
          break;
        case 'chant':
          if (!down) return finish('early');
          state.timer -= dt;
          if (state.timer <= 0) {
            state.index += 1;
            say();
          }
          break;
        case 'snap':
          if (!down) return finish('escaped');
          state.timer -= dt;
          if (state.timer <= 0) finish('caught');
          break;
        case 'result':
          state.timer -= dt;
          if (state.timer <= 0 && state.rounds < ROUNDS) {
            state.phase = 'wait';
            state.settled = 0;
            state.outcome = null;
          }
          break;
      }
    },
  };
}

/** Good play: finger in the palm, lifted on the decision after the real "ập" shows. */
export function chiChiBot(state: ChiChiState, _context: BotContext): BotMove {
  if (state.phase === 'snap' || state.phase === 'result') return {};
  return { touch: { x: state.palm.x, y: state.palm.y } };
}
