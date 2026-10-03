// Simon says (farm animals): four animals sing in turn, one more each round. The child taps them back in the
// same order. Each song sung back is the length of that song in points (a song of 6 is 6); a wrong animal
// costs one of two hearts and the same song is sung again. If she waits too long the song is sung again, for
// free. Every animal has its own note, so the song can be heard as well as seen. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export const ANIMALS = ['cow', 'chicken', 'duck', 'dog-face'] as const;
/** One note per animal (MIDI): do, mi, sol, high do. */
export const NOTES = [60, 64, 67, 72] as const;

export type SimonPhase = 'listen' | 'play' | 'right' | 'wrong';

export interface Pad {
  x: number;
  y: number;
  size: number;
}

export interface SimonState {
  pads: Pad[];
  song: number[];
  phase: SimonPhase;
  /** Seconds in the phase. */
  phaseAgo: number;
  /** While listening: the note being sung (-1 between notes). While playing: how many she has tapped back. */
  singing: number;
  played: number;
  /** Seconds since each pad was last lit (a glow and a hop). */
  litAgo: number[];
  lives: number;
  score: number;
  time: number;
}

const LIVES = 2;
const START_LENGTH = 2;
const LEAD_SECONDS = 0.7;
const RIGHT_SECONDS = 0.9;
const WRONG_SECONDS = 1.1;
/** Waiting longer than this for a tap sings the song again (no heart lost). */
const WAIT_SECONDS = 7;

/** Seconds per note of a song this long (shorter as songs grow) and the lit share of it. */
export const noteSeconds = (length: number): number => Math.max(0.42, 0.66 - length * 0.025);

export function createSimonSays({ arena, rng }: GameSetup): MinigameLogic<SimonState> {
  const events = eventQueue();
  const top = HUD_SAFE_TOP + 20;
  const gap = 22;
  const size = Math.min(260, (arena.width - 60 - gap) / 2, (arena.height - top - 40 - gap) / 2);
  const left = arena.width / 2 - size - gap / 2;
  const y0 = top + (arena.height - top - 20 - size * 2 - gap) / 2;
  const pads: Pad[] = [0, 1, 2, 3].map((i) => ({ x: left + (i % 2) * (size + gap) + size / 2, y: y0 + Math.floor(i / 2) * (size + gap) + size / 2, size }));
  const state: SimonState = { pads, song: [], phase: 'listen', phaseAgo: 0, singing: -1, played: 0, litAgo: [9, 9, 9, 9], lives: LIVES, score: 0, time: 0 };
  for (let i = 0; i < START_LENGTH; i += 1) state.song.push(rng.int(0, 3));

  const setPhase = (phase: SimonPhase): void => {
    state.phase = phase;
    state.phaseAgo = 0;
    state.singing = -1;
    state.played = 0;
  };
  const sound = (pad: number, type: 'action' | 'score' | 'hit' = 'action'): void => {
    const p = state.pads[pad];
    state.litAgo[pad] = 0;
    if (p) events.push({ type, x: p.x, y: p.y, note: NOTES[pad], voice: 'bell' });
  };
  const padAt = (x: number, y: number): number => state.pads.findIndex((p) => Math.abs(p.x - x) <= p.size / 2 + 8 && Math.abs(p.y - y) <= p.size / 2 + 8);

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.lives <= 0;
    },
    get lives() {
      return state.lives;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.phaseAgo += dt;
      state.litAgo = state.litAgo.map((t) => t + dt);

      switch (state.phase) {
        case 'listen': {
          const each = noteSeconds(state.song.length);
          const at = state.phaseAgo - LEAD_SECONDS;
          const index = at < 0 ? -1 : Math.floor(at / each);
          const on = index >= 0 && at - index * each < each * 0.7;
          const note = on ? (state.song[index] ?? -1) : -1;
          if (on && note >= 0 && state.singing !== index) {
            state.singing = index;
            sound(note);
          }
          if (index >= state.song.length) setPhase('play');
          return;
        }
        case 'play': {
          for (const tap of input.taps) {
            const pad = padAt(tap.x, tap.y);
            if (pad < 0) continue;
            state.phaseAgo = 0;
            if (pad === state.song[state.played]) {
              state.played += 1;
              sound(pad);
              if (state.played === state.song.length) {
                const points = state.song.length - state.score;
                state.score = state.song.length;
                const p = state.pads[pad];
                events.push({ type: 'score', x: arena.width / 2, y: p?.y ?? arena.height / 2, points });
                setPhase('right');
                return;
              }
            } else {
              state.lives -= 1;
              sound(pad, 'hit');
              setPhase('wrong');
              return;
            }
          }
          if (state.phaseAgo > WAIT_SECONDS) setPhase('listen');
          return;
        }
        case 'right':
          if (state.phaseAgo >= RIGHT_SECONDS) {
            state.song.push(rng.int(0, 3));
            setPhase('listen');
          }
          return;
        case 'wrong':
          if (state.phaseAgo >= WRONG_SECONDS) setPhase('listen');
          return;
      }
    },
  };
}

/** Good play: once the song is over, tap it back from memory, one animal per decision. */
export function simonSaysBot(state: SimonState, _context: BotContext): BotMove {
  if (state.phase !== 'play') return {};
  const pad = state.pads[state.song[state.played] ?? 0];
  return pad ? { tap: { x: pad.x, y: pad.y } } : {};
}
