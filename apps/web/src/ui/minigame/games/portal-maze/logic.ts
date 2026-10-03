// Portal maze ("Mê cung cổng phép"): a castle maze cut into three parts with no path between them, joined only
// by pairs of magic doors of the same colour: stepping on one door brings the child out at the other. She
// drags her way along the corridors (her character follows the finger when it is just ahead of her) to find
// which doors lead on to the treasure chest. One pair of doors only leads round in a circle. A chest reached
// is a point and a new maze. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** Open sides of a cell. */
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

export interface Portal {
  /** Pair colour (0, 1, 2) and the two cells it joins. */
  colour: number;
  a: number;
  b: number;
}

export interface PortalMazeState {
  cols: number;
  rows: number;
  open: number[];
  region: number[];
  portals: Portal[];
  child: number;
  chest: number;
  cell: number;
  origin: Point;
  /** When the child last stepped and last went through a door. */
  steppedAt: number;
  jumpedAt: number;
  nextIn: number;
  mazes: number;
  score: number;
  time: number;
}

const STEP_SECONDS = 0.12;
/** The finger leads the child this many steps at most. */
const LEAD = 4;
const NEXT_SECONDS = 1.1;

function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    const a = items[i];
    const b = items[j];
    if (a !== undefined && b !== undefined) {
      items[i] = b;
      items[j] = a;
    }
  }
  return items;
}

/** Cells next to `i` through an open side. */
export function neighbours(state: Pick<PortalMazeState, 'cols' | 'rows' | 'open'>, i: number): number[] {
  const c = i % state.cols;
  const r = Math.floor(i / state.cols);
  const out: number[] = [];
  for (const s of SIDES) {
    if (((state.open[i] ?? 0) & s.bit) === 0) continue;
    const nc = c + s.dc;
    const nr = r + s.dr;
    if (nc >= 0 && nc < state.cols && nr >= 0 && nr < state.rows) out.push(nr * state.cols + nc);
  }
  return out;
}

/** The other end of a door on cell `i`, or -1. */
export const twin = (state: Pick<PortalMazeState, 'portals'>, i: number): number => {
  for (const p of state.portals) {
    if (p.a === i) return p.b;
    if (p.b === i) return p.a;
  }
  return -1;
};

/** Shortest walk (cells) from `from` to `to`, optionally through doors; [] when there is none. */
export function pathTo(state: PortalMazeState, from: number, to: number, doors: boolean): number[] {
  const prev = new Map<number, number>([[from, -1]]);
  const queue = [from];
  while (queue.length > 0) {
    const i = queue.shift() ?? from;
    if (i === to) break;
    const t = twin(state, i);
    // Walking onto a door always goes through it.
    const walkedOn = doors && t >= 0 && i !== from && prev.get(i) !== t;
    const next = walkedOn ? [t] : neighbours(state, i);
    for (const n of next) {
      if (prev.has(n)) continue;
      prev.set(n, i);
      queue.push(n);
    }
  }
  if (!prev.has(to)) return [];
  const path: number[] = [];
  for (let i = to; i !== from; i = prev.get(i) ?? from) path.unshift(i);
  return path;
}

