// Bubble shooter: a cluster of coloured bubbles hangs from the top. The child drags to aim (a dotted line
// shows the path, bouncing off the sides) and lets go to shoot the bubble in the launcher; it sticks where it
// touches the cluster. Three or more of one colour joined together pop, and bubbles left hanging from
// nothing drop: every bubble gone is a point. Every few shots the cluster creeps down a row; if it reaches
// the line above the launcher the round stops (points kept). Each colour has its own picture, so colour is
// never the only clue. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const COLOURS = 4;
/** Largest bubble radius; a short screen gets smaller bubbles so the cluster has room to grow. */
const MAX_RADIUS = 30;
/** Rows of bubbles that fit between the ceiling and the danger line, at least. */
const ROOM_ROWS = 8.5;
const SHOT_SPEED = 1500;
const SHOTS_PER_ROW = 8;
const START_ROWS = 5;
/** Aim limits (radians from straight up): never flat along the floor. */
const MAX_TILT = 1.35;

export type Cell = { row: number; col: number };

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  colour: number;
}

export interface Falling {
  x: number;
  y: number;
  vy: number;
  colour: number;
  /** Popped in place (true) or dropping off (false). */
  popped: boolean;
  t: number;
}

export interface BubbleState {
  /** Bubble radius and the height of a row. */
  r: number;
  rowH: number;
  left: number;
  top: number;
  cols: number;
  rows: number;
  /** Which rows are shifted half a bubble right (flips when a row is added). */
  parity: number;
  /** grid[row][col]: a colour, or -1 for empty. */
  grid: number[][];
  shooterX: number;
  shooterY: number;
  dangerY: number;
  current: number;
  next: number;
  /** Aim angle from straight up (negative left) while the finger is down, else null. */
  aim: number | null;
  shot: Shot | null;
  falling: Falling[];
  shots: number;
  over: boolean;
  score: number;
  time: number;
}

export const rowCols = (state: BubbleState, row: number): number => ((row + state.parity) % 2 === 1 ? state.cols - 1 : state.cols);

export function cellCentre(state: BubbleState, { row, col }: Cell): Point {
  const shift = (row + state.parity) % 2 === 1 ? state.r : 0;
  return { x: state.left + state.r + col * state.r * 2 + shift, y: state.top + state.r + row * state.rowH };
}

export function neighbours(state: BubbleState, { row, col }: Cell): Cell[] {
  const shifted = (row + state.parity) % 2 === 1;
  const d = shifted ? 0 : -1;
  const out: Cell[] = [
    { row, col: col - 1 },
    { row, col: col + 1 },
    { row: row - 1, col: col + d },
    { row: row - 1, col: col + d + 1 },
    { row: row + 1, col: col + d },
    { row: row + 1, col: col + d + 1 },
  ];
  return out.filter((c) => c.row >= 0 && c.row < state.rows && c.col >= 0 && c.col < rowCols(state, c.row));
}

const at = (state: BubbleState, c: Cell): number => state.grid[c.row]?.[c.col] ?? -1;

function fillRow(state: BubbleState, row: number, rng: Rng): void {
  const cols = rowCols(state, row);
  const line: number[] = [];
  for (let c = 0; c < cols; c += 1) {
    // Neighbours often share a colour, so there are clusters to aim for.
    const above = state.grid[row - 1]?.[c];
    const leftOf = line[c - 1];
    if (leftOf !== undefined && rng.chance(0.4)) line.push(leftOf);
    else if (above !== undefined && above >= 0 && rng.chance(0.3)) line.push(above);
    else line.push(rng.int(0, COLOURS - 1));
  }
  state.grid[row] = line;
}

/** Where a bubble shot at `angle` goes: the points it passes (for the dotted line) and the cell it sticks in. */
export function trace(state: BubbleState, angle: number): { path: Point[]; cell: Cell | null } {
  let x = state.shooterX;
  let y = state.shooterY;
  let vx = Math.sin(angle);
  const vy = -Math.cos(angle);
  const path: Point[] = [{ x, y }];
  const minX = state.left + state.r;
  const maxX = state.left + state.cols * state.r * 2 - state.r;
  for (let i = 0; i < 400; i += 1) {
    x += vx * 8;
    y += vy * 8;
    if (x < minX || x > maxX) {
      x = x < minX ? minX : maxX;
      vx = -vx;
      path.push({ x, y });
    }
    if (y <= state.top + state.r || touches(state, x, y)) {
      path.push({ x, y });
      return { path, cell: nearestEmpty(state, x, y) };
    }
  }
  return { path, cell: null };
}

