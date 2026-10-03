// Basketball: the ball waits at the bottom; the child flicks it up toward the hoop (a quick swipe, or a slower
// drag and let go: a dotted arc shows the throw while she drags). The flick's direction aims, its length is
// the strength: too short falls short, too long bounces off the board, off to the side hits the rim. A ball
// close to the middle is helped in a little. After three baskets the hoop starts sliding to and fro, a bit
// faster as the round goes on. Every basket is a point. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type ShotResult = 'in' | 'short' | 'long' | 'rim';

export interface Shot {
  from: Point;
  /** Where it meets the hoop's height, and how strong it was (1 = just right). */
  toX: number;
  power: number;
  result: ShotResult;
  /** Seconds since it was thrown. */
  t: number;
}

export interface BasketballState {
  hoopX: number;
  hoopY: number;
  ball: Point;
  shot: Shot | null;
  /** The drag in progress: where it started and where the finger is. */
  drag: { from: Point; to: Point } | null;
  baskets: number;
  shots: number;
  lastResult: ShotResult | null;
  lastAgo: number;
  score: number;
  time: number;
}

/** Length (units) of a flick that is just strong enough. */
export const IDEAL = 260;
export const FLIGHT = 0.75;
const AFTER = 0.55;
/** Strength that still goes in, below and above 1. */
export const POWER_LOW = 0.8;
export const POWER_HIGH = 1.22;
export const RIM_HALF = 56;
/** A ball this close to the middle of the hoop is pulled in by this share (help for small hands). */
const ASSIST_REACH = 80;
const ASSIST = 0.35;
const MOVE_AFTER = 3;
const MIN_FLICK = 40;

/** Where the hoop is at `time` seconds, once it slides. */
export function hoopAt(state: BasketballState, time: number, width: number): number {
  if (state.baskets < MOVE_AFTER) return width / 2;
  const amplitude = Math.min(width * 0.3, 210);
  const speed = 1.1 + Math.min(1.2, (state.baskets - MOVE_AFTER) * 0.08);
  return width / 2 + Math.sin(time * speed) * amplitude;
}

/** Where a flick from the ball would cross the hoop's height, and how strong it is. */
export function aimOf(state: BasketballState, dx: number, dy: number): { toX: number; power: number } {
  const rise = state.ball.y - state.hoopY;
  return { toX: state.ball.x + (dx / -dy) * rise, power: -dy / IDEAL };
}

export function createBasketball({ arena }: GameSetup): MinigameLogic<BasketballState> {
  const events = eventQueue();
  const state: BasketballState = {
    hoopX: arena.width / 2,
    hoopY: HUD_SAFE_TOP + 140,
    ball: { x: arena.width / 2, y: arena.height - 110 },
    shot: null,
    drag: null,
    baskets: 0,
    shots: 0,
    lastResult: null,
    lastAgo: 9,
    score: 0,
    time: 0,
  };

  const throwBall = (dx: number, dy: number): void => {
    if (dy > -MIN_FLICK) return;
    const aim = aimOf(state, dx, dy);
    const hoopThen = hoopAt(state, state.time + FLIGHT, arena.width);
    let toX = aim.toX;
    if (Math.abs(toX - hoopThen) < ASSIST_REACH) toX += (hoopThen - toX) * ASSIST;
    const offset = Math.abs(toX - hoopThen);
    const result: ShotResult = aim.power < POWER_LOW ? 'short' : aim.power > POWER_HIGH ? 'long' : offset <= RIM_HALF - 12 ? 'in' : 'rim';
    state.shot = { from: { ...state.ball }, toX, power: aim.power, result, t: 0 };
    state.shots += 1;
    events.push({ type: 'action', x: state.ball.x, y: state.ball.y });
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
      state.lastAgo += dt;
      state.hoopX = hoopAt(state, state.time, arena.width);

      const shot = state.shot;
      if (shot) {
        state.drag = null;
        const before = shot.t;
        shot.t += dt;
        if (before < FLIGHT && shot.t >= FLIGHT) {
          state.lastResult = shot.result;
          state.lastAgo = 0;
          if (shot.result === 'in') {
            state.baskets += 1;
            state.score += 1;
            events.push({ type: 'score', x: state.hoopX, y: state.hoopY });
          } else events.push({ type: shot.result === 'rim' ? 'hit' : 'miss', x: shot.toX, y: state.hoopY });
        }
        if (shot.t >= FLIGHT + AFTER) state.shot = null;
        return;
      }

      // A quick swipe throws at once; a slower drag throws when the finger lifts.
      const swipe = input.swipes.find((s) => s.dy < -MIN_FLICK);
      if (swipe) {
        throwBall(swipe.dx, swipe.dy);
        state.drag = null;
        return;
      }
      if (input.pressed && input.pointer) state.drag = { from: input.pointer, to: input.pointer };
      if (state.drag && input.pointer) state.drag.to = input.pointer;
      if (state.drag && (!input.pointer || input.released)) {
        const { from, to } = state.drag;
        state.drag = null;
        throwBall(to.x - from.x, to.y - from.y);
      }
    },
  };
}

/** Good play: a flick of just the right length, aimed where the hoop will be when the ball gets there. */
export function basketballBot(state: BasketballState, context: BotContext): BotMove {
  if (state.shot) return {};
  // The swipe lands on the next step: aim for the hoop one flight from then.
  const hoop = hoopAt(state, context.time + 1 / 60 + FLIGHT, context.arena.width);
  const dy = -IDEAL;
  const dx = ((hoop - state.ball.x) / (state.ball.y - state.hoopY)) * IDEAL;
  return { swipe: { from: state.ball, dx, dy } };
}
