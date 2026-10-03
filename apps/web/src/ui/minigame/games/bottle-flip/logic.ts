// Bottle flip: a water bottle on the floor and a table, a step or a chair to land it on. The child swipes up:
// the longer the swipe, the higher the throw. The bottle always turns at the same speed, so only a throw of the
// right height has it come round exactly once to land standing up (a point); too short or too long and it
// topples over ("Nhẹ quá!" / "Mạnh quá!" says which). The landing spot changes height each time, so the swipe
// must change too. Fifteen bottles. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type FlipPhase = 'ready' | 'fly' | 'landed';
export type Perch = 'table' | 'step' | 'chair';

export interface BottleFlipState {
  phase: FlipPhase;
  phaseAgo: number;
  start: Point;
  /** Where it should land (top surface middle) and what it is. */
  target: Point;
  perch: Perch;
  pos: Point;
  vel: Point;
  angle: number;
  /** How the last throw ended: standing, or toppled from too little / too much spin. */
  result: 'stand' | 'short' | 'long' | null;
  bottles: number;
  score: number;
  time: number;
}

export const BOTTLES = 15;
const GRAVITY = 1600;
/** Seconds of flight that turn the bottle exactly once. */
export const FLIP_SECONDS = 0.9;
const SPIN = (Math.PI * 2) / FLIP_SECONDS;
/** Throw speed per unit of swipe. */
export const SWIPE_GAIN = 3;
/** Lands standing within this much turn (radians) of upright. */
export const STAND = 0.85;
const LANDED_SECONDS = 1.1;
const PERCHES: readonly { perch: Perch; height: number }[] = [
  { perch: 'step', height: 40 },
  { perch: 'chair', height: 110 },
  { perch: 'table', height: 170 },
];

/** Flight time for an upward speed `vy` landing `rise` units higher. */
export function flightTime(vy: number, rise: number): number {
  const disc = vy * vy - 2 * GRAVITY * rise;
  return disc <= 0 ? 0 : (vy + Math.sqrt(disc)) / GRAVITY;
}

/** The swipe length that turns the bottle exactly once onto this target. */
export function idealSwipe(state: BottleFlipState): number {
  const rise = state.start.y - state.target.y;
  return (rise / FLIP_SECONDS + (GRAVITY * FLIP_SECONDS) / 2) / SWIPE_GAIN;
}

export function createBottleFlip({ arena, rng }: GameSetup): MinigameLogic<BottleFlipState> {
  const events = eventQueue();
  const floorY = arena.height - Math.max(80, arena.height * 0.12);
  const start = { x: arena.width * 0.22, y: floorY };
  const state: BottleFlipState = {
    phase: 'ready',
    phaseAgo: 0,
    start,
    target: { x: 0, y: 0 },
    perch: 'table',
    pos: { ...start },
    vel: { x: 0, y: 0 },
    angle: 0,
    result: null,
    bottles: 0,
    score: 0,
    time: 0,
  };
  const next = (r: Rng): void => {
    const p = PERCHES[r.int(0, PERCHES.length - 1)] ?? { perch: 'table', height: 170 };
    state.perch = p.perch;
    state.target = { x: arena.width * r.range(0.62, 0.78), y: floorY - p.height };
    state.pos = { ...start };
    state.angle = 0;
    state.phase = 'ready';
    state.phaseAgo = 0;
  };
  next(rng);

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.bottles >= BOTTLES && state.phase === 'ready';
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.phaseAgo += dt;
      if (state.phase === 'ready') {
        const swipe = input.swipes.find((s) => s.dy < 0 && s.from.y > HUD_SAFE_TOP);
        if (!swipe || state.bottles >= BOTTLES) return;
        const vy = Math.min(450, -swipe.dy) * SWIPE_GAIN;
        const rise = start.y - state.target.y;
        let t = flightTime(vy, rise);
        // Too weak to reach the top: it falls back to the floor short of it.
        const reaches = t > 0;
        if (!reaches) t = (2 * vy) / GRAVITY;
        state.vel = { x: (reaches ? state.target.x - start.x : (state.target.x - start.x) * 0.5) / Math.max(0.2, t), y: -vy };
        state.phase = 'fly';
        state.phaseAgo = 0;
        state.bottles += 1;
        events.push({ type: 'action', x: start.x, y: start.y });
        return;
      }
      if (state.phase === 'fly') {
        state.vel.y += GRAVITY * dt;
        state.pos.x += state.vel.x * dt;
        state.pos.y += state.vel.y * dt;
        state.angle += SPIN * dt;
        const landY = Math.abs(state.pos.x - state.target.x) < 60 ? state.target.y : start.y;
        if (state.vel.y > 0 && state.pos.y >= landY) {
          state.pos.y = landY;
          const off = state.angle - Math.PI * 2;
          const onTop = landY === state.target.y;
          const stands = onTop && Math.abs(off) <= STAND;
          state.result = stands ? 'stand' : off < 0 ? 'short' : 'long';
          state.angle = stands ? 0 : off < 0 ? -Math.PI / 2 : Math.PI / 2;
          state.phase = 'landed';
          state.phaseAgo = 0;
          if (stands) {
            state.score += 1;
            events.push({ type: 'score', x: state.pos.x, y: landY - 60 });
          } else events.push({ type: 'miss', x: state.pos.x, y: landY });
        }
        return;
      }
      if (state.phaseAgo >= LANDED_SECONDS) next(rng);
    },
  };
}

/** Good play: the swipe that turns the bottle once onto the target. */
export function bottleFlipBot(state: BottleFlipState, _context: BotContext): BotMove {
  if (state.phase !== 'ready' || state.phaseAgo < 0.5) return {};
  return { swipe: { from: { x: state.start.x, y: state.start.y - 20 }, dx: 0, dy: -idealSwipe(state) } };
}
