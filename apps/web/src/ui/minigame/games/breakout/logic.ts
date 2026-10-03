// Breakout: a wall of bricks at the top, a paddle at the bottom that follows the child's finger, and a ball.
// A touch launches the ball from the paddle; it bounces off the walls, the paddle (the further from the middle
// it lands, the steeper it goes) and the bricks, which break: a point each, three for a star brick. Some bricks
// drop an apple: catching it makes the paddle longer for a while. A ball lost under the paddle costs one of
// three hearts and a new ball waits on the paddle. A cleared wall is built again. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  row: number;
  star: boolean;
  apple: boolean;
  alive: boolean;
  /** Seconds since it broke (it crumbles), large while alive. */
  brokeAgo: number;
}

export interface Apple {
  x: number;
  y: number;
}

export interface BreakoutState {
  bricks: Brick[];
  ball: { x: number; y: number; vx: number; vy: number };
  ballRadius: number;
  /** The ball rests on the paddle until a touch launches it. */
  onPaddle: boolean;
  paddleX: number;
  paddleY: number;
  paddleWidth: number;
  /** Seconds left of the long paddle. */
  longFor: number;
  apples: Apple[];
  lives: number;
  walls: number;
  /** Seconds since the ball last hit the paddle (a squash). */
  bouncedAgo: number;
  score: number;
  time: number;
}

const LIVES = 3;
const PADDLE = 150;
const LONG_PADDLE = 230;
const LONG_SECONDS = 10;
const BALL_SPEED = 430;
const SPEED_UP = 1.25;
const APPLE_FALL = 220;
/** Steepest bounce off the paddle edge, from straight up. */
const MAX_ANGLE = (62 * Math.PI) / 180;

export function createBreakout({ arena, duration, params, rng }: GameSetup): MinigameLogic<BreakoutState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.4, Math.max(0.7, params.speed)) : 1;
  const events = eventQueue();
  const paddleY = arena.height - 70;
  const ballRadius = 14;
  const state: BreakoutState = {
    bricks: [],
    ball: { x: arena.width / 2, y: paddleY - ballRadius - 12, vx: 0, vy: 0 },
    ballRadius,
    onPaddle: true,
    paddleX: arena.width / 2,
    paddleY,
    paddleWidth: PADDLE,
    longFor: 0,
    apples: [],
    lives: LIVES,
    walls: 0,
    bouncedAgo: 9,
    score: 0,
    time: 0,
  };

  function buildWall(): void {
    const cols = Math.max(5, Math.floor((arena.width - 30) / 92));
    // A taller wall on a tall screen, so the ball never has far to fly to the bricks.
    const rows = Math.max(4, Math.min(18, Math.max(Math.ceil(46 / cols), Math.floor((paddleY - 400 - (HUD_SAFE_TOP + 30)) / 34))));
    const w = (arena.width - 30) / cols;
    const h = 34;
    const top = HUD_SAFE_TOP + 30;
    state.bricks = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        state.bricks.push({ x: 15 + c * w + 3, y: top + r * h + 3, w: w - 6, h: h - 6, row: r, star: rng.chance(0.08), apple: rng.chance(0.12), alive: true, brokeAgo: 99 });
      }
    }
    state.walls += 1;
  }

  /** A little quicker where the ball has further to fly (tall screens). */
  const reach = (): number => Math.sqrt(Math.max(1, (paddleY - Math.max(...state.bricks.map((b) => b.y + b.h))) / 350));
  const speed = (): number => BALL_SPEED * factor * reach() * (1 + (SPEED_UP - 1) * Math.min(1, state.time / duration));

  function launch(): void {
    const angle = rng.range(0.25, 0.5) * (rng.chance(0.5) ? 1 : -1);
    state.onPaddle = false;
    state.ball.vx = Math.sin(angle) * speed();
    state.ball.vy = -Math.cos(angle) * speed();
    events.push({ type: 'action', x: state.ball.x, y: state.ball.y });
  }

  function hitBricks(): void {
    const b = state.ball;
    for (const brick of state.bricks) {
      if (!brick.alive) continue;
      const nx = Math.max(brick.x, Math.min(b.x, brick.x + brick.w));
      const ny = Math.max(brick.y, Math.min(b.y, brick.y + brick.h));
      const dx = b.x - nx;
      const dy = b.y - ny;
      if (dx * dx + dy * dy > state.ballRadius * state.ballRadius) continue;
      brick.alive = false;
      brick.brokeAgo = 0;
      const points = brick.star ? 3 : 1;
      state.score += points;
      events.push({ type: 'score', x: brick.x + brick.w / 2, y: brick.y + brick.h / 2, points, note: 72 + (brick.row % 5) * 2, voice: 'bell' });
      if (brick.apple) state.apples.push({ x: brick.x + brick.w / 2, y: brick.y + brick.h });
      // Bounce on the side it came in from.
      const overlapX = state.ballRadius - Math.abs(dx);
      const overlapY = state.ballRadius - Math.abs(dy);
      if (dx !== 0 && (dy === 0 || overlapX < overlapY)) b.vx = Math.sign(dx) * Math.abs(b.vx);
      else b.vy = (dy !== 0 ? Math.sign(dy) : -Math.sign(b.vy)) * Math.abs(b.vy);
      break;
    }
    if (state.bricks.every((x) => !x.alive)) buildWall();
  }

  buildWall();

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
      state.bouncedAgo += dt;
      state.longFor = Math.max(0, state.longFor - dt);
      state.paddleWidth += ((state.longFor > 0 ? LONG_PADDLE : PADDLE) - state.paddleWidth) * Math.min(1, dt * 8);
      for (const brick of state.bricks) brick.brokeAgo += dt;
      const finger = input.pointer ?? input.taps[0];
      if (finger) state.paddleX = Math.min(arena.width - state.paddleWidth / 2, Math.max(state.paddleWidth / 2, finger.x));
      if (state.onPaddle) {
        state.ball.x = state.paddleX;
        state.ball.y = state.paddleY - state.ballRadius - 12;
        if (input.pressed || input.taps.length > 0) launch();
      } else {
        const b = state.ball;
        const sub = 3;
        for (let k = 0; k < sub; k += 1) {
          const before = b.y;
          b.x += (b.vx * dt) / sub;
          b.y += (b.vy * dt) / sub;
          if (b.x < state.ballRadius) b.vx = Math.abs(b.vx);
          if (b.x > arena.width - state.ballRadius) b.vx = -Math.abs(b.vx);
          if (b.y < HUD_SAFE_TOP + state.ballRadius) b.vy = Math.abs(b.vy);
          const rim = state.paddleY - 12;
          if (b.vy > 0 && before + state.ballRadius <= rim && b.y + state.ballRadius >= rim && Math.abs(b.x - state.paddleX) <= state.paddleWidth / 2 + state.ballRadius) {
            const offset = Math.max(-1, Math.min(1, (b.x - state.paddleX) / (state.paddleWidth / 2)));
            // A little wobble, so a ball never settles into bouncing straight up and down an empty column.
            const angle = offset * MAX_ANGLE + rng.range(-0.06, 0.06);
            b.vx = Math.sin(angle) * speed();
            b.vy = -Math.cos(angle) * speed();
            state.bouncedAgo = 0;
            events.push({ type: 'action', x: b.x, y: rim, note: 60, voice: 'drum' });
          }
          hitBricks();
          if (b.y > arena.height + state.ballRadius) {
            state.lives -= 1;
            state.onPaddle = true;
            events.push({ type: 'hit', x: b.x, y: arena.height - 20 });
            break;
          }
        }
      }
      for (const apple of state.apples) {
        apple.y += APPLE_FALL * dt;
        if (apple.y >= state.paddleY - 20 && apple.y <= state.paddleY + 10 && Math.abs(apple.x - state.paddleX) <= state.paddleWidth / 2 + 20) {
          state.longFor = LONG_SECONDS;
          apple.y = arena.height + 100;
          events.push({ type: 'score', x: apple.x, y: state.paddleY - 30, points: 0 });
        }
      }
      state.apples = state.apples.filter((a) => a.y < arena.height + 40);
    },
  };
}

