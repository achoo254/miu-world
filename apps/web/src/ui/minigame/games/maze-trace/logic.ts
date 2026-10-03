// Maze trace: a hedge maze with the child at one end and home at the far end; stars wait in three dead ends.
// The child holds a finger on the screen and her character walks toward it along the paths, like on rails:
// at a crossing it takes the way that leads most toward the finger, so it never sticks on a hedge. A star is
// a point, home is two and a new maze. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** Bits of `open`: which sides of a cell have no hedge. */
export const UP = 1;
export const RIGHT = 2;
export const DOWN = 4;
export const LEFT = 8;
const SIDES = [
  { bit: UP, dc: 0, dr: -1, back: DOWN },
  { bit: RIGHT, dc: 1, dr: 0, back: LEFT },
  { bit: DOWN, dc: 0, dr: 1, back: UP },
  { bit: LEFT, dc: -1, dr: 0, back: RIGHT },
] as const;
/** Cells per second. */
const WALK_SPEED = 4.2;
const HOME_SECONDS = 1.2;
const STAR_POINTS = 1;
const HOME_POINTS = 2;

export interface MazeStar {
  col: number;
  row: number;
  /** Seconds since it was picked up, -1 before. */
  taken: number;
}

export interface MazeState {
  cols: number;
  rows: number;
  /** open[row * cols + col]: UP | RIGHT | DOWN | LEFT bits. */
  open: number[];
  home: { col: number; row: number };
  stars: MazeStar[];
  /** The child's position in cells (fractional between two cells). */
  px: number;
  py: number;
  /** Last direction walked (dc, dr), for facing and for carrying on between cells. */
  dir: { dc: number; dr: number };
  walking: boolean;
  /** Seconds since home was reached, -1 while walking the maze. */
  arrived: number;
  mazes: number;
  score: number;
  time: number;
  cell: number;
  left: number;
  top: number;
}

function carve(cols: number, rows: number, rng: Rng): number[] {
  const open = Array.from({ length: cols * rows }, () => 0);
  const seen = Array.from({ length: cols * rows }, () => false);
  const stack: number[] = [0];
  seen[0] = true;
  while (stack.length > 0) {
    const at = stack[stack.length - 1] ?? 0;
    const col = at % cols;
    const row = Math.floor(at / cols);
    const ways = SIDES.filter((s) => {
      const c = col + s.dc;
      const r = row + s.dr;
      return c >= 0 && r >= 0 && c < cols && r < rows && !seen[r * cols + c];
    });
    if (ways.length === 0) {
      stack.pop();
      continue;
    }
    const way = ways[rng.int(0, ways.length - 1)] ?? ways[0];
    if (!way) break;
    const next = (row + way.dr) * cols + col + way.dc;
    open[at] = (open[at] ?? 0) | way.bit;
    open[next] = (open[next] ?? 0) | way.back;
    seen[next] = true;
    stack.push(next);
  }
  return open;
}

/** Steps from `from` to every cell, following open sides; and each cell's previous cell on the way. */
export function distances(state: Pick<MazeState, 'cols' | 'rows' | 'open'>, from: number): { dist: number[]; prev: number[] } {
  const dist = Array.from({ length: state.cols * state.rows }, () => -1);
  const prev = Array.from({ length: state.cols * state.rows }, () => -1);
  dist[from] = 0;
  const queue = [from];
  for (let i = 0; i < queue.length; i += 1) {
    const at = queue[i] ?? 0;
    const col = at % state.cols;
    const row = Math.floor(at / state.cols);
    for (const s of SIDES) {
      if (!((state.open[at] ?? 0) & s.bit)) continue;
      const next = (row + s.dr) * state.cols + col + s.dc;
      if ((dist[next] ?? 0) >= 0) continue;
      dist[next] = (dist[at] ?? 0) + 1;
      prev[next] = at;
      queue.push(next);
    }
  }
  return { dist, prev };
}

