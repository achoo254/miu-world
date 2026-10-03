// Snowman roll: a snowball waits by the snow pile. The child drags it about the field and it grows as it
// rolls. A dashed ring on the snowman's spot shows the size wanted for the next part (big, then middle, then
// head); she rolls until the ball matches (it glows green) and lets go of it on the spot. The right size
// stacks: a point. Too small rolls back off the spot; too big crumbles, and a fresh small ball appears. Three
// parts make a snowman, who gets a carrot nose and steps aside for the next one. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** Radius wanted for each part, smallest and largest that fit. */
export const PARTS: ReadonlyArray<readonly [number, number]> = [
  [62, 80],
  [44, 58],
  [28, 40],
];
export const START_RADIUS = 20;
/** Radius gained per unit rolled. */
export const GROWTH = 0.03;
const MAX_RADIUS = 96;
const ROLL_SPEED = 900;
const DONE_SECONDS = 1.6;

export type DropResult = 'stacked' | 'small' | 'big';

export interface Ball extends Point {
  r: number;
  /** Turned this far by rolling (radians, for drawing its speckles). */
  spin: number;
}

export interface SnowmanState {
  ball: Ball;
  /** Radii of the parts already stacked. */
  stacked: number[];
  spot: Point;
  pile: Point;
  field: { left: number; top: number; right: number; bottom: number };
  holding: boolean;
  /** Last drop on the spot and seconds since. */
  last: DropResult | null;
  lastAgo: number;
  /** Seconds since the snowman was finished (-1 while building). */
  doneAgo: number;
  snowmen: number;
  score: number;
  time: number;
}

/** Where the centre of part `index` goes, given the parts below it (their radii). */
export function partCentre(state: SnowmanState, index: number, radius: number): Point {
  let y = state.spot.y;
  for (let i = 0; i < index; i += 1) y -= (state.stacked[i] ?? 0) * 1.75;
  return { x: state.spot.x, y: y - radius };
}

export const wanted = (state: SnowmanState): readonly [number, number] => PARTS[state.stacked.length] ?? [0, 0];

export function createSnowmanRoll({ arena }: GameSetup): MinigameLogic<SnowmanState> {
  const events = eventQueue();
  const wide = arena.width > arena.height;
  const field = { left: 30, top: HUD_SAFE_TOP + 40, right: arena.width - 30, bottom: arena.height - 30 };
  const spot = { x: arena.width * (wide ? 0.78 : 0.72), y: arena.height - 50 };
  // The pile stays near the spot: a fresh ball carried straight there is still small enough for a head.
  const pile = { x: Math.max(110, spot.x - 320), y: arena.height - 90 };
  const state: SnowmanState = {
    ball: { ...pile, r: START_RADIUS, spin: 0 },
    stacked: [],
    spot,
    pile,
    field,
    holding: false,
    last: null,
    lastAgo: 9,
    doneAgo: -1,
    snowmen: 0,
    score: 0,
    time: 0,
  };
  const freshBall = (): void => {
    state.ball = { ...pile, r: START_RADIUS, spin: 0 };
  };

  const release = (): void => {
    const [low, high] = wanted(state);
    const target = partCentre(state, state.stacked.length, state.ball.r);
    if (Math.hypot(state.ball.x - target.x, state.ball.y - target.y) > Math.max(48, state.ball.r)) return;
    state.lastAgo = 0;
    if (state.ball.r < low) {
      state.last = 'small';
      // Rolls back off the spot, toward the field's middle.
      state.ball.x += state.ball.x > arena.width / 2 ? -120 : 120;
      events.push({ type: 'miss', x: target.x, y: target.y });
    } else if (state.ball.r > high) {
      state.last = 'big';
      events.push({ type: 'hit', x: target.x, y: target.y });
      freshBall();
    } else {
      state.last = 'stacked';
      state.stacked.push(state.ball.r);
      state.score += 1;
      events.push({ type: 'score', x: target.x, y: target.y - state.ball.r });
      if (state.stacked.length === PARTS.length) {
        state.snowmen += 1;
        state.doneAgo = 0;
        state.ball = { ...pile, r: 0, spin: 0 };
      } else freshBall();
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
      state.lastAgo += dt;
      if (state.doneAgo >= 0) {
        state.doneAgo += dt;
        state.holding = false;
        if (state.doneAgo >= DONE_SECONDS) {
          state.doneAgo = -1;
          state.stacked = [];
          freshBall();
        }
        return;
      }
      const finger = input.pointer;
      if (finger) {
        state.holding = true;
        // The ball rolls toward the finger, quickly but not in one jump, and grows with every unit rolled.
        const ball = state.ball;
        const tx = Math.min(field.right - ball.r, Math.max(field.left + ball.r, finger.x));
        const ty = Math.min(field.bottom - ball.r, Math.max(field.top + ball.r, finger.y));
        const dx = tx - ball.x;
        const dy = ty - ball.y;
        const d = Math.hypot(dx, dy);
        const move = Math.min(d, ROLL_SPEED * dt);
        if (move > 0) {
          ball.x += (dx / d) * move;
          ball.y += (dy / d) * move;
          ball.r = Math.min(MAX_RADIUS, ball.r + move * GROWTH);
          ball.spin += move / Math.max(10, ball.r);
        }
      } else if (state.holding) {
        state.holding = false;
        release();
      }
    },
  };
}

/** Good play: roll in a loop until the ball, carried to the spot, will be the size wanted; then take it there. */
export function snowmanRollBot(state: SnowmanState, _context: BotContext): BotMove {
  if (state.doneAgo >= 0) return {};
  const { ball } = state;
  const [low, high] = wanted(state);
  const aim = (low + high) / 2;
  const target = partCentre(state, state.stacked.length, aim);
  const toSpot = Math.hypot(target.x - ball.x, target.y - ball.y);
  if (ball.r + toSpot * GROWTH >= aim - 1 || ball.r > aim) {
    if (toSpot < 6) return {};
    // Straight to the spot (the last stretch never overshoots: the ball rolls at most 90 units a decision).
    return { touch: partCentre(state, state.stacked.length, ball.r) };
  }
  // Loop round a point in the open field away from the spot.
  const { field } = state;
  const centre = { x: (field.left + field.right) / 2 + (state.spot.x > (field.left + field.right) / 2 ? -80 : 80), y: (field.top + field.bottom) / 2 + 60 };
  const angle = Math.atan2(ball.y - centre.y, ball.x - centre.x) + 0.6;
  return { touch: { x: centre.x + Math.cos(angle) * 120, y: centre.y + Math.sin(angle) * 120 } };
}
