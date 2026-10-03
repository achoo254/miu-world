// Ice fishing: a frozen lake with five round holes. Fish swim under the ice (their shadows show), often
// passing a hole. The child taps a hole to drop the penguin's line there; when a fish swims within reach of
// the hook while it hangs (after it has sunk a moment) it bites and comes up (a point). A line that waits too
// long comes up empty, no penalty. Only one line: tapping another hole moves it. So the trick is to read where
// a shadow is heading and drop the line just before it gets there. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Fish {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  /** Where it is swimming to (often a hole). */
  to: Point;
}

export interface Line {
  hole: number;
  /** Seconds since it went down. */
  ago: number;
}

export interface IceFishingState {
  holes: Point[];
  holeRadius: number;
  area: { x: number; y: number; w: number; h: number };
  fish: Fish[];
  line: Line | null;
  /** A fish being pulled up: at which hole, how long ago. */
  catching: { hole: number; ago: number } | null;
  /** Lines that came up empty (a small splash), for the picture. */
  empty: { hole: number; ago: number } | null;
  /** Where the bucket of caught fish stands. */
  bucket: Point;
  score: number;
  time: number;
}

/** The hook catches a fish this close to the hole's middle, once it has sunk for SINK_SECONDS. */
export const BITE_REACH = 36;
export const SINK_SECONDS = 0.3;
export const LINE_SECONDS = 2.6;
const CATCH_SECONDS = 0.8;
const FISH_COUNT = 4;
const HOLE_TARGET_SHARE = 0.65;

const LANDSCAPE_HOLES: readonly [number, number][] = [
  [0.15, 0.3],
  [0.5, 0.22],
  [0.85, 0.3],
  [0.32, 0.78],
  [0.68, 0.78],
];
const PORTRAIT_HOLES: readonly [number, number][] = [
  [0.22, 0.2],
  [0.78, 0.2],
  [0.5, 0.48],
  [0.22, 0.78],
  [0.78, 0.78],
];

export function createIceFishing({ arena, rng }: GameSetup): MinigameLogic<IceFishingState> {
  const events = eventQueue();
  const landscape = arena.width > arena.height * 1.15;
  const area = { x: 40, y: HUD_SAFE_TOP + 30, w: arena.width - 80, h: arena.height - HUD_SAFE_TOP - 70 };
  const holes = (landscape ? LANDSCAPE_HOLES : PORTRAIT_HOLES).map(([fx, fy]) => ({ x: area.x + fx * area.w, y: area.y + fy * area.h }));
  const state: IceFishingState = {
    holes,
    holeRadius: 56,
    area,
    fish: [],
    line: null,
    catching: null,
    empty: null,
    bucket: { x: arena.width - 70, y: arena.height - 60 },
    score: 0,
    time: 0,
  };
  let nextId = 0;

  const waypoint = (r: Rng): Point => {
    if (r.chance(HOLE_TARGET_SHARE)) {
      const h = holes[r.int(0, holes.length - 1)] ?? { x: 0, y: 0 };
      return { x: h.x + r.range(-12, 12), y: h.y + r.range(-12, 12) };
    }
    return { x: area.x + r.range(0, area.w), y: area.y + r.range(0, area.h) };
  };

  function addFish(): void {
    const edge = rng.int(0, 3);
    const x = edge === 0 ? area.x : edge === 1 ? area.x + area.w : area.x + rng.range(0, area.w);
    const y = edge === 2 ? area.y : edge === 3 ? area.y + area.h : area.y + rng.range(0, area.h);
    const speed = rng.range(70, 110);
    state.fish.push({ id: (nextId += 1), x, y, vx: 0, vy: 0, speed, to: waypoint(rng) });
  }
  for (let i = 0; i < FISH_COUNT; i += 1) addFish();

  const holeAt = (p: Point): number => holes.findIndex((h) => Math.hypot(p.x - h.x, p.y - h.y) <= state.holeRadius + 26);

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
      for (const f of state.fish) {
        const dx = f.to.x - f.x;
        const dy = f.to.y - f.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 10) f.to = waypoint(rng);
        // Steer smoothly toward the waypoint.
        const tx = (dx / Math.max(1, dist)) * f.speed;
        const ty = (dy / Math.max(1, dist)) * f.speed;
        const turn = Math.min(1, dt * 2.5);
        f.vx += (tx - f.vx) * turn;
        f.vy += (ty - f.vy) * turn;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
      }
      if (state.empty) {
        state.empty.ago += dt;
        if (state.empty.ago > 0.6) state.empty = null;
      }
      if (state.catching) {
        state.catching.ago += dt;
        if (state.catching.ago >= CATCH_SECONDS) {
          state.catching = null;
          addFish();
        }
        return;
      }
      for (const p of input.taps) {
        const hole = holeAt(p);
        if (hole < 0) continue;
        state.line = { hole, ago: 0 };
        const h = holes[hole];
        if (h) events.push({ type: 'action', ...h });
      }
      const line = state.line;
      if (!line) return;
      line.ago += dt;
      const h = holes[line.hole];
      if (!h) return;
      if (line.ago >= SINK_SECONDS) {
        const fish = state.fish.find((f) => Math.hypot(f.x - h.x, f.y - h.y) <= BITE_REACH);
        if (fish) {
          state.fish = state.fish.filter((f) => f !== fish);
          state.catching = { hole: line.hole, ago: 0 };
          state.line = null;
          state.score += 1;
          events.push({ type: 'score', x: h.x, y: h.y - 40, note: 74 + (state.score % 5) * 2, voice: 'bell' });
          return;
        }
      }
      if (line.ago >= LINE_SECONDS) {
        state.empty = { hole: line.hole, ago: 0 };
        state.line = null;
      }
    },
  };
}

/** Seconds until a fish (keeping its course) comes within reach of a hole, or Infinity within the horizon. */
function arrival(f: Fish, h: Point, horizon: number): number {
  for (let t = 0; t <= horizon; t += 0.1) {
    if (Math.hypot(f.x + f.vx * t - h.x, f.y + f.vy * t - h.y) <= BITE_REACH - 6) return t;
  }
  return Infinity;
}

/** Good play: drops the line at the hole a shadow will reach soonest, a little before it gets there. */
export function iceFishingBot(state: IceFishingState, _context: BotContext): BotMove {
  if (state.catching) return {};
  let best = { hole: -1, t: Infinity };
  state.holes.forEach((h, hole) => {
    for (const f of state.fish) {
      const t = arrival(f, h, 2);
      if (t < best.t) best = { hole, t };
    }
  });
  if (best.hole < 0) return {};
  const line = state.line;
  // Keep a line where a fish is coming anyway.
  if (line && line.hole === best.hole) return {};
  if (best.t > 1.2) return {};
  const h = state.holes[best.hole];
  return h ? { tap: { x: h.x, y: h.y } } : {};
}
