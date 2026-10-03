// Yo-yo: the child swipes down to throw the yo-yo; it runs down its string, spins ("sleeps") at the bottom for
// a moment, and a tap right then rolls it back up: a point, two (and a named trick) when the tap is quick.
// Tapping while it is still high, or waiting too long, lets the string go slack: the yo-yo comes back to the
// hand slowly and she throws again. Every throw has its own string length and speed, so she has to watch the
// yo-yo, not count. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export type YoyoPhase = 'hand' | 'down' | 'sleep' | 'up' | 'slack';

export interface YoyoState {
  handX: number;
  handY: number;
  phase: YoyoPhase;
  /** Seconds in the current phase. */
  phaseTime: number;
  /** String length of this throw (arena units) and seconds the yo-yo takes to reach its end. */
  length: number;
  fallTime: number;
  /** How far down the string the yo-yo is (0 at the hand … length). */
  drop: number;
  /** Spin angle (radians) for the picture. */
  spin: number;
  /** The last trick's name and when it was done (for the floating words). */
  trick: string;
  trickAt: number;
  /** What the last catch was: shown as a word under the hand. */
  last: 'perfect' | 'good' | 'early' | 'late' | null;
  lastAt: number;
  rolls: number;
  score: number;
  time: number;
}

/** A tap this long before the yo-yo reaches the bottom still catches it. */
export const EARLY_WINDOW = 0.14;
/** Seconds it sleeps at the bottom; a tap in the first PERFECT_WINDOW of them is a trick. */
export const SLEEP_SECONDS = 0.42;
export const PERFECT_WINDOW = 0.14;
const UP_SECONDS = 0.5;
const SLACK_SECONDS = 1.1;

export const TRICKS = ['Dắt cún đi dạo', 'Vòng quanh thế giới', 'Ru em ngủ', 'Bay lên trời', 'Cầu vồng', 'Chong chóng'] as const;

export function createYoyo({ arena, duration, params, rng }: GameSetup): MinigameLogic<YoyoState> {
  const pace = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.7, params.speed)) : 1;
  const events = eventQueue();
  const handY = HUD_SAFE_TOP + 70;
  const room = arena.height - handY - 90;
  const state: YoyoState = {
    handX: arena.width / 2,
    handY,
    phase: 'hand',
    phaseTime: 0,
    length: room * 0.7,
    fallTime: 0.7,
    drop: 0,
    spin: 0,
    trick: '',
    trickAt: -9,
    last: null,
    lastAt: -9,
    rolls: 0,
    score: 0,
    time: 0,
  };

  const setPhase = (phase: YoyoPhase): void => {
    state.phase = phase;
    state.phaseTime = 0;
  };
  const bottomY = (): number => state.handY + state.length;

  function throwYoyo(): void {
    // Longer strings and quicker drops as the round goes on.
    const late = Math.min(1, state.time / duration);
    state.length = room * rng.range(0.5, 0.75 + 0.25 * late);
    state.fallTime = rng.range(0.55, 0.9 - 0.15 * late) / pace;
    state.drop = 0;
    setPhase('down');
    events.push({ type: 'action', x: state.handX, y: state.handY + 30 });
  }

  function slack(why: 'early' | 'late'): void {
    state.last = why;
    state.lastAt = state.time;
    setPhase('slack');
    events.push({ type: 'miss', x: state.handX, y: state.handY + state.drop });
  }

  function catchYoyo(perfect: boolean): void {
    const points = perfect ? 2 : 1;
    state.score += points;
    state.rolls += 1;
    state.last = perfect ? 'perfect' : 'good';
    state.lastAt = state.time;
    if (perfect) {
      state.trick = TRICKS[rng.int(0, TRICKS.length - 1)] ?? TRICKS[0];
      state.trickAt = state.time;
    }
    setPhase('up');
    events.push({ type: 'score', x: state.handX, y: bottomY() - 40, points, note: perfect ? 79 : 72, voice: 'bell' });
  }

  function tap(): void {
    if (state.phase === 'down') {
      if (state.fallTime - state.phaseTime <= EARLY_WINDOW) catchYoyo(false);
      else slack('early');
    } else if (state.phase === 'sleep') {
      catchYoyo(state.phaseTime <= PERFECT_WINDOW);
    }
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
      if (state.phase === 'hand' && input.swipes.some((s) => s.direction === 'down')) throwYoyo();
      else if (input.taps.length > 0) tap();

      switch (state.phase) {
        case 'hand':
          state.drop = 0;
          state.spin += dt * 2;
          break;
        case 'down': {
          // Accelerates down the string like a real yo-yo.
          const t = Math.min(1, state.phaseTime / state.fallTime);
          state.drop = state.length * t * t;
          state.spin += dt * (8 + 22 * t);
          if (t >= 1) setPhase('sleep');
          break;
        }
        case 'sleep':
          state.drop = state.length;
          state.spin += dt * 30;
          if (state.phaseTime > SLEEP_SECONDS) slack('late');
          break;
        case 'up': {
          const t = Math.min(1, state.phaseTime / UP_SECONDS);
          state.drop = state.length * (1 - t * (2 - t));
          state.spin -= dt * 26;
          if (t >= 1) setPhase('hand');
          break;
        }
        case 'slack': {
          // Hangs, wobbles, then the child winds it back up by hand.
          const t = Math.min(1, state.phaseTime / SLACK_SECONDS);
          state.drop = Math.max(0, state.drop - dt * (t > 0.5 ? state.length * 2 : 0));
          state.spin += dt * 3 * (1 - t);
          if (t >= 1) setPhase('hand');
          break;
        }
      }
    },
  };
}

/** Good play: throws as soon as the yo-yo is in the hand and taps as it reaches the bottom of the string. */
export function yoyoBot(state: YoyoState, context: BotContext): BotMove {
  if (state.phase === 'hand') return { swipe: { from: { x: state.handX, y: state.handY + 60 }, dx: 0, dy: 160 } };
  const tap = { x: context.arena.width / 2, y: context.arena.height * 0.6 };
  if (state.phase === 'down' && state.fallTime - state.phaseTime <= 0.09) return { tap };
  if (state.phase === 'sleep') return { tap };
  return {};
}
