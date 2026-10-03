// Light mirrors: the sun shines a beam into a grid from one side; mirrors on some cells turn it a quarter
// turn ('/' or '\'). Tapping a mirror flips it. Lead the beam out of the grid at the flower to make it
// bloom: a point, then the next board (more turns, and spare mirrors that are not on the way). Every board is
// made by laying the beam's path first, so it always has an answer. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type Tilt = '/' | '\\';

export interface Cell {
  x: number;
  y: number;
}

export interface Mirror extends Cell {
  tilt: Tilt;
  /** The tilt that leads the beam to the flower (spare mirrors: either). */
  answer: Tilt | null;
  /** Seconds since it was flipped (a spin). */
  flipped: number;
}

export interface MirrorState {
  cols: number;
  rows: number;
  cell: number;
  originX: number;
  originY: number;
  /** The sun sits just outside the left edge of this row; the flower just outside the grid at `flower`. */
  sunRow: number;
  flower: Cell;
  mirrors: Mirror[];
  /** The beam's corner points (cell coordinates, the sun first), and whether it reaches the flower. */
  beam: Cell[];
  lit: boolean;
  /** Seconds since the flower bloomed (-1 while not). */
  bloomed: number;
  boards: number;
  score: number;
  time: number;
}

const NEXT_BOARD = 1.3;

/** The way a beam travelling (dx, dy) leaves a mirror. */
export function reflect(tilt: Tilt, dx: number, dy: number): [number, number] {
  if (tilt === '\\') return [dy, dx];
  // Negated, without leaving a -0 behind.
  return [dy === 0 ? 0 : -dy, dx === 0 ? 0 : -dx];
}
const tiltFor = (inDx: number, inDy: number, outDx: number, outDy: number): Tilt => {
  const [sx, sy] = reflect('/', inDx, inDy);
  return sx === outDx && sy === outDy ? '/' : '\\';
};

/** Follows the beam from the sun; returns the cells it turns at and where it leaves the grid. */
export function traceBeam(state: Pick<MirrorState, 'cols' | 'rows' | 'sunRow' | 'mirrors'>): { points: Cell[]; exit: Cell } {
  let x = -1;
  let y = state.sunRow;
  let dx = 1;
  let dy = 0;
  const points: Cell[] = [{ x, y }];
  for (let n = 0; n < 200; n += 1) {
    x += dx;
    y += dy;
    if (x < 0 || y < 0 || x >= state.cols || y >= state.rows) break;
    const m = state.mirrors.find((k) => k.x === x && k.y === y);
    if (m) {
      [dx, dy] = reflect(m.tilt, dx, dy);
      points.push({ x, y });
    }
  }
  points.push({ x, y });
  return { points, exit: { x, y } };
}

/** Lays a path from the sun with `turns` mirrors, ending outside the grid (not back at the sun's side). */
function layPath(cols: number, rows: number, turns: number, rng: Rng): { sunRow: number; mirrors: Mirror[]; flower: Cell } | null {
  const sunRow = rng.int(0, rows - 1);
  let x = -1;
  let y = sunRow;
  let dx = 1;
  let dy = 0;
  const used = new Set<string>();
  const mirrors: Mirror[] = [];
  for (let n = 0; n < 60; n += 1) {
    x += dx;
    y += dy;
    if (x < 0 || y < 0 || x >= cols || y >= rows) {
      if (mirrors.length === turns && x >= 0) return { sunRow, mirrors, flower: { x, y } };
      return null;
    }
    if (used.has(`${x},${y}`)) return null;
    used.add(`${x},${y}`);
    // Turn here if more turns are needed, now and then (and always when the wall is next).
    const wallAhead = x + dx < 0 || y + dy < 0 || x + dx >= cols || y + dy >= rows;
    if (mirrors.length < turns && (wallAhead || rng.chance(0.45))) {
      const options: Array<[number, number]> = dx === 0 ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
      const ok = options.filter(([ox, oy]) => x + ox >= 0 && y + oy >= 0 && x + ox < cols && y + oy < rows && !used.has(`${x + ox},${y + oy}`));
      const pick = ok[rng.int(0, Math.max(0, ok.length - 1))];
      if (!pick) return null;
      const tilt = tiltFor(dx, dy, pick[0], pick[1]);
      mirrors.push({ x, y, tilt, answer: tilt, flipped: 9 });
      [dx, dy] = pick;
    }
  }
  return null;
}

