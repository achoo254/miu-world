// Seesaw launch: a seesaw on the playground with a ball on its right end and a basket somewhere on the right.
// The child taps a height above the left end: a sandbag drops from there, slams the seesaw down, and the ball
// flies off. The higher the drop, the farther the ball goes (a lever: the falling weight's speed becomes the
// ball's). Ten sandbags; a ball in the basket is a point, and the basket moves to a new spot. Marks on the pole
// and the last drop's flag help to judge the next one. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type LaunchPhase = 'aim' | 'drop' | 'fly' | 'result';

export interface SeesawLaunchState {
  phase: LaunchPhase;
  phaseAgo: number;
  pivot: Point;
  /** Half the plank's length; ends at pivot.x ± half. */
  half: number;
  /** Highest drop point allowed (y), and the drop height of this bag. */
  poleTop: number;
  drop: number;
  /** Last drop height, for the flag on the pole (0 before). */
  lastDrop: number;
  bag: Point;
  ball: Point;
  ballVel: Point;
  basketX: number;
  /** Range per unit of drop height. */
  gain: number;
  bags: number;
  lastIn: boolean;
  score: number;
  time: number;
}

export const BAGS = 10;
/** A ball landing within this of the basket's middle goes in. */
export const CATCH = 50;
const GRAVITY = 900;
const ANGLE = (55 * Math.PI) / 180;
const RESULT_SECONDS = 0.9;

export function createSeesawLaunch({ arena, rng }: GameSetup): MinigameLogic<SeesawLaunchState> {
  const events = eventQueue();
  const groundY = arena.height - Math.max(90, arena.height * 0.14);
  const half = Math.min(130, arena.width * 0.16);
  const pivot = { x: 40 + half + 30, y: groundY - 40 };
  const poleTop = HUD_SAFE_TOP + 60;
  const maxDrop = pivot.y - poleTop;
  const nearest = pivot.x + half + 120;
  const farthest = arena.width - 60;
  const state: SeesawLaunchState = {
    phase: 'aim',
    phaseAgo: 0,
    pivot,
    half,
    poleTop,
    drop: 0,
    lastDrop: 0,
    bag: { x: pivot.x - half, y: 0 },
    ball: { x: pivot.x + half, y: pivot.y - 30 },
    ballVel: { x: 0, y: 0 },
    basketX: 0,
    gain: (farthest + 20 - (pivot.x + half)) / maxDrop,
    bags: 0,
    lastIn: false,
    score: 0,
    time: 0,
  };
  const placeBasket = (r: Rng): void => {
    state.basketX = r.range(nearest, farthest);
  };
  placeBasket(rng);

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.bags >= BAGS && state.phase === 'aim';
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.phaseAgo += dt;
      if (state.phase === 'aim') {
        const tap = input.taps.find((t) => t.y > HUD_SAFE_TOP && t.y < pivot.y - 20);
        if (!tap || state.bags >= BAGS) return;
        state.drop = Math.min(pivot.y - Math.max(poleTop, tap.y), pivot.y - poleTop);
        state.bag = { x: pivot.x - half, y: pivot.y - state.drop };
        state.phase = 'drop';
        state.phaseAgo = 0;
        events.push({ type: 'action', x: state.bag.x, y: state.bag.y });
        return;
      }
      if (state.phase === 'drop') {
        state.bag.y += GRAVITY * 1.4 * state.phaseAgo * dt;
        if (state.bag.y >= pivot.y - 30) {
          // The ball goes as far as the drop height times the gain.
          const range = state.drop * state.gain;
          const speed = Math.sqrt((range * GRAVITY) / Math.sin(2 * ANGLE));
          state.ball = { x: pivot.x + half, y: pivot.y - 30 };
          state.ballVel = { x: Math.cos(ANGLE) * speed, y: -Math.sin(ANGLE) * speed };
          state.phase = 'fly';
          state.phaseAgo = 0;
          state.bags += 1;
          state.lastDrop = state.drop;
          events.push({ type: 'action', x: pivot.x - half, y: pivot.y, note: 48, voice: 'drum' });
        }
        return;
      }
      if (state.phase === 'fly') {
        state.ballVel.y += GRAVITY * dt;
        state.ball.x += state.ballVel.x * dt;
        state.ball.y += state.ballVel.y * dt;
        if (state.ballVel.y > 0 && state.ball.y >= pivot.y - 30) {
          state.ball.y = pivot.y - 30;
          state.lastIn = Math.abs(state.ball.x - state.basketX) <= CATCH;
          state.phase = 'result';
          state.phaseAgo = 0;
          if (state.lastIn) {
            state.score += 1;
            events.push({ type: 'score', x: state.basketX, y: pivot.y - 60 });
          } else events.push({ type: 'miss', x: state.ball.x, y: state.ball.y });
        }
        return;
      }
      if (state.phaseAgo >= RESULT_SECONDS) {
        if (state.lastIn) placeBasket(rng);
        state.ball = { x: pivot.x + half, y: pivot.y - 30 };
        state.phase = 'aim';
        state.phaseAgo = 0;
      }
    },
  };
}

/** Good play: the drop height that sends the ball to the basket. */
export function seesawLaunchBot(state: SeesawLaunchState, _context: BotContext): BotMove {
  if (state.phase !== 'aim' || state.phaseAgo < 0.5) return {};
  const drop = (state.basketX - (state.pivot.x + state.half)) / state.gain;
  return { tap: { x: state.pivot.x - state.half, y: state.pivot.y - drop } };
}
