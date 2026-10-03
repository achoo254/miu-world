// Kéo cưa lừa xẻ (the sawing folk game and rhyme): the child and a friend hold the two ends of a long saw over
// a log. The friend pulls and pushes in a steady rhythm, shown by a ghost handle on the blade; the child drags
// left and right to move the saw with them. While the saw stays with the friend's rhythm it bites into the log
// (one word of the rhyme on every stroke); pulling against the friend jams the saw for a second. A log cut
// through is a point, and the next log is rolled up. The rhythm quickens a little as the round goes on.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

/** The rhyme, one word per stroke. */
export const RHYME = ['Kéo', 'cưa', 'lừa', 'xẻ', 'Ông', 'thợ', 'nào', 'khỏe', 'Về', 'ăn', 'cơm', 'vua', 'Ông', 'thợ', 'nào', 'thua', 'Về', 'bú', 'tí', 'mẹ'];

export interface KeoCuaState {
  /** The saw's offset from the middle (−reach … reach), and where the friend's rhythm wants it. */
  saw: number;
  target: number;
  reach: number;
  /** Half the saw's length, and where the two sawyers stand (from the middle). */
  half: number;
  stand: number;
  /** Rhythm phase (cycles) and speed (cycles per second). */
  phase: number;
  rate: number;
  /** Centre of the log and the saw's line. */
  x: number;
  y: number;
  /** How far through the log (0 … 1). */
  cut: number;
  /** Seconds the saw has been off the rhythm, and when it jammed (stuck until JAM later). */
  offFor: number;
  /** When the saw last moved (a finger held still does not saw). */
  movedAt: number;
  jammedAt: number;
  /** Strokes made (the rhyme's word), and when the last one landed. */
  strokes: number;
  strokeAt: number;
  /** Logs cut, and seconds since the last one fell (−1 while sawing). */
  logs: number;
  falling: number;
  inTime: boolean;
  score: number;
  time: number;
}

/** In time within this share of the reach; off by more than OFF for OFF_SECONDS jams the saw. */
export const TOLERANCE = 0.42;
const OFF = 0.7;
const OFF_SECONDS = 0.4;
export const JAM_SECONDS = 1;
/** Rhythm cycles of good sawing that cut one log. */
export const CYCLES_PER_LOG = 3;
const NEXT_LOG_SECONDS = 0.8;
const FOLLOW_SPEED = 1500;

export const isJammed = (state: KeoCuaState): boolean => state.time - state.jammedAt < JAM_SECONDS;

export function createKeoCua({ arena, duration }: GameSetup): MinigameLogic<KeoCuaState> {
  const events = eventQueue();
  const reach = Math.min(160, arena.width * 0.15);
  const half = Math.min(260, arena.width / 2 - reach - 70);
  const state: KeoCuaState = {
    saw: 0,
    target: 0,
    reach,
    half,
    stand: Math.min(arena.width / 2 - 50, half + reach + 20),
    phase: 0,
    rate: 0.6,
    x: arena.width / 2,
    y: HUD_SAFE_TOP + (arena.height - HUD_SAFE_TOP) * 0.45,
    cut: 0,
    offFor: 0,
    movedAt: -9,
    jammedAt: -9,
    strokes: 0,
    strokeAt: -9,
    logs: 0,
    falling: -1,
    inTime: false,
    score: 0,
    time: 0,
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
      const progress = Math.min(1, state.time / duration);
      state.rate = 0.6 + 0.25 * progress;
      const before = state.phase;
      state.phase += state.rate * dt;
      state.target = Math.sin(state.phase * Math.PI * 2) * reach;

      if (state.falling >= 0) {
        state.falling += dt;
        if (state.falling >= NEXT_LOG_SECONDS) {
          state.falling = -1;
          state.cut = 0;
        }
      }
      const jammed = isJammed(state);
      const last = state.saw;
      if (input.pointer && !jammed) {
        const want = Math.max(-reach, Math.min(reach, input.pointer.x - state.x));
        const stepMax = FOLLOW_SPEED * dt;
        state.saw += Math.max(-stepMax, Math.min(stepMax, want - state.saw));
      }
      if (Math.abs(state.saw - last) > 0.5) state.movedAt = state.time;
      const error = Math.abs(state.saw - state.target) / reach;
      state.inTime = !jammed && input.pointer !== null && error <= TOLERANCE && state.time - state.movedAt < 0.2;
      if (state.inTime && state.falling < 0) {
        // The saw bites as far as the friend pulls: CYCLES_PER_LOG cycles (four reaches each) in time cut a log.
        const pulled = Math.abs(state.target - Math.sin(before * Math.PI * 2) * reach);
        state.cut += pulled / (4 * reach * CYCLES_PER_LOG);
        if (state.cut >= 1) {
          state.cut = 1;
          state.logs += 1;
          state.score += 1;
          state.falling = 0;
          events.push({ type: 'score', x: state.x, y: state.y + 60 });
        }
      }
      if (!jammed && input.pointer && error > OFF) {
        state.offFor += dt;
        if (state.offFor >= OFF_SECONDS) {
          state.jammedAt = state.time;
          state.offFor = 0;
          events.push({ type: 'hit', x: state.x, y: state.y });
        }
      } else state.offFor = Math.max(0, state.offFor - dt);

      // A stroke ends at each turn of the friend's rhythm: the next word of the rhyme, sounded if in time.
      const turns = Math.floor(before * 2 + 0.5) !== Math.floor(state.phase * 2 + 0.5);
      if (turns) {
        state.strokes += 1;
        state.strokeAt = state.time;
        const inTime = !jammed && Math.abs(state.saw - state.target) / reach <= TOLERANCE * 1.4 && input.pointer !== null;
        if (inTime) events.push({ type: 'action', x: state.x + state.saw, y: state.y - 40, note: state.strokes % 2 === 0 ? 72 : 67, voice: 'piano' });
      }
    },
  };
}

/** Good play: the finger where the friend's rhythm will have the saw half a decision from now. */
export function keoCuaBot(state: KeoCuaState, _context: BotContext): BotMove {
  const ahead = state.phase + state.rate * 0.05;
  return { touch: { x: state.x + Math.sin(ahead * Math.PI * 2) * state.reach, y: state.y + 140 } };
}
