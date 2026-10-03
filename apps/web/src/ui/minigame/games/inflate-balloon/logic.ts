// Inflate balloon: a customer wants a balloon of a size shown by a green ring. Holding the finger down pumps
// air in (the balloon grows); letting go inside the ring sells it (a point), letting go too early leaves it
// small to pump again, and pumping past the ring pops it (one of three hearts). Balloons grow a little
// faster as the round goes on. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export const CUSTOMERS = ['rabbit', 'panda', 'monkey-face', 'penguin', 'dog-face', 'owl', 'turtle', 'frog'] as const;
export type Customer = (typeof CUSTOMERS)[number];
export type BalloonPhase = 'pump' | 'sold' | 'popped';

export interface InflateBalloonState {
  /** Balloon centre (it grows around it) and the pump's nozzle under it. */
  cx: number;
  cy: number;
  pumpY: number;
  radius: number;
  /** The ring the customer asked for: sold when let go between target − tolerance and target + tolerance. */
  target: number;
  tolerance: number;
  colour: number;
  customer: Customer;
  phase: BalloonPhase;
  /** Seconds in the current phase. */
  phaseAgo: number;
  holding: boolean;
  /** Seconds since a balloon was let go too small ("a bit more!"). */
  smallAgo: number;
  lives: number;
  score: number;
  time: number;
}

const LIVES = 3;
export const START_RADIUS = 26;
const GROW_START = 58;
const GROW_END = 92;
const TOLERANCE = 15;
const SOLD_SECONDS = 1.1;
const POPPED_SECONDS = 0.9;

export function createInflateBalloon({ arena, duration, params, rng }: GameSetup): MinigameLogic<InflateBalloonState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const maxRadius = 140;
  const cy = Math.max(HUD_SAFE_TOP + maxRadius + TOLERANCE + 20, HUD_SAFE_TOP + (arena.height - HUD_SAFE_TOP) * 0.36);
  const state: InflateBalloonState = {
    cx: arena.width / 2,
    cy,
    pumpY: cy + maxRadius + TOLERANCE + 22,
    radius: START_RADIUS,
    target: 0,
    tolerance: TOLERANCE,
    colour: 0,
    customer: 'rabbit',
    phase: 'pump',
    phaseAgo: 0,
    holding: false,
    smallAgo: 9,
    lives: LIVES,
    score: 0,
    time: 0,
  };

  function nextBalloon(newCustomer: boolean): void {
    state.radius = START_RADIUS;
    state.phase = 'pump';
    state.phaseAgo = 0;
    state.colour = (state.colour + 1) % 4;
    if (newCustomer) {
      state.customer = rng.pick(CUSTOMERS);
      state.target = rng.range(70, maxRadius);
    }
  }
  nextBalloon(true);

  const growth = (): number => (GROW_START + (GROW_END - GROW_START) * Math.min(1, state.time / duration)) * factor;

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.lives <= 0;
    },
    get lives() {
      return state.lives;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.phaseAgo += dt;
      state.smallAgo += dt;
      state.holding = input.pointer !== null;

      if (state.phase === 'sold' && state.phaseAgo >= SOLD_SECONDS) nextBalloon(true);
      if (state.phase === 'popped' && state.phaseAgo >= POPPED_SECONDS) nextBalloon(false);
      if (state.phase !== 'pump') return;

      if (state.holding) {
        state.radius += growth() * dt;
        if (state.radius > state.target + state.tolerance) {
          state.phase = 'popped';
          state.phaseAgo = 0;
          state.lives -= 1;
          events.push({ type: 'hit', x: state.cx, y: state.cy });
        }
        return;
      }
      if (!input.released || state.radius <= START_RADIUS + 2) return;
      if (state.radius >= state.target - state.tolerance) {
        state.phase = 'sold';
        state.phaseAgo = 0;
        state.score += 1;
        events.push({ type: 'score', x: state.cx, y: state.cy });
      } else {
        state.smallAgo = 0;
        events.push({ type: 'miss', x: state.cx, y: state.cy + state.radius });
      }
    },
  };
}

/** Good play: pump until the balloon is just inside the ring, then let go. */
export function inflateBalloonBot(state: InflateBalloonState, _context: BotContext): BotMove {
  if (state.phase !== 'pump') return {};
  return state.radius < state.target - state.tolerance + 3 ? { touch: { x: state.cx, y: state.pumpY } } : {};
}
