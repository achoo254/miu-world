// Sled slalom: seen from above, the child's sled rides down a snowy slope (the slope scrolls up past her).
// She drags left and right to steer through gates, a pair of flags: through the middle is a point. Gates
// take turns left and right of the slope's middle, so riding straight down scores little. Pine trees stand
// between the gates; bumping one stops the sled for a second (no hearts). Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export interface Gate {
  x: number;
  /** Screen y (moves up as she rides down). */
  y: number;
  half: number;
  /** Passed through (true), missed (false), or not reached yet (null). */
  passed: boolean | null;
}

export interface Tree {
  x: number;
  y: number;
  /** Already bumped into (it does not stop her twice). */
  bumped: boolean;
}

export interface SledState {
  sledX: number;
  sledY: number;
  /** Sideways speed, for the lean. */
  vx: number;
  speed: number;
  /** Seconds left stopped after a bump. */
  stopped: number;
  distance: number;
  gates: Gate[];
  trees: Tree[];
  score: number;
  time: number;
}

const BASE_SPEED = 330;
const RAMP = 0.4;
const STEER = 620;
const STOP_SECONDS = 1;
export const TREE_REACH = 46;
const GATE_GAP = 430;
const MIDDLE_CLEAR = 20;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function createSledSlalom({ arena, duration, params, rng }: GameSetup): MinigameLogic<SledState> {
  const factor = typeof params.speed === 'number' ? clamp(params.speed, 0.6, 1.5) : 1;
  const events = eventQueue();
  const margin = 50;
  const centre = arena.width / 2;
  const state: SledState = {
    sledX: centre,
    sledY: HUD_SAFE_TOP + 110,
    vx: 0,
    speed: BASE_SPEED * factor,
    stopped: 0,
    distance: 0,
    gates: [],
    trees: [],
    score: 0,
    time: 0,
  };
  let side = rng.chance(0.5) ? 1 : -1;
  let nextY = state.sledY + 420;
  let lastGate: { x: number; y: number } = { x: centre, y: state.sledY };

  function layGate(r: Rng): void {
    const progress = Math.min(1, state.time / duration);
    // Narrower on a narrow screen, so a gate always fits beside the middle.
    const half = Math.min(110 - 25 * progress, (centre - margin - MIDDLE_CLEAR - 40) / 2);
    side = -side;
    // Left or right of the middle, never over it: riding straight down scores nothing.
    const lo = side < 0 ? margin + half : centre + half + MIDDLE_CLEAR;
    const hi = side < 0 ? centre - half - MIDDLE_CLEAR : arena.width - margin - half;
    const x = r.range(Math.min(lo, hi), Math.max(lo, hi));
    const gate = { x, y: nextY, half, passed: null };
    state.gates.push(gate);
    // Trees off the line between this gate and the last.
    for (let k = 0; k < 3; k += 1) {
      const ty = lastGate.y + ((nextY - lastGate.y) * (k + 1)) / 4;
      const along = lastGate.x + ((x - lastGate.x) * (k + 1)) / 4;
      const tx = r.range(margin, arena.width - margin);
      if (Math.abs(tx - along) > 120) state.trees.push({ x: tx, y: ty, bumped: false });
    }
    lastGate = { x, y: nextY };
    nextY += GATE_GAP * r.range(0.9, 1.1);
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
      const progress = Math.min(1, state.time / duration);
      state.speed = BASE_SPEED * factor * (1 + RAMP * progress);
      state.stopped = Math.max(0, state.stopped - dt);

      const aim = input.pointer?.x ?? input.taps.at(-1)?.x;
      const before = state.sledX;
      if (aim !== undefined && state.stopped <= 0) {
        const want = clamp(aim, margin, arena.width - margin) - state.sledX;
        state.sledX += clamp(want, -STEER * dt, STEER * dt);
      }
      state.vx = (state.sledX - before) / dt;

      const move = state.stopped > 0 ? 0 : state.speed * dt;
      state.distance += move;
      nextY -= move;
      lastGate.y -= move;
      for (const g of state.gates) g.y -= move;
      for (const t of state.trees) t.y -= move;
      while (nextY < arena.height + 200) layGate(rng);

      for (const g of state.gates) {
        if (g.passed !== null || g.y > state.sledY) continue;
        g.passed = Math.abs(state.sledX - g.x) < g.half;
        if (g.passed) {
          state.score += 1;
          events.push({ type: 'score', x: g.x, y: g.y });
        } else events.push({ type: 'miss', x: g.x, y: g.y });
      }
      if (state.stopped <= 0) {
        for (const t of state.trees) {
          if (!t.bumped && Math.abs(t.x - state.sledX) < TREE_REACH && Math.abs(t.y - 20 - state.sledY) < TREE_REACH) {
            // Snow shaken off it; she slides on past it after the stop.
            t.bumped = true;
            state.stopped = STOP_SECONDS;
            events.push({ type: 'hit', x: state.sledX, y: state.sledY });
            break;
          }
        }
      }
      state.gates = state.gates.filter((g) => g.y > -100);
      state.trees = state.trees.filter((t) => t.y > -100);
    },
  };
}

/** Good play: steer for the middle of the next gate, round any tree in the way. */
export function sledBot(state: SledState, _context: BotContext): BotMove {
  const next = state.gates.find((g) => g.passed === null && g.y > state.sledY - 5);
  let x = next?.x ?? state.sledX;
  const tree = state.trees.find((t) => t.y > state.sledY && t.y - state.sledY < 170 && Math.abs(t.x - x) < TREE_REACH + 40);
  if (tree) x = tree.x + (x < tree.x ? -1 : 1) * (TREE_REACH + 70);
  return { touch: { x, y: state.sledY + 200 } };
}
