// Drum beat: notes slide along a lane toward a ring; when a note sits in the ring the child hits the big
// festival drum at the bottom: its red middle for a full red note ("tùng"), its blue rim (or anywhere off the
// middle) for a hollow blue note ("cắc"). Every tap sounds the drum; a right hit on time is a point. A song is
// always 48 notes, so the goal is the same share of every song. Right on the beat is two points, close is
// one. A strike with no note near it puts the drum off the beat for a moment, so drumming all the time does
// not score. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type DrumHit = 'face' | 'rim';

export interface Note {
  kind: DrumHit;
  /** Seconds into the round when it sits in the ring. */
  at: number;
  /** null until judged; then how it went and when. */
  result: 'perfect' | 'good' | 'wrong' | 'late' | null;
  judgedAt: number;
}

export interface DrumBeatState {
  notes: Note[];
  /** Where the lane runs (y), where the ring is (x) and where notes appear (x). */
  laneY: number;
  ringX: number;
  spawnX: number;
  drum: Point;
  faceRadius: number;
  rimRadius: number;
  /** The last part of the drum struck and when (the drum bounces). */
  struck: DrumHit | null;
  struckAt: number;
  /** Until this time strikes do not count: the last one came with no note near it. */
  offBeatUntil: number;
  /** Words for the last judged note. */
  lastResult: Note['result'];
  lastAt: number;
  score: number;
  time: number;
}

export const NOTE_COUNT = 48;
/** Seconds a note takes from where it appears to the ring, on every screen. */
export const TRAVEL_SECONDS = 1.8;
/** A tap this close to the note's time is perfect; this close is still good. */
export const PERFECT_WINDOW = 0.07;
export const GOOD_WINDOW = 0.18;
const FIRST_NOTE = 2.2;
/** Seconds a stray strike keeps the drum off the beat. */
export const OFF_BEAT_SECONDS = 0.25;
/** Drum sounds (MIDI): a deep "tùng" and a dry "cắc". */
const FACE_NOTE = 43;
const RIM_NOTE = 74;

/** The song: NOTE_COUNT notes on a steady beat with some quick pairs and rests, finished before `end`. */
export function makeSong(rng: Rng, end: number): Note[] {
  const notes: Note[] = [];
  let at = FIRST_NOTE;
  for (let i = 0; i < NOTE_COUNT; i += 1) {
    notes.push({ kind: rng.chance(0.58) ? 'face' : 'rim', at, result: null, judgedAt: 0 });
    const left = NOTE_COUNT - 1 - i;
    const progress = i / NOTE_COUNT;
    const gaps = progress < 0.3 ? ([0.6, 0.9, 1.2, 0.6] as const) : ([0.6, 0.3, 0.9, 0.6, 0.3] as const);
    let gap: number = rng.pick(gaps);
    // Never past the end of the round: quicken when time runs short.
    if (at + gap + (left - 1) * 0.3 > end) gap = 0.3;
    at += gap;
  }
  return notes;
}

export function createDrumBeat({ arena, duration, rng }: GameSetup): MinigameLogic<DrumBeatState> {
  const events = eventQueue();
  const rimRadius = Math.min(175, arena.width * 0.3, (arena.height - HUD_SAFE_TOP - 120) / 2.3);
  const faceRadius = rimRadius * 0.62;
  const drum = { x: arena.width / 2, y: arena.height - Math.max(rimRadius + 30, arena.height * 0.2) };
  const laneY = Math.max(HUD_SAFE_TOP + 70, drum.y - rimRadius - 95);
  const state: DrumBeatState = {
    notes: makeSong(rng, duration - 1),
    laneY,
    ringX: 110,
    spawnX: arena.width + 40,
    drum,
    faceRadius,
    rimRadius,
    struck: null,
    struckAt: -9,
    offBeatUntil: 0,
    lastResult: null,
    lastAt: -9,
    score: 0,
    time: 0,
  };

  const judge = (note: Note, result: NonNullable<Note['result']>): void => {
    note.result = result;
    note.judgedAt = state.time;
    state.lastResult = result;
    state.lastAt = state.time;
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
      const press = input.pressed ? (input.pointer ?? input.taps[0] ?? null) : null;
      if (press) {
        const hit: DrumHit = Math.hypot(press.x - drum.x, press.y - drum.y) <= faceRadius ? 'face' : 'rim';
        state.struck = hit;
        state.struckAt = state.time;
        const sound = hit === 'face' ? { note: FACE_NOTE, voice: 'drum' as const } : { note: RIM_NOTE, voice: 'clap' as const };
        const note = state.notes.find((n) => n.result === null && Math.abs(n.at - state.time) <= GOOD_WINDOW);
        const onBeat = state.time >= state.offBeatUntil;
        if (!note) state.offBeatUntil = state.time + OFF_BEAT_SECONDS;
        if (note && onBeat && note.kind === hit) {
          const perfect = Math.abs(note.at - state.time) <= PERFECT_WINDOW;
          judge(note, perfect ? 'perfect' : 'good');
          const points = perfect ? 2 : 1;
          state.score += points;
          events.push({ type: 'score', x: state.ringX, y: laneY, points, ...sound });
        } else {
          if (note && onBeat) {
            judge(note, 'wrong');
            events.push({ type: 'miss', x: state.ringX, y: laneY });
          }
          events.push({ type: 'action', x: press.x, y: press.y, ...sound });
        }
      }
      for (const note of state.notes) {
        if (note.result === null && state.time - note.at > GOOD_WINDOW) {
          judge(note, 'late');
          events.push({ type: 'miss', x: state.ringX, y: laneY });
        }
      }
    },
  };
}

/** Where a note is drawn: it reaches the ring at its time. */
export function noteX(state: DrumBeatState, note: Note): number {
  return state.ringX + ((note.at - state.time) / TRAVEL_SECONDS) * (state.spawnX - state.ringX);
}

/** Good play: strike the right part of the drum on the decision closest to each note. */
export function drumBeatBot(state: DrumBeatState, _context: BotContext): BotMove {
  const note = state.notes.find((n) => n.result === null && Math.abs(n.at - state.time) <= 0.05);
  if (!note) return {};
  const { drum, faceRadius, rimRadius } = state;
  return { tap: note.kind === 'face' ? { x: drum.x, y: drum.y } : { x: drum.x + (faceRadius + rimRadius) / 2, y: drum.y } };
}
