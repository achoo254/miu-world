// Air hockey against the penguin: the child drags her paddle in her half of the table to hit the puck into the
// penguin's goal (a point) and to keep it out of her own. The puck glides and bounces off the rails. When the
// penguin scores it gets a little slower, so a match never runs away from her. Physics run in table units
// (`u` across, `v` along from the penguin's end to hers), the same on a wide and a tall screen; draw.ts maps
// them to the screen. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const PUCK_R = 28;
export const PADDLE_R = 46;
const MAX_PUCK = 1050;
const GLIDE = 0.55;
/** Speed kept off a rail. */
const RAIL = 0.85;
const PADDLE_SPEED = 1900;
const AI_SPEED = 280;
const AI_SLOWER = 45;
const AI_SLOWEST = 200;
const PAUSE_SECONDS = 1;

export interface Body {
  u: number;
  v: number;
  vu: number;
  vv: number;
}

export interface HockeyState {
  /** The table: width across, length along; its top-left on screen; laid along x on a wide screen. */
  width: number;
  length: number;
  goalHalf: number;
  wide: boolean;
  left: number;
  top: number;
  puck: Body;
  mine: Body;
  ai: Body;
  aiSpeed: number;
  /** After a goal: seconds left before the puck is served again, and who scored. */
  pause: number;
  lastGoal: 'mine' | 'ai' | null;
  aiGoals: number;
  hitAt: number;
  score: number;
  time: number;
}

/** Screen point of a table point. */
export function toScreen(state: Pick<HockeyState, 'wide' | 'left' | 'top' | 'length'>, u: number, v: number): Point {
  return state.wide ? { x: state.left + (state.length - v), y: state.top + u } : { x: state.left + u, y: state.top + v };
}

/** Table point of a screen point. */
export function toTable(state: Pick<HockeyState, 'wide' | 'left' | 'top' | 'length'>, p: Point): { u: number; v: number } {
  return state.wide ? { u: p.y - state.top, v: state.length - (p.x - state.left) } : { u: p.x - state.left, v: p.y - state.top };
}

function collide(puck: Body, paddle: Body): boolean {
  const du = puck.u - paddle.u;
  const dv = puck.v - paddle.v;
  const d = Math.hypot(du, dv);
  const reach = PUCK_R + PADDLE_R;
  if (d >= reach || d === 0) return false;
  const nu = du / d;
  const nv = dv / d;
  puck.u = paddle.u + nu * reach;
  puck.v = paddle.v + nv * reach;
  const rel = (puck.vu - paddle.vu) * nu + (puck.vv - paddle.vv) * nv;
  if (rel < 0) {
    puck.vu -= 1.6 * rel * nu;
    puck.vv -= 1.6 * rel * nv;
  }
  const speed = Math.hypot(puck.vu, puck.vv);
  if (speed > MAX_PUCK) {
    puck.vu *= MAX_PUCK / speed;
    puck.vv *= MAX_PUCK / speed;
  }
  return true;
}

