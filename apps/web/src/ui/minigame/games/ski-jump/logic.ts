// Ski jump: three jumps, their metres added up. On the in-run, holding the screen crouches (she speeds up
// twice as fast); letting go stands her up. Letting go in the green zone at the end of the ramp is the
// take-off: a big spring into the air. Letting go too early stands her up before the lip (slower, no
// spring); holding past the lip slides off without a spring. In the air, a tap just before touching down
// lands it nicely (a tenth further). Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { BotContext, BotMove, GameInput, GameSetup, MinigameLogic } from '../../types';

export type Phase = 'ready' | 'inrun' | 'flight' | 'landed';

export interface SkiState {
  phase: Phase;
  phaseTime: number;
  jump: number;
  /** World position (x right, y down) and velocity. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Distance along the in-run, and speed along it. */
  along: number;
  speed: number;
  crouching: boolean;
  /** Stood up early: no take-off spring. */
  stood: boolean;
  sprang: boolean;
  telemark: boolean;
  /** Metres of each finished jump. */
  results: number[];
  /** World point at the screen's top-left: the view follows her. */
  camX: number;
  camY: number;
  score: number;
  time: number;
}

export const JUMPS = 3;
export const INRUN_LENGTH = 700;
const INRUN_ANGLE = (35 * Math.PI) / 180;
export const LIP_X = Math.cos(INRUN_ANGLE) * INRUN_LENGTH;
export const LIP_Y = Math.sin(INRUN_ANGLE) * INRUN_LENGTH;
/** The take-off zone: this far before the lip. */
export const ZONE = 170;
const CROUCH_ACCEL = 520;
const STAND_ACCEL = 260;
const TAKEOFF_ANGLE = (10 * Math.PI) / 180;
const SPRING = 260;
/** Gravity in the air, lightened by the glide. */
const GLIDE_GRAVITY = 650;
export const UNITS_PER_METRE = 20;
/** A landing tap counts this close above the snow. */
export const TELEMARK_WINDOW = 80;
const READY_SECONDS = 2;
const LANDED_SECONDS = 1.8;

/** Height of the landing hill (world y) at world x past the lip. */
export function hillY(x: number): number {
  const d = Math.max(0, x - LIP_X);
  const steep = LIP_Y + 50 + 0.62 * d;
  // The hill eases off far down (the out-run).
  return d > 1500 ? steep - 0.0004 * (d - 1500) ** 2 : steep;
}

export function createSkiJump({ arena }: GameSetup): MinigameLogic<SkiState> {
  const events = eventQueue();
  const state: SkiState = {
    phase: 'ready',
    phaseTime: 0,
    jump: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    along: 0,
    speed: 0,
    crouching: false,
    stood: false,
    sprang: false,
    telemark: false,
    results: [],
    camX: -arena.width * 0.35,
    camY: -arena.height * 0.45,
    score: 0,
    time: 0,
  };
  const reset = (): void => {
    Object.assign(state, { phase: 'ready', phaseTime: 0, x: 0, y: 0, vx: 0, vy: 0, along: 0, speed: 0, crouching: false, stood: false, sprang: false, telemark: false });
  };
  const screen = (): { x: number; y: number } => ({ x: state.x - state.camX, y: state.y - state.camY });

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.results.length >= JUMPS && state.phase === 'landed' && state.phaseTime >= LANDED_SECONDS;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.phaseTime += dt;
      const holding = input.pointer !== null;
      switch (state.phase) {
        case 'ready':
          if (holding || state.phaseTime >= READY_SECONDS) {
            state.phase = 'inrun';
            state.phaseTime = 0;
          }
          break;
        case 'inrun': {
          const inZone = state.along >= INRUN_LENGTH - ZONE;
          if (state.crouching && !holding) {
            if (inZone) {
              state.sprang = true;
              events.push({ type: 'action', ...screen(), note: 79, voice: 'whistle' });
            } else state.stood = true;
          }
          state.crouching = holding && !state.stood;
          state.speed += (state.crouching ? CROUCH_ACCEL : STAND_ACCEL) * dt;
          state.along += state.speed * dt;
          if (state.sprang || state.along >= INRUN_LENGTH) {
            state.along = Math.min(state.along, INRUN_LENGTH);
            state.x = Math.cos(INRUN_ANGLE) * state.along;
            state.y = Math.sin(INRUN_ANGLE) * state.along;
            state.vx = Math.cos(TAKEOFF_ANGLE) * state.speed;
            state.vy = Math.sin(TAKEOFF_ANGLE) * state.speed - (state.sprang ? SPRING : 0);
            state.phase = 'flight';
            state.phaseTime = 0;
          } else {
            state.x = Math.cos(INRUN_ANGLE) * state.along;
            state.y = Math.sin(INRUN_ANGLE) * state.along;
          }
          break;
        }
        case 'flight': {
          const above = hillY(state.x) - state.y;
          if (input.taps.length > 0 && above < TELEMARK_WINDOW && above > 0 && !state.telemark) {
            state.telemark = true;
            events.push({ type: 'action', ...screen() });
          }
          state.vy += GLIDE_GRAVITY * dt;
          state.x += state.vx * dt;
          state.y += state.vy * dt;
          if (state.y >= hillY(state.x)) {
            state.y = hillY(state.x);
            const metres = Math.floor(((state.x - LIP_X) / UNITS_PER_METRE) * (state.telemark ? 1.1 : 1));
            state.results.push(metres);
            state.score += metres;
            events.push({ type: 'score', ...screen(), points: metres });
            state.phase = 'landed';
            state.phaseTime = 0;
          }
          break;
        }
        case 'landed':
          // Slides on down the out-run.
          state.x += Math.max(0, state.vx * (1 - state.phaseTime / LANDED_SECONDS)) * dt;
          state.y = hillY(state.x);
          if (state.phaseTime >= LANDED_SECONDS && state.results.length < JUMPS) {
            state.jump += 1;
            reset();
          }
          break;
      }
      // The view follows, a little ahead of her.
      const wantX = state.x - arena.width * 0.35;
      const wantY = state.y - arena.height * 0.45;
      const ease = state.phase === 'ready' ? 1 : Math.min(1, dt * 6);
      state.camX += (wantX - state.camX) * ease;
      state.camY += (wantY - state.camY) * ease;
    },
  };
}

/** Good play: crouch all the way, let go in the green zone, tap just before landing. */
export function skiJumpBot(state: SkiState, _context: BotContext): BotMove {
  const finger = { x: 300, y: 400 };
  if (state.phase === 'ready') return { touch: finger };
  if (state.phase === 'inrun') return state.along >= INRUN_LENGTH - ZONE + 10 ? {} : { touch: finger };
  if (state.phase === 'flight') {
    const above = hillY(state.x) - state.y;
    // Falling toward the snow: tap when it will be inside the window at the next look.
    const closing = state.vy - 0.62 * state.vx;
    return above < TELEMARK_WINDOW + closing * 0.05 && above > 0 && !state.telemark ? { tap: finger } : {};
  }
  return {};
}
