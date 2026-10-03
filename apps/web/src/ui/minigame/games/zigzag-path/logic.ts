// Zigzag path: a ball rolls up a narrow stone path that zigzags through the forest, always diagonally. Each
// tap swaps its slant (up-left ↔ up-right). Turn at every corner and it stays on the path; a turn made is a
// point once the ball is well into the next stretch, and gems on the path are a point each. Missing a corner
// rolls it off the edge: it drops, and comes back at the start of that stretch, rolling the right way (no
// other penalty). It rolls a little faster as the round goes on. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export interface Corner {
  /** Distance along the climb, and across the screen. */
  d: number;
  x: number;
}

export interface Gem {
  d: number;
  x: number;
  taken: boolean;
}

export interface ZigzagState {
  /** Corners of the path; stretch i runs from corner i to corner i + 1. */
  corners: Corner[];
  /** Slant of each stretch: -1 up-left, 1 up-right. */
  dirs: number[];
  gems: Gem[];
  trees: Corner[];
  halfWidth: number;
  ball: { d: number; x: number; dir: number };
  speed: number;
  /** Seconds left of the fall off the edge (0 when rolling). */
  falling: number;
  /** The stretch the ball came back on after a fall (its corner is not a turn made). */
  respawnedOn: number;
  /** Stretches whose turn was scored. */
  turned: Set<number>;
  /** Where the ball shows on screen (it stays there; the path moves). */
  ballScreenY: number;
  /** Seconds since the last tap (a squash). */
  tappedAgo: number;
  score: number;
  time: number;
}

export const BALL_RADIUS = 20;
const FALL_SECONDS = 0.9;
const SPEED_START = 190;
const SPEED_END = 260;
const MIN_STRETCH = 100;
const MAX_STRETCH = 240;

