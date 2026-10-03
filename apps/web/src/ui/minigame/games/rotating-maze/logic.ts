// Rotating maze: a square maze board with a ball inside. The child drags round the board to turn the whole
// maze; the ball always rolls "down" the screen, square by square, as far as the walls let it. Turn the maze
// so the ball rolls through the corridors and out of the gap in the outer wall (a point), and a new, bigger
// maze comes. Let go and the board settles to the nearest quarter turn. The ball can never get stuck: there
// is always a way to turn. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** Directions in the maze: east, south, west, north (column, row steps). */
export const DIRS = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
] as const;

export interface Maze {
  n: number;
  /** walls[cell][dir]: a wall on that side. */
  walls: boolean[][];
  start: number;
  /** The border cell with the gap, and which side the gap is on. */
  exit: number;
  exitDir: number;
}

export interface MazeState {
  maze: Maze;
  centre: Point;
  /** Board side (units) and one square's size. */
  side: number;
  cell: number;
  /** Turn of the board (radians). */
  angle: number;
  /** The ball: its square, the way it is rolling (-1 when still) and how far into the next square. */
  ball: { cell: number; dir: number; t: number };
  /** While a finger turns the board: the finger's angle minus the board's when it took hold. */
  grip: number | null;
  /** Seconds since the ball rolled out (a cheer before the next maze), -1 while in. */
  outAgo: number;
  mazes: number;
  score: number;
  time: number;
}

const ROLL_SPEED = 4;
/** The ball rolls a way once gravity points along it at least this much (cos of about 50°). */
const ROLL_THRESHOLD = 0.62;
const SIZES = [5, 5, 6, 6, 7] as const;

/** A perfect maze (one way between any two squares), carved by a random walk with backtracking. */
export function makeMaze(rng: Rng, n: number): Maze {
  const walls = Array.from({ length: n * n }, () => [true, true, true, true]);
  const seen = new Set<number>();
  const start = Math.floor(n / 2) * n + Math.floor(n / 2);
  const stack = [start];
  seen.add(start);
  while (stack.length > 0) {
    const cell = stack[stack.length - 1] ?? start;
    const c = cell % n;
    const r = Math.floor(cell / n);
    const options = DIRS.map(([dc, dr], d) => ({ d, next: (r + dr) * n + (c + dc), ok: c + dc >= 0 && c + dc < n && r + dr >= 0 && r + dr < n })).filter((o) => o.ok && !seen.has(o.next));
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const pick = options[rng.int(0, options.length - 1)];
    if (!pick) continue;
    const here = walls[cell];
    const there = walls[pick.next];
    if (here) here[pick.d] = false;
    if (there) there[(pick.d + 2) % 4] = false;
    seen.add(pick.next);
    stack.push(pick.next);
  }
  // The exit: the border square farthest from the start, opened outward.
  const dist = distances(walls, n, start);
  let exit = 0;
  let exitDir = 3;
  let best = -1;
  for (let cell = 0; cell < n * n; cell += 1) {
    const c = cell % n;
    const r = Math.floor(cell / n);
    const outward = c === n - 1 ? 0 : r === n - 1 ? 1 : c === 0 ? 2 : r === 0 ? 3 : -1;
    const d = dist[cell] ?? 0;
    if (outward >= 0 && d > best) {
      best = d;
      exit = cell;
      exitDir = outward;
    }
  }
  const exitWalls = walls[exit];
  if (exitWalls) exitWalls[exitDir] = false;
  return { n, walls, start, exit, exitDir };
}

function distances(walls: boolean[][], n: number, from: number): number[] {
  const dist = Array.from({ length: n * n }, () => -1);
  dist[from] = 0;
  const queue = [from];
  while (queue.length > 0) {
    const cell = queue.shift() ?? from;
    DIRS.forEach(([dc, dr], d) => {
      if (walls[cell]?.[d]) return;
      const c = (cell % n) + dc;
      const r = Math.floor(cell / n) + dr;
      if (c < 0 || r < 0 || c >= n || r >= n) return;
      const next = r * n + c;
      if (dist[next] === -1) {
        dist[next] = (dist[cell] ?? 0) + 1;
        queue.push(next);
      }
    });
  }
  return dist;
}

/** The first way to roll from `cell` toward the exit (the exit square's way is out). */
export function firstStep(maze: Maze, cell: number): number {
  if (cell === maze.exit) return maze.exitDir;
  const dist = distances(maze.walls, maze.n, maze.exit);
  let best = -1;
  let bestD = Infinity;
  DIRS.forEach(([dc, dr], d) => {
    if (maze.walls[cell]?.[d]) return;
    const c = (cell % maze.n) + dc;
    const r = Math.floor(cell / maze.n) + dr;
    if (c < 0 || r < 0 || c >= maze.n || r >= maze.n) return;
    const dd = dist[r * maze.n + c] ?? Infinity;
    if (dd >= 0 && dd < bestD) {
      bestD = dd;
      best = d;
    }
  });
  return best;
}

/** "Down" on the screen, in the maze's own directions, for a board turned by `angle`. */
export const gravityIn = (angle: number): [number, number] => [Math.sin(angle), Math.cos(angle)];