export function createAirHockey({ arena, rng }: GameSetup): MinigameLogic<HockeyState> {
  const events = eventQueue();
  const wide = arena.width >= arena.height;
  const free = arena.height - HUD_SAFE_TOP;
  const length = wide ? Math.min(arena.width - 40, 860) : Math.min(free - 30, (arena.width - 40) * 1.75);
  const width = wide ? Math.min(free - 30, length * 0.62) : Math.min(arena.width - 40, 560);
  const state: HockeyState = {
    width,
    length,
    goalHalf: width * 0.3,
    wide,
    left: wide ? (arena.width - length) / 2 : (arena.width - width) / 2,
    top: wide ? HUD_SAFE_TOP + (free - width) / 2 : HUD_SAFE_TOP + (free - length) / 2,
    puck: { u: width / 2 + rng.range(-0.2, 0.2) * width, v: length * 0.62, vu: 0, vv: 0 },
    mine: { u: width / 2, v: length - PADDLE_R - 20, vu: 0, vv: 0 },
    ai: { u: width / 2, v: PADDLE_R + 20, vu: 0, vv: 0 },
    aiSpeed: AI_SPEED,
    pause: 0,
    lastGoal: null,
    aiGoals: 0,
    hitAt: -9,
    score: 0,
    time: 0,
  };

  /** The puck is put down on the side of whoever lost the last point, a little off the middle. */
  const serve = (toward: 'mine' | 'ai'): void => {
    state.puck = { u: width / 2 + rng.range(-0.2, 0.2) * width, v: toward === 'mine' ? length * 0.62 : length * 0.38, vu: rng.range(-60, 60), vv: 0 };
  };

  const movePaddle = (paddle: Body, to: { u: number; v: number }, speed: number, vMin: number, vMax: number, dt: number): void => {
    const tu = Math.min(width - PADDLE_R, Math.max(PADDLE_R, to.u));
    const tv = Math.min(vMax, Math.max(vMin, to.v));
    const du = tu - paddle.u;
    const dv = tv - paddle.v;
    const d = Math.hypot(du, dv);
    const step = Math.min(d, speed * dt);
    const mu = d > 0 ? (du / d) * step : 0;
    const mv = d > 0 ? (dv / d) * step : 0;
    paddle.u += mu;
    paddle.v += mv;
    paddle.vu = mu / dt;
    paddle.vv = mv / dt;
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
      const half = length / 2;
      // The child's paddle follows the finger in her half.
      if (input.pointer) movePaddle(state.mine, toTable(state, input.pointer), PADDLE_SPEED, half + PADDLE_R, length - PADDLE_R, dt);
      else {
        state.mine.vu = 0;
        state.mine.vv = 0;
      }
      // The penguin: goes for a slow puck in its half, otherwise guards the middle of its goal.
      const { puck } = state;
      const attack = puck.v < half && state.pause <= 0 && Math.hypot(puck.vu, puck.vv) < 420;
      const aiTarget = attack ? { u: puck.u, v: puck.v - PUCK_R * 0.5 } : { u: width / 2 + (puck.u - width / 2) * 0.15, v: PADDLE_R + 30 };
      movePaddle(state.ai, aiTarget, state.aiSpeed, PADDLE_R, half - PADDLE_R, dt);

      if (state.pause > 0) {
        state.pause -= dt;
        if (state.pause <= 0) serve(state.lastGoal === 'mine' ? 'ai' : 'mine');
        return;
      }
      puck.u += puck.vu * dt;
      puck.v += puck.vv * dt;
      const glide = Math.pow(GLIDE, dt);
      puck.vu *= glide;
      puck.vv *= glide;
      // Rails.
      if (puck.u < PUCK_R) {
        puck.u = PUCK_R;
        puck.vu = Math.abs(puck.vu) * RAIL;
      } else if (puck.u > width - PUCK_R) {
        puck.u = width - PUCK_R;
        puck.vu = -Math.abs(puck.vu) * RAIL;
      }
      const inMouth = Math.abs(puck.u - width / 2) < state.goalHalf;
      if (!inMouth) {
        if (puck.v < PUCK_R) {
          puck.v = PUCK_R;
          puck.vv = Math.abs(puck.vv) * RAIL;
        } else if (puck.v > length - PUCK_R) {
          puck.v = length - PUCK_R;
          puck.vv = -Math.abs(puck.vv) * RAIL;
        }
      }
      if (puck.v < -PUCK_R || puck.v > length + PUCK_R) {
        const mine = puck.v < 0;
        state.lastGoal = mine ? 'mine' : 'ai';
        state.pause = PAUSE_SECONDS;
        const at = toScreen(state, width / 2, mine ? 0 : length);
        if (mine) {
          state.score += 1;
          events.push({ type: 'score', x: at.x, y: at.y });
        } else {
          state.aiGoals += 1;
          state.aiSpeed = Math.max(AI_SLOWEST, state.aiSpeed - AI_SLOWER);
          events.push({ type: 'miss', x: at.x, y: at.y });
        }
        return;
      }
      for (const paddle of [state.mine, state.ai]) {
        if (collide(puck, paddle)) {
          if (state.time - state.hitAt > 0.12) {
            const at = toScreen(state, puck.u, puck.v);
            events.push({ type: 'action', x: at.x, y: at.y, note: paddle === state.mine ? 76 : 69, voice: 'drum' });
          }
          state.hitAt = state.time;
        }
      }
    },
  };
}

/** Good play: meets the puck in her half from behind, on the line to the open side of the penguin's goal, and
 * drives through it; waits in front of her goal while the puck is away. */
export function airHockeyBot(state: HockeyState, _context: BotContext): BotMove {
  const { puck, mine, width, length } = state;
  const half = length / 2;
  // Where the puck will be a moment from now.
  const ahead = { u: Math.min(width - PUCK_R, Math.max(PUCK_R, puck.u + puck.vu * 0.1)), v: puck.v + puck.vv * 0.1 };
  if (ahead.v < half + PUCK_R || state.pause > 0) return { touch: toScreen(state, width / 2 + (puck.u - width / 2) * 0.5, length * 0.8) };
  // Aim at the side of the goal the penguin is not covering.
  const aim = { u: width / 2 + (state.ai.u < width / 2 ? 1 : -1) * state.goalHalf * 0.8, v: 0 };
  const du = aim.u - ahead.u;
  const dv = aim.v - ahead.v;
  const d = Math.hypot(du, dv);
  const behind = { u: ahead.u - (du / d) * (PUCK_R + PADDLE_R + 6), v: ahead.v - (dv / d) * (PUCK_R + PADDLE_R + 6) };
  // A fast puck: stay behind it on the line, a little way off, until it slows down.
  const speed = Math.hypot(puck.vu, puck.vv);
  if (speed > 330) return { touch: toScreen(state, ahead.u - (du / d) * (PUCK_R + PADDLE_R + 50), Math.min(length - PADDLE_R, ahead.v - (dv / d) * (PUCK_R + PADDLE_R + 50))) };
  const ready = Math.hypot(mine.u - behind.u, mine.v - behind.v) < 45;
  if (ready) return { touch: toScreen(state, ahead.u + (du / d) * 110, ahead.v + (dv / d) * 110) };
  // In front of the puck: come round its side first rather than knock it back home.
  if (mine.v < ahead.v + PADDLE_R * 0.5 && Math.abs(mine.u - ahead.u) < PUCK_R + PADDLE_R) {
    return { touch: toScreen(state, ahead.u + (mine.u <= ahead.u ? -1 : 1) * (PUCK_R + PADDLE_R + 24), ahead.v + PADDLE_R) };
  }
  return { touch: toScreen(state, behind.u, behind.v) };
}
