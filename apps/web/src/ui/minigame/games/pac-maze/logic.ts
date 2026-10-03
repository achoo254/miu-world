// Pac maze: the child walks a maze cell by cell, eating the seed in every cell (a point each). Swipes (or
// taps toward a side) set the way she turns at the next crossing; she keeps going until a wall. Two slow
// ghosts wander, partly chasing her; a touch costs one of three hearts and sends everyone home. The four
// stars in the corners scare the ghosts for a few seconds: bumping a scared ghost sends it home, two points.
// An eaten-out maze is replaced by a fresh one. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type SwipeDirection } from '../../types';

/** Open sides of a cell, as bits. */
export const UP = 1;
export const RIGHT = 2;
export const DOWN = 4;
export const LEFT = 8;
const DIRS: ReadonlyArray<readonly [number, number, number, SwipeDirection]> = [
  [UP, 0, -1, 'up'],
  [RIGHT, 1, 0, 'right'],
  [DOWN, 0, 1, 'down'],
  [LEFT, -1, 0, 'left'],
];
const OPPOSITE: Readonly<Record<number, number>> = { [UP]: DOWN, [DOWN]: UP, [LEFT]: RIGHT, [RIGHT]: LEFT };
const BIT: Readonly<Record<SwipeDirection, number>> = { up: UP, right: RIGHT, down: DOWN, left: LEFT };

export interface Walker {
  /** The cell it is leaving and the one it walks to (the same when standing), progress 0–1 between them. */
  x: number;
  y: number;
  tx: number;
  ty: number;
  t: number;
  /** Direction bit it is going (0 standing). */
  dir: number;
}

export interface Ghost extends Walker {
  homeX: number;
  homeY: number;
  /** Seconds it waits at home before moving. */
  wait: number;
}

export interface PacState {
  cols: number;
  rows: number;
  cell: number;
  originX: number;
  originY: number;
  open: number[];
  /** 0 empty, 1 seed, 2 star. */
  food: number[];
  player: Walker;
  /** The turn she asked for, as a direction bit (kept until it can be taken). */
  wanted: number;
  startX: number;
  startY: number;
  ghosts: Ghost[];
  /** Seconds the ghosts stay scared. */
  scared: number;
  /** Seconds she is safe after being caught. */
  safe: number;
  mazes: number;
  lives: number;
  score: number;
  time: number;
}

const LIVES = 3;
const PLAYER_SPEED = 4.2;
const GHOST_SPEED = 2.5;
const SCARED_SPEED = 1.9;
const SCARED_SECONDS = 5;
const SAFE_SECONDS = 1.6;
const CHASE = 0.5;
const MAX_CELLS = 110;

const index = (state: Pick<PacState, 'cols'>, x: number, y: number): number => y * state.cols + x;
export const isOpen = (state: Pick<PacState, 'cols' | 'rows' | 'open'>, x: number, y: number, bit: number): boolean =>
  x >= 0 && y >= 0 && x < state.cols && y < state.rows && ((state.open[index(state, x, y)] ?? 0) & bit) !== 0;