function touches(state: BubbleState, x: number, y: number): boolean {
  for (let row = 0; row < state.rows; row += 1) {
    const cy = state.top + state.r + row * state.rowH;
    if (Math.abs(cy - y) > state.r * 2) continue;
    for (let col = 0; col < rowCols(state, row); col += 1) {
      if (at(state, { row, col }) < 0) continue;
      const c = cellCentre(state, { row, col });
      if (Math.hypot(c.x - x, c.y - y) < state.r * 1.75) return true;
    }
  }
  return false;
}

function nearestEmpty(state: BubbleState, x: number, y: number): Cell | null {
  let best: Cell | null = null;
  let bestD = Infinity;
  for (let row = 0; row < state.rows; row += 1) {
    for (let col = 0; col < rowCols(state, row); col += 1) {
      if (at(state, { row, col }) >= 0) continue;
      const c = cellCentre(state, { row, col });
      const d = Math.hypot(c.x - x, c.y - y);
      // Only a cell hanging from the ceiling or from a bubble can hold it.
      if (d < bestD && (row === 0 || neighbours(state, { row, col }).some((n) => at(state, n) >= 0))) {
        best = { row, col };
        bestD = d;
      }
    }
  }
  return best;
}

/** Same-coloured bubbles joined to `start` (including it). */
export function cluster(state: BubbleState, start: Cell, colour: number): Cell[] {
  const seen = new Set<string>([`${start.row},${start.col}`]);
  const out: Cell[] = [start];
  for (let i = 0; i < out.length; i += 1) {
    const cell = out[i];
    if (!cell) break;
    for (const n of neighbours(state, cell)) {
      const key = `${n.row},${n.col}`;
      if (!seen.has(key) && at(state, n) === colour) {
        seen.add(key);
        out.push(n);
      }
    }
  }
  return out;
}

/** Bubbles not joined to the ceiling through other bubbles. */
function hanging(state: BubbleState): Cell[] {
  const seen = new Set<string>();
  const queue: Cell[] = [];
  for (let col = 0; col < rowCols(state, 0); col += 1) {
    if (at(state, { row: 0, col }) >= 0) {
      queue.push({ row: 0, col });
      seen.add(`0,${col}`);
    }
  }
  for (let i = 0; i < queue.length; i += 1) {
    const cell = queue[i];
    if (!cell) break;
    for (const n of neighbours(state, cell)) {
      const key = `${n.row},${n.col}`;
      if (!seen.has(key) && at(state, n) >= 0) {
        seen.add(key);
        queue.push(n);
      }
    }
  }
  const out: Cell[] = [];
  state.grid.forEach((line, row) => line.forEach((colour, col) => colour >= 0 && !seen.has(`${row},${col}`) && out.push({ row, col })));
  return out;
}

