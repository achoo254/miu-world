// Bird choir: five birds on a wire sing a little tune together, one chirp on every beat; a note pops up over
// each bird as it sings, higher for a higher note. One bird is off: it sings a beat late, or sings a different
// note (its note pops at another height). The child taps that bird: a point, and the choir starts a new song
// with another bird off. A wrong bird says "chíp?" and the off bird is shown, no point that time, so watching
// pays and guessing does not. The off bird gets harder to spot as the round goes on. Taps before the choir
// has sung its first beat do not count. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const BIRDS = 5;
export type OddKind = 'late' | 'pitch';

export interface BirdChoirState {
  birds: Point[];
  birdRadius: number;
  wireY: number;
  /** Seconds between beats. */
  beat: number;
  /** The song's notes (MIDI), one per beat, looping. */
  tune: number[];
  odd: number;
  kind: OddKind;
  /** How late the odd bird sings (s), or how many semitones off. */
  lateBy: number;
  pitchBy: number;
  /** When this song started. */
  songAt: number;
  /** Per bird: when it last chirped and the note it sang (for the bounce and the note shown). */
  chirpAt: number[];
  chirpNote: number[];
  /** The last answer: which bird and whether right, and when; -1 before. */
  picked: number;
  pickedRight: boolean;
  pickedAt: number;
  /** Seconds until the next song (0 while one plays). */
  nextIn: number;
  songs: number;
  score: number;
  time: number;
}

const TUNES: readonly (readonly number[])[] = [
  [72, 76, 79, 76],
  [74, 72, 74, 79],
  [79, 77, 76, 74],
  [72, 72, 79, 79],
  [76, 79, 81, 79],
];
const RIGHT_PAUSE = 0.9;
const WRONG_PAUSE = 1.6;
/** Seconds into a song before the first beat. */
const LEAD_IN = 0.35;

/** Beats sung so far in the current song (the beat at LEAD_IN is beat 1). */
export const beatsSung = (state: BirdChoirState): number => Math.max(0, Math.floor((state.time - state.songAt - LEAD_IN) / state.beat) + 1);

export function createBirdChoir({ arena, duration, rng }: GameSetup): MinigameLogic<BirdChoirState> {
  const events = eventQueue();
  const spacing = (arena.width - 40) / BIRDS;
  const wireY = HUD_SAFE_TOP + (arena.height - HUD_SAFE_TOP) * 0.45;
  const state: BirdChoirState = {
    birds: Array.from({ length: BIRDS }, (_, i) => ({ x: 20 + spacing * (i + 0.5), y: wireY - 30 })),
    birdRadius: Math.max(TOUCH_RADIUS + 8, Math.min(70, spacing * 0.45)),
    wireY,
    beat: 0.62,
    tune: [72, 76, 79, 76],
    odd: 0,
    kind: 'late',
    lateBy: 0.24,
    pitchBy: 5,
    songAt: 0,
    chirpAt: Array.from({ length: BIRDS }, () => -9),
    chirpNote: Array.from({ length: BIRDS }, () => 72),
    picked: -1,
    pickedRight: false,
    pickedAt: -9,
    nextIn: 0,
    songs: 0,
    score: 0,
    time: 0,
  };

  const newSong = (): void => {
    const progress = Math.min(1, state.time / duration);
    state.tune = [...(TUNES[rng.int(0, TUNES.length - 1)] ?? [72, 76, 79, 76])];
    state.odd = rng.int(0, BIRDS - 1);
    state.kind = rng.chance(0.5) ? 'late' : 'pitch';
    state.lateBy = 0.26 - 0.1 * progress;
    state.pitchBy = (rng.chance(0.5) ? 1 : -1) * (progress < 0.5 ? 5 : 3);
    state.beat = 0.62 - 0.08 * progress;
    state.songAt = state.time;
    state.picked = -1;
    state.nextIn = 0;
  };

  /** Sings whatever falls in (from, to]: the choir on the beat, the odd bird on its own time. */
  const sing = (from: number, to: number): void => {
    const start = state.songAt + LEAD_IN;
    for (let k = Math.max(0, Math.floor((from - start) / state.beat)); ; k += 1) {
      const at = start + k * state.beat;
      if (at > to) break;
      const note = state.tune[k % state.tune.length] ?? 72;
      const oddNote = state.kind === 'pitch' ? note + state.pitchBy : note;
      if (at > from) {
        for (let b = 0; b < BIRDS; b += 1) {
          if (b === state.odd && state.kind === 'late') continue;
          state.chirpAt[b] = at;
          state.chirpNote[b] = b === state.odd ? oddNote : note;
        }
        const mid = state.birds[2] ?? { x: arena.width / 2, y: wireY };
        events.push({ type: 'action', x: mid.x, y: mid.y - 60, note, voice: 'whistle' });
        if (state.kind === 'pitch') {
          const odd = state.birds[state.odd] ?? mid;
          events.push({ type: 'action', x: odd.x, y: odd.y - 60, note: oddNote, voice: 'whistle' });
        }
      }
      if (state.kind === 'late' && at + state.lateBy > from && at + state.lateBy <= to) {
        state.chirpAt[state.odd] = at + state.lateBy;
        state.chirpNote[state.odd] = note;
        const odd = state.birds[state.odd] ?? { x: 0, y: 0 };
        events.push({ type: 'action', x: odd.x, y: odd.y - 60, note, voice: 'whistle' });
      }
    }
  };

  newSong();

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
      const before = state.time;
      state.time += dt;
      if (state.nextIn > 0) {
        state.nextIn -= dt;
        if (state.nextIn <= 0) {
          state.songs += 1;
          newSong();
        }
        return;
      }
      sing(before, state.time);
      if (beatsSung(state) < 1) return;
      for (const tap of input.taps) {
        const reach = state.birdRadius * 1.25;
        const index = state.birds.findIndex((b) => Math.abs(tap.x - b.x) <= reach && Math.abs(tap.y - b.y) <= reach * 1.3);
        if (index < 0) continue;
        state.picked = index;
        state.pickedAt = state.time;
        state.pickedRight = index === state.odd;
        const bird = state.birds[index] ?? { x: 0, y: 0 };
        if (state.pickedRight) {
          state.score += 1;
          state.nextIn = RIGHT_PAUSE;
          events.push({ type: 'score', x: bird.x, y: bird.y - state.birdRadius });
        } else {
          state.nextIn = WRONG_PAUSE;
          events.push({ type: 'miss', x: bird.x, y: bird.y, note: 88, voice: 'whistle' });
        }
        break;
      }
    },
  };
}

/** Good play: listen to two beats, then tap the bird that was off. */
export function birdChoirBot(state: BirdChoirState, _context: BotContext): BotMove {
  if (state.nextIn > 0 || beatsSung(state) < 2) return {};
  const bird = state.birds[state.odd];
  return bird ? { tap: bird } : {};
}