/** A maze with loops: a depth-first maze, then about a third of the inner walls taken out (no dead ends). */
export function makeMaze(cols: number, rows: number, rng: Rng): number[] {
  const open = new Array<number>(cols * rows).fill(0);
  const seen = new Set<number>([0]);
  const stack: Array<[number, number]> = [[0, 0]];
  while (stack.length > 0) {
    const top = stack[stack.length - 1];
    if (!top) break;
    const [x, y] = top;
    const options = DIRS.filter(([, dx, dy]) => x + dx >= 0 && y + dy >= 0 && x + dx < cols && y + dy < rows && !seen.has((y + dy) * cols + x + dx));
    const pick = options[rng.int(0, options.length - 1)];
    if (!pick || options.length === 0) {
      stack.pop();
      continue;
    }
    const [bit, dx, dy] = pick;
    const nx = x + dx;
    const ny = y + dy;
    open[y * cols + x] = (open[y * cols + x] ?? 0) | bit;
    open[ny * cols + nx] = (open[ny * cols + nx] ?? 0) | (OPPOSITE[bit] ?? 0);
    seen.add(ny * cols + nx);
    stack.push([nx, ny]);
  }
  const carve = (x: number, y: number, bit: number, dx: number, dy: number): void => {
    open[y * cols + x] = (open[y * cols + x] ?? 0) | bit;
    open[(y + dy) * cols + x + dx] = (open[(y + dy) * cols + x + dx] ?? 0) | (OPPOSITE[bit] ?? 0);
  };
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const sides = DIRS.filter(([bit]) => ((open[y * cols + x] ?? 0) & bit) !== 0).length;
      const closed = DIRS.filter(([bit, dx, dy]) => ((open[y * cols + x] ?? 0) & bit) === 0 && x + dx >= 0 && y + dy >= 0 && x + dx < cols && y + dy < rows);
      // Dead ends always get a second way out; other cells sometimes.
      if (closed.length > 0 && (sides <= 1 || rng.chance(0.18))) {
        const pick = closed[rng.int(0, closed.length - 1)];
        if (pick) carve(x, y, pick[0], pick[1], pick[2]);
      }
    }
  }
  return open;
}

/** Steps from every cell to (x, y) through open sides. */
export function distances(state: Pick<PacState, 'cols' | 'rows' | 'open'>, x: number, y: number): number[] {
  const dist = new Array<number>(state.cols * state.rows).fill(Infinity);
  dist[y * state.cols + x] = 0;
  const queue: Array<[number, number]> = [[x, y]];
  for (let head = 0; head < queue.length; head += 1) {
    const at = queue[head];
    if (!at) break;
    const d = dist[at[1] * state.cols + at[0]] ?? 0;
    for (const [bit, dx, dy] of DIRS) {
      if (!isOpen(state, at[0], at[1], bit)) continue;
      const k = (at[1] + dy) * state.cols + at[0] + dx;
      if ((dist[k] ?? 0) > d + 1) {
        dist[k] = d + 1;
        queue.push([at[0] + dx, at[1] + dy]);
      }
    }
  }
  return dist;
}

