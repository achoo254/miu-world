// Bowling: a lane seen from the bowler's end, ten pins in a triangle at the far end. The child slides a finger
// along the bottom to place the ball, then swipes up toward the pins: the ball rolls the way she swiped
// (a straight lane line, so swiping at a pin rolls at that pin). Ball, pins and pins knocking pins are circles
// on the lane's floor; a ball off the edge drops into the gutter. Five frames of up to two rolls: a pin is a
// point, a strike (all ten with the first ball) five more, a spare (the rest with the second) three more.
// Pure: no DOM, no canvas. Lane units: the lane is 42 wide, the head pin 500 from the foul line.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const LANE_HALF = 21;
export const PIN_RADIUS = 2.4;
export const BALL_RADIUS = 4.3;
export const HEAD_PIN_V = 500;
const ROW_GAP = 10.4;
const PIN_GAP = 12;
/** Where the lane ends (pins knocked past it fall into the pit). */
export const LANE_END = 548;
const BALL_SPEED = 260;
const BALL_MASS = 6;
const GUTTER_U = LANE_HALF + 6;
export const FRAMES = 5;
export const STRIKE_BONUS = 5;
export const SPARE_BONUS = 3;

export interface Pin {
  /** Where it stands in a fresh rack. */
  home: Point;
  u: number;
  v: number;
  vu: number;
  vv: number;
  /** Knocked over (it may still slide and knock others). */
  down: boolean;
  /** Seconds since it was knocked (it tips over in draw). */
  downAgo: number;
  /** Swept away after the first roll of a frame, or fallen into the pit or a gutter. */
  gone: boolean;
}

export interface BowlBall {
  u: number;
  v: number;
  vu: number;
  vv: number;
  gutter: boolean;
  /** Seconds rolling (spin in draw). */
  t: number;
}

export type BowlPhase = 'aim' | 'rolling' | 'settle';

export interface BowlingState {
  /** Lane → screen: the foul line's y and half width, the pin deck's y, the centre x. */
  view: { cx: number; nearY: number; farY: number; nearHalf: number };
  pins: Pin[];
  ball: BowlBall | null;
  /** Where the ball waits before the roll (lane u). */
  aimU: number;
  phase: BowlPhase;
  phaseTime: number;
  frame: number;
  /** 0 = first roll of the frame, 1 = second. */
  roll: number;
  /** Pins down per frame so far (for the score board) and points per frame. */
  framePoints: number[];
  /** What the last roll was, for the big label. */
  lastCall: 'strike' | 'spare' | 'gutter' | null;
  callAgo: number;
  score: number;
  time: number;
  finished: boolean;
}

/** Perspective shrink with lane depth (0 at the foul line … 1 at the end). */
const DEPTH = 1.3;
const shrink = (t: number): number => 1 / (1 + DEPTH * t);
const FAR_SHRINK = shrink(1);

/** Lane point → screen point and scale. */
export function toScreen(s: BowlingState, u: number, v: number): { x: number; y: number; scale: number } {
  const t = v / LANE_END;
  const k = shrink(t);
  const { cx, nearY, farY, nearHalf } = s.view;
  return { x: cx + (u / LANE_HALF) * nearHalf * k, y: farY + (nearY - farY) * ((k - FAR_SHRINK) / (1 - FAR_SHRINK)), scale: k };
}

/** Screen point → lane point (inverse of toScreen, for where a finger is). */
export function toLane(s: BowlingState, x: number, y: number): Point {
  const { cx, nearY, farY, nearHalf } = s.view;
  const k = FAR_SHRINK + ((y - farY) / (nearY - farY)) * (1 - FAR_SHRINK);
  const safeK = Math.max(FAR_SHRINK * 0.5, k);
  const t = (1 / safeK - 1) / DEPTH;
  return { x: ((x - cx) / (nearHalf * safeK)) * LANE_HALF, y: t * LANE_END };
}

function rack(): Pin[] {
  const pins: Pin[] = [];
  for (let row = 0; row < 4; row += 1) {
    for (let i = 0; i <= row; i += 1) {
      const u = (i - row / 2) * PIN_GAP;
      const v = HEAD_PIN_V + row * ROW_GAP;
      pins.push({ home: { x: u, y: v }, u, v, vu: 0, vv: 0, down: false, downAgo: 0, gone: false });
    }
  }
  return pins;
}

const clampAim = (u: number): number => Math.max(-LANE_HALF + BALL_RADIUS, Math.min(LANE_HALF - BALL_RADIUS, u));

