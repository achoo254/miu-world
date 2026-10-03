// Rice pound: two pestles take turns in one mortar. The friend pounds on the odd beats, the child taps on the
// even ones; a ring closing on the child's pestle shows when. On the beat is a point (rice jumps); the tempo
// quickens every few right beats. A tap on the friend's beat, or with no beat near, knocks the pestles together:
// the friend stops for a moment and the tempo eases, so drumming all the time does not pay. A missed beat only
// slows the tempo a little. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Beat {
  /** Seconds into the round. */
  at: number;
  /** The child's beat (even) or the friend's (odd). */
  mine: boolean;
  result: 'hit' | 'missed' | null;
}

export interface RicePoundState {
  beats: Beat[];
  /** Seconds between one beat and the next (friend to child). */
  gap: number;
  /** Right beats since the last tempo change. */
  streak: number;
  mortar: Point;
  /** When each pestle last struck (the child's and the friend's), for the swing. */
  myStrikeAt: number;
  friendStrikeAt: number;
  /** When the pestles last knocked together. */
  clashAt: number;
  lastResultAt: number;
  lastResult: 'hit' | 'missed' | 'clash' | null;
  score: number;
  time: number;
}

/** A tap this close to the child's beat counts. */
export const WINDOW = 0.16;
const GAP_START = 0.55;
const GAP_FASTEST = 0.32;
const GAP_SLOWEST = 0.65;
const SPEED_UP_EVERY = 6;
const CLASH_PAUSE = 1.0;
const FIRST_BEAT = 1.2;
/** Low and high pounding notes (MIDI). */
const FRIEND_NOTE = 45;
const MY_NOTE = 52;

export function createRicePound({ arena, params }: GameSetup): MinigameLogic<RicePoundState> {
  const speed = typeof params.speed === 'number' ? Math.min(1.4, Math.max(0.7, params.speed)) : 1;
  const events = eventQueue();
  const mortar = { x: arena.width / 2, y: HUD_SAFE_TOP + (arena.height - HUD_SAFE_TOP) * 0.62 };
  const state: RicePoundState = {
    beats: [{ at: FIRST_BEAT, mine: false, result: null }],
    gap: GAP_START / speed,
    streak: 0,
    mortar,
    myStrikeAt: -9,
    friendStrikeAt: -9,
    clashAt: -9,
    lastResultAt: -9,
    lastResult: null,
    score: 0,
    time: 0,
  };

  /** Keeps two beats queued ahead, alternating friend and child. */
  function schedule(): void {
    const last = state.beats[state.beats.length - 1];
    if (!last) return;
    while (state.beats.filter((b) => b.at > state.time).length < 3) {
      const tail = state.beats[state.beats.length - 1] ?? last;
      state.beats.push({ at: tail.at + state.gap, mine: !tail.mine, result: null });
    }
    state.beats = state.beats.filter((b) => b.at > state.time - 1.5);
  }

  /** Throws away the planned beats and restarts with the friend after `wait` seconds. */
  function restart(wait: number): void {
    state.beats = state.beats.filter((b) => b.at <= state.time);
    state.beats.push({ at: state.time + wait, mine: false, result: null });
    schedule();
  }

  function settle(result: RicePoundState['lastResult']): void {
    state.lastResult = result;
    state.lastResultAt = state.time;
  }

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
      schedule();
      // The friend pounds on its beats.
      for (const b of state.beats) {
        if (!b.mine && b.at > before && b.at <= state.time) {
          state.friendStrikeAt = state.time;
          events.push({ type: 'action', x: mortar.x - 60, y: mortar.y - 40, note: FRIEND_NOTE, voice: 'drum' });
        }
        // The child's beat slipped by.
        if (b.mine && b.result === null && state.time > b.at + WINDOW) {
          b.result = 'missed';
          state.streak = 0;
          state.gap = Math.min(GAP_SLOWEST / speed, state.gap + 0.03);
          settle('missed');
          events.push({ type: 'miss', x: mortar.x, y: mortar.y });
        }
      }
      for (const _tap of input.taps) {
        state.myStrikeAt = state.time;
        const mine = state.beats.find((b) => b.mine && b.result === null && Math.abs(b.at - state.time) <= WINDOW);
        if (mine) {
          mine.result = 'hit';
          state.score += 1;
          state.streak += 1;
          settle('hit');
          events.push({ type: 'score', x: mortar.x, y: mortar.y - 80, note: MY_NOTE, voice: 'drum' });
          if (state.streak >= SPEED_UP_EVERY) {
            state.streak = 0;
            const gap = Math.max(GAP_FASTEST / speed, state.gap - 0.04);
            if (gap !== state.gap) {
              state.gap = gap;
              // The new tempo starts after the next friend's beat.
              restart(state.gap * 2);
            }
          }
        } else {
          // Off the beat: the pestles knock, the friend waits, the tempo eases.
          state.streak = 0;
          state.clashAt = state.time;
          state.gap = Math.min(GAP_SLOWEST / speed, state.gap + 0.05);
          settle('clash');
          events.push({ type: 'hit', x: mortar.x, y: mortar.y - 60 });
          restart(CLASH_PAUSE);
        }
        break;
      }
    },
  };
}

/** Good play: strikes as its beat comes (it decides ten times a second, so it leads a little). */
export function ricePoundBot(state: RicePoundState, _context: BotContext): BotMove {
  const mine = state.beats.find((b) => b.mine && b.result === null && b.at >= state.time - 0.05);
  if (!mine) return {};
  const ahead = mine.at - state.time;
  return ahead <= 0.09 && ahead >= -0.06 ? { tap: { x: state.mortar.x, y: state.mortar.y } } : {};
}
