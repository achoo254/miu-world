// Current drift: a message bottle waits at one end of a winding stream; an island lies at the other end, off to
// one side (one well-placed rock is always enough). The child taps the water to drop up to three rocks (tap a rock to lift it again); water swirls away
// from a rock, so a bottle drifting past one is pushed aside. A tap on the bottle lets it go. Reaching the
// island is a point and a new stream; a bottle that drifts off the edge comes back to try again (the rocks stay
// where they are, to be moved). Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface DriftState {
  area: { x: number; y: number; w: number; h: number };
  /** The stream runs along x (wide screens) or along y (tall ones). */
  alongX: boolean;
  start: Point;
  island: Point & { r: number };
  rocks: Point[];
  bottle: Point;
  drifting: boolean;
  /** Seconds the bottle has drifted. */
  driftTime: number;
  meander: number;
  phase: 'set' | 'drift' | 'arrived' | 'lost';
  phaseTime: number;
  boards: number;
  lastTapAt: number;
  score: number;
  time: number;
}

export const MAX_ROCKS = 3;
export const ROCK_R = 34;
const SWIRL_R = 160;
const SWIRL = 330;
const FLOW = 170;
const BOTTLE_HIT = 52;
const MAX_DRIFT = 10;
const PAUSE = 1.3;

/** Water speed at p with these rocks. */
export function flowAt(state: Pick<DriftState, 'alongX' | 'meander' | 'start'>, rocks: readonly Point[], p: Point): Point {
  const along = state.alongX ? p.x : p.y;
  const cross = Math.sin(along / 140 + state.meander) * 45;
  let vx = state.alongX ? FLOW : cross;
  let vy = state.alongX ? cross : FLOW;
  for (const r of rocks) {
    const dx = p.x - r.x;
    const dy = p.y - r.y;
    const d = Math.hypot(dx, dy);
    if (d >= SWIRL_R || d === 0) continue;
    const push = SWIRL * (1 - d / SWIRL_R);
    vx += (dx / d) * push;
    vy += (dy / d) * push;
  }
  return { x: vx, y: vy };
}

/** Moves a bottle one step; false once it left the stream. */
export function driftStep(state: DriftState, rocks: readonly Point[], b: Point, dt: number): boolean {
  const v = flowAt(state, rocks, b);
  b.x += v.x * dt;
  b.y += v.y * dt;
  for (const r of rocks) {
    const d = Math.hypot(b.x - r.x, b.y - r.y);
    if (d < ROCK_R + 14 && d > 0) {
      b.x = r.x + ((b.x - r.x) / d) * (ROCK_R + 14);
      b.y = r.y + ((b.y - r.y) / d) * (ROCK_R + 14);
    }
  }
  const { area } = state;
  return b.x > area.x - 30 && b.x < area.x + area.w + 30 && b.y > area.y - 30 && b.y < area.y + area.h + 30;
}

/** Whether a bottle let go now, with these rocks, would reach the island. */
export function reaches(state: DriftState, rocks: readonly Point[]): boolean {
  const b = { ...state.start };
  for (let t = 0; t < MAX_DRIFT; t += 1 / 60) {
    if (Math.hypot(b.x - state.island.x, b.y - state.island.y) <= state.island.r) return true;
    if (!driftStep(state, rocks, b, 1 / 60)) return false;
  }
  return false;
}

