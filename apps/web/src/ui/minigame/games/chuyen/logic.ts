// Chơi chuyền: ten bamboo sticks lie on a mat. A tap on the ball tosses it up; while it is in the air the
// child taps sticks to pick them up (one on bàn 1, two on bàn 2… five from bàn 5 on), then taps the ball on
// its way down to catch it. Enough sticks and a catch clears the bàn (a point); a dropped ball, or a catch
// with too few sticks, puts the sticks back and that bàn is played again. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type Arena, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Stick {
  x: number;
  y: number;
  angle: number;
  /** Picked during the current toss. */
  picked: boolean;
  /** Taken for good by a cleared bàn. */
  gone: boolean;
}

export type BallPhase = 'hand' | 'air' | 'dropped';

export interface ChuyenState {
  handX: number;
  handY: number;
  apexY: number;
  mat: { x: number; y: number; w: number; h: number };
  ball: { x: number; y: number; vy: number; phase: BallPhase; since: number };
  sticks: Stick[];
  /** The bàn being played (1, 2, 3…) and the sticks it needs per toss. */
  level: number;
  need: number;
  /** Seconds since the last outcome, and what it was, for the words on screen. */
  outcomeAgo: number;
  outcome: 'cleared' | 'short' | 'dropped' | null;
  score: number;
  time: number;
}

const STICKS = 10;
const MAX_NEED = 5;
/** Ball and sticks are tapped within these radii: wider than their pictures. */
export const BALL_RADIUS = Math.max(TOUCH_RADIUS * 2, 84);
export const STICK_RADIUS = Math.max(TOUCH_RADIUS * 1.3, 56);
const SPACING = 118;
const DROP_PAUSE = 0.7;

/** Seconds the ball is in the air on a bàn: a little longer when more sticks are needed. */
export const airTime = (need: number, factor: number): number => (2.0 + need * 0.18) / factor;

function scatter(rng: Rng, mat: ChuyenState['mat']): Stick[] {
  const sticks: Stick[] = [];
  for (let tries = 0; sticks.length < STICKS && tries < 4000; tries += 1) {
    const x = rng.range(mat.x + 60, mat.x + mat.w - 60);
    const y = rng.range(mat.y + 40, mat.y + mat.h - 40);
    // Spread out, so every tap is clearly one stick.
    const spacing = tries < 3000 ? SPACING : SPACING * 0.75;
    if (sticks.every((s) => Math.hypot(s.x - x, s.y - y) >= spacing)) sticks.push({ x, y, angle: rng.range(-0.9, 0.9), picked: false, gone: false });
  }
  return sticks;
}

function layout(arena: Arena): Pick<ChuyenState, 'handX' | 'handY' | 'apexY' | 'mat'> {
  const handY = arena.height - 95;
  const top = HUD_SAFE_TOP + 70;
  // The mat sits between the ball's flight and the hand, as wide as the screen allows.
  const w = Math.min(arena.width - 60, 820);
  const h = Math.min(Math.max(200, (handY - top) * 0.55), 520);
  const matY = handY - 110 - h;
  return { handX: arena.width / 2, handY, apexY: Math.max(HUD_SAFE_TOP + 30, matY - 260), mat: { x: (arena.width - w) / 2, y: matY, w, h } };
}

export function createChuyen({ arena, params, rng }: GameSetup): MinigameLogic<ChuyenState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const place = layout(arena);
  const state: ChuyenState = {
    ...place,
    ball: { x: place.handX, y: place.handY, vy: 0, phase: 'hand', since: 0 },
    sticks: scatter(rng, place.mat),
    level: 1,
    need: 1,
    outcomeAgo: 9,
    outcome: null,
    score: 0,
    time: 0,
  };
  const gravity = (): number => {
    const t = airTime(state.need, factor);
    return (8 * (state.handY - state.apexY)) / (t * t);
  };

  function backToHand(outcome: ChuyenState['outcome']): void {
    for (const s of state.sticks) {
      if (outcome === 'cleared' && s.picked) s.gone = true;
      s.picked = false;
    }
    state.outcome = outcome;
    state.outcomeAgo = 0;
    if (state.sticks.filter((s) => !s.gone).length < state.need) state.sticks = scatter(rng, state.mat);
  }

  function tap(at: Point): void {
    const { ball } = state;
    const onBall = Math.hypot(at.x - ball.x, at.y - ball.y) <= BALL_RADIUS;
    if (ball.phase === 'hand' && onBall) {
      ball.phase = 'air';
      ball.since = 0;
      ball.vy = -gravity() * (airTime(state.need, factor) / 2);
      events.push({ type: 'action', x: ball.x, y: ball.y });
      return;
    }
    if (ball.phase !== 'air') return;
    const picked = state.sticks.filter((s) => s.picked).length;
    if (onBall && ball.vy > 0) {
      ball.phase = 'hand';
      ball.y = state.handY;
      ball.vy = 0;
      if (picked >= state.need) {
        state.score += 1;
        events.push({ type: 'score', x: ball.x, y: ball.y - 40 });
        backToHand('cleared');
        state.level += 1;
        state.need = Math.min(MAX_NEED, state.level);
      } else {
        events.push({ type: 'hit', x: ball.x, y: ball.y });
        backToHand('short');
      }
      return;
    }
    if (picked >= state.need) return;
    let best: Stick | null = null;
    let bestD = STICK_RADIUS;
    for (const s of state.sticks) {
      const d = Math.hypot(at.x - s.x, at.y - s.y);
      if (!s.gone && !s.picked && d <= bestD) {
        best = s;
        bestD = d;
      }
    }
    if (best) {
      best.picked = true;
      events.push({ type: 'action', x: best.x, y: best.y });
    }
  }

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
      state.outcomeAgo += dt;
      const { ball } = state;
      ball.since += dt;
      for (const at of input.taps) tap(at);
      if (ball.phase === 'air') {
        ball.vy += gravity() * dt;
        ball.y += ball.vy * dt;
        if (ball.y > state.handY + 30) {
          ball.phase = 'dropped';
          ball.since = 0;
          ball.y = state.handY + 30;
          events.push({ type: 'miss', x: ball.x, y: ball.y });
          backToHand('dropped');
        }
      } else if (ball.phase === 'dropped' && ball.since >= DROP_PAUSE) {
        ball.phase = 'hand';
        ball.y = state.handY;
      }
    },
  };
}

/** Good play: toss, pick the sticks nearest the hand first, catch once it falls past the mat's top. */
export function chuyenBot(state: ChuyenState, _context: BotContext): BotMove {
  const { ball } = state;
  if (ball.phase === 'hand') return { tap: { x: ball.x, y: ball.y } };
  if (ball.phase !== 'air') return {};
  const picked = state.sticks.filter((s) => s.picked).length;
  if (picked < state.need) {
    const next = state.sticks.filter((s) => !s.gone && !s.picked).sort((a, b) => b.y - a.y)[0];
    return next ? { tap: { x: next.x, y: next.y } } : {};
  }
  return ball.vy > 0 && ball.y > state.mat.y ? { tap: { x: ball.x, y: ball.y + ball.vy * 0.03 } } : {};
}