export function createPortalMaze({ arena, rng }: GameSetup): MinigameLogic<PortalMazeState> {
  const events = eventQueue();
  const landscape = arena.width >= arena.height;
  const cols = landscape ? 12 : 7;
  const rows = landscape ? 6 : Math.min(12, Math.max(9, Math.floor((arena.height - HUD_SAFE_TOP - 40) / ((arena.width - 30) / 7))));
  const cell = Math.floor(Math.min((arena.width - 30) / cols, (arena.height - HUD_SAFE_TOP - 30) / rows));
  const origin = { x: (arena.width - cell * cols) / 2, y: HUD_SAFE_TOP + 10 + (arena.height - HUD_SAFE_TOP - 20 - cell * rows) / 2 };
  const state: PortalMazeState = { cols, rows, open: [], region: [], portals: [], child: 0, chest: 0, cell, origin, steppedAt: -9, jumpedAt: -9, nextIn: 0, mazes: 0, score: 0, time: 0 };

  const build = (r: Rng): void => {
    const n = cols * rows;
    // Three parts: side by side on a wide screen, stacked on a tall one.
    state.region = Array.from({ length: n }, (_, i) => (landscape ? Math.floor(((i % cols) * 3) / cols) : Math.floor((Math.floor(i / cols) * 3) / rows)));
    state.open = Array.from({ length: n }, () => 0);
    for (let reg = 0; reg < 3; reg += 1) {
      const cells = state.region.map((g, i) => (g === reg ? i : -1)).filter((i) => i >= 0);
      const start = cells[r.int(0, cells.length - 1)] ?? 0;
      const seen = new Set([start]);
      const stack = [start];
      while (stack.length > 0) {
        const i = stack.at(-1) ?? start;
        const c = i % cols;
        const row = Math.floor(i / cols);
        const options = shuffle([...SIDES], r).filter((s) => {
          const nc = c + s.dc;
          const nr = row + s.dr;
          const ni = nr * cols + nc;
          return nc >= 0 && nc < cols && nr >= 0 && nr < rows && state.region[ni] === reg && !seen.has(ni);
        });
        const s = options[0];
        if (!s) {
          stack.pop();
          continue;
        }
        const ni = (row + s.dr) * cols + c + s.dc;
        state.open[i] = (state.open[i] ?? 0) | s.bit;
        state.open[ni] = (state.open[ni] ?? 0) | s.back;
        seen.add(ni);
        stack.push(ni);
      }
    }
    // Doors go in dead ends, so walking never has to cross one.
    const deadEnd = (i: number): boolean => neighbours(state, i).length === 1;
    const pick = (reg: number, taken: number[], door: boolean): number => {
      const cells = state.region.map((g, i) => (g === reg && !taken.includes(i) ? i : -1)).filter((i) => i >= 0);
      const ends = cells.filter(deadEnd);
      const from = door && ends.length > 0 ? ends : cells;
      return from[r.int(0, from.length - 1)] ?? 0;
    };
    const used: number[] = [];
    const take = (reg: number, door = true): number => {
      const i = pick(reg, used, door);
      used.push(i);
      return i;
    };
    const a1 = take(0);
    const b1 = take(1);
    const a2 = take(1);
    const b2 = take(2);
    state.chest = take(2);
    // The circle: both doors in the middle part, or both in the first.
    const loopReg = r.chance(0.5) ? 0 : 1;
    const c1 = take(loopReg);
    const c2 = take(loopReg);
    state.portals = shuffle(
      [
        { colour: 0, a: a1, b: b1 },
        { colour: 1, a: a2, b: b2 },
        { colour: 2, a: c1, b: c2 },
      ],
      r,
    ).map((p, k) => ({ ...p, colour: k }));
    state.child = take(0, false);
    state.jumpedAt = -9;
  };
  // A dead end may still sit on the way when a part has few of them: build again until the chest is reachable.
  const buildSolvable = (r: Rng): void => {
    for (let tries = 0; tries < 30; tries += 1) {
      build(r);
      if (pathTo(state, state.child, state.chest, true).length > 0) return;
    }
  };
  buildSolvable(rng);

  const cellAt = (p: Point): number => {
    const c = Math.floor((p.x - origin.x) / cell);
    const r = Math.floor((p.y - origin.y) / cell);
    return c >= 0 && c < cols && r >= 0 && r < rows ? r * cols + c : -1;
  };

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
      if (state.nextIn > 0) {
        state.nextIn -= dt;
        if (state.nextIn <= 0) {
          state.mazes += 1;
          buildSolvable(rng);
        }
        return;
      }
      const finger = input.pointer ?? input.taps[0];
      if (!finger || state.time - state.steppedAt < STEP_SECONDS) return;
      const target = cellAt(finger);
      if (target < 0 || target === state.child) return;
      const path = pathTo(state, state.child, target, false);
      const next = path[0];
      if (next === undefined || path.length > LEAD) return;
      state.child = next;
      state.steppedAt = state.time;
      const other = twin(state, next);
      const x = origin.x + ((next % cols) + 0.5) * cell;
      const y = origin.y + (Math.floor(next / cols) + 0.5) * cell;
      if (next === state.chest) {
        state.score += 1;
        state.nextIn = NEXT_SECONDS;
        events.push({ type: 'score', x, y });
      } else if (other >= 0) {
        state.child = other;
        state.jumpedAt = state.time;
        state.steppedAt = state.time + 0.2;
        events.push({ type: 'action', x, y, note: 84, voice: 'bell' });
      }
    },
  };
}

/** Good play: the shortest way to the chest through the doors, the finger two cells ahead. */
export function portalMazeBot(state: PortalMazeState, _context: BotContext): BotMove {
  if (state.nextIn > 0) return {};
  const path = pathTo(state, state.child, state.chest, true);
  // Stop at the first door on the way: walking onto it is the jump.
  let ahead = -1;
  for (let k = 0; k < Math.min(2, path.length); k += 1) {
    const i = path[k] ?? -1;
    if (k > 0 && twin(state, path[k - 1] ?? -1) === i) break;
    ahead = i;
    if (twin(state, i) >= 0) break;
  }
  if (ahead < 0) return {};
  return { touch: { x: state.origin.x + ((ahead % state.cols) + 0.5) * state.cell, y: state.origin.y + (Math.floor(ahead / state.cols) + 0.5) * state.cell } };
}
