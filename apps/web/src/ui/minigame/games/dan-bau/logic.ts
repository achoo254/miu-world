// Đàn bầu: the monochord's one string sings whatever pitch its rod bends it to. A ribbon of pitch flows in from
// the right, gliding from note to note like a đàn bầu melody. The child holds a finger anywhere and moves it
// up and down: the singing dot at the string follows her height (high = high note) and the đàn plays it,
// bending smoothly as she moves. Each note of the ribbon is judged as it passes: on it nine tenths of the time
// is two points, six tenths one. Lifting the finger stops the sound. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export interface Note {
  /** MIDI pitch, start and length in seconds (a glide of GLIDE seconds leads into it). */
  pitch: number;
  at: number;
  length: number;
  /** Seconds the dot was on it, and the points it got once past (null before). */
  onFor: number;
  points: number | null;
}

export interface DanBauState {
  notes: Note[];
  /** Where the string is (the dot's x), and the pitch scale on screen. */
  playX: number;
  topY: number;
  bottomY: number;
  /** Units the ribbon moves per second. */
  speed: number;
  /** The dot: its height while the finger is down, null when lifted. */
  dotY: number | null;
  /** Whether the dot sits on the ribbon now. */
  onRibbon: boolean;
  /** The last judged note's points and when (words on screen). */
  lastPoints: number | null;
  lastAt: number;
  score: number;
  time: number;
}

export const LOW = 60;
export const HIGH = 76;
export const GLIDE = 0.25;
/** Half the ribbon's thickness (units): the dot counts as on it within this. */
export const RIBBON_HALF = 38;
const FIRST = 2;
/** A pentatonic scale over the range (C D E G A). */
const SCALE = [60, 62, 64, 67, 69, 72, 74, 76] as const;
const HOLD_ID = 'dan-bau';

/** A melody of gliding notes until `end`: small steps up and down the scale, held for different lengths. */
export function makeMelody(rng: Rng, end: number): Note[] {
  const notes: Note[] = [];
  let step = 3;
  let at = FIRST;
  while (at < end - 1.5) {
    const length = rng.pick([0.9, 1.2, 1.2, 1.6] as const);
    notes.push({ pitch: SCALE[step] ?? 67, at, length, onFor: 0, points: null });
    at += length + GLIDE;
    const move = rng.pick([-2, -1, 1, 1, 2, -1] as const);
    step = Math.min(SCALE.length - 1, Math.max(0, step + move));
  }
  return notes;
}

/** Pitch of the ribbon at time t (gliding between notes), or null outside the melody. */
export function ribbonPitch(notes: readonly Note[], t: number): number | null {
  for (let i = 0; i < notes.length; i += 1) {
    const n = notes[i];
    if (!n) continue;
    if (t >= n.at && t <= n.at + n.length) return n.pitch;
    const next = notes[i + 1];
    if (next && t > n.at + n.length && t < next.at) {
      const k = (t - n.at - n.length) / GLIDE;
      const s = (1 - Math.cos(k * Math.PI)) / 2;
      return n.pitch + (next.pitch - n.pitch) * s;
    }
  }
  return null;
}

export function createDanBau({ arena, duration, rng }: GameSetup): MinigameLogic<DanBauState> {
  const events = eventQueue();
  const state: DanBauState = {
    notes: makeMelody(rng, duration),
    playX: Math.max(130, arena.width * 0.26),
    topY: HUD_SAFE_TOP + 60,
    bottomY: arena.height - 190,
    speed: Math.max(200, arena.width * 0.3),
    dotY: null,
    onRibbon: false,
    lastPoints: null,
    lastAt: -9,
    score: 0,
    time: 0,
  };
  const yOf = (pitch: number): number => state.bottomY - ((pitch - LOW) / (HIGH - LOW)) * (state.bottomY - state.topY);
  const pitchOf = (y: number): number => LOW + ((state.bottomY - y) / (state.bottomY - state.topY)) * (HIGH - LOW);
  let sounding = false;
  let lastSent = 0;

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
      const p = input.pointer;
      state.dotY = p ? Math.min(state.bottomY, Math.max(state.topY, p.y)) : null;
      // The string's voice follows the finger.
      if (state.dotY !== null) {
        const pitch = Math.round(pitchOf(state.dotY) * 4) / 4;
        if (!sounding) {
          sounding = true;
          lastSent = pitch;
          events.push({ type: 'action', x: state.playX, y: state.dotY, note: pitch, voice: 'whistle', hold: 'start', holdId: HOLD_ID });
        } else if (Math.abs(pitch - lastSent) >= 0.5) {
          lastSent = pitch;
          events.push({ type: 'action', x: state.playX, y: state.dotY, note: pitch, hold: 'bend', holdId: HOLD_ID });
        }
      } else if (sounding) {
        sounding = false;
        events.push({ type: 'action', x: state.playX, y: state.bottomY, hold: 'release', holdId: HOLD_ID });
      }
      const ribbon = ribbonPitch(state.notes, state.time);
      state.onRibbon = ribbon !== null && state.dotY !== null && Math.abs(state.dotY - yOf(ribbon)) <= RIBBON_HALF;
      for (const n of state.notes) {
        if (n.points !== null) continue;
        if (state.time >= n.at && state.time <= n.at + n.length && state.onRibbon) n.onFor += dt;
        if (state.time > n.at + n.length) {
          const share = n.onFor / n.length;
          n.points = share >= 0.9 ? 2 : share >= 0.6 ? 1 : 0;
          state.lastPoints = n.points;
          state.lastAt = state.time;
          if (n.points > 0) {
            state.score += n.points;
            events.push({ type: 'score', x: state.playX, y: yOf(n.pitch) - 40, points: n.points });
          }
        }
      }
    },
  };
}

/** Good play: the finger at the ribbon's height just ahead of now. */
export function danBauBot(state: DanBauState, _context: BotContext): BotMove {
  const pitch = ribbonPitch(state.notes, state.time + 0.05) ?? ribbonPitch(state.notes, state.time + 0.3);
  if (pitch === null) return {};
  const y = state.bottomY - ((pitch - LOW) / (HIGH - LOW)) * (state.bottomY - state.topY);
  return { touch: { x: state.playX + 200, y } };
}
