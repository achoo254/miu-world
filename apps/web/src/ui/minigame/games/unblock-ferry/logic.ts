// Unblock ferry: a crowded river landing seen from above, 6 × 6. Boats lie across or along the river, two or
// three squares long, and each can only slide the way it points. The child drags boats out of the way until the
// yellow boat can slide out of the gap on the right: a point, and a busier landing. "Lùi" takes back the last
// slide. Every landing is checked solvable before it is shown. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const SIZE = 6;
/** The yellow boat's row; the gap is at the right end of it. */
export const EXIT_ROW = 2;

export interface Boat {
  /** Fixed line (row for an across boat, column for an along boat) and position along it. */
  across: boolean;
  line: number;
  pos: number;
  length: number;
}

export interface FerryState {
  left: number;
  top: number;
  cell: number;
  /** Boat 0 is the yellow one. */
  boats: Boat[];
  /** The boat being dragged, and its position along its line while dragged (fractional). */
  held: number;
  heldPos: number;
  grabOffset: number;
  range: [number, number];
  history: number[][];
  /** The shortest way out from here (slides [boat, pos]), kept up to date as boats move. */
  plan: Array<[number, number]>;
  /** When the last slide was made (the bot looks at the board a moment between slides). */
  movedAt: number;
  undo: Point & { r: number };
  /** Seconds since the yellow boat got out (-1 while puzzling). */
  outAgo: number;
  boards: number;
  score: number;
  time: number;
}

const OUT_SECONDS = 1.3;

const cellsOf = (b: Boat): number[] => Array.from({ length: b.length }, (_, k) => (b.across ? b.line * SIZE + b.pos + k : (b.pos + k) * SIZE + b.line));

function occupancy(boats: readonly Boat[], skip = -1): boolean[] {
  const grid = Array.from({ length: SIZE * SIZE }, () => false);
  boats.forEach((b, i) => {
    if (i !== skip) for (const c of cellsOf(b)) grid[c] = true;
  });
  return grid;
}

/** How far boat i can slide: [lowest pos, highest pos]. */
export function slideRange(boats: readonly Boat[], i: number): [number, number] {
  const b = boats[i];
  if (!b) return [0, 0];
  const grid = occupancy(boats, i);
  const free = (p: number): boolean => p >= 0 && p + b.length <= SIZE && cellsOf({ ...b, pos: p }).every((c) => !grid[c]);
  let lo = b.pos;
  while (free(lo - 1)) lo -= 1;
  let hi = b.pos;
  while (free(hi + 1)) hi += 1;
  return [lo, hi];
}

const key = (boats: readonly Boat[]): string => boats.map((b) => b.pos).join(',');
export const isOut = (boats: readonly Boat[]): boolean => (boats[0]?.pos ?? 0) + (boats[0]?.length ?? 2) === SIZE;

/** Shortest list of slides [boat, pos] that gets the yellow boat out, or null (breadth-first). */
export function solve(boats: readonly Boat[], limit = 30000): Array<[number, number]> | null {
  const start = boats.map((b) => ({ ...b }));
  const seen = new Map<string, { prev: string | null; move: [number, number] | null }>([[key(start), { prev: null, move: null }]]);
  const queue: Boat[][] = [start];
  for (let q = 0; q < queue.length && seen.size < limit; q += 1) {
    const state = queue[q];
    if (!state) break;
    if (isOut(state)) {
      const moves: Array<[number, number]> = [];
      for (let k: string | null = key(state); k; ) {
        const node = seen.get(k);
        if (!node?.move) break;
        moves.unshift(node.move);
        k = node.prev;
      }
      return moves;
    }
    for (let i = 0; i < state.length; i += 1) {
      const [lo, hi] = slideRange(state, i);
      for (let p = lo; p <= hi; p += 1) {
        if (p === state[i]?.pos) continue;
        const next = state.map((b, j) => (j === i ? { ...b, pos: p } : b));
        const k = key(next);
        if (!seen.has(k)) {
          seen.set(k, { prev: key(state), move: [i, p] });
          queue.push(next);
        }
      }
    }
  }
  return null;
}

function makeLanding(rng: Rng, minMoves: number): { boats: Boat[]; plan: Array<[number, number]> } {
  let best: { boats: Boat[]; plan: Array<[number, number]> } = { boats: [], plan: [] };
  for (let tries = 0; tries < 20; tries += 1) {
    const boats: Boat[] = [{ across: true, line: EXIT_ROW, pos: rng.int(0, 1), length: 2 }];
    const count = rng.int(6, 9);
    for (let n = 0; n < 80 && boats.length < count + 1; n += 1) {
      const across = rng.chance(0.45);
      const length = rng.chance(0.3) ? 3 : 2;
      const line = rng.int(0, SIZE - 1);
      // Nothing else lies across the yellow boat's row.
      if (across && line === EXIT_ROW) continue;
      const boat = { across, line, pos: rng.int(0, SIZE - length), length };
      const grid = occupancy(boats);
      if (cellsOf(boat).some((c) => grid[c])) continue;
      boats.push(boat);
    }
    if (isOut(boats)) continue;
    const plan = solve(boats, 2000);
    if (!plan) continue;
    if (plan.length >= minMoves && plan.length <= 14) return { boats, plan };
    if (plan.length > best.plan.length) best = { boats, plan };
  }
  if (best.boats.length > 0) return best;
  // Fallback: one boat in the way.
  const boats: Boat[] = [
    { across: true, line: EXIT_ROW, pos: 0, length: 2 },
    { across: false, line: 4, pos: 1, length: 3 },
  ];
  return { boats, plan: solve(boats) ?? [] };
}