/** Where a walker is now, in cells (fractional between two cells). */
export const position = (w: Walker): { x: number; y: number } => ({ x: w.x + (w.tx - w.x) * w.t, y: w.y + (w.ty - w.y) * w.t });

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function createPacMaze({ arena, params, rng }: GameSetup): MinigameLogic<PacState> {
  const ghostFactor = typeof params.ghostSpeed === 'number' ? clamp(params.ghostSpeed, 0.6, 1.4) : 1;
  const events = eventQueue();
  const availW = arena.width - 30;
  const availH = arena.height - HUD_SAFE_TOP - 30;
  const cell = Math.max(56, Math.min(72, Math.floor(availW / 9)));
  const cols = Math.min(13, Math.floor(availW / cell));
  const rows = Math.min(Math.floor(availH / cell), Math.floor(MAX_CELLS / cols));
  const startX = Math.floor(cols / 2);
  const startY = rows - 1;
  const walker = (x: number, y: number): Walker => ({ x, y, tx: x, ty: y, t: 0, dir: 0 });
  const state: PacState = {
    cols,
    rows,
    cell,
    originX: (arena.width - cols * cell) / 2,
    originY: HUD_SAFE_TOP + 15 + (availH - rows * cell) / 2,
    open: [],
    food: [],
    player: walker(startX, startY),
    wanted: 0,
    startX,
    startY,
    ghosts: [
      { ...walker(0, 0), homeX: 0, homeY: 0, wait: 1.5 },
      { ...walker(cols - 1, 0), homeX: cols - 1, homeY: 0, wait: 3 },
    ],
    scared: 0,
    safe: 0,
    mazes: 0,
    lives: LIVES,
    score: 0,
    time: 0,
  };

  function newMaze(): void {
    state.open = makeMaze(cols, rows, rng);
    state.food = state.open.map(() => 1);
    state.food[index(state, startX, startY)] = 0;
    for (const [x, y] of [[0, rows - 1], [cols - 1, rows - 1], [0, Math.floor(rows / 3)], [cols - 1, Math.floor(rows / 3)]] as const) state.food[index(state, x, y)] = 2;
  }
  newMaze();

  const sendHome = (g: Ghost, wait: number): void => {
    Object.assign(g, walker(g.homeX, g.homeY));
    g.wait = wait;
  };

  /** Arrives at a cell: picks the next step. */
  function choosePlayer(): void {
    const p = state.player;
    if (state.wanted && isOpen(state, p.x, p.y, state.wanted)) p.dir = state.wanted;
    else if (!(p.dir && isOpen(state, p.x, p.y, p.dir))) p.dir = 0;
    const step = DIRS.find(([bit]) => bit === p.dir);
    p.tx = p.x + (step?.[1] ?? 0);
    p.ty = p.y + (step?.[2] ?? 0);
    p.t = 0;
  }

  function chooseGhost(g: Ghost, toward: number[]): void {
    const options = DIRS.filter(([bit]) => isOpen(state, g.x, g.y, bit) && bit !== OPPOSITE[g.dir]);
    const all = options.length > 0 ? options : DIRS.filter(([bit]) => isOpen(state, g.x, g.y, bit));
    let pick = all[rng.int(0, all.length - 1)];
    if (rng.chance(CHASE) || state.scared > 0) {
      const score = (o: (typeof all)[number]): number => toward[index(state, g.x + o[1], g.y + o[2])] ?? 99;
      const sorted = [...all].sort((a, b) => (state.scared > 0 ? score(b) - score(a) : score(a) - score(b)));
      pick = sorted[0] ?? pick;
    }
    if (!pick) return;
    g.dir = pick[0];
    g.tx = g.x + pick[1];
    g.ty = g.y + pick[2];
    g.t = 0;
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
      state.scared = Math.max(0, state.scared - dt);
      state.safe = Math.max(0, state.safe - dt);
      const p = state.player;
      const at = position(p);

      const asked: SwipeDirection | undefined =
        input.swipes.at(-1)?.direction ??
        (() => {
          const tap = input.taps.at(-1);
          if (!tap) return undefined;
          const dx = tap.x - (state.originX + (at.x + 0.5) * cell);
          const dy = tap.y - (state.originY + (at.y + 0.5) * cell);
          if (Math.max(Math.abs(dx), Math.abs(dy)) < cell * 0.4) return undefined;
          return Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
        })();
      if (asked) {
        state.wanted = BIT[asked];
        // Turning right round happens at once.
        if (p.dir && state.wanted === OPPOSITE[p.dir]) {
          [p.x, p.tx, p.y, p.ty] = [p.tx, p.x, p.ty, p.y];
          p.t = 1 - p.t;
          p.dir = state.wanted;
        }
      }
      if (p.dir === 0) choosePlayer();
      p.t += PLAYER_SPEED * dt;
      if (p.t >= 1 || p.dir === 0) {
        if (p.dir !== 0) {
          p.x = p.tx;
          p.y = p.ty;
        }
        const k = index(state, p.x, p.y);
        const food = state.food[k] ?? 0;
        if (food > 0) {
          state.food[k] = 0;
          state.score += 1;
          const sx = state.originX + (p.x + 0.5) * cell;
          const sy = state.originY + (p.y + 0.5) * cell;
          if (food === 2) {
            state.scared = SCARED_SECONDS;
            events.push({ type: 'score', x: sx, y: sy });
          } else events.push({ type: 'action', x: sx, y: sy, note: 76 + (state.score % 2) * 3, voice: 'bell' });
        }
        choosePlayer();
        if (state.food.every((f) => f === 0)) {
          state.mazes += 1;
          newMaze();
          for (const g of state.ghosts) sendHome(g, 1.5);
        }
      }

      const toward = distances(state, p.x, p.y);
      for (const g of state.ghosts) {
        if (g.wait > 0) {
          g.wait -= dt;
          continue;
        }
        if (g.dir === 0) chooseGhost(g, toward);
        g.t += (state.scared > 0 ? SCARED_SPEED : GHOST_SPEED * ghostFactor) * dt;
        if (g.t >= 1) {
          g.x = g.tx;
          g.y = g.ty;
          chooseGhost(g, toward);
        }
        const gp = position(g);
        const pp = position(p);
        if (Math.hypot(gp.x - pp.x, gp.y - pp.y) < 0.6) {
          if (state.scared > 0) {
            state.score += 2;
            events.push({ type: 'score', x: state.originX + (gp.x + 0.5) * cell, y: state.originY + (gp.y + 0.5) * cell, points: 2 });
            sendHome(g, 2.5);
          } else if (state.safe <= 0) {
            state.lives -= 1;
            state.safe = SAFE_SECONDS;
            events.push({ type: 'hit', x: state.originX + (pp.x + 0.5) * cell, y: state.originY + (pp.y + 0.5) * cell });
            Object.assign(state.player, walker(startX, startY));
            state.wanted = 0;
            state.ghosts.forEach((ghost, i) => sendHome(ghost, 1 + i));
            break;
          }
        }
      }
    },
  };
}