export function createBowling({ arena }: GameSetup): MinigameLogic<BowlingState> {
  const events = eventQueue();
  const nearY = arena.height - (arena.height > 700 ? 230 : 150);
  const farY = HUD_SAFE_TOP + 95;
  const state: BowlingState = {
    view: { cx: arena.width / 2, nearY, farY, nearHalf: Math.min(arena.width * 0.4, 240) },
    pins: rack(),
    ball: null,
    aimU: 0,
    phase: 'aim',
    phaseTime: 0,
    frame: 0,
    roll: 0,
    framePoints: [],
    lastCall: null,
    callAgo: 9,
    score: 0,
    time: 0,
    finished: false,
  };
  /** The bottom band where the finger places the ball. */
  const placeTop = nearY - 60;

  /** Pins already swept off this frame (not counted again on the second roll). */
  const swept = new Set<Pin>();

  const enter = (phase: BowlPhase): void => {
    state.phase = phase;
    state.phaseTime = 0;
  };

  function roll(from: Point, dx: number, dy: number): void {
    state.aimU = clampAim(toLane(state, from.x, nearY).x);
    // The swipe as a screen line from the ball: where it crosses the head pin's row is where the ball goes.
    const start = toScreen(state, state.aimU, 0);
    const head = toScreen(state, 0, HEAD_PIN_V);
    const crossX = start.x + (dx / -dy) * (start.y - head.y);
    const targetU = toLane(state, crossX, head.y).x;
    const vu = ((targetU - state.aimU) / HEAD_PIN_V) * BALL_SPEED;
    state.ball = { u: state.aimU, v: 0, vu, vv: BALL_SPEED, gutter: false, t: 0 };
    enter('rolling');
    events.push({ type: 'action', x: start.x, y: start.y });
  }

  function knock(pin: Pin): void {
    if (pin.down) return;
    pin.down = true;
    pin.downAgo = 0;
    const p = toScreen(state, pin.u, pin.v);
    events.push({ type: 'action', x: p.x, y: p.y - 20 * p.scale });
  }

  function collide(dt: number): void {
    const ball = state.ball;
    const live = state.pins.filter((p) => !p.gone);
    if (ball && !ball.gutter) {
      for (const pin of live) {
        const du = pin.u - ball.u;
        const dv = pin.v - ball.v;
        const d = Math.hypot(du, dv);
        const min = BALL_RADIUS + PIN_RADIUS;
        if (d >= min || d === 0) continue;
        const nu = du / d;
        const nv = dv / d;
        const rel = (ball.vu - pin.vu) * nu + (ball.vv - pin.vv) * nv;
        if (rel <= 0) continue;
        // Elastic push, the heavy ball barely slowed.
        const j = (2 * rel) / (1 + 1 / BALL_MASS);
        pin.vu += j * nu * 0.9;
        pin.vv += j * nv * 0.9;
        ball.vu -= (j / BALL_MASS) * nu;
        ball.vv -= (j / BALL_MASS) * nv;
        pin.u = ball.u + nu * min;
        pin.v = ball.v + nv * min;
        knock(pin);
      }
    }
    for (let i = 0; i < live.length; i += 1) {
      for (let k = i + 1; k < live.length; k += 1) {
        const a = live[i];
        const b = live[k];
        if (!a || !b) continue;
        const du = b.u - a.u;
        const dv = b.v - a.v;
        const d = Math.hypot(du, dv);
        const min = PIN_RADIUS * 2;
        if (d >= min || d === 0) continue;
        const nu = du / d;
        const nv = dv / d;
        const rel = (a.vu - b.vu) * nu + (a.vv - b.vv) * nv;
        const overlap = (min - d) / 2;
        a.u -= nu * overlap;
        a.v -= nv * overlap;
        b.u += nu * overlap;
        b.v += nv * overlap;
        if (rel <= 0) continue;
        const j = rel * 0.9;
        a.vu -= j * nu;
        a.vv -= j * nv;
        b.vu += j * nu;
        b.vv += j * nv;
        if (Math.abs(rel) > 8) {
          knock(a);
          knock(b);
        }
      }
    }
    for (const pin of live) {
      pin.u += pin.vu * dt;
      pin.v += pin.vv * dt;
      const drag = Math.exp(-2.2 * dt);
      pin.vu *= drag;
      pin.vv *= drag;
      if (Math.abs(pin.u) > LANE_HALF + 2 || pin.v > LANE_END + 6) {
        knock(pin);
        pin.gone = true;
      }
    }
  }

  function endRoll(): void {
    const standing = state.pins.filter((p) => !p.down && !p.gone).length;
    // Points: the pins this roll knocked (those swept after the first roll were counted then).
    const knocked = state.pins.filter((p) => (p.down || p.gone) && !swept.has(p)).length;
    let points = knocked;
    state.lastCall = null;
    if (standing === 0 && state.roll === 0) {
      points += STRIKE_BONUS;
      state.lastCall = 'strike';
    } else if (standing === 0) {
      points += SPARE_BONUS;
      state.lastCall = 'spare';
    } else if (knocked === 0 && state.ball?.gutter) state.lastCall = 'gutter';
    state.callAgo = 0;
    state.score += points;
    state.framePoints[state.frame] = (state.framePoints[state.frame] ?? 0) + points;
    if (points > 0) {
      const head = toScreen(state, 0, HEAD_PIN_V);
      events.push({ type: 'score', x: head.x, y: head.y - 30, points, ...(state.lastCall === 'strike' ? { note: 84, voice: 'bell' as const } : {}) });
    } else {
      const head = toScreen(state, 0, HEAD_PIN_V);
      events.push({ type: 'miss', x: head.x, y: head.y });
    }
    // Knocked pins are swept off; a second roll follows unless the rack is clear.
    for (const p of state.pins) {
      if (p.down && !p.gone) p.gone = true;
      if (p.gone) swept.add(p);
    }
    state.ball = null;
    if (state.roll === 0 && standing > 0) {
      state.roll = 1;
      for (const p of state.pins) {
        if (!p.gone) {
          p.u = p.home.x;
          p.v = p.home.y;
          p.vu = 0;
          p.vv = 0;
        }
      }
    } else {
      state.frame += 1;
      state.roll = 0;
      swept.clear();
      if (state.frame >= FRAMES) state.finished = true;
      else state.pins = rack();
    }
    state.aimU = 0;
    enter('aim');
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.finished && state.callAgo > 1.2;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.phaseTime += dt;
      state.callAgo += dt;
      for (const p of state.pins) if (p.down) p.downAgo += dt;
      if (state.finished) return;

      if (state.phase === 'aim') {
        if (state.phaseTime < 0.4) return;
        const finger = input.pointer;
        if (finger && finger.y >= placeTop) state.aimU = clampAim(toLane(state, finger.x, nearY).x);
        const swipe = input.swipes.find((s) => s.dy < -40);
        if (swipe) roll(swipe.from.y >= placeTop ? swipe.from : toScreen(state, state.aimU, 0), swipe.dx, swipe.dy);
        return;
      }

      const ball = state.ball;
      const sub = 4;
      for (let i = 0; i < sub; i += 1) {
        if (ball) {
          ball.t += dt / sub;
          ball.u += ball.vu * (dt / sub);
          ball.v += ball.vv * (dt / sub);
          if (!ball.gutter && Math.abs(ball.u) > LANE_HALF - BALL_RADIUS * 0.3 && ball.v < HEAD_PIN_V - 20) {
            ball.gutter = true;
            ball.u = Math.sign(ball.u) * GUTTER_U;
            ball.vu = 0;
          }
        }
        collide(dt / sub);
      }
      if (state.phase === 'rolling' && ball && ball.v > LANE_END + 30) enter('settle');
      if (state.phase === 'settle') {
        const moving = state.pins.some((p) => !p.gone && Math.hypot(p.vu, p.vv) > 6);
        if ((!moving && state.phaseTime > 0.6) || state.phaseTime > 2.2) endRoll();
      }
    },
  };
}

/**
 * Good play: from the middle, swipe at the pocket (just right of the head pin) for a strike; on a second roll,
 * at the middle of the pins still standing. Waits a breath before each roll.
 */
export function bowlingBot(state: BowlingState, _context: BotContext): BotMove {
  if (state.phase !== 'aim' || state.phaseTime < 0.8 || state.finished) return {};
  const standing = state.pins.filter((p) => !p.down && !p.gone);
  const target = state.roll === 0 || standing.length === 0 ? { u: 2.6, v: HEAD_PIN_V } : { u: standing.reduce((a, p) => a + p.u, 0) / standing.length, v: Math.min(...standing.map((p) => p.v)) };
  const start = toScreen(state, 0, 0);
  const aim = toScreen(state, target.u, target.v);
  const dy = -180;
  const dx = ((aim.x - start.x) / (start.y - aim.y)) * -dy;
  return { swipe: { from: { x: start.x, y: start.y }, dx, dy } };
}