export function createBubbleShooter({ arena, rng }: GameSetup): MinigameLogic<BubbleState> {
  const events = eventQueue();
  const shooterY = arena.height - 75;
  const top = HUD_SAFE_TOP + 6;
  const dangerY = shooterY - 75;
  const r = Math.min(MAX_RADIUS, (dangerY - top) / (ROOM_ROWS * Math.sqrt(3)));
  const rowH = r * Math.sqrt(3);
  const boardW = Math.min(arena.width - 30, 660);
  const cols = Math.floor(boardW / (r * 2));
  const rows = Math.floor((dangerY - top - r) / rowH) + 1;
  const state: BubbleState = {
    r,
    rowH,
    left: (arena.width - cols * r * 2) / 2,
    top,
    cols,
    rows,
    parity: 0,
    grid: Array.from({ length: rows }, () => [] as number[]),
    shooterX: arena.width / 2,
    shooterY,
    dangerY,
    current: 0,
    next: 0,
    aim: null,
    shot: null,
    falling: [],
    shots: 0,
    over: false,
    score: 0,
    time: 0,
  };
  const emptyRow = (row: number): void => {
    state.grid[row] = Array.from({ length: rowCols(state, row) }, () => -1);
  };
  for (let row = 0; row < rows; row += 1) {
    if (row < START_ROWS) fillRow(state, row, rng);
    else emptyRow(row);
  }
  /** A colour still on the board (any, once it is empty). */
  const pickColour = (): number => {
    const present = [...new Set(state.grid.flat().filter((c) => c >= 0))];
    return present.length > 0 ? (present[rng.int(0, present.length - 1)] ?? 0) : rng.int(0, COLOURS - 1);
  };
  state.current = pickColour();
  state.next = pickColour();

  function addRow(): void {
    state.grid.pop();
    state.parity = 1 - state.parity;
    state.grid.unshift([]);
    fillRow(state, 0, rng);
    // Rows below keep their cells; a row's width follows its shift.
    for (let row = 1; row < rows; row += 1) {
      const line = state.grid[row] ?? [];
      const cols = rowCols(state, row);
      state.grid[row] = Array.from({ length: cols }, (_, c) => line[c] ?? -1);
    }
  }

  function settle(cell: Cell, colour: number): void {
    const line = state.grid[cell.row];
    if (!line) return;
    line[cell.col] = colour;
    const group = cluster(state, cell, colour);
    let gone = 0;
    if (group.length >= 3) {
      for (const c of group) {
        const p = cellCentre(state, c);
        (state.grid[c.row] ?? [])[c.col] = -1;
        state.falling.push({ x: p.x, y: p.y, vy: 0, colour, popped: true, t: 0 });
      }
      gone += group.length;
      for (const c of hanging(state)) {
        const p = cellCentre(state, c);
        state.falling.push({ x: p.x, y: p.y, vy: -120, colour: at(state, c), popped: false, t: 0 });
        (state.grid[c.row] ?? [])[c.col] = -1;
        gone += 1;
      }
      state.score += gone;
      const p = cellCentre(state, cell);
      events.push({ type: 'score', x: p.x, y: p.y, points: gone });
    } else events.push({ type: 'action', x: cellCentre(state, cell).x, y: cellCentre(state, cell).y });
    state.shots += 1;
    if (state.shots % SHOTS_PER_ROW === 0) addRow();
    // A cleared board fills up again.
    if (state.grid.every((l) => l.every((c) => c < 0))) for (let row = 0; row < START_ROWS; row += 1) fillRow(state, row, rng);
    if (state.grid.some((l, row) => l.some((c) => c >= 0) && cellCentre(state, { row, col: 0 }).y + state.r > state.dangerY)) state.over = true;
    state.current = state.next;
    state.next = pickColour();
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.over;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      for (const f of state.falling) {
        f.t += dt;
        if (!f.popped) {
          f.vy += 1800 * dt;
          f.y += f.vy * dt;
        }
      }
      state.falling = state.falling.filter((f) => (f.popped ? f.t < 0.3 : f.y < arena.height + 60));

      const shot = state.shot;
      if (shot) {
        const minX = state.left + state.r;
        const maxX = state.left + state.cols * state.r * 2 - state.r;
        // Small sub-steps so a fast bubble never passes through another.
        const steps = Math.ceil((SHOT_SPEED * dt) / 8);
        for (let i = 0; i < steps; i += 1) {
          shot.x += (shot.vx * dt) / steps;
          shot.y += (shot.vy * dt) / steps;
          if (shot.x < minX || shot.x > maxX) {
            shot.x = shot.x < minX ? minX : maxX;
            shot.vx = -shot.vx;
          }
          if (shot.y <= state.top + state.r || touches(state, shot.x, shot.y)) {
            const cell = nearestEmpty(state, shot.x, shot.y);
            state.shot = null;
            if (cell) settle(cell, shot.colour);
            break;
          }
        }
        return;
      }
      if (input.pointer) {
        const dx = input.pointer.x - state.shooterX;
        const dy = Math.min(-20, input.pointer.y - state.shooterY);
        state.aim = Math.max(-MAX_TILT, Math.min(MAX_TILT, Math.atan2(dx, -dy)));
      } else if (input.released && state.aim !== null) {
        state.shot = { x: state.shooterX, y: state.shooterY, vx: Math.sin(state.aim) * SHOT_SPEED, vy: -Math.cos(state.aim) * SHOT_SPEED, colour: state.current };
        state.aim = null;
        events.push({ type: 'action', x: state.shooterX, y: state.shooterY });
      } else state.aim = null;
    },
  };
}

/** Good play: try a fan of angles; shoot where the bubble joins the most of its colour (and pops). */
export function bubbleShooterBot(state: BubbleState, _context: BotContext): BotMove {
  if (state.shot) return {};
  if (state.aim !== null) return {};
  let best = 0;
  let bestValue = -Infinity;
  for (let a = -MAX_TILT + 0.02; a <= MAX_TILT - 0.02; a += 0.04) {
    const { cell } = trace(state, a);
    if (!cell) continue;
    const line = state.grid[cell.row];
    if (!line) continue;
    line[cell.col] = state.current;
    const size = cluster(state, cell, state.current).length;
    line[cell.col] = -1;
    // Pops first (bigger is better), otherwise next to its own colour, and high up rather than low.
    const value = (size >= 3 ? 100 + size * 10 : size * 5) - cell.row;
    if (value > bestValue) {
      bestValue = value;
      best = a;
    }
  }
  return { touch: { x: state.shooterX + Math.sin(best) * 200, y: state.shooterY - Math.cos(best) * 200 } };
}