/** Good play: walk the shortest way to the nearest seed, keeping clear of ghosts that are not scared. */
export function pacBot(state: PacState, _context: BotContext): BotMove {
  const p = state.player;
  // Plan from the cell she is about to reach.
  const fromX = p.dir ? p.tx : p.x;
  const fromY = p.dir ? p.ty : p.y;
  const danger = new Set<number>();
  if (state.scared <= 1) {
    for (const g of state.ghosts) {
      for (const [gx, gy] of [[g.x, g.y], [g.tx, g.ty]] as const) {
        distances(state, gx, gy).forEach((d, k) => {
          if (d <= 3) danger.add(k);
        });
      }
    }
  }
  const search = (avoid: boolean): SwipeDirection | null => {
    const start = fromY * state.cols + fromX;
    const first = new Map<number, SwipeDirection>();
    const queue = [start];
    const seen = new Set([start]);
    for (let head = 0; head < queue.length; head += 1) {
      const k = queue[head] ?? 0;
      const x = k % state.cols;
      const y = Math.floor(k / state.cols);
      if (k !== start && (state.food[k] ?? 0) > 0) return first.get(k) ?? null;
      for (const [bit, dx, dy, name] of DIRS) {
        if (!isOpen(state, x, y, bit)) continue;
        const n = (y + dy) * state.cols + x + dx;
        if (seen.has(n) || (avoid && danger.has(n))) continue;
        seen.add(n);
        first.set(n, first.get(k) ?? name);
        queue.push(n);
      }
    }
    return null;
  };
  // No safe way to a seed: run to the open side furthest from the ghosts.
  const flee = (): SwipeDirection | null => {
    const near = state.ghosts.map((g) => distances(state, g.tx, g.ty));
    let best: SwipeDirection | null = null;
    let bestD = -1;
    for (const [bit, dx, dy, name] of DIRS) {
      if (!isOpen(state, fromX, fromY, bit)) continue;
      const k = (fromY + dy) * state.cols + fromX + dx;
      const d = Math.min(...near.map((n) => n[k] ?? 0));
      if (d > bestD) {
        bestD = d;
        best = name;
      }
    }
    return best;
  };
  const dir = search(true) ?? flee();
  if (!dir) return {};
  if (BIT[dir] === state.wanted && p.dir) return {};
  const at = position(p);
  return { swipe: { from: { x: state.originX + (at.x + 0.5) * state.cell, y: state.originY + (at.y + 0.5) * state.cell }, dx: dir === 'left' ? -80 : dir === 'right' ? 80 : 0, dy: dir === 'up' ? -80 : dir === 'down' ? 80 : 0 } };
}