/** The board turn that makes direction d point down the screen. */
export const angleFor = (d: number): number => Math.atan2(DIRS[d]?.[0] ?? 0, DIRS[d]?.[1] ?? 1);

export function createRotatingMaze({ arena, rng }: GameSetup): MinigameLogic<MazeState> {
  const events = eventQueue();
  const room = Math.min(arena.width - 40, arena.height - HUD_SAFE_TOP - 60);
  const side = room / Math.SQRT2;
  const state: MazeState = {
    maze: makeMaze(rng, 5),
    centre: { x: arena.width / 2, y: HUD_SAFE_TOP + 20 + (arena.height - HUD_SAFE_TOP - 40) / 2 },
    side,
    cell: side / 5,
    angle: 0,
    ball: { cell: 0, dir: -1, t: 0 },
    grip: null,
    outAgo: -1,
    mazes: 0,
    score: 0,
    time: 0,
  };

  function newMaze(): void {
    const n = SIZES[Math.min(state.mazes, SIZES.length - 1)] ?? 7;
    state.maze = makeMaze(rng, n);
    state.cell = side / n;
    state.ball = { cell: state.maze.start, dir: -1, t: 0 };
    state.outAgo = -1;
    state.mazes += 1;
  }
  newMaze();

  const fingerAngle = (p: Point): number => Math.atan2(p.y - state.centre.y, p.x - state.centre.x);

  function roll(dt: number): void {
    const { ball, maze } = state;
    if (ball.dir < 0) {
      const [gx, gy] = gravityIn(state.angle);
      let best = -1;
      let bestDot = ROLL_THRESHOLD;
      DIRS.forEach(([dx, dy], d) => {
        const dot = dx * gx + dy * gy;
        if (dot > bestDot && !maze.walls[ball.cell]?.[d]) {
          best = d;
          bestDot = dot;
        }
      });
      if (best < 0) return;
      ball.dir = best;
      ball.t = 0;
    }
    ball.t += ROLL_SPEED * dt;
    if (ball.t < 1) return;
    const [dc, dr] = DIRS[ball.dir] ?? [0, 0];
    const c = (ball.cell % maze.n) + dc;
    const r = Math.floor(ball.cell / maze.n) + dr;
    if (c < 0 || r < 0 || c >= maze.n || r >= maze.n) {
      // Out through the gap.
      state.outAgo = 0;
      state.score += 1;
      events.push({ type: 'score', x: state.centre.x, y: state.centre.y, note: 84, voice: 'bell' });
      return;
    }
    ball.cell = r * maze.n + c;
    ball.t = 0;
    events.push({ type: 'action', x: state.centre.x, y: state.centre.y + side * 0.6, note: 60 + (ball.cell % 7), voice: 'drum' });
    // Keeps rolling the same way while it can and gravity still says so.
    const [gx, gy] = gravityIn(state.angle);
    if (maze.walls[ball.cell]?.[ball.dir] || dc * gx + dr * gy <= ROLL_THRESHOLD) ball.dir = -1;
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
      if (state.outAgo >= 0) {
        state.outAgo += dt;
        if (state.outAgo >= 1) newMaze();
        state.grip = null;
        return;
      }
      const p = input.pointer;
      if (p && Math.hypot(p.x - state.centre.x, p.y - state.centre.y) > 30) {
        if (state.grip === null) state.grip = fingerAngle(p) - state.angle;
        else {
          // Follow the finger round, the short way (no jump when it crosses the left side).
          const want = fingerAngle(p) - state.grip;
          let delta = want - state.angle;
          delta -= Math.round(delta / (Math.PI * 2)) * Math.PI * 2;
          state.angle += delta;
        }
      } else {
        state.grip = null;
        // Settle to the nearest quarter turn.
        const quarter = Math.round(state.angle / (Math.PI / 2)) * (Math.PI / 2);
        state.angle += (quarter - state.angle) * Math.min(1, dt * 8);
      }
      roll(dt);
    },
  };
}

/** Good play: turns the board, a little each decision, so the next way out points down. */
export function rotatingMazeBot(state: MazeState, _context: BotContext): BotMove {
  if (state.outAgo >= 0) return {};
  const { ball, maze } = state;
  const at = ball.dir >= 0 ? nextCell(maze, ball.cell, ball.dir) : ball.cell;
  const d = at < 0 ? ball.dir : firstStep(maze, at);
  if (d < 0) return {};
  let delta = angleFor(d) - state.angle;
  delta -= Math.round(delta / (Math.PI * 2)) * Math.PI * 2;
  const stepTurn = Math.max(-1.6, Math.min(1.6, delta));
  const grip = state.grip ?? 0;
  const r = state.side * 0.6;
  const a = state.angle + stepTurn + grip;
  return { touch: { x: state.centre.x + Math.cos(a) * r, y: state.centre.y + Math.sin(a) * r } };
}

function nextCell(maze: Maze, cell: number, dir: number): number {
  const [dc, dr] = DIRS[dir] ?? [0, 0];
  const c = (cell % maze.n) + dc;
  const r = Math.floor(cell / maze.n) + dr;
  return c < 0 || r < 0 || c >= maze.n || r >= maze.n ? -1 : r * maze.n + c;
}