export function createCurrentDrift({ arena, rng }: GameSetup): MinigameLogic<DriftState> {
  const events = eventQueue();
  const area = { x: 20, y: HUD_SAFE_TOP + 10, w: arena.width - 40, h: arena.height - HUD_SAFE_TOP - 30 };
  const alongX = area.w >= area.h;
  const state: DriftState = {
    area,
    alongX,
    start: { x: 0, y: 0 },
    island: { x: 0, y: 0, r: 70 },
    rocks: [],
    bottle: { x: 0, y: 0 },
    drifting: false,
    driftTime: 0,
    meander: 0,
    phase: 'set',
    phaseTime: 0,
    boards: 0,
    lastTapAt: -1,
    score: 0,
    time: 0,
  };

  function newStream(r: Rng): void {
    const crossSize = alongX ? area.h : area.w;
    for (let tries = 0; tries < 30; tries += 1) {
      const a = r.range(0.2, 0.8) * crossSize;
      let b = r.range(0.15, 0.85) * crossSize;
      if (Math.abs(a - b) < 130) b = a + (a < crossSize / 2 ? 1 : -1) * r.range(130, Math.max(140, crossSize * 0.35));
      b = Math.min(crossSize - 80, Math.max(80, b));
      state.start = alongX ? { x: area.x + 40, y: area.y + a } : { x: area.x + a, y: area.y + 40 };
      state.island = alongX ? { x: area.x + area.w - 90, y: area.y + b, r: 70 } : { x: area.x + b, y: area.y + area.h - 90, r: 70 };
      state.meander = r.range(0, Math.PI * 2);
      // Never a stream that carries the bottle home with no rocks at all, and always one a single rock can solve.
      state.rocks = [];
      if (!reaches(state, []) && rockToAdd(state)) break;
    }
    reset();
  }

  function reset(): void {
    state.bottle = { ...state.start };
    state.drifting = false;
    state.driftTime = 0;
    state.phase = 'set';
    state.phaseTime = 0;
  }

  newStream(rng);

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
      state.phaseTime += dt;
      if (state.phase === 'arrived' || state.phase === 'lost') {
        if (state.phaseTime >= PAUSE) {
          if (state.phase === 'arrived') {
            state.boards += 1;
            newStream(rng);
          } else reset();
        }
        return;
      }
      if (state.phase === 'drift') {
        state.driftTime += dt;
        const inside = driftStep(state, state.rocks, state.bottle, dt);
        if (Math.hypot(state.bottle.x - state.island.x, state.bottle.y - state.island.y) <= state.island.r) {
          state.phase = 'arrived';
          state.phaseTime = 0;
          state.score += 1;
          events.push({ type: 'score', ...state.island });
        } else if (!inside || state.driftTime > MAX_DRIFT) {
          state.phase = 'lost';
          state.phaseTime = 0;
          events.push({ type: 'miss', ...state.bottle });
        }
        return;
      }
      for (const tap of input.taps) {
        state.lastTapAt = state.time;
        if (Math.hypot(tap.x - state.bottle.x, tap.y - state.bottle.y) <= BOTTLE_HIT) {
          state.phase = 'drift';
          state.phaseTime = 0;
          events.push({ type: 'action', ...state.bottle });
          break;
        }
        const rock = state.rocks.findIndex((r) => Math.hypot(r.x - tap.x, r.y - tap.y) <= ROCK_R + 14);
        if (rock >= 0) {
          state.rocks.splice(rock, 1);
          events.push({ type: 'action', ...tap });
          continue;
        }
        if (state.rocks.length >= MAX_ROCKS) state.rocks.shift();
        state.rocks.push({ x: Math.min(area.x + area.w, Math.max(area.x, tap.x)), y: Math.min(area.y + area.h, Math.max(area.y, tap.y)) });
        events.push({ type: 'action', ...tap, note: 55, voice: 'drum' });
      }
    },
  };
}

/** A rock to add so the bottle reaches the island (searched on a coarse grid), or null. */
export function rockToAdd(state: DriftState): Point | null {
  const { area } = state;
  for (let y = area.y + 30; y < area.y + area.h; y += 45) {
    for (let x = area.x + 30; x < area.x + area.w; x += 45) {
      const p = { x, y };
      if (Math.hypot(p.x - state.start.x, p.y - state.start.y) < 90 || Math.hypot(p.x - state.island.x, p.y - state.island.y) < 90) continue;
      if (reaches(state, [...state.rocks, p])) return p;
    }
  }
  return null;
}

/** Good play: lets go if the rocks already do it, else adds the rock that does (or clears and starts again). */
export function driftBot(state: DriftState, _context: BotContext): BotMove {
  if (state.phase !== 'set' || state.time - state.lastTapAt < 0.4) return {};
  if (reaches(state, state.rocks)) return { tap: state.bottle };
  if (state.rocks.length < MAX_ROCKS) {
    const p = rockToAdd(state);
    if (p) return { tap: p };
  }
  const first = state.rocks[0];
  return first ? { tap: first } : {};
}
