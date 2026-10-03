// Bank shot: a friend waits behind a stack of crates, so the ball cannot go straight to him. The child drags to
// aim (a dotted line shows the way up to the first bounce) and lets go to throw; the ball flies straight and
// bounces off the walls, the ceiling and the crates. Reaching the friend's hands is a point. Twelve balls; the
// friend and the crates move after every throw. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Field {
  left: number;
  right: number;
  ceiling: number;
  floor: number;
  thrower: Point;
  friend: Point;
  crates: { x: number; y: number; w: number; h: number };
}

export interface Ball extends Point {
  vx: number;
  vy: number;
  bounces: number;
  age: number;
}

export interface BankState extends Field {
  ball: Ball | null;
  /** Aim direction while dragging (unit vector), or null. */
  aim: Point | null;
  /** How the last throw ended, and seconds since. */
  result: 'caught' | 'missed' | null;
  resultAgo: number;
  /** Bounce flashes. */
  bounceAt: Point | null;
  bounceAgo: number;
  balls: number;
  score: number;
  time: number;
}

export const BALLS = 12;
export const SPEED = 950;
export const CATCH_RADIUS = 62;
const MAX_BOUNCES = 4;
const MAX_FLIGHT = 3.2;
const BALL_R = 18;
const STEP = 1 / 60;

/** Moves a ball one step, bouncing off walls, ceiling and crates; returns where it bounced, if it did. */
export function advance(field: Field, ball: Ball, dt: number): Point | null {
  let bounced: Point | null = null;
  const sub = 3;
  for (let k = 0; k < sub; k += 1) {
    const px = ball.x;
    const py = ball.y;
    ball.x += (ball.vx * dt) / sub;
    ball.y += (ball.vy * dt) / sub;
    if (ball.x < field.left + BALL_R || ball.x > field.right - BALL_R) {
      ball.vx = -ball.vx;
      ball.x = px;
      bounced = { x: ball.x, y: ball.y };
    }
    if (ball.y < field.ceiling + BALL_R) {
      ball.vy = -ball.vy;
      ball.y = py;
      bounced = { x: ball.x, y: ball.y };
    }
    const c = field.crates;
    if (ball.x > c.x - BALL_R && ball.x < c.x + c.w + BALL_R && ball.y > c.y - BALL_R && ball.y < c.y + c.h + BALL_R) {
      const wasSide = px <= c.x - BALL_R || px >= c.x + c.w + BALL_R;
      if (wasSide) ball.vx = -ball.vx;
      else ball.vy = -ball.vy;
      ball.x = px;
      ball.y = py;
      bounced = { x: ball.x, y: ball.y };
    }
  }
  if (bounced) ball.bounces += 1;
  ball.age += dt;
  return bounced;
}

const reached = (field: Field, ball: Ball): boolean => Math.hypot(ball.x - field.friend.x, ball.y - field.friend.y) <= CATCH_RADIUS;
const over = (field: Field, ball: Ball): boolean => ball.bounces > MAX_BOUNCES || ball.age > MAX_FLIGHT || ball.y > field.floor + 40;

/** Would a throw at this angle (radians, screen coordinates) reach the friend? */
export function throwReaches(field: Field, angle: number): boolean {
  const ball: Ball = { x: field.thrower.x, y: field.thrower.y, vx: Math.cos(angle) * SPEED, vy: Math.sin(angle) * SPEED, bounces: 0, age: 0 };
  while (!over(field, ball)) {
    advance(field, ball, STEP);
    if (reached(field, ball)) return true;
  }
  return false;
}

