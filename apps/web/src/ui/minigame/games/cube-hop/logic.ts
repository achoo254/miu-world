// Cube hop: a pyramid of cube tops, six rows high. The child hops from cube to cube by tapping one of the four
// cubes next to hers (up-left, up-right, down-left, down-right); each cube she lands on for the first time
// changes colour: a point. Balls drop onto the top and bounce down the pyramid one cube at a time; landing on
// a ball's cube, or a ball landing on hers, or hopping off the edge, costs a heart and puts her back on top.
// A finished pyramid brings the next one in a new colour. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const ROWS = 6;
export const CUBES = (ROWS * (ROWS + 1)) / 2;

export interface Cell {
  row: number;
  col: number;
}

export interface Ball {
  at: Cell;
  next: Cell;
  /** Seconds into the current bounce. */
  t: number;
}

export interface CubeState {
  /** Centre of the top cube and the cube size. */
  topX: number;
  topY: number;
  size: number;
  at: Cell;
  from: Cell;
  hopAgo: number;
  /** Cube tops already coloured on this pyramid. */
  painted: Set<string>;
  balls: Ball[];
  nextBall: number;
  lives: number;
  /** Seconds since a fall or hit (she blinks back on the top). */
  hurtAgo: number;
  /** Fell off this way (for the picture). */
  fellTo: Point | null;
  doneAgo: number;
  pyramids: number;
  score: number;
  time: number;
}

const HOP_SECONDS = 0.24;
const BOUNCE_SECONDS = 0.62;
const LIVES = 3;
const HURT_SECONDS = 1.1;
const DONE_SECONDS = 1.2;

export const key = (c: Cell): string => `${c.row}:${c.col}`;
export const onPyramid = (c: Cell): boolean => c.row >= 0 && c.row < ROWS && c.col >= 0 && c.col <= c.row;
/** The four cubes next to a cube (some may be off the pyramid). */
export const neighbours = (c: Cell): Cell[] => [
  { row: c.row - 1, col: c.col - 1 },
  { row: c.row - 1, col: c.col },
  { row: c.row + 1, col: c.col },
  { row: c.row + 1, col: c.col + 1 },
];

export function cubeCentre(state: Pick<CubeState, 'topX' | 'topY' | 'size'>, c: Cell): Point {
  return { x: state.topX + (c.col - c.row / 2) * state.size, y: state.topY + c.row * state.size * 0.78 };
}

const same = (a: Cell, b: Cell): boolean => a.row === b.row && a.col === b.col;

function nextDown(rng: Rng, c: Cell): Cell {
  return { row: c.row + 1, col: c.col + (rng.chance(0.5) ? 1 : 0) };
}

export function createCubeHop({ arena, rng }: GameSetup): MinigameLogic<CubeState> {
  const events = eventQueue();
  const size = Math.min(96, (arena.width - 40) / ROWS, (arena.height - HUD_SAFE_TOP - 90) / (ROWS * 0.78 + 0.6));
  const height = ROWS * 0.78 * size;
  const state: CubeState = {
    topX: arena.width / 2,
    topY: HUD_SAFE_TOP + 40 + (arena.height - HUD_SAFE_TOP - 70 - height) / 2,
    size,
    at: { row: 0, col: 0 },
    from: { row: 0, col: 0 },
    hopAgo: 9,
    painted: new Set(['0:0']),
    balls: [],
    nextBall: 3,
    lives: LIVES,
    hurtAgo: 9,
    fellTo: null,
    doneAgo: -1,
    pyramids: 0,
    score: 0,
    time: 0,
  };

  function hurt(): void {
    state.lives -= 1;
    state.hurtAgo = 0;
    const c = cubeCentre(state, state.at);
    events.push({ type: 'hit', ...c });
    state.at = { row: 0, col: 0 };
    state.from = state.at;
    state.balls = state.balls.filter((b) => b.at.row > 1);
  }

  function hop(to: Cell): void {
    state.from = state.at;
    state.hopAgo = 0;
    if (!onPyramid(to)) {
      state.fellTo = cubeCentre(state, to);
      hurt();
      return;
    }
    state.fellTo = null;
    state.at = to;
    const c = cubeCentre(state, to);
    if (state.balls.some((b) => same(b.at, to))) {
      hurt();
      return;
    }
    if (!state.painted.has(key(to))) {
      state.painted.add(key(to));
      state.score += 1;
      events.push({ type: 'score', x: c.x, y: c.y - 30 });
      if (state.painted.size === CUBES) state.doneAgo = 0;
    } else {
      events.push({ type: 'action', ...c });
    }
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.lives <= 0;
    },
    get lives() {
      return state.lives;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.hopAgo += dt;
      state.hurtAgo += dt;
      if (state.doneAgo >= 0) {
        state.doneAgo += dt;
        if (state.doneAgo > DONE_SECONDS) {
          state.pyramids += 1;
          state.painted = new Set([key(state.at)]);
          state.balls = [];
          state.doneAgo = -1;
        }
        return;
      }
      // Balls: one bounce every so often, more as pyramids go by.
      state.nextBall -= dt;
      if (state.nextBall <= 0 && state.hurtAgo > HURT_SECONDS) {
        state.balls.push({ at: { row: 0, col: 0 }, next: nextDown(rng, { row: 0, col: 0 }), t: -0.4 });
        state.nextBall = Math.max(1.6, 3.4 - state.pyramids * 0.5 - state.time * 0.01);
      }
      for (const b of state.balls) {
        b.t += dt;
        if (b.t >= BOUNCE_SECONDS) {
          b.t -= BOUNCE_SECONDS;
          b.at = b.next;
          b.next = nextDown(rng, b.at);
          if (same(b.at, state.at) && state.hurtAgo > HURT_SECONDS && state.hopAgo >= HOP_SECONDS) hurt();
        }
      }
      state.balls = state.balls.filter((b) => b.at.row < ROWS);
      if (state.hopAgo < HOP_SECONDS || state.hurtAgo < 0.3) return;
      for (const tap of input.taps) {
        const options = neighbours(state.at);
        let best: Cell | null = null;
        let bestD = state.size * 0.75;
        for (const c of options) {
          const p = cubeCentre(state, c);
          const d = Math.hypot(p.x - tap.x, p.y - tap.y);
          if (d < bestD) {
            bestD = d;
            best = c;
          }
        }
        if (best) {
          hop(best);
          break;
        }
      }
    },
  };
}

/** Hops from a cube to the nearest uncoloured cube (breadth-first). */
function hopsToPaint(state: CubeState, start: Cell): number {
  const seen = new Set([key(start)]);
  let frontier = [start];
  for (let d = 0; d < 12; d += 1) {
    if (frontier.some((c) => !state.painted.has(key(c)))) return d;
    const next: Cell[] = [];
    for (const c of frontier) {
      for (const n of neighbours(c)) {
        if (onPyramid(n) && !seen.has(key(n))) {
          seen.add(key(n));
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  return 99;
}

/** Good play: hops toward the nearest uncoloured cube, never onto a cube a ball is on or about to land on. */
export function cubeBot(state: CubeState, _context: BotContext): BotMove {
  if (state.doneAgo >= 0 || state.hopAgo < 0.35 || state.hurtAgo < 0.4) return {};
  const danger = new Set(state.balls.flatMap((b) => [key(b.at), key(b.next)]));
  const best = neighbours(state.at)
    .filter((c) => onPyramid(c) && !danger.has(key(c)))
    .map((c) => ({ c, d: hopsToPaint(state, c) }))
    .sort((a, b) => a.d - b.d)[0];
  return best ? { tap: cubeCentre(state, best.c) } : {};
}
