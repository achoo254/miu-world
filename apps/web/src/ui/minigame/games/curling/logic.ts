// Curling: an ice sheet seen from above, the house (three rings) near the top. The child swipes up to slide a
// stone from the bottom: a quicker swipe goes farther, the swipe's slant sets its direction. While it slides,
// rubbing the ice just ahead of it (moving the finger to and fro) melts the ice a little, so it slows less and
// travels farther: a soft throw can be swept home. Stones knock each other. Each stone resting in the house
// scores by its ring (centre 3, middle 2, outer 1), counted live; five stones a round. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point, type Swipe } from '../../types';

export const STONES = 5;
export const STONE_RADIUS = 24;
/** House ring radii, inner to outer, and their points. */
export const RINGS = [
  { r: 36, points: 3 },
  { r: 70, points: 2 },
  { r: 106, points: 1 },
] as const;
/** Seconds a stone thrown just right takes to come to rest on the button. */
const IDEAL_SECONDS = 2.4;
/** A swipe of this speed (arena units/s) throws the stone just to the button without sweeping. */
export const IDEAL_SWIPE = 1400;
/** Sweeping keeps this share of the ice's friction. */
const SWEEP_FRICTION = 0.4;
const SWEEP_HOLD = 0.15;
const MAX_SLANT = 0.4;
const NEXT_SECONDS = 0.7;

export interface Stone {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Knocked out of play (off the sides or past the back line). */
  out: boolean;
  /** Spin angle, for the picture. */
  angle: number;
}

export interface CurlingState {
  sheetLeft: number;
  sheetRight: number;
  houseX: number;
  houseY: number;
  backLine: number;
  hackY: number;
  /** Friction (units/s²) of unswept ice. */
  friction: number;
  stones: Stone[];
  /** Stones thrown so far. */
  thrown: number;
  phase: 'aim' | 'sliding' | 'over';
  /** Seconds the stones have all been at rest (the next stone comes after a beat). */
  restFor: number;
  /** Seconds of sweeping left (a stroke keeps the ice fast for a moment) and recent sweep marks. */
  sweeping: number;
  sweepMarks: Array<{ x: number; y: number; age: number }>;
  /** Where the finger is while sweeping (the broom), or null. */
  broom: Point | null;
  score: number;
  time: number;
}

export function ringPoints(state: CurlingState, s: Stone): number {
  if (s.out) return 0;
  const d = Math.hypot(s.x - state.houseX, s.y - state.houseY) - STONE_RADIUS * 0.5;
  for (const ring of RINGS) if (d <= ring.r) return ring.points;
  return 0;
}

const moving = (s: Stone): boolean => !s.out && (s.vx !== 0 || s.vy !== 0);

export function createCurling({ arena, params }: GameSetup): MinigameLogic<CurlingState> {
  const factor = typeof params.ice === 'number' ? Math.min(1.5, Math.max(0.6, params.ice)) : 1;
  const events = eventQueue();
  const width = Math.min(arena.width - 60, 520);
  const houseY = HUD_SAFE_TOP + 140;
  const hackY = arena.height - 90;
  const distance = hackY - houseY;
  const state: CurlingState = {
    sheetLeft: arena.width / 2 - width / 2,
    sheetRight: arena.width / 2 + width / 2,
    houseX: arena.width / 2,
    houseY,
    backLine: houseY - RINGS[2].r - 30,
    hackY,
    // d = v0·T/2 and v0 = a·T for a throw that stops at the button after T seconds.
    friction: ((2 * distance) / (IDEAL_SECONDS * IDEAL_SECONDS)) / factor,
    stones: [],
    thrown: 0,
    phase: 'aim',
    restFor: 0,
    sweeping: 0,
    sweepMarks: [],
    broom: null,
    score: 0,
    time: 0,
  };
  const idealSpeed = state.friction * IDEAL_SECONDS;
  let lastPointer: Point | null = null;

  function throwStone(swipe: Swipe): void {
    const v0 = idealSpeed * Math.min(1.6, Math.max(0.45, swipe.speed / IDEAL_SWIPE));
    const slant = Math.max(-MAX_SLANT, Math.min(MAX_SLANT, swipe.dx / -swipe.dy));
    const norm = Math.hypot(1, slant);
    state.stones.push({ x: state.houseX, y: hackY, vx: (v0 * slant) / norm, vy: -v0 / norm, out: false, angle: 0 });
    state.thrown += 1;
    state.phase = 'sliding';
    events.push({ type: 'action', x: state.houseX, y: hackY });
  }

  function collide(a: Stone, b: Stone): void {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    if (dist >= STONE_RADIUS * 2 || dist === 0) return;
    const nx = dx / dist;
    const ny = dy / dist;
    // Push apart, then swap the velocity along the line between centres (equal masses, a little lossy).
    const overlap = STONE_RADIUS * 2 - dist;
    a.x -= (nx * overlap) / 2;
    a.y -= (ny * overlap) / 2;
    b.x += (nx * overlap) / 2;
    b.y += (ny * overlap) / 2;
    const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    if (rel <= 0) return;
    const j = rel * 0.92;
    a.vx -= j * nx;
    a.vy -= j * ny;
    b.vx += j * nx;
    b.vy += j * ny;
    events.push({ type: 'action', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, note: 50, voice: 'drum' });
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.phase === 'over';
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      for (const m of state.sweepMarks) m.age += dt;
      state.sweepMarks = state.sweepMarks.filter((m) => m.age < 0.6);

      if (state.phase === 'aim') {
        const swipe = input.swipes.find((s) => s.dy < -40 && s.from.y > arena.height * 0.45);
        if (swipe) throwStone(swipe);
        lastPointer = null;
        return;
      }

      // Sweeping: the finger moving just ahead of a sliding stone.
      const runner = state.stones.find(moving);
      state.broom = null;
      if (runner && input.pointer) {
        const p = input.pointer;
        const ahead = runner.y - p.y;
        if (ahead > -30 && ahead < 240 && Math.abs(p.x - runner.x) < 130) {
          state.broom = p;
          if (lastPointer && Math.hypot(p.x - lastPointer.x, p.y - lastPointer.y) > 2) {
            state.sweeping = SWEEP_HOLD;
            if (state.sweepMarks.length < 40) state.sweepMarks.push({ x: p.x, y: p.y, age: 0 });
          }
        }
      }
      lastPointer = input.pointer;
      state.sweeping = Math.max(0, state.sweeping - dt);

      for (const s of state.stones) {
        if (!moving(s)) continue;
        const speed = Math.hypot(s.vx, s.vy);
        const friction = state.friction * (s === runner && state.sweeping > 0 ? SWEEP_FRICTION : 1);
        const slower = Math.max(0, speed - friction * dt);
        if (slower < 4) {
          s.vx = 0;
          s.vy = 0;
        } else {
          s.vx *= slower / speed;
          s.vy *= slower / speed;
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.angle += (speed / 300) * dt;
        if (s.x < state.sheetLeft + STONE_RADIUS * 0.5 || s.x > state.sheetRight - STONE_RADIUS * 0.5 || s.y < state.backLine) {
          s.out = true;
          s.vx = 0;
          s.vy = 0;
          events.push({ type: 'miss', x: s.x, y: s.y });
        }
      }
      for (let i = 0; i < state.stones.length; i += 1) {
        for (let j = i + 1; j < state.stones.length; j += 1) {
          const a = state.stones[i];
          const b = state.stones[j];
          if (a && b && !a.out && !b.out) collide(a, b);
        }
      }

      if (state.stones.some(moving)) {
        state.restFor = 0;
        return;
      }
      if (state.restFor === 0) {
        // Everything has come to rest: count the house again.
        const total = state.stones.reduce((sum, s) => sum + ringPoints(state, s), 0);
        const last = state.stones.at(-1);
        if (total > state.score && last) events.push({ type: 'score', x: last.x, y: last.y, points: total - state.score, note: 72 + Math.min(12, total), voice: 'bell' });
        else if (last && ringPoints(state, last) === 0) events.push({ type: 'miss', x: last.x, y: last.y });
        state.score = total;
      }
      state.restFor += dt;
      if (state.restFor >= NEXT_SECONDS) state.phase = state.thrown >= STONES ? 'over' : 'aim';
    },
  };
}

