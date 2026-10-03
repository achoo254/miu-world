// Swing push (đánh đu): the bamboo swing sways by itself, a little less every second. A tap just as it reaches
// its high point at the back is a push that swings it higher; a tap at any other moment drags it down a bit.
// A lucky red ribbon (dải lộc) hangs high on one side: when the swing reaches it, the child grabs it (a point)
// and a new one is hung somewhere else. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export interface SwingState {
  pivotX: number;
  pivotY: number;
  rope: number;
  /** Swing size (radians) and where in its cycle it is (radians: 0 straight down going forward). */
  amplitude: number;
  phase: number;
  /** Rope angle from straight down (radians; positive = forward, to the right). */
  angle: number;
  /** The ribbon's rope angle (negative = behind). */
  ribbon: number;
  /** Seconds since the last ribbon was grabbed. */
  grabbedAgo: number;
  /** The push of this swing was already used. */
  pushed: boolean;
  /** Seconds since the last push (good) or a mistimed tap (bad), for the picture. */
  pushAgo: number;
  badAgo: number;
  score: number;
  time: number;
}

const PERIOD = 2.3;
const OMEGA = (Math.PI * 2) / PERIOD;
/** Phase of the high point behind (where the angle is -amplitude). */
const BACK_PEAK = Math.PI * 1.5;
/** A push counts this close (radians of phase) to the back high point: about a third of a second each side. */
export const PUSH_WINDOW = 0.95;
const PUSH_GAIN = 0.17;
const BAD_TAP_LOSS = 0.08;
const DRAG = 0.032;
const START_AMPLITUDE = 0.3;
export const MAX_AMPLITUDE = 1.22;
/** The swing loses this much as the child reaches out for a ribbon. */
const GRAB_LOSS = 0.12;

const wrap = (a: number): number => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
/** Phase distance to the back high point (radians). */
export const fromBackPeak = (phase: number): number => Math.abs(wrap(phase - BACK_PEAK + Math.PI) - Math.PI);

export function createSwingPush({ arena, rng }: GameSetup): MinigameLogic<SwingState> {
  const events = eventQueue();
  const rope = Math.max(200, Math.min(arena.height - HUD_SAFE_TOP - 160, (arena.width / 2 - 70) / Math.sin(MAX_AMPLITUDE)));
  // On a tall screen the swing stands on the ground, not hanging from the top.
  const pivotY = Math.max(HUD_SAFE_TOP + 10, arena.height - 50 - rope - 200);
  const state: SwingState = {
    pivotX: arena.width / 2,
    pivotY,
    rope,
    amplitude: START_AMPLITUDE,
    phase: 0,
    angle: 0,
    ribbon: 0.62,
    grabbedAgo: 9,
    pushed: false,
    pushAgo: 9,
    badAgo: 9,
    score: 0,
    time: 0,
  };

  const hangRibbon = (): void => {
    // Higher as the round goes on, on either side.
    const height = Math.min(MAX_AMPLITUDE - 0.12, rng.range(0.6, 0.85) + state.score * 0.04);
    state.ribbon = rng.chance(0.5) ? height : -height;
  };

  function tap(x: number, y: number): void {
    if (!state.pushed && fromBackPeak(state.phase) <= PUSH_WINDOW) {
      state.pushed = true;
      state.amplitude = Math.min(MAX_AMPLITUDE, state.amplitude + PUSH_GAIN);
      state.pushAgo = 0;
      events.push({ type: 'action', x, y });
    } else {
      state.amplitude = Math.max(0.05, state.amplitude - BAD_TAP_LOSS);
      state.badAgo = 0;
      events.push({ type: 'miss', x, y });
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
      state.grabbedAgo += dt;
      state.pushAgo += dt;
      state.badAgo += dt;
      const seatX = state.pivotX + Math.sin(state.angle) * rope;
      const seatY = state.pivotY + Math.cos(state.angle) * rope;
      for (let i = 0; i < input.taps.length; i += 1) tap(seatX, seatY);

      const before = state.phase;
      state.phase = wrap(state.phase + OMEGA * dt);
      // A new swing starts each time it passes the bottom going forward: one push per swing.
      if (state.phase < before) state.pushed = false;
      state.amplitude = Math.max(0.05, state.amplitude - DRAG * dt);
      const previous = state.angle;
      state.angle = state.amplitude * Math.sin(state.phase);

      const reached = state.ribbon > 0 ? state.angle >= state.ribbon - 0.03 && previous < state.ribbon - 0.03 : state.angle <= state.ribbon + 0.03 && previous > state.ribbon + 0.03;
      if (reached && state.grabbedAgo > 0.4) {
        state.score += 1;
        state.grabbedAgo = 0;
        state.amplitude = Math.max(0.2, state.amplitude - GRAB_LOSS);
        const x = state.pivotX + Math.sin(state.ribbon) * rope;
        const y = state.pivotY + Math.cos(state.ribbon) * rope;
        events.push({ type: 'score', x, y: y - 40, note: 76, voice: 'bell' });
        hangRibbon();
      }
    },
  };
}

/** Good play: one push at every back high point. */
export function swingBot(state: SwingState, context: BotContext): BotMove {
  if (!state.pushed && fromBackPeak(state.phase) <= PUSH_WINDOW * 0.6) return { tap: { x: context.arena.width / 2, y: context.arena.height * 0.7 } };
  return {};
}
