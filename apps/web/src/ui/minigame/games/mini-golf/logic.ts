// Mini golf: a green with walls and the hole with its flag. The child pulls back from anywhere and lets go: the
// ball shoots the other way, as hard as the pull was long, rolls, slows and bounces off walls. Into the hole (not
// too fast, or it hops over) is a point and the next green. After five strokes on one green the ball is set down
// beside the hole, so nobody gets stuck. Greens get a wall with a gap, then a block as well. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Wall {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Ball extends Point {
  vx: number;
  vy: number;
}

export interface GolfState {
  green: Wall;
  walls: Wall[];
  hole: Point;
  ball: Ball;
  /** Where the pull started and where the finger is now; null when not pulling. */
  aimFrom: Point | null;
  aimTo: Point | null;
  rolling: boolean;
  strokes: number;
  greens: number;
  /** Seconds since the ball dropped in (the next green comes after a moment), or -1. */
  sunk: number;
  score: number;
  time: number;
}

export const BALL_R = 12;
export const HOLE_R = 22;
const POWER = 4;
export const MAX_SPEED = 950;
const SINK_SPEED = 520;
const MAX_STROKES = 5;

export function shotVelocity(from: Point, to: Point): Point {
  let vx = (from.x - to.x) * POWER;
  let vy = (from.y - to.y) * POWER;
  const s = Math.hypot(vx, vy);
  if (s > MAX_SPEED) {
    vx = (vx / s) * MAX_SPEED;
    vy = (vy / s) * MAX_SPEED;
  }
  return { x: vx, y: vy };
}

/** One step of rolling: friction, walls, the hole. Returns 'sunk' when it drops in. */
export function roll(state: Pick<GolfState, 'green' | 'walls' | 'hole'>, b: Ball, dt: number): 'sunk' | 'rolling' | 'stopped' {
  const speed = Math.hypot(b.vx, b.vy);
  const slow = Math.max(0, speed - (90 + speed * 0.9) * dt);
  if (slow < 6) {
    b.vx = 0;
    b.vy = 0;
    return 'stopped';
  }
  b.vx = (b.vx / speed) * slow;
  b.vy = (b.vy / speed) * slow;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  const g = state.green;
  if (b.x < g.x + BALL_R) {
    b.x = g.x + BALL_R;
    b.vx = Math.abs(b.vx) * 0.8;
  }
  if (b.x > g.x + g.w - BALL_R) {
    b.x = g.x + g.w - BALL_R;
    b.vx = -Math.abs(b.vx) * 0.8;
  }
  if (b.y < g.y + BALL_R) {
    b.y = g.y + BALL_R;
    b.vy = Math.abs(b.vy) * 0.8;
  }
  if (b.y > g.y + g.h - BALL_R) {
    b.y = g.y + g.h - BALL_R;
    b.vy = -Math.abs(b.vy) * 0.8;
  }
  for (const w of state.walls) {
    const cx = Math.max(w.x, Math.min(w.x + w.w, b.x));
    const cy = Math.max(w.y, Math.min(w.y + w.h, b.y));
    const dx = b.x - cx;
    const dy = b.y - cy;
    const d = Math.hypot(dx, dy);
    if (d >= BALL_R) continue;
    const nx = d > 0 ? dx / d : 0;
    const ny = d > 0 ? dy / d : -1;
    b.x = cx + nx * BALL_R;
    b.y = cy + ny * BALL_R;
    const dot = b.vx * nx + b.vy * ny;
    if (dot < 0) {
      b.vx -= 1.8 * dot * nx;
      b.vy -= 1.8 * dot * ny;
    }
  }
  if (Math.hypot(b.x - state.hole.x, b.y - state.hole.y) < HOLE_R - 4 && Math.hypot(b.vx, b.vy) < SINK_SPEED) return 'sunk';
  return 'rolling';
}