/** Where a throw of speed v0 straight up from the hack comes to rest without sweeping (units travelled). */
const travel = (state: CurlingState, v0: number): number => (v0 * v0) / (2 * state.friction);

/**
 * Good play: aims at a free spot on the button (not straight into a stone already there), swipes the speed that
 * stops it there, and sweeps a stone that would come up short.
 */
export function curlingBot(state: CurlingState, context: BotContext): BotMove {
  if (state.phase === 'aim') {
    const resting = state.stones.filter((s) => !s.out);
    // Free spots in the house, best rings first.
    const spots: Point[] = [];
    for (let dx = -75; dx <= 75; dx += 15) for (let dy = -60; dy <= 75; dy += 15) spots.push({ x: state.houseX + dx, y: state.houseY + dy });
    const pointsAt = (p: Point): number => ringPoints(state, { x: p.x, y: p.y, vx: 0, vy: 0, out: false, angle: 0 });
    spots.sort((a, b) => pointsAt(b) - pointsAt(a) || Math.hypot(a.x - state.houseX, a.y - state.houseY) - Math.hypot(b.x - state.houseX, b.y - state.houseY));
    const clear = (spot: Point): boolean =>
      resting.every((s) => {
        // Not on the spot, and not in the stone's way there (distance from the straight line hack → spot).
        if (Math.hypot(s.x - spot.x, s.y - spot.y) < STONE_RADIUS * 2.2) return false;
        if (s.y < spot.y) return true;
        const t = (state.hackY - s.y) / (state.hackY - spot.y);
        const lineX = state.houseX + (spot.x - state.houseX) * t;
        return Math.abs(lineX - s.x) > STONE_RADIUS * 2.1;
      });
    const spot = spots.find(clear) ?? { x: state.houseX, y: state.houseY };
    const dist = Math.hypot(spot.x - state.houseX, state.hackY - spot.y);
    const v0 = Math.sqrt(2 * state.friction * dist);
    const idealSpeed = state.friction * IDEAL_SECONDS;
    const swipeSpeed = (v0 / idealSpeed) * IDEAL_SWIPE;
    const length = swipeSpeed * 0.12;
    const slant = (spot.x - state.houseX) / (state.hackY - spot.y);
    const dy = -length / Math.hypot(1, slant);
    return { swipe: { from: { x: state.houseX, y: context.arena.height - 120 }, dx: -dy * slant, dy } };
  }
  const runner = state.stones.find(moving);
  if (!runner) return {};
  const v = Math.hypot(runner.vx, runner.vy);
  const toGo = runner.y - state.houseY;
  // Sweep (a stroke to and fro, just ahead) while it would stop short of the button.
  if (travel(state, v) * Math.abs(runner.vy / v) < toGo - 4) {
    const side = Math.floor(context.time * 10) % 2 === 0 ? -40 : 40;
    return { touch: { x: runner.x + side, y: runner.y - 90 } };
  }
  return {};
}