export function createUnblockFerry({ arena, rng }: GameSetup): MinigameLogic<FerryState> {
  const events = eventQueue();
  const wide = arena.width > arena.height;
  const board = Math.min(wide ? arena.width - 220 : arena.width - 60, arena.height - HUD_SAFE_TOP - (wide ? 40 : 170), 540);
  const left = wide ? (arena.width - board - 130) / 2 : (arena.width - board) / 2;
  const top = HUD_SAFE_TOP + 20 + (arena.height - HUD_SAFE_TOP - (wide ? 40 : 170) - board) / 2;
  const state: FerryState = {
    left,
    top,
    cell: board / SIZE,
    boats: [],
    held: -1,
    heldPos: 0,
    grabOffset: 0,
    range: [0, 0],
    history: [],
    plan: [],
    movedAt: 0,
    undo: wide ? { x: left + board + 90, y: top + board - 50, r: 48 } : { x: arena.width / 2, y: top + board + 75, r: 48 },
    outAgo: -1,
    boards: 0,
    score: 0,
    time: 0,
  };

  function newLanding(): void {
    const landing = makeLanding(rng, Math.min(4, 2 + Math.floor(state.boards / 2)));
    state.boats = landing.boats;
    state.plan = landing.plan;
    state.history = [];
    state.held = -1;
    state.outAgo = -1;
  }

  const along = (p: Point, b: Boat): number => ((b.across ? p.x - state.left : p.y - state.top) / state.cell);
  const boatAt = (p: Point): number => {
    const col = Math.floor((p.x - state.left) / state.cell);
    const row = Math.floor((p.y - state.top) / state.cell);
    return state.boats.findIndex((b) => cellsOf(b).includes(row * SIZE + col));
  };

  newLanding();

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
        if (state.outAgo > OUT_SECONDS) {
          state.boards += 1;
          newLanding();
        }
        return;
      }
      for (const t of input.taps) {
        if (Math.hypot(t.x - state.undo.x, t.y - state.undo.y) <= state.undo.r + 10 && state.history.length > 0) {
          const last = state.history.pop();
          if (last) state.boats.forEach((b, i) => (b.pos = last[i] ?? b.pos));
          state.plan = solve(state.boats) ?? [];
          events.push({ type: 'action', x: state.undo.x, y: state.undo.y });
        }
      }
      const p = input.pointer;
      if (p && input.pressed && state.held < 0) {
        const i = boatAt(p);
        const b = state.boats[i];
        if (b) {
          state.held = i;
          state.heldPos = b.pos;
          state.grabOffset = along(p, b) - b.pos;
          state.range = slideRange(state.boats, i);
        }
      }
      const b = state.boats[state.held];
      if (p && b) state.heldPos = Math.max(state.range[0], Math.min(state.range[1], along(p, b) - state.grabOffset));
      if (!p && b) {
        const pos = Math.round(state.heldPos);
        if (pos !== b.pos) {
          state.history.push(state.boats.map((x) => x.pos));
          b.pos = pos;
          state.movedAt = state.time;
          const next = state.plan[0];
          if (next && next[0] === state.held && next[1] === pos) state.plan.shift();
          else state.plan = solve(state.boats) ?? [];
          events.push({ type: 'action', x: state.left + state.cell * 3, y: state.top + state.cell * 3 });
        }
        state.held = -1;
        if (isOut(state.boats)) {
          state.outAgo = 0;
          state.score += 1;
          events.push({ type: 'score', x: state.left + state.cell * SIZE, y: state.top + (EXIT_ROW + 0.5) * state.cell });
        }
      }
    },
  };
}

/** Good play: follows the shortest solution, one slide at a time (look, grab, slide, let go). */
export function ferryBot(state: FerryState, _context: BotContext): BotMove {
  const move = state.plan[0];
  if (state.outAgo >= 0 || !move) return {};
  const b = state.boats[move[0]];
  if (!b) return {};
  const centre = (pos: number): Point => {
    const mid = pos + b.length / 2;
    return b.across ? { x: state.left + mid * state.cell, y: state.top + (b.line + 0.5) * state.cell } : { x: state.left + (b.line + 0.5) * state.cell, y: state.top + mid * state.cell };
  };
  if (state.held < 0) return state.time - state.movedAt < 1.8 ? {} : { touch: centre(b.pos) };
  if (state.held !== move[0] || Math.abs(state.heldPos - move[1]) < 0.05) return {};
  return { touch: centre(move[1]) };
}
