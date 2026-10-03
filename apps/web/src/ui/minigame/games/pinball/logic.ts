// Pinball: a tilted table with bells (bumpers) that kick the ball away and stars that light up. Touching the
// left half of the screen raises the left flipper, the right half the right one (a quick tap flicks it). Keep the
// ball on the table and hit things: a bell is 10 points, a star 25 (it lights again after a while). The ball
// that slips between the flippers is lost; three balls in all, and a ball lost in its first seconds comes back
// free once. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Segment {
  a: Point;
  b: Point;
}

export interface Flipper {
  pivot: Point;
  /** +1 for the left flipper (points right), -1 for the right one. */
  side: 1 | -1;
  angle: number;
  speed: number;
  up: boolean;
}

export interface Bumper extends Point {
  r: number;
  hitAgo: number;
}

export interface Star extends Point {
  /** Seconds until it lights again (0 = lit). */
  dark: number;
}

export interface PinballState {
  table: { x: number; y: number; w: number; h: number };
  walls: Segment[];
  flippers: Flipper[];
  bumpers: Bumper[];
  stars: Star[];
  ball: Point & { vx: number; vy: number };
  /** Seconds the current ball has been in play, or -1 while waiting for the next. */
  inPlay: number;
  waitNext: number;
  /** Seconds the ball has hardly moved (it gets a nudge if it ever settles somewhere). */
  still: number;
  /** The free return of an early-lost ball is used (once per ball). */
  saved: boolean;
  balls: number;
  /** Seconds a tap keeps a flipper up. */
  flick: [number, number];
  score: number;
  time: number;
}

export const BALL_R = 13;
const FLIPPER_R = 10;
const GRAVITY = 700;
const REST = 0.5;
const RAISED = -0.45;
const MAX_SPEED = 1300;
const SAVE_SECONDS = 3;
const STAR_DARK = 6;

export function flipperTip(f: Flipper, length: number): Point {
  const a = f.side === 1 ? f.angle : Math.PI - f.angle;
  return { x: f.pivot.x + Math.cos(a) * length, y: f.pivot.y + Math.sin(a) * length };
}

function closestOnSegment(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return { x: a.x + dx * t, y: a.y + dy * t };
}

