// Duck catch: a fenced village pond with three ducks paddling about. The child wades after the finger she
// holds down; ducks swim away from her a little faster than she wades, but along the fence they can only
// slide sideways and in a corner they slow right down. A tap makes her lunge toward the tapped spot (a quarter
// second at three times her pace): a duck she touches during the lunge is caught (a point, it goes into the
// basket on the bank) and a new one swims in from the reeds. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Duck {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Seconds left of paddling in from the reeds (it cannot be caught yet). */
  entering: number;
  /** A wander heading while nobody chases it. */
  heading: number;
  /** Seconds left of a sideways flap away from a lunge, and its direction. */
  dodge: number;
  dodgeDir: Point;
}

export interface PondRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DuckCatchState {
  pond: PondRect;
  player: Point;
  /** Direction the child faces (-1 left, 1 right). */
  facing: number;
  /** Seconds left of a lunge, its direction, and the pause before the next one. */
  lunge: number;
  lungeDir: Point;
  lungeRest: number;
  ducks: Duck[];
  /** Ducks caught, in order, for the basket (and when, for the fly-in). */
  caught: Array<{ at: number; from: Point }>;
  /** Seconds since the last splash (a lunge that missed). */
  splashAgo: number;
  splashAt: Point;
  score: number;
  time: number;
}

