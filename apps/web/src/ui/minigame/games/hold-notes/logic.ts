// Kite flute: a kite with a bamboo flute flies over the fields, and the flute's notes float toward a line, long
// ones and short ones. The child puts a finger down (anywhere) when a note reaches the line and keeps it there
// as long as the note lasts: the flute sings while the finger is down. Lifting near the note's end is a point
// (two when both the start and the end were spot on); lifting much too early or holding much too long only
// loses that note. The song has a fixed number of notes,
// so the goal is the same share of every song. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export type NoteResult = 'perfect' | 'good' | 'short' | 'long' | 'missed';

export interface FluteNote {
  /** Seconds into the round when it reaches the line, and how long it lasts. */
  at: number;
  len: number;
  pitch: number;
  /** Held now; then how it went. */
  holding: boolean;
  result: NoteResult | null;
  /** When it was pressed and when it was judged. */
  pressedAt: number;
  judgedAt: number;
}

export interface HoldNotesState {
  notes: FluteNote[];
  laneY: number;
  lineX: number;
  /** Arena units a note travels per second. */
  speed: number;
  kiteLift: number;
  lastResult: NoteResult | null;
  lastAt: number;
  score: number;
  time: number;
}

export const NOTE_COUNT = 24;
/** A press this close to the note's start catches it; a lift this close to its end is right. */
export const PRESS_WINDOW = 0.22;
export const RELEASE_WINDOW = 0.25;
/** Both this close: a perfect note, two points. */
export const PERFECT_PRESS = 0.1;
export const PERFECT_RELEASE = 0.12;
const FIRST_NOTE = 2.2;
const LEAD_SECONDS = 2.4;
const LENGTHS = [0.35, 0.6, 0.9, 1.3] as const;
const GAPS = [0.35, 0.5, 0.7] as const;
/** A bamboo flute's five notes (D E G A B) over two octaves. */
const SCALE = [74, 76, 79, 81, 83, 86, 88] as const;

/** The song: NOTE_COUNT notes of mixed lengths, a gentle melody, done before `end`. */
export function makeTune(rng: Rng, end: number): FluteNote[] {
  const notes: FluteNote[] = [];
  let at = FIRST_NOTE;
  let degree = 2;
  for (let i = 0; i < NOTE_COUNT; i += 1) {
    const left = NOTE_COUNT - 1 - i;
    let len: number = rng.pick(LENGTHS);
    let gap: number = rng.pick(GAPS);
    // Squeeze when time runs short.
    if (at + len + gap + left * 0.7 > end) {
      len = 0.35;
      gap = 0.35;
    }
    degree = Math.max(0, Math.min(SCALE.length - 1, degree + rng.pick([-2, -1, -1, 0, 1, 1, 2] as const)));
    notes.push({ at, len, pitch: SCALE[degree] ?? 79, holding: false, result: null, pressedAt: 0, judgedAt: 0 });
    at += len + gap;
  }
  return notes;
}

export function createHoldNotes({ arena, duration, rng }: GameSetup): MinigameLogic<HoldNotesState> {
  const events = eventQueue();
  const lineX = Math.max(110, arena.width * 0.2);
  const laneY = HUD_SAFE_TOP + (arena.height - HUD_SAFE_TOP) * 0.5;
  const state: HoldNotesState = {
    notes: makeTune(rng, duration - 1),
    laneY,
    lineX,
    speed: (arena.width - lineX + 40) / LEAD_SECONDS,
    kiteLift: 0,
    lastResult: null,
    lastAt: -9,
    score: 0,
    time: 0,
  };

  const judge = (note: FluteNote, result: NoteResult, index: number): void => {
    const wasHeld = note.holding;
    note.holding = false;
    note.result = result;
    note.judgedAt = state.time;
    state.lastResult = result;
    state.lastAt = state.time;
    const at = { x: lineX, y: laneY };
    const release = wasHeld ? { hold: 'release' as const, holdId: `flute-${index}`, note: note.pitch } : {};
    if (result === 'good' || result === 'perfect') {
      const points = result === 'perfect' ? 2 : 1;
      state.score += points;
      state.kiteLift = Math.min(1, state.kiteLift + 0.08);
      events.push({ type: 'score', ...at, points, ...release });
    } else {
      state.kiteLift = Math.max(0, state.kiteLift - 0.05);
      events.push({ type: 'miss', ...at, ...release });
    }
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
      const down = input.pressed;
      const up = input.released || (!input.pointer && state.notes.some((n) => n.holding));
      if (down) {
        const index = state.notes.findIndex((n) => n.result === null && !n.holding && Math.abs(n.at - state.time) <= PRESS_WINDOW);
        const note = state.notes[index];
        if (note) {
          note.holding = true;
          note.pressedAt = state.time;
          events.push({ type: 'action', x: lineX, y: laneY, note: note.pitch, voice: 'whistle', hold: 'start', holdId: `flute-${index}` });
        }
      }
      state.notes.forEach((note, index) => {
        if (note.result !== null) return;
        const end = note.at + note.len;
        if (note.holding) {
          if (up && !down) {
            const off = state.time - end;
            const spotOn = Math.abs(off) <= PERFECT_RELEASE && Math.abs(note.pressedAt - note.at) <= PERFECT_PRESS;
            judge(note, Math.abs(off) <= RELEASE_WINDOW ? (spotOn ? 'perfect' : 'good') : off < 0 ? 'short' : 'long', index);
          } else if (state.time > end + RELEASE_WINDOW) judge(note, 'long', index);
        } else if (state.time > note.at + PRESS_WINDOW) judge(note, 'missed', index);
      });
    },
  };
}

/** Where a note's head is on screen at the current time. */
export const noteX = (state: HoldNotesState, at: number): number => state.lineX + (at - state.time) * state.speed;

/** Good play: down as the note arrives, held, up as it ends. */
export function holdNotesBot(state: HoldNotesState, context: BotContext): BotMove {
  const finger = { x: context.arena.width / 2, y: context.arena.height * 0.75 };
  const held = state.notes.find((n) => n.holding);
  if (held) return state.time >= held.at + held.len - 0.06 ? {} : { touch: finger };
  const next = state.notes.find((n) => n.result === null);
  if (next && next.at - state.time <= 0.06 && next.at - state.time >= -0.15) return { touch: finger };
  return {};
}