export function createPinball({ arena, rng }: GameSetup): MinigameLogic<PinballState> {
  const events = eventQueue();
  const h = arena.height - HUD_SAFE_TOP - 20;
  const w = Math.min(arena.width - 40, h * 0.9);
  const table = { x: (arena.width - w) / 2, y: HUD_SAFE_TOP + 10, w, h };
  const cx = table.x + w / 2;
  const bottom = table.y + h;
  const length = w * 0.3;
  const pivotY = bottom - 120;
  const gapHalf = 22;
  const leftPivot = { x: cx - gapHalf - length * Math.cos(REST), y: pivotY - length * Math.sin(REST) };
  const rightPivot = { x: cx + gapHalf + length * Math.cos(REST), y: leftPivot.y };
  const walls: Segment[] = [];
  const top = table.y + w * 0.35;
  // Side walls, a rounded top, and the slopes down to the flippers.
  walls.push({ a: { x: table.x, y: top }, b: { x: table.x, y: leftPivot.y - 70 } });
  walls.push({ a: { x: table.x + w, y: top }, b: { x: table.x + w, y: leftPivot.y - 70 } });
  for (let i = 0; i < 12; i += 1) {
    const a0 = Math.PI + (i / 12) * Math.PI;
    const a1 = Math.PI + ((i + 1) / 12) * Math.PI;
    const r = w / 2;
    walls.push({ a: { x: cx + Math.cos(a0) * r, y: top + Math.sin(a0) * (top - table.y) }, b: { x: cx + Math.cos(a1) * r, y: top + Math.sin(a1) * (top - table.y) } });
  }
  // The slopes meet the top of the flippers' round ends, so a ball rolls on without a bump.
  walls.push({ a: { x: table.x, y: leftPivot.y - 70 }, b: { x: leftPivot.x, y: leftPivot.y - FLIPPER_R } });
  walls.push({ a: { x: table.x + w, y: leftPivot.y - 70 }, b: { x: rightPivot.x, y: rightPivot.y - FLIPPER_R } });
  const bumpR = Math.max(28, w * 0.07);
  // Side bells leave a wide lane to the wall, so the ball never gets stuck bouncing between them.
  const side = Math.min(w * 0.22, w / 2 - bumpR - 95);
  const bumpers: Bumper[] = [
    { x: cx, y: table.y + h * 0.3, r: bumpR, hitAgo: 9 },
    { x: cx - side, y: table.y + h * 0.42, r: bumpR, hitAgo: 9 },
    { x: cx + side, y: table.y + h * 0.42, r: bumpR, hitAgo: 9 },
  ];
  const stars: Star[] = [
    { x: table.x + w * 0.15, y: table.y + h * 0.25, dark: 0 },
    { x: table.x + w * 0.85, y: table.y + h * 0.25, dark: 0 },
    { x: cx, y: table.y + h * 0.55, dark: 0 },
    { x: table.x + w * 0.12, y: table.y + h * 0.6, dark: 0 },
    { x: table.x + w * 0.88, y: table.y + h * 0.6, dark: 0 },
  ];
  const state: PinballState = {
    table,
    walls,
    flippers: [
      { pivot: leftPivot, side: 1, angle: REST, speed: 0, up: false },
      { pivot: rightPivot, side: -1, angle: REST, speed: 0, up: false },
    ],
    bumpers,
    stars,
    ball: { x: cx, y: table.y + 60, vx: 0, vy: 0 },
    inPlay: -1,
    waitNext: 0.6,
    saved: false,
    still: 0,
    balls: 3,
    flick: [0, 0],
    score: 0,
    time: 0,
  };

  // A new ball rolls in from a side, down toward the flippers: it needs a flip to reach the bells.
  const serve = (r: Rng): void => {
    const fromLeft = r.chance(0.5);
    state.ball = { x: fromLeft ? table.x + 30 : table.x + w - 30, y: Math.min(table.y + h * 0.62, leftPivot.y - 150), vx: (fromLeft ? 1 : -1) * r.range(120, 200), vy: 60 };
    state.inPlay = 0;
  };

  function collideSegment(s: Segment, radius: number, surface: (p: Point) => Point, restitution: number): boolean {
    const b = state.ball;
    const c = closestOnSegment(b, s.a, s.b);
    const dx = b.x - c.x;
    const dy = b.y - c.y;
    const d = Math.hypot(dx, dy);
    if (d >= BALL_R + radius || d === 0) return false;
    const nx = dx / d;
    const ny = dy / d;
    b.x = c.x + nx * (BALL_R + radius);
    b.y = c.y + ny * (BALL_R + radius);
    const sv = surface(c);
    const rel = (b.vx - sv.x) * nx + (b.vy - sv.y) * ny;
    if (rel < 0) {
      b.vx -= (1 + restitution) * rel * nx;
      b.vy -= (1 + restitution) * rel * ny;
    }
    return true;
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.balls <= 0;
    },
    get lives() {
      return state.balls;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      for (const tap of input.taps) state.flick[tap.x < cx ? 0 : 1] = 0.18;
      state.flick = [Math.max(0, state.flick[0] - dt), Math.max(0, state.flick[1] - dt)];
      const held = input.pointer;
      state.flippers.forEach((f, i) => {
        const up = (held !== null && (i === 0 ? held.x < cx : held.x >= cx)) || state.flick[i as 0 | 1] > 0;
        if (up && !f.up) events.push({ type: 'action', x: f.pivot.x, y: f.pivot.y, note: 50, voice: 'drum' });
        f.up = up;
      });
      for (const b of state.bumpers) b.hitAgo += dt;
      for (const s of state.stars) s.dark = Math.max(0, s.dark - dt);

      if (state.inPlay < 0) {
        state.waitNext -= dt;
        if (state.waitNext <= 0 && state.balls > 0) serve(rng);
        // Flippers still move.
      }
      const subs = 4;
      const h2 = dt / subs;
      for (let k = 0; k < subs; k += 1) {
        for (const f of state.flippers) {
          const target = f.up ? RAISED : REST;
          const before = f.angle;
          const rate = f.up ? 20 : 9;
          f.angle = target < f.angle ? Math.max(target, f.angle - rate * h2) : Math.min(target, f.angle + rate * h2);
          f.speed = (f.angle - before) / h2;
        }
        if (state.inPlay < 0) continue;
        const b = state.ball;
        b.vy += GRAVITY * h2;
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > MAX_SPEED) {
          b.vx = (b.vx / sp) * MAX_SPEED;
          b.vy = (b.vy / sp) * MAX_SPEED;
        }
        b.x += b.vx * h2;
        b.y += b.vy * h2;
        for (const s of state.walls) collideSegment(s, 0, () => ({ x: 0, y: 0 }), 0.5);
        for (const f of state.flippers) {
          const tip = flipperTip(f, length);
          // The surface moves with the flipper's turn.
          const omega = f.side === 1 ? f.speed : -f.speed;
          collideSegment({ a: f.pivot, b: tip }, FLIPPER_R, (p) => ({ x: -omega * (p.y - f.pivot.y), y: omega * (p.x - f.pivot.x) }), 0.35);
        }
        for (const bump of state.bumpers) {
          const dx = b.x - bump.x;
          const dy = b.y - bump.y;
          const d = Math.hypot(dx, dy);
          if (d >= bump.r + BALL_R || d === 0) continue;
          const nx = dx / d;
          const ny = dy / d;
          b.x = bump.x + nx * (bump.r + BALL_R);
          b.y = bump.y + ny * (bump.r + BALL_R);
          b.vx = nx * 430 + b.vx * 0.2;
          b.vy = ny * 430 + b.vy * 0.2;
          if (bump.hitAgo > 0.1) {
            state.score += 10;
            events.push({ type: 'score', x: bump.x, y: bump.y, points: 10, note: 76, voice: 'bell' });
          }
          bump.hitAgo = 0;
        }
        for (const s of state.stars) {
          if (s.dark > 0 || Math.hypot(b.x - s.x, b.y - s.y) > 30) continue;
          s.dark = STAR_DARK;
          state.score += 25;
          events.push({ type: 'score', x: s.x, y: s.y, points: 25 });
        }
      }
      if (state.inPlay >= 0) {
        state.inPlay += dt;
        const resting = Math.hypot(state.ball.vx, state.ball.vy) < 20 && !state.flippers.some((f) => f.up);
        state.still = resting ? state.still + dt : 0;
        if (state.still > 1.5) {
          state.ball.vx = (state.ball.x < cx ? 1 : -1) * 120;
          state.ball.vy = -80;
          state.still = 0;
        }
        if (state.ball.y > bottom + 30 || state.ball.x < table.x - 40 || state.ball.x > table.x + w + 40) {
          events.push({ type: 'hit', x: cx, y: bottom });
          if (state.inPlay > SAVE_SECONDS || state.saved) {
            state.balls -= 1;
            state.saved = false;
          } else state.saved = true;
          state.inPlay = -1;
          state.waitNext = 1.0;
        }
      }
    },
  };
}

/** Good play: raises a flipper as the ball comes to it; a ball resting on a flipper gets a quick flick. */
export function pinballBot(state: PinballState, _context: BotContext): BotMove {
  if (state.inPlay < 0) return {};
  const b = state.ball;
  const length = state.table.w * 0.3;
  const ahead = { x: b.x + b.vx * 0.15, y: b.y + b.vy * 0.15 };
  for (const [i, f] of state.flippers.entries()) {
    const tip = flipperTip({ ...f, angle: REST }, length);
    const near = Math.min(...[b, ahead].map((p) => Math.hypot(p.x - closestOnSegment(p, f.pivot, tip).x, p.y - closestOnSegment(p, f.pivot, tip).y)));
    if (near >= 60 || b.vy < -50) continue;
    const side = { x: i === 0 ? state.table.x + 10 : state.table.x + state.table.w - 10, y: f.pivot.y };
    // A slow ball: lower the flipper, let it roll out toward the tip, then flick it.
    const along = Math.hypot(b.x - f.pivot.x, b.y - f.pivot.y);
    if (Math.hypot(b.vx, b.vy) < 160) return f.up || along < length * 0.55 ? {} : { tap: side };
    return { touch: side };
  }
  return {};
}