export const WADE_SPEED = 230;
const LUNGE_SECONDS = 0.2;
const LUNGE_FACTOR = 2.6;
const LUNGE_REST = 0.55;
/** A duck within this of the child during a lunge is caught. */
export const CATCH_RADIUS = 46;
/** A duck out in open water sees a lunge coming and flaps sideways (most of the time); a cornered one cannot. */
const DODGE_RANGE = 230;
const DODGE_CHANCE = 0.7;
const DODGE_SPEED = 420;
const DODGE_SECONDS = 0.3;
const DUCKS = 3;
const FLEE_RANGE = 280;
const FLEE_SPEED = 290;
const WANDER_SPEED = 60;
const ENTER_SECONDS = 0.9;
/** Near a fence a duck is slower, in a corner much slower. */
const WALL_NEAR = 70;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function createDuckCatch({ arena, params, rng }: GameSetup): MinigameLogic<DuckCatchState> {
  const duckSpeed = typeof params.duckSpeed === 'number' ? clamp(params.duckSpeed, 0.6, 1.4) : 1;
  const events = eventQueue();
  const pond: PondRect = { x: 34, y: HUD_SAFE_TOP + 24, w: arena.width - 68, h: arena.height - HUD_SAFE_TOP - 58 };
  const state: DuckCatchState = {
    pond,
    player: { x: pond.x + pond.w / 2, y: pond.y + pond.h - 80 },
    facing: 1,
    lunge: 0,
    lungeDir: { x: 0, y: -1 },
    lungeRest: 0,
    ducks: [],
    caught: [],
    splashAgo: 9,
    splashAt: { x: 0, y: 0 },
    score: 0,
    time: 0,
  };
  const margin = 26;

  function spawn(r: Rng, entering: number): Duck {
    // From the reeds along the top or the sides, away from the child.
    for (let i = 0; i < 20; i += 1) {
      const x = r.range(pond.x + 60, pond.x + pond.w - 60);
      const y = r.range(pond.y + 50, pond.y + pond.h * 0.55);
      if (Math.hypot(x - state.player.x, y - state.player.y) > 260) return { x, y, vx: 0, vy: 0, entering, heading: r.range(0, Math.PI * 2), dodge: 0, dodgeDir: { x: 0, y: 0 } };
    }
    return { x: pond.x + 60, y: pond.y + 60, vx: 0, vy: 0, entering, heading: 0, dodge: 0, dodgeDir: { x: 0, y: 0 } };
  }
  for (let i = 0; i < DUCKS; i += 1) state.ducks.push(spawn(rng, 0));

  const nearWalls = (d: Duck): { nearX: boolean; nearY: boolean } => ({
    nearX: Math.min(d.x - pond.x, pond.x + pond.w - d.x) < WALL_NEAR,
    nearY: Math.min(d.y - pond.y, pond.y + pond.h - d.y) < WALL_NEAR,
  });

  /** Ducks near a lunge flap sideways out of its way, unless the fence leaves them nowhere to go. */
  function startle(dir: Point): void {
    for (const d of state.ducks) {
      if (d.entering > 0 || Math.hypot(d.x - state.player.x, d.y - state.player.y) > DODGE_RANGE) continue;
      const { nearX, nearY } = nearWalls(d);
      if (nearX && nearY) continue;
      if (!rng.chance(nearX || nearY ? DODGE_CHANCE * 0.6 : DODGE_CHANCE)) continue;
      // Sideways to the lunge, toward the side with more water.
      let side = { x: -dir.y, y: dir.x };
      const ahead = { x: d.x + side.x * 120, y: d.y + side.y * 120 };
      if (ahead.x < pond.x + margin || ahead.x > pond.x + pond.w - margin || ahead.y < pond.y + margin || ahead.y > pond.y + pond.h - margin) side = { x: -side.x, y: -side.y };
      d.dodge = DODGE_SECONDS;
      d.dodgeDir = side;
    }
  }

  function moveDuck(d: Duck, dt: number): void {
    if (d.entering > 0) {
      d.entering = Math.max(0, d.entering - dt);
      return;
    }
    const dx = d.x - state.player.x;
    const dy = d.y - state.player.y;
    const dist = Math.hypot(dx, dy) || 1;
    let want: Point;
    if (d.dodge > 0) {
      d.dodge -= dt;
      want = { x: d.dodgeDir.x * DODGE_SPEED, y: d.dodgeDir.y * DODGE_SPEED };
    } else if (dist < FLEE_RANGE) {
      // Away from the child, and away from the middle of the pond's nearest fence a little.
      const urge = 1 - dist / FLEE_RANGE;
      want = { x: (dx / dist) * FLEE_SPEED * (0.5 + 0.5 * urge), y: (dy / dist) * FLEE_SPEED * (0.5 + 0.5 * urge) };
    } else {
      d.heading += rng.range(-1, 1) * dt * 2;
      want = { x: Math.cos(d.heading) * WANDER_SPEED, y: Math.sin(d.heading) * WANDER_SPEED };
    }
    // Fences: a duck cannot swim into one; pressed against one it slips along it instead (full speed), and only
    // in a corner, with nowhere to slip, does it slow right down.
    const { nearX, nearY } = nearWalls(d);
    if (dist < FLEE_RANGE && d.dodge <= 0) {
      const pushX = (d.x < pond.x + WALL_NEAR && want.x < 0) || (d.x > pond.x + pond.w - WALL_NEAR && want.x > 0);
      const pushY = (d.y < pond.y + WALL_NEAR && want.y < 0) || (d.y > pond.y + pond.h - WALL_NEAR && want.y > 0);
      const along = Math.hypot(want.x, want.y);
      if (pushX && !pushY) want = { x: 0, y: (Math.sign(want.y) || (d.y < pond.y + pond.h / 2 ? 1 : -1)) * along };
      if (pushY && !pushX) want = { x: (Math.sign(want.x) || (d.x < pond.x + pond.w / 2 ? 1 : -1)) * along, y: 0 };
    }
    const slow = nearX && nearY ? 0.5 : 1;
    want.x *= slow * duckSpeed;
    want.y *= slow * duckSpeed;
    const ease = d.dodge > 0 ? 1 : Math.min(1, dt * 6);
    d.vx += (want.x - d.vx) * ease;
    d.vy += (want.y - d.vy) * ease;
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    if (d.x < pond.x + margin || d.x > pond.x + pond.w - margin) {
      d.x = clamp(d.x, pond.x + margin, pond.x + pond.w - margin);
      d.vx = 0;
      d.heading = Math.PI - d.heading;
    }
    if (d.y < pond.y + margin || d.y > pond.y + pond.h - margin) {
      d.y = clamp(d.y, pond.y + margin, pond.y + pond.h - margin);
      d.vy = 0;
      d.heading = -d.heading;
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
      state.splashAgo += dt;
      state.lungeRest = Math.max(0, state.lungeRest - dt);
      const p = state.player;

      const tap = input.taps.at(-1);
      if (tap && state.lunge <= 0 && state.lungeRest <= 0) {
        const dx = tap.x - p.x;
        const dy = tap.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        state.lunge = LUNGE_SECONDS;
        state.lungeDir = { x: dx / d, y: dy / d };
        if (Math.abs(dx) > 4) state.facing = Math.sign(dx);
        events.push({ type: 'action', x: p.x, y: p.y });
        startle(state.lungeDir);
      }

      if (state.lunge > 0) {
        state.lunge -= dt;
        p.x += state.lungeDir.x * WADE_SPEED * LUNGE_FACTOR * dt;
        p.y += state.lungeDir.y * WADE_SPEED * LUNGE_FACTOR * dt;
        if (state.lunge <= 0) {
          state.lungeRest = LUNGE_REST;
          state.splashAgo = 0;
          state.splashAt = { x: p.x, y: p.y };
          events.push({ type: 'miss', x: p.x, y: p.y });
        }
      } else if (input.pointer) {
        const dx = input.pointer.x - p.x;
        const dy = input.pointer.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d > 6) {
          const step = Math.min(d, WADE_SPEED * dt);
          p.x += (dx / d) * step;
          p.y += (dy / d) * step;
          if (Math.abs(dx) > 4) state.facing = Math.sign(dx);
        }
      }
      p.x = clamp(p.x, pond.x + 30, pond.x + pond.w - 30);
      p.y = clamp(p.y, pond.y + 30, pond.y + pond.h - 30);

      for (const d of state.ducks) moveDuck(d, dt);

      if (state.lunge > 0) {
        for (let i = 0; i < state.ducks.length; i += 1) {
          const d = state.ducks[i];
          if (!d || d.entering > 0 || Math.hypot(d.x - p.x, d.y - p.y) > CATCH_RADIUS) continue;
          state.score += 1;
          state.caught.push({ at: state.time, from: { x: d.x, y: d.y } });
          events.push({ type: 'score', x: d.x, y: d.y, note: 76, voice: 'whistle' });
          state.ducks[i] = spawn(rng, ENTER_SECONDS);
          state.lunge = 0;
          state.lungeRest = LUNGE_REST;
          break;
        }
      }
    },
  };
}

