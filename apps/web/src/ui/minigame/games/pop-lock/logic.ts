// Pop the lock: a needle sweeps round the ring of a treasure chest's padlock and a golden dot waits on the
// ring. The child taps (anywhere) while the needle is on the dot: the dot pops, the needle turns back and a new
// dot appears ahead of it. Six dots open a lock (a point); a tap off the dot, or letting the needle sweep past
// it, starts that lock over. Every lock spins a little faster. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const DOTS_PER_LOCK = 6;
/** Half the angle (radians) around the dot that counts as on it. */
export const TOLERANCE = 0.22;
const OPEN_SECONDS = 1.3;
const FAIL_SECONDS = 0.9;
/** Needle speed (radians per second) on the first lock, the gain per lock and the most it reaches. */
const SPEED_START = 1.7;
const SPEED_STEP = 0.16;
const SPEED_MAX = 2.6;
/** Pentatonic bell notes climbing with each dot of a lock. */
const DOT_NOTES = [72, 74, 76, 79, 81, 84];

export type LockPhase = 'play' | 'open' | 'fail';

export interface PopLockState {
  centre: Point;
  radius: number;
  needle: number;
  /** +1 clockwise, -1 counter-clockwise (screen angles grow clockwise). */
  dir: number;
  speed: number;
  dot: number;
  dotsLeft: number;
  phase: LockPhase;
  phaseAgo: number;
  locks: number;
  /** When the last dot popped (a ring flash). */
  poppedAt: number;
  score: number;
  time: number;
}

/** Angle difference folded into (-π, π]. */
export const wrapAngle = (a: number): number => {
  const t = (a + Math.PI) % (Math.PI * 2);
  return (t < 0 ? t + Math.PI * 2 : t) - Math.PI;
};

/** How far the dot is ahead of the needle in its direction (negative once passed). */
export const aheadOf = (state: Pick<PopLockState, 'dot' | 'needle' | 'dir'>): number => wrapAngle(state.dot - state.needle) * state.dir;

export function createPopLock({ arena, params, rng }: GameSetup): MinigameLogic<PopLockState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.3, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const free = arena.height - HUD_SAFE_TOP;
  const radius = Math.min(arena.width * 0.34, free * 0.34, 210);
  const centre = { x: arena.width / 2, y: HUD_SAFE_TOP + free * 0.55 };
  const state: PopLockState = {
    centre,
    radius,
    needle: -Math.PI / 2,
    dir: 1,
    speed: SPEED_START * factor,
    dot: 0,
    dotsLeft: DOTS_PER_LOCK,
    phase: 'play',
    phaseAgo: 0,
    locks: 0,
    poppedAt: -9,
    score: 0,
    time: 0,
  };

  const placeDot = (r: Rng): void => {
    state.dot = state.needle + state.dir * r.range(0.9, 3.4);
  };

  const startLock = (): void => {
    state.phase = 'play';
    state.phaseAgo = 0;
    state.dotsLeft = DOTS_PER_LOCK;
    state.needle = -Math.PI / 2;
    state.dir = 1;
    state.speed = Math.min(SPEED_MAX, SPEED_START + SPEED_STEP * state.locks) * factor;
    placeDot(rng);
  };

  const fail = (at: Point): void => {
    state.phase = 'fail';
    state.phaseAgo = 0;
    events.push({ type: 'hit', x: at.x, y: at.y });
  };

  placeDot(rng);

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
      if (state.phase === 'open') {
        if (state.phaseAgo >= OPEN_SECONDS) startLock();
        return;
      }
      if (state.phase === 'fail') {
        if (state.phaseAgo >= FAIL_SECONDS) startLock();
        return;
      }
      state.needle += state.dir * state.speed * dt;
      const dotPoint = { x: centre.x + Math.cos(state.dot) * radius, y: centre.y + Math.sin(state.dot) * radius };
      if (input.taps.length > 0) {
        if (Math.abs(wrapAngle(state.dot - state.needle)) <= TOLERANCE) {
          state.dotsLeft -= 1;
          state.poppedAt = state.time;
          const note = DOT_NOTES[DOTS_PER_LOCK - 1 - state.dotsLeft] ?? 84;
          if (state.dotsLeft <= 0) {
            state.locks += 1;
            state.score += 1;
            state.phase = 'open';
            state.phaseAgo = 0;
            events.push({ type: 'score', x: centre.x, y: centre.y, note, voice: 'bell' });
          } else {
            events.push({ type: 'action', x: dotPoint.x, y: dotPoint.y, note, voice: 'bell' });
            state.dir = -state.dir;
            placeDot(rng);
          }
        } else {
          fail(dotPoint);
        }
        return;
      }
      if (aheadOf(state) < -TOLERANCE) fail(dotPoint);
    },
  };
}

/** Good play: a tap as soon as the needle is on the dot (early in the window, so the next step still counts). */
export function popLockBot(state: PopLockState, _context: BotContext): BotMove {
  if (state.phase !== 'play') return {};
  const ahead = aheadOf(state);
  if (ahead <= TOLERANCE * 0.95 && ahead >= -TOLERANCE * 0.6) return { tap: { x: state.centre.x, y: state.centre.y + state.radius + 60 } };
  return {};
}