/** Where the ball will cross height `y` going down, bouncing off the side walls (null when going up). */
export function landingX(state: BreakoutState, width: number): number | null {
  const b = state.ball;
  if (b.vy <= 0) return null;
  const t = (state.paddleY - 12 - state.ballRadius - b.y) / b.vy;
  const lo = state.ballRadius;
  const span = width - 2 * state.ballRadius;
  let x = b.x + b.vx * t - lo;
  x = ((x % (2 * span)) + 2 * span) % (2 * span);
  return lo + (x > span ? 2 * span - x : x);
}

/** Good play: launches, then meets the ball where it comes down, angling the bounce at the lowest bricks. */
export function breakoutBot(state: BreakoutState, context: BotContext): BotMove {
  const y = state.paddleY;
  if (state.onPaddle) return context.time > 0.5 ? { tap: { x: state.paddleX, y } } : {};
  const apple = state.apples.find((a) => a.y > y - 150 && a.y < y);
  const land = landingX(state, context.arena.width);
  if (land === null) return { touch: { x: apple ? apple.x : state.ball.x, y } };
  const alive = state.bricks.filter((b) => b.alive);
  const lowest = Math.max(...alive.map((b) => b.y));
  const target = alive.filter((b) => b.y >= lowest - 1).sort((a, b) => Math.abs(a.x + a.w / 2 - land) - Math.abs(b.x + b.w / 2 - land))[0];
  if (!target) return { touch: { x: land, y } };
  // The bounce angle that sends the ball from the paddle to that brick, as a place on the paddle.
  const angle = Math.atan2(target.x + target.w / 2 - land, y - (target.y + target.h));
  const offset = Math.max(-0.85, Math.min(0.85, angle / MAX_ANGLE));
  return { touch: { x: land - offset * (state.paddleWidth / 2), y } };
}