/**
 * Good play: chase the duck nearest a fence (it cannot run far), coming at it from the pond's middle so it
 * is pinned, and lunge once it is within reach.
 */
export function duckBot(state: DuckCatchState, _context: BotContext): BotMove {
  const p = state.player;
  if (state.lunge > 0) return {};
  const centre = { x: state.pond.x + state.pond.w / 2, y: state.pond.y + state.pond.h / 2 };
  const wallGap = (d: Duck): number => Math.min(d.x - state.pond.x, state.pond.x + state.pond.w - d.x, d.y - state.pond.y, state.pond.y + state.pond.h - d.y);
  const ready = state.ducks.filter((d) => d.entering <= 0);
  const target = ready.sort((a, b) => wallGap(a) + Math.hypot(a.x - p.x, a.y - p.y) * 0.5 - (wallGap(b) + Math.hypot(b.x - p.x, b.y - p.y) * 0.5))[0];
  if (!target) return { touch: centre };
  const dist = Math.hypot(target.x - p.x, target.y - p.y);
  // A lunge covers about 170 units: aim a little ahead of where it swims.
  const pinned = wallGap(target) < 75;
  if (dist < (pinned ? 140 : 70) && state.lungeRest <= 0) return { tap: { x: target.x + target.vx * 0.12, y: target.y + target.vy * 0.12 } };
  // Approach from the middle's side: aim at a point just inside the duck, toward the pond's centre.
  const toCentre = { x: centre.x - target.x, y: centre.y - target.y };
  const c = Math.hypot(toCentre.x, toCentre.y) || 1;
  const offset = dist > 220 ? 60 : 0;
  return { touch: { x: target.x + (toCentre.x / c) * offset, y: target.y + (toCentre.y / c) * offset } };
}