export function createMazeTrace({ arena, params, rng }: GameSetup): MinigameLogic<MazeState> {
  const speed = WALK_SPEED * (typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1);
  const events = eventQueue();
  const target = 90;
  const availW = arena.width - 40;
  const availH = arena.height - HUD_SAFE_TOP - 30;
  const cols = Math.max(4, Math.min(10, Math.floor(availW / target)));
  const rows = Math.max(4, Math.min(10, Math.floor(availH / target)));
  const cell = Math.floor(Math.min(availW / cols, availH / rows, 120));
  const left = (arena.width - cols * cell) / 2;
  const top = HUD_SAFE_TOP + 10 + (availH - rows * cell) / 2;
  const state: MazeState = {
    cols,
    rows,
    open: [],
    home: { col: 0, row: 0 },
    stars: [],
    px: 0,
    py: rows - 1,
    dir: { dc: 1, dr: 0 },
    walking: false,
    arrived: -1,
    mazes: 0,
    score: 0,
    time: 0,
    cell,
    left,
    top,
  };

  function build(): void {
    state.open = carve(cols, rows, rng);
    // Start in the bottom-left corner; home is the cell farthest along the paths.
    const start = (rows - 1) * cols;
    const { dist } = distances(state, start);
    let far = 0;
    dist.forEach((d, i) => {
      if (d > (dist[far] ?? 0)) far = i;
    });
    state.home = { col: far % cols, row: Math.floor(far / cols) };
    // Stars in dead ends (one open side), away from the start and home, spread out: the farthest first.
    const deadEnds = dist
      .map((d, i) => ({ d, i }))
      .filter(({ i }) => i !== start && i !== far && [UP, RIGHT, DOWN, LEFT].filter((b) => (state.open[i] ?? 0) & b).length === 1)
      .sort((a, b) => b.d - a.d);
    const picked: number[] = [];
    for (const { i } of deadEnds) {
      if (picked.length >= 3) break;
      const c = i % cols;
      const r = Math.floor(i / cols);
      if (picked.every((p) => Math.abs((p % cols) - c) + Math.abs(Math.floor(p / cols) - r) >= 2)) picked.push(i);
    }
    for (let i = 0; picked.length < 3 && i < 200; i += 1) {
      const cand = rng.int(0, cols * rows - 1);
      if (cand !== start && cand !== far && !picked.includes(cand)) picked.push(cand);
    }
    state.stars = picked.map((i) => ({ col: i % cols, row: Math.floor(i / cols), taken: -1 }));
    state.px = 0;
    state.py = rows - 1;
    state.walking = false;
    state.arrived = -1;
    state.mazes += 1;
  }

  const isOpen = (col: number, row: number, bit: number): boolean => ((state.open[row * cols + col] ?? 0) & bit) !== 0;
  const toCells = (p: Point): { x: number; y: number } => ({ x: (p.x - left) / cell - 0.5, y: (p.y - top) / cell - 0.5 });
  const atCentre = (): boolean => Math.abs(state.px - Math.round(state.px)) < 1e-6 && Math.abs(state.py - Math.round(state.py)) < 1e-6;

  /** At a cell centre: the open way that leads most toward the finger, if any leads toward it at all. */
  function chooseWay(dx: number, dy: number): { dc: number; dr: number } | null {
    const col = Math.round(state.px);
    const row = Math.round(state.py);
    const ways = SIDES.filter((s) => isOpen(col, row, s.bit))
      .map((s) => ({ s, gain: s.dc * dx + s.dr * dy }))
      .filter((w) => w.gain > 0.3)
      .sort((a, b) => b.gain - a.gain);
    const way = ways[0];
    return way ? { dc: way.s.dc, dr: way.s.dr } : null;
  }

  function walk(finger: Point, dt: number): void {
    const goal = toCells(finger);
    let budget = speed * dt;
    for (let guard = 0; budget > 1e-9 && guard < 4; guard += 1) {
      const dx = goal.x - state.px;
      const dy = goal.y - state.py;
      if (atCentre()) {
        state.px = Math.round(state.px);
        state.py = Math.round(state.py);
        const way = chooseWay(dx, dy);
        if (!way) {
          state.walking = false;
          return;
        }
        state.dir = way;
      } else {
        // Between two centres: go on, or turn back if the finger is now behind.
        const along = state.dir.dc * dx + state.dir.dr * dy;
        if (along < -0.15) state.dir = { dc: -state.dir.dc, dr: -state.dir.dr };
      }
      // Distance to the next centre in the walking direction.
      const fx = state.dir.dc > 0 ? Math.floor(state.px + 1e-9) + 1 : state.dir.dc < 0 ? Math.ceil(state.px - 1e-9) - 1 : state.px;
      const fy = state.dir.dr > 0 ? Math.floor(state.py + 1e-9) + 1 : state.dir.dr < 0 ? Math.ceil(state.py - 1e-9) - 1 : state.py;
      const gap = Math.abs(fx - state.px) + Math.abs(fy - state.py);
      const move = Math.min(budget, gap);
      state.px += state.dir.dc * move;
      state.py += state.dir.dr * move;
      budget -= move;
      state.walking = true;
      if (move >= gap - 1e-9) {
        state.px = Math.round(state.px);
        state.py = Math.round(state.py);
        arrive();
        if (state.arrived >= 0) return;
      }
    }
  }

  function arrive(): void {
    const col = Math.round(state.px);
    const row = Math.round(state.py);
    const x = left + (col + 0.5) * cell;
    const y = top + (row + 0.5) * cell;
    for (const star of state.stars) {
      if (star.taken < 0 && star.col === col && star.row === row) {
        star.taken = 0;
        state.score += STAR_POINTS;
        events.push({ type: 'score', x, y, points: STAR_POINTS });
      }
    }
    if (col === state.home.col && row === state.home.row) {
      state.arrived = 0;
      state.walking = false;
      state.score += HOME_POINTS;
      events.push({ type: 'score', x, y, points: HOME_POINTS });
    }
  }

  build();

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
      for (const star of state.stars) if (star.taken >= 0) star.taken += dt;
      if (state.arrived >= 0) {
        state.arrived += dt;
        if (state.arrived >= HOME_SECONDS) build();
        return;
      }
      if (input.pressed && input.pointer) events.push({ type: 'action', x: left + (state.px + 0.5) * cell, y: top + (state.py + 0.5) * cell });
      if (input.pointer) walk(input.pointer, dt);
      else state.walking = false;
    },
  };
}

/** Good play: the shortest way to the nearest star still lying there, then home; the finger stays ahead. */
export function mazeBot(state: MazeState, _context: BotContext): BotMove {
  if (state.arrived >= 0) return {};
  const here = Math.round(state.py) * state.cols + Math.round(state.px);
  const { dist, prev } = distances(state, here);
  const goals = state.stars.filter((s) => s.taken < 0).map((s) => s.row * state.cols + s.col);
  const goal = goals.sort((a, b) => (dist[a] ?? 0) - (dist[b] ?? 0))[0] ?? state.home.row * state.cols + state.home.col;
  const path: number[] = [];
  for (let at = goal; at !== here && at >= 0; at = prev[at] ?? -1) path.unshift(at);
  // Aim at the farthest cell of the path still in a straight line from here.
  let aim = path[0] ?? goal;
  const hc = here % state.cols;
  const hr = Math.floor(here / state.cols);
  for (const p of path.slice(0, 3)) {
    if (p % state.cols === hc || Math.floor(p / state.cols) === hr) aim = p;
    else break;
  }
  return { touch: { x: state.left + ((aim % state.cols) + 0.5) * state.cell, y: state.top + (Math.floor(aim / state.cols) + 0.5) * state.cell } };
}