export function createMiniGolf({ arena, rng }: GameSetup): MinigameLogic<GolfState> {
  const events = eventQueue();
  const green: Wall = { x: 30, y: HUD_SAFE_TOP + 20, w: arena.width - 60, h: arena.height - HUD_SAFE_TOP - 50 };
  const state: GolfState = { green, walls: [], hole: { x: 0, y: 0 }, ball: { x: 0, y: 0, vx: 0, vy: 0 }, aimFrom: null, aimTo: null, rolling: false, strokes: 0, greens: 0, sunk: -1, score: 0, time: 0 };

  function newGreen(r: Rng): void {
    const wide = green.w >= green.h;
    const along = wide ? green.w : green.h;
    const across = wide ? green.h : green.w;
    const at = (a: number, c: number): Point => (wide ? { x: green.x + a, y: green.y + c } : { x: green.x + c, y: green.y + a });
    state.ball = { ...at(70, r.range(0.25, 0.75) * across), vx: 0, vy: 0 };
    state.hole = at(along - 80, r.range(0.25, 0.75) * across);
    state.walls = [];
    if (state.greens >= 1) {
      // A wall across the middle with a gap.
      const gap = 130;
      const gapAt = r.range(0.2, 0.8) * (across - gap);
      const thick = 18;
      const mid = along / 2 - thick / 2;
      const a1 = { a: mid, c: 0, la: thick, lc: gapAt };
      const a2 = { a: mid, c: gapAt + gap, la: thick, lc: across - gapAt - gap };
      for (const s of [a1, a2]) if (s.lc > 4) state.walls.push(wide ? { x: green.x + s.a, y: green.y + s.c, w: s.la, h: s.lc } : { x: green.x + s.c, y: green.y + s.a, w: s.lc, h: s.la });
    }
    if (state.greens >= 3) {
      const p = at(along * 0.75, r.range(0.3, 0.7) * across);
      state.walls.push({ x: p.x - 25, y: p.y - 25, w: 50, h: 50 });
    }
    state.strokes = 0;
    state.rolling = false;
    state.sunk = -1;
  }

  newGreen(rng);

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
      if (state.sunk >= 0) {
        state.sunk += dt;
        if (state.sunk >= 1.2) {
          state.greens += 1;
          newGreen(rng);
        }
        return;
      }
      if (state.rolling) {
        const result = roll(state, state.ball, dt);
        if (result === 'sunk') {
          state.rolling = false;
          state.sunk = 0;
          state.score += 1;
          state.ball.x = state.hole.x;
          state.ball.y = state.hole.y;
          events.push({ type: 'score', ...state.hole });
        } else if (result === 'stopped') {
          state.rolling = false;
          if (state.strokes >= MAX_STROKES) {
            // Set down beside the hole: one easy putt left.
            state.ball.x = state.hole.x - 60;
            state.ball.y = state.hole.y;
          }
        }
        return;
      }
      if (input.pressed && input.pointer) state.aimFrom = { ...input.pointer };
      if (input.pointer && state.aimFrom) state.aimTo = { ...input.pointer };
      if (input.released && state.aimFrom && state.aimTo) {
        const v = shotVelocity(state.aimFrom, state.aimTo);
        if (Math.hypot(v.x, v.y) > 60) {
          state.ball.vx = v.x;
          state.ball.vy = v.y;
          state.rolling = true;
          state.strokes += 1;
          events.push({ type: 'action', x: state.ball.x, y: state.ball.y });
        }
        state.aimFrom = null;
        state.aimTo = null;
      }
    },
  };
}

const plans = new Map<string, Point>();

/** The pull (as an offset from where it starts) that leaves the ball nearest the hole, by trying many shots. */
export function bestPull(state: GolfState): Point {
  const key = `${state.greens}:${Math.round(state.ball.x)}:${Math.round(state.ball.y)}`;
  const known = plans.get(key);
  if (known) return known;
  let best = { x: 0, y: 0 };
  let bestD = Infinity;
  for (let k = 0; k < 72; k += 1) {
    const a = (k / 72) * Math.PI * 2;
    for (const p of [0.25, 0.4, 0.55, 0.7, 0.85, 1]) {
      const v = { x: Math.cos(a) * MAX_SPEED * p, y: Math.sin(a) * MAX_SPEED * p };
      const b: Ball = { x: state.ball.x, y: state.ball.y, vx: v.x, vy: v.y };
      let d = Infinity;
      for (let i = 0; i < 600; i += 1) {
        const r = roll(state, b, 1 / 60);
        if (r === 'sunk') {
          d = -1;
          break;
        }
        if (r === 'stopped') {
          d = Math.hypot(b.x - state.hole.x, b.y - state.hole.y);
          break;
        }
      }
      if (d < bestD) {
        bestD = d;
        best = { x: -v.x / POWER, y: -v.y / POWER };
      }
    }
  }
  if (plans.size > 64) plans.clear();
  plans.set(key, best);
  return best;
}

/** Good play: presses on the ball, pulls back for the best shot, lets go. */
export function golfBot(state: GolfState, _context: BotContext): BotMove {
  if (state.rolling || state.sunk >= 0) return {};
  const pull = bestPull(state);
  const from = { x: state.ball.x, y: state.ball.y };
  if (!state.aimFrom) return { touch: from };
  const to = { x: state.aimFrom.x + pull.x, y: state.aimFrom.y + pull.y };
  if (!state.aimTo || Math.hypot(state.aimTo.x - to.x, state.aimTo.y - to.y) > 1) return { touch: to };
  return {};
}
