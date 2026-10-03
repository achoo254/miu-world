// Bottle rocket: a water rocket stands on a launcher that tilts slowly back and forth. Every swipe (up or down)
// is one stroke of the pump; the gauge shows the pressure and a green band for how far the landing pad is.
// Too many strokes and the bottle spurts its water out: pump again. A tap launches it: it flies off, opens its
// parachute and lands. Landing on the pad is a point. Eight rockets; the pad moves each time. The farther the
// tilt is from the middle (45°), the shorter it flies, so she launches when the needle is in the green.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export type RocketPhase = 'pump' | 'flight' | 'landed';

export interface RocketState {
  launchX: number;
  groundY: number;
  /** Landing pad centre and half width. */
  padX: number;
  padHalf: number;
  /** Farthest flight (full pressure, 45°). */
  reach: number;
  pressure: number;
  /** Launcher tilt from the ground (radians). */
  tilt: number;
  phase: RocketPhase;
  phaseTime: number;
  /** Where this rocket lands, its launch tilt, and if it hit the pad. */
  landX: number;
  launchTilt: number;
  hit: boolean;
  /** Seconds since a spurt (pumped too much). */
  spurtAgo: number;
  rockets: number;
  score: number;
  time: number;
}

export const ROCKETS = 8;
export const STROKE = 0.08;
const TILT_MID = Math.PI / 4;
const TILT_SWING = (20 * Math.PI) / 180;
const TILT_SPEED = 2.3;
/** Launch counts as straight enough within this of 45°. */
export const GOOD_TILT = (8 * Math.PI) / 180;
export const FLIGHT_SECONDS = 2.2;
const LANDED_SECONDS = 1.1;

export const flightDistance = (reach: number, pressure: number, tilt: number): number => reach * pressure * Math.sin(2 * tilt);
/** Pressure that sends the rocket to the pad at 45°. */
export const neededPressure = (s: Pick<RocketState, 'padX' | 'launchX' | 'reach'>): number => (s.padX - s.launchX) / s.reach;

function placePad(rng: Rng, s: RocketState, width: number): void {
  s.padX = s.launchX + s.reach * rng.range(0.42, 0.88);
  s.padX = Math.min(width - s.padHalf - 20, s.padX);
}

export function createBottleRocket({ arena, rng }: GameSetup): MinigameLogic<RocketState> {
  const events = eventQueue();
  const launchX = Math.max(100, arena.width * 0.14);
  const state: RocketState = {
    launchX,
    groundY: arena.height - 70,
    padX: 0,
    padHalf: 62,
    reach: (arena.width - 40 - launchX) / 0.92,
    pressure: 0,
    tilt: TILT_MID,
    phase: 'pump',
    phaseTime: 0,
    landX: 0,
    launchTilt: TILT_MID,
    hit: false,
    spurtAgo: 9,
    rockets: 0,
    score: 0,
    time: 0,
  };
  placePad(rng, state, arena.width);

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.rockets >= ROCKETS && state.phase === 'landed' && state.phaseTime > LANDED_SECONDS;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.phaseTime += dt;
      state.spurtAgo += dt;
      state.tilt = TILT_MID + TILT_SWING * Math.sin(state.time * TILT_SPEED);
      if (state.phase === 'flight') {
        if (state.phaseTime >= FLIGHT_SECONDS) {
          state.phase = 'landed';
          state.phaseTime = 0;
          state.hit = Math.abs(state.landX - state.padX) <= state.padHalf;
          if (state.hit) {
            state.score += 1;
            events.push({ type: 'score', x: state.landX, y: state.groundY - 40 });
          } else {
            events.push({ type: 'miss', x: state.landX, y: state.groundY });
          }
        }
        return;
      }
      if (state.phase === 'landed') {
        if (state.phaseTime > LANDED_SECONDS && state.rockets < ROCKETS) {
          state.phase = 'pump';
          state.phaseTime = 0;
          state.pressure = 0;
          placePad(rng, state, arena.width);
        }
        return;
      }
      for (const s of input.swipes) {
        if (s.direction !== 'up' && s.direction !== 'down') continue;
        state.pressure += STROKE;
        events.push({ type: 'action', x: state.launchX - 60, y: state.groundY - 60 });
        if (state.pressure > 1.0001) {
          state.pressure = 0;
          state.spurtAgo = 0;
          events.push({ type: 'hit', x: state.launchX, y: state.groundY - 60 });
        }
      }
      if (input.taps.length > 0 && state.pressure >= 0.2) {
        state.phase = 'flight';
        state.phaseTime = 0;
        state.rockets += 1;
        state.launchTilt = state.tilt;
        state.landX = state.launchX + flightDistance(state.reach, state.pressure, state.tilt);
        events.push({ type: 'action', x: state.launchX, y: state.groundY - 60 });
      }
    },
  };
}

/** Good play: pumps to the stroke nearest the green band, then launches as the tilt passes 45°. */
export function rocketBot(state: RocketState, context: BotContext): BotMove {
  if (state.phase !== 'pump' || state.phaseTime < 0.4) return {};
  const target = neededPressure(state);
  if (state.pressure + STROKE / 2 < target) return { swipe: { from: { x: context.arena.width / 2, y: context.arena.height * 0.6 }, dx: 0, dy: state.pressure * 100 > 50 ? -120 : 120 } };
  if (Math.abs(state.tilt - Math.PI / 4) < (3 * Math.PI) / 180) return { tap: { x: context.arena.width / 2, y: context.arena.height / 2 } };
  return {};
}