export function createZigzagPath({ arena, duration, params, rng }: GameSetup): MinigameLogic<ZigzagState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.4, Math.max(0.7, params.speed)) : 1;
  const events = eventQueue();
  const halfWidth = 66;
  const margin = halfWidth + 30;
  const state: ZigzagState = {
    corners: [{ d: 0, x: arena.width / 2 }],
    dirs: [],
    gems: [],
    trees: [],
    halfWidth,
    ball: { d: 0, x: arena.width / 2, dir: 1 },
    speed: SPEED_START * factor,
    falling: 0,
    respawnedOn: -1,
    turned: new Set(),
    ballScreenY: arena.height * 0.74,
    tappedAgo: 9,
    score: 0,
    time: 0,
  };

  function extend(): void {
    const last = state.corners[state.corners.length - 1] ?? { d: 0, x: arena.width / 2 };
    const dir = state.dirs.length === 0 ? (rng.chance(0.5) ? 1 : -1) : -(state.dirs[state.dirs.length - 1] ?? 1);
    const room = dir > 0 ? arena.width - margin - last.x : last.x - margin;
    // A long first stretch to get going.
    const wanted = state.dirs.length === 0 ? 260 : rng.range(MIN_STRETCH, MAX_STRETCH);
    const length = Math.max(MIN_STRETCH * 0.8, Math.min(wanted, room));
    const corner = { d: last.d + length, x: last.x + dir * length };
    state.dirs.push(dir);
    state.corners.push(corner);
    if (state.dirs.length > 2 && rng.chance(0.4)) {
      const t = rng.range(0.3, 0.7);
      state.gems.push({ d: last.d + length * t, x: last.x + dir * length * t, taken: false });
    }
    for (let k = 0; k < 2; k += 1) {
      const d = last.d + rng.range(0, length);
      const side = rng.chance(0.5) ? 1 : -1;
      const x = pathX(d) + side * rng.range(halfWidth + 60, halfWidth + 200);
      if (x > 30 && x < arena.width - 30) state.trees.push({ d, x });
    }
  }

  /** The stretch at distance d along the climb. */
  function stretchAt(d: number): number {
    for (let i = 0; i < state.dirs.length; i += 1) if (d < (state.corners[i + 1]?.d ?? Infinity)) return i;
    return state.dirs.length - 1;
  }

  function pathX(d: number): number {
    const i = stretchAt(d);
    const c = state.corners[i];
    if (!c) return arena.width / 2;
    return c.x + (state.dirs[i] ?? 0) * (d - c.d);
  }

  const ahead = (): number => state.ball.d + arena.height * 1.2;
  extend();
  state.ball.dir = state.dirs[0] ?? 1;
  while ((state.corners[state.corners.length - 1]?.d ?? 0) < ahead()) extend();

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
      state.tappedAgo += dt;
      state.speed = (SPEED_START + (SPEED_END - SPEED_START) * Math.min(1, state.time / duration)) * factor;
      const { ball } = state;
      if (state.falling > 0) {
        state.falling -= dt;
        if (state.falling <= 0) {
          // Back at the start of the stretch it fell from, rolling the right way.
          const i = stretchAt(ball.d);
          const c = state.corners[i] ?? { d: 0, x: arena.width / 2 };
          ball.d = c.d + 1;
          ball.x = c.x + (state.dirs[i] ?? 1);
          ball.dir = state.dirs[i] ?? 1;
          state.respawnedOn = i;
          state.falling = 0;
        }
        return;
      }
      if (input.taps.length % 2 === 1) {
        ball.dir = -ball.dir;
        state.tappedAgo = 0;
        events.push({ type: 'action', x: ball.x, y: state.ballScreenY });
      }
      ball.d += state.speed * dt;
      ball.x += ball.dir * state.speed * dt;
      const i = stretchAt(ball.d);
      // A turn made: the ball is past the middle of a stretch it did not come back on.
      const start = state.corners[i];
      const end = state.corners[i + 1];
      if (i > 0 && start && end && !state.turned.has(i) && state.respawnedOn !== i && ball.d > (start.d + end.d) / 2) {
        state.turned.add(i);
        state.score += 1;
        events.push({ type: 'score', x: ball.x, y: state.ballScreenY - 30, note: 72 + (state.turned.size % 8), voice: 'bell' });
      }
      for (const gem of state.gems) {
        if (gem.taken || Math.abs(gem.d - ball.d) > 26 || Math.abs(gem.x - ball.x) > 40) continue;
        gem.taken = true;
        state.score += 1;
        events.push({ type: 'score', x: gem.x, y: state.ballScreenY - 40 });
      }
      if (Math.abs(ball.x - pathX(ball.d)) > state.halfWidth) {
        state.falling = FALL_SECONDS;
        events.push({ type: 'miss', x: ball.x, y: state.ballScreenY });
      }
      while ((state.corners[state.corners.length - 1]?.d ?? 0) < ahead()) extend();
      // Forget what is far behind.
      while (state.corners.length > 4 && (state.corners[2]?.d ?? 0) < ball.d - arena.height) {
        state.corners.shift();
        state.dirs.shift();
        state.respawnedOn -= 1;
        state.turned = new Set([...state.turned].map((t) => t - 1).filter((t) => t >= 0));
      }
      state.gems = state.gems.filter((g) => g.d > ball.d - arena.height);
      state.trees = state.trees.filter((t) => t.d > ball.d - arena.height);
    },
  };
}

/** Good play: turns on the decision closest to each corner. */
export function zigzagBot(state: ZigzagState, _context: BotContext): BotMove {
  if (state.falling > 0) return {};
  const { ball } = state;
  let i = 0;
  while (i < state.dirs.length - 1 && ball.d >= (state.corners[i + 1]?.d ?? Infinity)) i += 1;
  const dir = state.dirs[i] ?? ball.dir;
  if (dir !== ball.dir) return { tap: { x: ball.x, y: state.ballScreenY } };
  const next = state.corners[i + 1];
  const nextDir = state.dirs[i + 1];
  if (next && nextDir !== undefined && nextDir !== ball.dir && (next.d - ball.d) / state.speed <= 0.05) return { tap: { x: ball.x, y: state.ballScreenY } };
  return {};
}