/** The middle of the widest run of good angles (the safest throw), or null. */
export function bestAngle(field: Field): number | null {
  let best: [number, number] | null = null;
  let start: number | null = null;
  for (let a = -175; a <= -5; a += 0.5) {
    const ok = throwReaches(field, (a * Math.PI) / 180);
    if (ok && start === null) start = a;
    const last = a + 0.5 > -5;
    if (start !== null && (!ok || last)) {
      const end = ok ? a : a - 0.5;
      if (!best || end - start > best[1] - best[0]) best = [start, end];
      start = null;
    }
  }
  return best ? (((best[0] + best[1]) / 2) * Math.PI) / 180 : null;
}

function placeField(rng: Rng, base: Omit<Field, 'friend' | 'crates'>): Field {
  const width = base.right - base.left;
  for (let tries = 0; tries < 40; tries += 1) {
    const friend = { x: base.left + width * rng.range(0.68, 0.9), y: base.floor - 50 };
    const h = rng.range(0.35, 0.6) * (base.floor - base.ceiling);
    const crates = { x: base.left + width * rng.range(0.42, 0.52), y: base.floor - h, w: 90, h };
    const field = { ...base, friend, crates };
    if (bestAngle(field) !== null) return field;
  }
  return { ...base, friend: { x: base.right - 80, y: base.floor - 50 }, crates: { x: base.left + width * 0.45, y: base.floor - 160, w: 90, h: 160 } };
}

export function createBankShot({ arena, rng }: GameSetup): MinigameLogic<BankState> {
  const events = eventQueue();
  const base = { left: 20, right: arena.width - 20, ceiling: HUD_SAFE_TOP + 20, floor: arena.height - 40, thrower: { x: Math.max(90, arena.width * 0.14), y: arena.height - 100 } };
  const state: BankState = { ...placeField(rng, base), ball: null, aim: null, result: null, resultAgo: 9, bounceAt: null, bounceAgo: 9, balls: 0, score: 0, time: 0 };

  function settle(caught: boolean): void {
    state.result = caught ? 'caught' : 'missed';
    state.resultAgo = 0;
    state.ball = null;
    if (caught) {
      state.score += 1;
      events.push({ type: 'score', x: state.friend.x, y: state.friend.y - 60 });
    } else {
      events.push({ type: 'miss', x: state.friend.x, y: state.friend.y });
    }
    if (state.balls < BALLS) Object.assign(state, placeField(rng, base));
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.balls >= BALLS && !state.ball && state.resultAgo > 0.8;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.resultAgo += dt;
      state.bounceAgo += dt;
      if (state.ball) {
        const at = advance(state, state.ball, dt);
        if (at) {
          state.bounceAt = at;
          state.bounceAgo = 0;
          events.push({ type: 'action', ...at });
        }
        if (reached(state, state.ball)) settle(true);
        else if (over(state, state.ball)) settle(false);
        return;
      }
      if (state.balls >= BALLS || state.resultAgo < 0.6) return;
      const p = input.pointer;
      if (p) {
        const dx = p.x - state.thrower.x;
        const dy = Math.min(-10, p.y - state.thrower.y);
        const d = Math.hypot(dx, dy);
        state.aim = { x: dx / d, y: dy / d };
      } else if (state.aim) {
        const aim = state.aim;
        state.aim = null;
        state.balls += 1;
        state.ball = { x: state.thrower.x, y: state.thrower.y, vx: aim.x * SPEED, vy: aim.y * SPEED, bounces: 0, age: 0 };
        events.push({ type: 'action', ...state.thrower });
      }
    },
  };
}

/** Good play: works out the safest angle, aims along it for a moment, then lets go. */
export function bankBot(state: BankState, _context: BotContext): BotMove {
  if (state.ball || state.resultAgo < 0.7 || state.balls >= BALLS) return {};
  const angle = bestAngle(state);
  if (angle === null) return {};
  const want = { x: Math.cos(angle), y: Math.sin(angle) };
  if (state.aim && Math.hypot(state.aim.x - want.x, state.aim.y - want.y) < 0.001) return {};
  return { touch: { x: state.thrower.x + want.x * 200, y: state.thrower.y + want.y * 200 } };
}
