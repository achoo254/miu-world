// Gravity flip: the child runs on her own through an icy cave, along the floor or upside down along the roof.
// A tap flips which way is down and she falls across to the other side. Rocks stand on the floor, icicles hang
// from the roof and there are holes in both; running into one makes her stumble and slow down for about a
// second. Points are metres run. The cave speeds up as she goes. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export type Side = 'floor' | 'roof';
export type ObstacleKind = 'rock' | 'icicle' | 'hole';

export interface Obstacle {
  /** Metres from the start of the cave to its front edge. */
  at: number;
  /** Metres long. */
  length: number;
  side: Side;
  kind: ObstacleKind;
  /** How far it reaches into the cave (arena units). */
  reach: number;
  hit: boolean;
}

export interface GravityState {
  roofY: number;
  floorY: number;
  /** Runner's screen x and her centre's y. */
  runnerX: number;
  y: number;
  vy: number;
  /** Which way is down now, and whether she stands on it. */
  down: Side;
  grounded: boolean;
  /** Metres run. */
  distance: number;
  /** Metres per second now. */
  speed: number;
  /** Seconds since the last stumble. */
  stumbleAgo: number;
  obstacles: Obstacle[];
  /** Next 50-metre mark (a cheer). */
  nextMark: number;
  score: number;
  time: number;
}

/** Arena units per metre. */
export const UNITS_PER_METRE = 50;
export const RUNNER_HALF = 26;
const GRAVITY = 3200;
const SPEED_START = 7;
const SPEED_END = 10;
/** Stumble: almost stopped for a moment, then back to speed. */
const STUMBLE_STOP = 1.0;
const STUMBLE_RAMP = 0.8;

function nextObstacle(rng: Rng, after: number, previous: Obstacle | undefined, cave: number): Obstacle {
  // Mostly the other side from the last one, so flipping back and forth is the rhythm; sometimes the same side.
  const side: Side = previous ? (rng.chance(0.65) ? (previous.side === 'floor' ? 'roof' : 'floor') : previous.side) : 'floor';
  const gap = previous && previous.side !== side ? rng.range(9, 13) : rng.range(6, 9);
  const kind: ObstacleKind = rng.chance(0.25) ? 'hole' : side === 'floor' ? 'rock' : 'icicle';
  return { at: after + gap, length: kind === 'hole' ? rng.range(1.4, 2) : rng.range(0.8, 1.2), side, kind, reach: kind === 'hole' ? 0 : cave * rng.range(0.28, 0.38), hit: false };
}

export function createGravityFlip({ arena, duration, rng }: GameSetup): MinigameLogic<GravityState> {
  const events = eventQueue();
  const room = arena.height - HUD_SAFE_TOP - 60;
  const cave = Math.min(460, room);
  // A taller cave falls faster, so a flip takes the same time on every screen.
  const gravity = GRAVITY * (cave / 340);
  const roofY = HUD_SAFE_TOP + 20 + (room - cave) / 2;
  const floorY = roofY + cave;
  const state: GravityState = {
    roofY,
    floorY,
    runnerX: Math.max(140, arena.width * 0.26),
    y: floorY - RUNNER_HALF,
    vy: 0,
    down: 'floor',
    grounded: true,
    distance: 0,
    speed: SPEED_START,
    stumbleAgo: 9,
    obstacles: [],
    nextMark: 50,
    score: 0,
    time: 0,
  };
  // The first obstacle comes after a short clear run.
  let last: Obstacle | undefined = { at: 6, length: 0, side: 'roof', kind: 'icicle', reach: 0, hit: true };
  const aheadMetres = (arena.width - state.runnerX) / UNITS_PER_METRE + 6;

  function fill(): void {
    while (!last || last.at < state.distance + aheadMetres) {
      const o = nextObstacle(rng, last?.at ?? 0, last, cave);
      state.obstacles.push(o);
      last = o;
    }
    state.obstacles = state.obstacles.filter((o) => o.at + o.length > state.distance - 10);
  }

  /** Is the runner inside this obstacle now? */
  function touching(o: Obstacle): boolean {
    const half = RUNNER_HALF / UNITS_PER_METRE;
    if (state.distance + half < o.at || state.distance - half > o.at + o.length) return false;
    if (o.kind === 'hole') return state.grounded && state.down === o.side;
    return o.side === 'floor' ? state.y + RUNNER_HALF > floorY - o.reach : state.y - RUNNER_HALF < roofY + o.reach;
  }

  fill();

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
      state.stumbleAgo += dt;
      if (input.taps.length > 0) {
        state.down = state.down === 'floor' ? 'roof' : 'floor';
        state.grounded = false;
        events.push({ type: 'action', x: state.runnerX, y: state.y });
      }
      // Fall toward whichever side is down.
      if (!state.grounded) {
        state.vy += (state.down === 'floor' ? gravity : -gravity) * dt;
        state.y += state.vy * dt;
        const floorStand = floorY - RUNNER_HALF;
        const roofStand = roofY + RUNNER_HALF;
        if (state.down === 'floor' && state.y >= floorStand) {
          state.y = floorStand;
          state.vy = 0;
          state.grounded = true;
        } else if (state.down === 'roof' && state.y <= roofStand) {
          state.y = roofStand;
          state.vy = 0;
          state.grounded = true;
        }
      }

      const cruise = SPEED_START + (SPEED_END - SPEED_START) * Math.min(1, state.time / duration);
      const recover = state.stumbleAgo < STUMBLE_STOP ? 0.05 : Math.min(1, 0.05 + (0.95 * (state.stumbleAgo - STUMBLE_STOP)) / STUMBLE_RAMP);
      state.speed = cruise * recover;
      state.distance += state.speed * dt;

      for (const o of state.obstacles) {
        if (!o.hit && touching(o)) {
          o.hit = true;
          state.stumbleAgo = 0;
          events.push({ type: 'hit', x: state.runnerX, y: state.y });
        }
      }
      fill();

      state.score = Math.floor(state.distance);
      if (state.distance >= state.nextMark) {
        events.push({ type: 'score', x: state.runnerX, y: state.y - 60, points: 50 });
        state.nextMark += 50;
      }
    },
  };
}

/** Good play: flips over to the other side a little before anything on her side, when that side is clear. */
export function gravityBot(state: GravityState, _context: BotContext): BotMove {
  if (!state.grounded) return {};
  const half = RUNNER_HALF / UNITS_PER_METRE;
  const ahead = state.obstacles.filter((o) => !o.hit && o.at + o.length > state.distance - half).sort((a, b) => a.at - b.at);
  const mine = ahead.find((o) => o.side === state.down);
  if (!mine) return {};
  const metres = mine.at - (state.distance + half);
  const lead = Math.max(2.2, state.speed * 0.42);
  if (metres > lead + 1.2) return {};
  const other = state.down === 'floor' ? 'roof' : 'floor';
  const blocked = ahead.some((o) => o.side === other && o.at < state.distance + half + 1.2 && o.at + o.length > state.distance - half);
  return blocked ? {} : { tap: { x: 300, y: 300 } };
}
