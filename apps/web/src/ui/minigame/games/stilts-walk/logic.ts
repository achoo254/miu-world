// Stilts walk ("Đi cà kheo", the Tết folk game): the child stands high on two bamboo stilts and keeps tipping
// one way or the other. A tap on the side she leans to steps that stilt forward and brings her back up (a
// little past the middle, so the next lean is the other way); a tap on the other side only tips her further.
// Lumps of earth on the path give her a jolt. Leaning too far, she hops down and climbs back on where she fell.
// The score is metres walked. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export interface StiltsState {
  /** Lean (radians, + = right) and how fast it changes. */
  lean: number;
  spin: number;
  /** Metres walked, and where the lumps of earth are (metres). */
  metres: number;
  lumps: number[];
  /** Which stilt stepped last (-1 left, 1 right) and when; and when she last tapped the wrong side. */
  stepSide: -1 | 1;
  stepAt: number;
  wrongAt: number;
  /** Seconds since she fell (−1 while up). */
  fallen: number;
  fallSide: -1 | 1;
  falls: number;
  /** Where the child stands and the ground line. */
  x: number;
  groundY: number;
  score: number;
  time: number;
}

/** Falls past this lean. */
export const FALL_LEAN = 0.85;
/** Metres per good step. */
export const STEP_METRES = 2;
const GRAVITY = 2.4;
const STEP_COOLDOWN = 0.3;
/** A step needs at least this lean; it leaves her tipping the other way this fast. */
export const MIN_LEAN = 0.08;
const PUSH = 0.35;
const DOWN_SECONDS = 1.3;
const NOTES = [67, 71];

function placeLumps(rng: Rng, from: number, lumps: number[]): void {
  let at = Math.max(from, lumps.at(-1) ?? 0);
  while (at < from + 60) {
    at += rng.range(7, 14);
    lumps.push(at);
  }
}

export function createStiltsWalk({ arena, rng }: GameSetup): MinigameLogic<StiltsState> {
  const events = eventQueue();
  const state: StiltsState = {
    lean: 0.06,
    spin: 0,
    metres: 0,
    lumps: [],
    stepSide: 1,
    stepAt: -9,
    wrongAt: -9,
    fallen: -1,
    fallSide: 1,
    falls: 0,
    x: arena.width * 0.38,
    groundY: arena.height - Math.max(150, arena.height * 0.22),
    score: 0,
    time: 0,
  };
  placeLumps(rng, 0, state.lumps);
  if (rng.chance(0.5)) state.lean = -state.lean;

  const step = (side: -1 | 1): void => {
    if (state.time - state.stepAt < STEP_COOLDOWN) return;
    // Standing almost straight there is nothing to correct: the tap does nothing.
    if (Math.abs(state.lean) < MIN_LEAN) return;
    const leaning: -1 | 1 = state.lean >= 0 ? 1 : -1;
    if (side === leaning) {
      state.stepSide = side;
      state.stepAt = state.time;
      // Back up, and a little past the middle so the next lean is the other way.
      state.lean *= 0.25;
      state.spin = -side * PUSH;
      const before = state.metres;
      state.metres += STEP_METRES;
      if (state.lumps.some((l) => l > before && l <= state.metres)) state.spin += (rng.chance(0.5) ? 1 : -1) * 0.9;
      state.score = Math.floor(state.metres);
      events.push({ type: 'action', x: state.x + side * 30, y: state.groundY, note: NOTES[side < 0 ? 0 : 1], voice: 'drum' });
      placeLumps(rng, state.metres, state.lumps);
      state.lumps = state.lumps.filter((l) => l > state.metres - 20);
    } else {
      // The wrong stilt lifts: she lurches further over and needs a moment to steady.
      state.wrongAt = state.time;
      state.stepAt = state.time;
      state.lean += leaning * 0.22;
      state.spin += leaning * 0.6;
      events.push({ type: 'miss', x: state.x + side * 30, y: state.groundY });
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
      if (state.fallen >= 0) {
        state.fallen += dt;
        if (state.fallen >= DOWN_SECONDS) {
          state.fallen = -1;
          state.lean = -state.fallSide * 0.05;
          state.spin = 0;
        }
        return;
      }
      for (const tap of input.taps) {
        if (tap.y < HUD_SAFE_TOP) continue;
        step(tap.x < arena.width / 2 ? -1 : 1);
      }
      state.spin += GRAVITY * Math.sin(state.lean) * dt;
      state.lean += state.spin * dt;
      if (Math.abs(state.lean) > FALL_LEAN) {
        state.fallen = 0;
        state.fallSide = state.lean > 0 ? 1 : -1;
        state.falls += 1;
        events.push({ type: 'hit', x: state.x + state.fallSide * 80, y: state.groundY });
      }
    },
  };
}

/** Good play: step on the side she leans to once the lean shows. */
export function stiltsBot(state: StiltsState, context: BotContext): BotMove {
  if (state.fallen >= 0) return {};
  // Where she will be leaning a moment from now.
  if (Math.abs(state.lean) < MIN_LEAN + 0.02 || state.time - state.stepAt < 0.3) return {};
  const soon = state.lean;
  const y = context.arena.height - 100;
  return { tap: { x: soon > 0 ? context.arena.width * 0.8 : context.arena.width * 0.2, y } };
}
