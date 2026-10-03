// Dig channel: water pours from a pipe into the ground; the duck's bathtub sits at the bottom. The child drags a
// finger through the soil to dig a channel, and the water runs into what is dug: down first, then sideways,
// never uphill. Rocks cannot be dug. If the water reaches a mud pit the level starts over; reaching the tub is a
// point and a new level comes. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type Ground = 'soil' | 'rock' | 'mud' | 'open' | 'tub';

const FLOW_SECONDS = 0.07;
const WIN_SECONDS = 1.3;
const FAIL_SECONDS = 1.2;

export interface DigState {
  cols: number;
  rows: number;
  cells: Ground[];
  dealt: Ground[];
  water: boolean[];
  source: number;
  tub: number;
  cell: number;
  left: number;
  top: number;
  phase: 'dig' | 'win' | 'fail';
  phaseAgo: number;
  flowIn: number;
  /** Where the water went into mud (for the splash). */
  spoilt: number;
  levels: number;
  score: number;
  time: number;
}

const neighbours = (cols: number, rows: number, i: number): number[] => {
  const c = i % cols;
  const r = Math.floor(i / cols);
  const out: number[] = [];
  if (r + 1 < rows) out.push(i + cols);
  if (c > 0) out.push(i - 1);
  if (c + 1 < cols) out.push(i + 1);
  return out;
};

/** A cell the water may run through without spilling into mud (no mud left, right or below it). */
const safe = (cells: readonly Ground[], cols: number, rows: number, i: number): boolean =>
  cells[i] !== 'rock' && cells[i] !== 'mud' && neighbours(cols, rows, i).every((j) => cells[j] !== 'mud');

/** The fewest squares to dig for a safe channel from the source to the tub (0-1 BFS over water moves). */
export function cheapestChannel(cells: readonly Ground[], cols: number, rows: number, source: number, tub: number): number[] | null {
  const dist = new Array<number>(cells.length).fill(Infinity);
  const prev = new Array<number>(cells.length).fill(-1);
  dist[source] = 0;
  const queue = [source];
  while (queue.length > 0) {
    queue.sort((a, b) => (dist[a] ?? 0) - (dist[b] ?? 0));
    const i = queue.shift() ?? source;
    for (const j of neighbours(cols, rows, i)) {
      if (!safe(cells, cols, rows, j)) continue;
      const d = (dist[i] ?? 0) + (cells[j] === 'soil' ? 1 : 0);
      if (d < (dist[j] ?? Infinity)) {
        dist[j] = d;
        prev[j] = i;
        queue.push(j);
      }
    }
  }
  if (dist[tub] === Infinity) return null;
  const path: number[] = [];
  for (let i = tub; i >= 0; i = prev[i] ?? -1) path.unshift(i);
  return path;
}

export function makeLevel(rng: Rng, cols: number, rows: number, n: number): { cells: Ground[]; source: number; tub: number } {
  for (;;) {
    const cells: Ground[] = new Array<Ground>(cols * rows).fill('soil');
    const sourceCol = rng.int(1, cols - 2);
    const source = sourceCol;
    // A winding way down that must stay soil.
    const way = new Set<number>([source]);
    let c = sourceCol;
    for (let r = 1; r < rows; r += 1) {
      way.add(r * cols + c);
      if (r < rows - 1 && rng.chance(0.55)) {
        const to = rng.int(0, cols - 1);
        for (let x = Math.min(c, to); x <= Math.max(c, to); x += 1) way.add(r * cols + x);
        c = to;
      }
    }
    const tub = (rows - 1) * cols + c;
    const near = (i: number): boolean => [...way].some((w) => Math.abs((w % cols) - (i % cols)) + Math.abs(Math.floor(w / cols) - Math.floor(i / cols)) <= 1);
    for (let i = 0; i < cells.length; i += 1) if (!way.has(i) && rng.chance(0.15 + Math.min(0.1, n * 0.02))) cells[i] = 'rock';
    const pits = 2 + Math.min(2, Math.floor(n / 2));
    for (let k = 0, tries = 0; k < pits && tries < 100; tries += 1) {
      const i = rng.int(cols, cells.length - 1);
      if (way.has(i) || near(i) || cells[i] === 'mud') continue;
      cells[i] = 'mud';
      k += 1;
    }
    cells[source] = 'open';
    cells[tub] = 'tub';
    if (cheapestChannel(cells, cols, rows, source, tub)) return { cells, source, tub };
  }
}

