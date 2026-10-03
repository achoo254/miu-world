// Clock catch: an alarm clock's hands run fast (an hour every few seconds); the rooster asks for a time ("7 giờ",
// "8 giờ rưỡi", "3 giờ 15 phút") and the child taps to stop the hands on it. Close enough (a few minutes) is a
// point and a new time; a wrong stop rings, and the hands wind back three quarters of an hour before running on,
// so tapping all the time never gets there. Hands that run well past the time wind back too. Times are the
// class 2 ones: o'clock, half past, quarter past. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface ClockTime {
  hour: number;
  minute: 0 | 15 | 30;
}

export type Phase = 'run' | 'right' | 'wrong' | 'rewind';

export interface ClockCatchState {
  /** Minutes on the clock, 0 … 720 (12 hours), fractional. */
  minutes: number;
  target: ClockTime;
  phase: Phase;
  phaseTime: number;
  /** Where the rewind starts and ends. */
  rewindFrom: number;
  rewindTo: number;
  clock: Point & { r: number };
  card: { x: number; y: number; w: number; h: number };
  lastTapAt: number;
  score: number;
  time: number;
}

/** Minutes either side of the asked time that still count. */
export const TOLERANCE = 7;
const RIGHT_PAUSE = 1.1;
const WRONG_PAUSE = 0.5;
const REWIND_SECONDS = 0.6;
const REWIND_MINUTES = 45;
const DAY = 720;

/** Minutes after 12:00 of a time. */
export const minutesOf = (t: ClockTime): number => (t.hour % 12) * 60 + t.minute;

/** Signed minutes from the clock to the target, in −360 … 360. */
export function offset(clock: number, target: number): number {
  return ((((target - clock) % DAY) + DAY + DAY / 2) % DAY) - DAY / 2;
}

/** "7 giờ", "7 giờ rưỡi", "7 giờ 15 phút". */
export function spoken(t: ClockTime): string {
  if (t.minute === 0) return `${t.hour} giờ`;
  if (t.minute === 30) return `${t.hour} giờ rưỡi`;
  return `${t.hour} giờ ${t.minute} phút`;
}

export const digital = (t: ClockTime): string => `${t.hour}:${String(t.minute).padStart(2, '0')}`;

function randomTime(rng: Rng, previous: ClockTime | null): ClockTime {
  for (;;) {
    const t: ClockTime = { hour: rng.int(1, 12), minute: rng.pick([0, 0, 30, 30, 15] as const) };
    if (!previous || t.hour !== previous.hour) return t;
  }
}

export function createClockCatch({ arena, duration, params, rng }: GameSetup): MinigameLogic<ClockCatchState> {
  const speed = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const top = HUD_SAFE_TOP + 10;
  const landscape = arena.width > arena.height;
  let clock: ClockCatchState['clock'];
  let card: ClockCatchState['card'];
  if (landscape) {
    const r = Math.min((arena.height - top - 30) / 2, arena.width * 0.28);
    clock = { x: 30 + r, y: top + (arena.height - top) / 2, r };
    card = { x: 2 * r + 70, y: top + 20, w: arena.width - 2 * r - 100, h: arena.height - top - 60 };
  } else {
    card = { x: 20, y: top, w: arena.width - 40, h: 190 };
    const r = Math.min((arena.width - 60) / 2, (arena.height - card.y - card.h - 60) / 2);
    clock = { x: arena.width / 2, y: card.y + card.h + 30 + r + (arena.height - card.y - card.h - 60 - 2 * r) / 2, r };
  }
  const target = randomTime(rng, null);
  const state: ClockCatchState = {
    minutes: (minutesOf(target) - rng.range(30, 80) + DAY) % DAY,
    target,
    phase: 'run',
    phaseTime: 0,
    rewindFrom: 0,
    rewindTo: 0,
    clock,
    card,
    lastTapAt: -1,
    score: 0,
    time: 0,
  };

  /** Clock minutes per second: an hour in three seconds, a little quicker by the end. */
  const rate = (): number => (20 + 6 * Math.min(1, state.time / duration)) * speed;

  function rewind(by: number): void {
    state.phase = 'rewind';
    state.phaseTime = 0;
    state.rewindFrom = state.minutes;
    state.rewindTo = state.minutes - by;
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
      state.time += dt;
      state.phaseTime += dt;
      switch (state.phase) {
        case 'right':
          if (state.phaseTime >= RIGHT_PAUSE) {
            state.target = randomTime(rng, state.target);
            // The hands start a little before the new time, running toward it.
            const before = rng.range(30, 80);
            state.rewindFrom = state.minutes;
            state.rewindTo = state.minutes + offset(state.minutes, minutesOf(state.target) - before);
            state.phase = 'rewind';
            state.phaseTime = 0;
          }
          return;
        case 'wrong':
          if (state.phaseTime >= WRONG_PAUSE) rewind(REWIND_MINUTES);
          return;
        case 'rewind': {
          const t = Math.min(1, state.phaseTime / REWIND_SECONDS);
          state.minutes = (((state.rewindFrom + (state.rewindTo - state.rewindFrom) * t) % DAY) + DAY) % DAY;
          if (t >= 1) {
            state.phase = 'run';
            state.phaseTime = 0;
          }
          return;
        }
        case 'run':
          break;
      }
      state.minutes = (state.minutes + rate() * dt) % DAY;
      if (input.taps.length > 0) {
        state.lastTapAt = state.time;
        const off = Math.abs(offset(state.minutes, minutesOf(state.target)));
        if (off <= TOLERANCE) {
          // Settle the hands right on the time, so the face shows it.
          state.minutes = minutesOf(state.target);
          state.phase = 'right';
          state.phaseTime = 0;
          state.score += 1;
          events.push({ type: 'score', x: clock.x, y: clock.y - clock.r * 0.4, note: 84, voice: 'bell' });
        } else {
          state.phase = 'wrong';
          state.phaseTime = 0;
          events.push({ type: 'hit', x: clock.x, y: clock.y });
        }
        return;
      }
      // Well past the time: wind back so it comes round again soon.
      if (offset(state.minutes, minutesOf(state.target)) < -40) rewind(90);
    },
  };
}

/** Good play: taps when the hands are a breath before the time (the tap lands within the next tenth of a second). */
export function clockCatchBot(state: ClockCatchState, _context: BotContext): BotMove {
  if (state.phase !== 'run') return {};
  const off = offset(state.minutes, minutesOf(state.target));
  return off <= 3 && off >= -4 ? { tap: { x: state.clock.x, y: state.clock.y } } : {};
}