export function createLightMirrors({ arena, rng }: GameSetup): MinigameLogic<MirrorState> {
  const events = eventQueue();
  const wide = arena.width > arena.height;
  const cols = wide ? 5 : 4;
  const rows = wide ? 4 : arena.height / arena.width > 1.8 ? 6 : 5;
  const cell = Math.floor(Math.min(110, arena.width / (cols + 2), (arena.height - HUD_SAFE_TOP - 30) / (rows + 2)));
  const state: MirrorState = {
    cols,
    rows,
    cell,
    originX: (arena.width - cols * cell) / 2,
    originY: HUD_SAFE_TOP + 15 + cell + (arena.height - HUD_SAFE_TOP - 30 - (rows + 2) * cell) / 2,
    sunRow: 0,
    flower: { x: cols, y: 0 },
    mirrors: [],
    beam: [],
    lit: false,
    bloomed: -1,
    boards: 0,
    score: 0,
    time: 0,
  };

  const retrace = (): void => {
    const { points, exit } = traceBeam(state);
    state.beam = points;
    state.lit = exit.x === state.flower.x && exit.y === state.flower.y;
  };

  function deal(): void {
    const turns = Math.min(5, 2 + state.boards);
    let laid = layPath(cols, rows, turns, rng);
    while (!laid) laid = layPath(cols, rows, turns, rng);
    state.sunRow = laid.sunRow;
    state.flower = laid.flower;
    state.mirrors = laid.mirrors;
    // Spare mirrors off the path.
    const spare = Math.min(3, state.boards);
    for (let k = 0, tries = 0; k < spare && tries < 50; tries += 1) {
      const c = { x: rng.int(0, cols - 1), y: rng.int(0, rows - 1) };
      const { points } = traceBeam({ ...state, mirrors: state.mirrors });
      const onPath = (() => {
        // Cells the solved beam crosses.
        for (let i = 1; i < points.length; i += 1) {
          const a = points[i - 1];
          const b = points[i];
          if (!a || !b) continue;
          if ((a.x === b.x && c.x === a.x && c.y >= Math.min(a.y, b.y) && c.y <= Math.max(a.y, b.y)) || (a.y === b.y && c.y === a.y && c.x >= Math.min(a.x, b.x) && c.x <= Math.max(a.x, b.x))) return true;
        }
        return false;
      })();
      if (onPath || state.mirrors.some((m) => m.x === c.x && m.y === c.y)) continue;
      state.mirrors.push({ ...c, tilt: rng.chance(0.5) ? '/' : '\\', answer: null, flipped: 9 });
      k += 1;
    }
    // Scramble the path's mirrors (at least one wrong).
    do {
      for (const m of state.mirrors) if (m.answer) m.tilt = rng.chance(0.5) ? '/' : '\\';
      retrace();
    } while (state.lit);
    state.bloomed = -1;
  }
  deal();

  const cellAt = (p: Point): Cell => ({ x: Math.floor((p.x - state.originX) / cell), y: Math.floor((p.y - state.originY) / cell) });

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
      for (const m of state.mirrors) m.flipped += dt;
      if (state.bloomed >= 0) {
        state.bloomed += dt;
        if (state.bloomed >= NEXT_BOARD) {
          state.boards += 1;
          deal();
        }
        return;
      }
      for (const tap of input.taps) {
        const c = cellAt(tap);
        const m = state.mirrors.find((k) => k.x === c.x && k.y === c.y);
        if (!m) continue;
        m.tilt = m.tilt === '/' ? '\\' : '/';
        m.flipped = 0;
        events.push({ type: 'action', x: state.originX + (m.x + 0.5) * cell, y: state.originY + (m.y + 0.5) * cell });
        retrace();
        if (state.lit) {
          state.bloomed = 0;
          state.score += 1;
          events.push({ type: 'score', x: state.originX + (state.flower.x + 0.5) * cell, y: state.originY + (state.flower.y + 0.5) * cell });
          break;
        }
      }
    },
  };
}

/** Good play: flip the first mirror along the way that is turned wrong. */
export function lightMirrorsBot(state: MirrorState, _context: BotContext): BotMove {
  if (state.bloomed >= 0) return {};
  const wrong = state.mirrors.find((m) => m.answer !== null && m.tilt !== m.answer);
  if (!wrong) return {};
  return { tap: { x: state.originX + (wrong.x + 0.5) * state.cell, y: state.originY + (wrong.y + 0.5) * state.cell } };
}
