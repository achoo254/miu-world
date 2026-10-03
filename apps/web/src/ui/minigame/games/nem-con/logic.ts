// Ném còn (a festival throw): a tall bamboo pole with a ring at the top. The child pulls back from anywhere
// low on the screen, like a slingshot, and lets go: the còn (a cloth ball with ribbon tails) flies the
// opposite way, further the more she pulled, and arcs down. Through the ring is a point; the rim or the pole
// knocks it down. A short dotted line shows the start of the throw while she aims. Ten throws, and the
// ring's height changes each time. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type ThrowResult = 'through' | 'rim' | 'pole' | 'short' | 'long';
export type ConPhase = 'aim' | 'flight' | 'result';

export interface NemConState {
  /** Where the còn leaves the hand, the pole's x, the ring's centre height and its half opening. */
  hand: Point;
  poleX: number;
  ringY: number;
  ringHalf: number;
  groundY: number;
  /** While aiming: where the finger went down and the pull (from there to the finger). */
  anchor: Point | null;
  pull: Point;
  ball: { x: number; y: number; vx: number; vy: number; spin: number } | null;
  /** The ball crossed the pole's line this throw (judged then). */
  crossed: boolean;
  phase: ConPhase;
  phaseAgo: number;
  result: ThrowResult | null;
  throws: number;
  score: number;
  time: number;
}

export const THROWS = 10;
export const GRAVITY = 900;
/** Launch speed per unit of pull, and the longest pull. */
export const POWER = 4.4;
export const MAX_PULL = 200;
const MIN_PULL = 30;
export const BALL_RADIUS = 13;
const RESULT_SECONDS = 1.1;

/** The còn's launch velocity for a pull (the pull's opposite, capped). */
export function launch(pull: Point): Point {
  const len = Math.hypot(pull.x, pull.y);
  const k = len > MAX_PULL ? MAX_PULL / len : 1;
  return { x: -pull.x * k * POWER, y: -pull.y * k * POWER };
}

export function createNemCon({ arena, rng }: GameSetup): MinigameLogic<NemConState> {
  const events = eventQueue();
  const wide = arena.width >= arena.height;
  const groundY = arena.height - 60;
  const state: NemConState = {
    hand: { x: arena.width * (wide ? 0.16 : 0.18), y: groundY - 90 },
    poleX: arena.width * (wide ? 0.74 : 0.74),
    ringY: 0,
    ringHalf: 48,
    groundY,
    anchor: null,
    pull: { x: 0, y: 0 },
    ball: null,
    crossed: false,
    phase: 'aim',
    phaseAgo: 0,
    result: null,
    throws: 0,
    score: 0,
    time: 0,
  };
  // The ring stays within a throw's reach of the hand on every screen.
  const ringTop = Math.max(HUD_SAFE_TOP + 90, state.hand.y - 340);
  const ringLow = Math.max(ringTop, state.hand.y - 220);
  const newRing = (): void => {
    state.ringY = rng.range(ringTop, ringLow);
  };
  newRing();

  function finish(result: ThrowResult): void {
    state.result = result;
    state.phase = 'result';
    state.phaseAgo = 0;
    state.throws += 1;
    if (result === 'through') {
      state.score += 1;
      events.push({ type: 'score', x: state.poleX, y: state.ringY });
    } else events.push({ type: result === 'rim' || result === 'pole' ? 'hit' : 'miss', x: state.ball?.x ?? state.poleX, y: state.ball?.y ?? state.ringY });
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.throws >= THROWS && state.phase === 'result' && state.phaseAgo >= RESULT_SECONDS * 0.8;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.phaseAgo += dt;
      switch (state.phase) {
        case 'aim': {
          if (input.pressed && input.pointer && input.pointer.y > HUD_SAFE_TOP + 60) state.anchor = input.pointer;
          if (state.anchor && input.pointer) state.pull = { x: input.pointer.x - state.anchor.x, y: input.pointer.y - state.anchor.y };
          if (input.released && state.anchor) {
            state.anchor = null;
            const v = launch(state.pull);
            if (Math.hypot(state.pull.x, state.pull.y) >= MIN_PULL && v.x > 0) {
              state.ball = { x: state.hand.x, y: state.hand.y, vx: v.x, vy: v.y, spin: 0 };
              state.crossed = false;
              state.phase = 'flight';
              state.phaseAgo = 0;
              events.push({ type: 'action', ...state.hand });
            }
            state.pull = { x: 0, y: 0 };
          }
          break;
        }
        case 'flight': {
          const b = state.ball;
          if (!b) break;
          const beforeX = b.x;
          const beforeY = b.y;
          b.vy += GRAVITY * dt;
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.spin += dt * 8;
          if (!state.crossed && beforeX < state.poleX && b.x >= state.poleX) {
            state.crossed = true;
            const y = beforeY + ((b.y - beforeY) * (state.poleX - beforeX)) / (b.x - beforeX);
            const off = Math.abs(y - state.ringY);
            if (off <= state.ringHalf - BALL_RADIUS) {
              finish('through');
              break;
            }
            if (off <= state.ringHalf + BALL_RADIUS) {
              b.vx = -b.vx * 0.3;
              finish('rim');
              break;
            }
            if (y > state.ringY) {
              b.vx = -b.vx * 0.25;
              finish('pole');
              break;
            }
          }
          if (b.y >= state.groundY) finish(b.x < state.poleX ? 'short' : 'long');
          else if (b.x > arena.width + 40) finish('long');
          break;
        }
        case 'result': {
          const b = state.ball;
          if (b && b.y < state.groundY) {
            b.vy += GRAVITY * dt;
            b.x += b.vx * dt;
            b.y = Math.min(state.groundY, b.y + b.vy * dt);
          }
          if (state.phaseAgo >= RESULT_SECONDS && state.throws < THROWS) {
            state.phase = 'aim';
            state.phaseAgo = 0;
            state.ball = null;
            state.result = null;
            newRing();
          }
          break;
        }
      }
    },
  };
}

/** Good play: work out a throw that reaches the ring's centre, pull back that much, let go. */
export function nemConBot(state: NemConState, _context: BotContext): BotMove {
  if (state.phase !== 'aim' || state.phaseAgo < 0.6) return {};
  const dx = state.poleX - state.hand.x;
  for (let t = 0.7; t <= 1.8; t += 0.05) {
    const vx = dx / t;
    const vy = (state.ringY - state.hand.y - (GRAVITY * t * t) / 2) / t;
    const pull = { x: -vx / POWER, y: -vy / POWER };
    if (Math.hypot(pull.x, pull.y) > MAX_PULL * 0.98) continue;
    const anchor = { x: state.hand.x + 60, y: state.groundY - 160 };
    if (!state.anchor) return { touch: anchor };
    const want = { x: state.anchor.x + pull.x, y: state.anchor.y + pull.y };
    // Pulled to the right place: let go.
    if (Math.hypot(state.pull.x - pull.x, state.pull.y - pull.y) < 1) return {};
    return { touch: want };
  }
  return {};
}