export function createDigChannel({ arena, rng }: GameSetup): MinigameLogic<DigState> {
  const events = eventQueue();
  const free = arena.height - HUD_SAFE_TOP - 70;
  const cols = Math.max(6, Math.min(10, Math.floor((arena.width - 40) / 78)));
  const rows = Math.max(6, Math.min(11, Math.floor((free - 20) / 78)));
  const cell = Math.min((arena.width - 40) / cols, (free - 20) / rows);
  const first = makeLevel(rng, cols, rows, 0);
  const state: DigState = {
    cols,
    rows,
    cells: [...first.cells],
    dealt: first.cells,
    water: first.cells.map((_, i) => i === first.source),
    source: first.source,
    tub: first.tub,
    cell,
    left: (arena.width - cols * cell) / 2,
    top: HUD_SAFE_TOP + 70 + (free - rows * cell) / 2,
    phase: 'dig',
    phaseAgo: 0,
    flowIn: FLOW_SECONDS,
    spoilt: -1,
    levels: 0,
    score: 0,
    time: 0,
  };

  const reset = (): void => {
    state.cells = [...state.dealt];
    state.water = state.cells.map((_, i) => i === state.source);
    state.phase = 'dig';
    state.phaseAgo = 0;
    state.spoilt = -1;
  };

  const centre = (i: number): Point => ({ x: state.left + ((i % cols) + 0.5) * cell, y: state.top + (Math.floor(i / cols) + 0.5) * cell });

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
      state.phaseAgo += dt;
      if (state.phase === 'win') {
        if (state.phaseAgo >= WIN_SECONDS) {
          state.levels += 1;
          const level = makeLevel(rng, cols, rows, state.levels);
          state.dealt = level.cells;
          state.source = level.source;
          state.tub = level.tub;
          reset();
        }
        return;
      }
      if (state.phase === 'fail') {
        if (state.phaseAgo >= FAIL_SECONDS) reset();
        return;
      }
      // Dig where the finger is.
      const p = input.pointer ?? input.taps[0];
      if (p) {
        const c = Math.floor((p.x - state.left) / cell);
        const r = Math.floor((p.y - state.top) / cell);
        const i = r * cols + c;
        if (c >= 0 && c < cols && r >= 0 && r < rows && state.cells[i] === 'soil') {
          state.cells[i] = 'open';
          const at = centre(i);
          events.push({ type: 'action', x: at.x, y: at.y });
        }
      }
      // Water spreads one square a tick: down and sideways into open ground.
      state.flowIn -= dt;
      if (state.flowIn > 0) return;
      state.flowIn += FLOW_SECONDS;
      const next = [...state.water];
      state.water.forEach((wet, i) => {
        if (!wet) return;
        for (const j of neighbours(cols, rows, i)) {
          const g = state.cells[j];
          if (g === 'open' || g === 'tub' || g === 'mud') next[j] = true;
        }
      });
      state.water = next;
      const spoilt = state.cells.findIndex((g, i) => g === 'mud' && next[i]);
      if (spoilt >= 0) {
        state.phase = 'fail';
        state.phaseAgo = 0;
        state.spoilt = spoilt;
        const at = centre(spoilt);
        events.push({ type: 'hit', x: at.x, y: at.y });
      } else if (next[state.tub]) {
        state.phase = 'win';
        state.phaseAgo = 0;
        state.score += 1;
        const at = centre(state.tub);
        events.push({ type: 'score', x: at.x, y: at.y });
      }
    },
  };
}

/** Good play: digs the cheapest safe channel, square by square from the pipe down. */
export function digChannelBot(state: DigState, _context: BotContext): BotMove {
  if (state.phase !== 'dig') return {};
  const path = cheapestChannel(state.cells, state.cols, state.rows, state.source, state.tub);
  const next = path?.find((i) => state.cells[i] === 'soil');
  if (next === undefined) return {};
  return { touch: { x: state.left + ((next % state.cols) + 0.5) * state.cell, y: state.top + (Math.floor(next / state.cols) + 0.5) * state.cell } };
}
