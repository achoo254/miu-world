// Polyline length (đường gấp khúc): stepping stones joined by little paths, each path marked in centimetres.
// A snail sits on one stone, its lettuce on another, and a sign asks for a way of exactly so many centimetres.
// The child drags from the snail from stone to stone (back onto the last stone undoes a step) to the lettuce.
// The running sum shows as she goes. The right total: the snail crawls home (a point) and a new map comes.
// A wrong total: the way fades and she tries again; no penalty. Every map has a way of the asked length and
// at least one way of another length. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Edge {
  a: number;
  b: number;
  cm: number;
}

export interface PolylineState {
  nodes: Point[];
  edges: Edge[];
  start: number;
  end: number;
  target: number;
  /** One way of the asked length (the bot's, and the proof it can be done). */
  answer: number[];
  /** The stones the child has gone through so far. */
  path: number[];
  /** A finished try: whether it was right and how long ago (the snail crawls, or the way fades). */
  result: { right: boolean; ago: number; path: number[] } | null;
  boards: number;
  lastMoveAt: number;
  score: number;
  time: number;
}

export const NODE_REACH = 46;
const CRAWL_SECONDS = 1.4;
const FADE_SECONDS = 0.8;

export const pathLength = (edges: readonly Edge[], path: readonly number[]): number => {
  let sum = 0;
  for (let i = 1; i < path.length; i += 1) {
    const a = path[i - 1];
    const b = path[i];
    sum += edges.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a))?.cm ?? 0;
  }
  return sum;
};

export const linked = (edges: readonly Edge[], a: number, b: number): boolean => edges.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));

/** Every simple way from `start` to `end` (a small map: a few hundred at most). */
export function allWays(count: number, edges: readonly Edge[], start: number, end: number): number[][] {
  const out: number[][] = [];
  const walk = (path: number[]): void => {
    const last = path[path.length - 1] ?? start;
    if (last === end) {
      out.push([...path]);
      return;
    }
    if (out.length > 2000) return;
    for (let n = 0; n < count; n += 1) if (!path.includes(n) && linked(edges, last, n)) walk([...path, n]);
  };
  walk([start]);
  return out;
}

interface Board {
  nodes: Point[];
  edges: Edge[];
  start: number;
  end: number;
  target: number;
  answer: number[];
}

/** A map of stones on a cols × rows grid (a little jittered), joined to their neighbours, with an asked length. */
export function makeBoard(rng: Rng, cols: number, rows: number, area: { x: number; y: number; w: number; h: number }): Board {
  for (;;) {
    const dx = area.w / (cols - 1);
    const dy = area.h / (rows - 1);
    const nodes: Point[] = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) nodes.push({ x: area.x + c * dx + rng.range(-0.14, 0.14) * dx, y: area.y + r * dy + rng.range(-0.14, 0.14) * dy });
    }
    const edges: Edge[] = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const i = r * cols + c;
        if (c < cols - 1 && rng.chance(0.8)) edges.push({ a: i, b: i + 1, cm: rng.int(1, 5) });
        if (r < rows - 1 && rng.chance(0.8)) edges.push({ a: i, b: i + cols, cm: rng.int(1, 5) });
      }
    }
    const corners = [0, cols - 1, (rows - 1) * cols, rows * cols - 1];
    const startCorner = rng.int(0, 3);
    const start = corners[startCorner] ?? 0;
    const end = corners[3 - startCorner] ?? nodes.length - 1;
    const ways = allWays(nodes.length, edges, start, end).filter((w) => w.length <= 7);
    const sums = [...new Set(ways.map((w) => pathLength(edges, w)))];
    // A fair map: a way of the asked length, and some other length to tell it from.
    if (sums.length < 2) continue;
    const target = sums[rng.int(0, sums.length - 1)] ?? 0;
    const answer = ways.filter((w) => pathLength(edges, w) === target).sort((a, b) => a.length - b.length)[0];
    if (!answer || target > 15) continue;
    return { nodes, edges, start, end, target, answer };
  }
}

export function createPolylineLength({ arena, rng }: GameSetup): MinigameLogic<PolylineState> {
  const events = eventQueue();
  const landscape = arena.width > arena.height * 1.15;
  const top = HUD_SAFE_TOP + 135;
  const area = { x: 80, y: top, w: arena.width - 160, h: arena.height - top - 70 };
  const cols = landscape ? 4 : 3;
  const rows = landscape ? 3 : Math.min(5, Math.max(4, Math.floor(area.h / 200) + 1));
  const state: PolylineState = { nodes: [], edges: [], start: 0, end: 0, target: 0, answer: [], path: [], result: null, boards: 0, lastMoveAt: 0, score: 0, time: 0 };

  function next(): void {
    const board = makeBoard(rng, cols, rows, area);
    Object.assign(state, board);
    state.path = [];
    state.result = null;
    state.boards += 1;
    state.lastMoveAt = state.time;
  }
  next();

  const nodeAt = (p: Point): number => state.nodes.findIndex((n) => Math.hypot(n.x - p.x, n.y - p.y) <= NODE_REACH);

  function finish(): void {
    const path = state.path;
    state.path = [];
    if (path[path.length - 1] !== state.end || path.length < 2) return;
    const right = pathLength(state.edges, path) === state.target;
    state.result = { right, ago: 0, path };
    const end = state.nodes[state.end] ?? { x: 0, y: 0 };
    if (right) {
      state.score += 1;
      events.push({ type: 'score', ...end });
    } else events.push({ type: 'miss', ...end });
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
      if (state.result) {
        state.result.ago += dt;
        if (state.result.right && state.result.ago >= CRAWL_SECONDS) next();
        else if (!state.result.right && state.result.ago >= FADE_SECONDS) state.result = null;
        else return;
      }
      if (input.pressed && input.pointer && nodeAt(input.pointer) === state.start) {
        state.path = [state.start];
        state.lastMoveAt = state.time;
      }
      if (input.pointer && state.path.length > 0) {
        const n = nodeAt(input.pointer);
        const last = state.path[state.path.length - 1] ?? state.start;
        if (n >= 0 && n === state.path[state.path.length - 2]) {
          state.path.pop();
          state.lastMoveAt = state.time;
        } else if (n >= 0 && !state.path.includes(n) && linked(state.edges, last, n)) {
          state.path.push(n);
          state.lastMoveAt = state.time;
          const at = state.nodes[n] ?? { x: 0, y: 0 };
          events.push({ type: 'action', ...at, note: 60 + Math.min(24, pathLength(state.edges, state.path)), voice: 'bell' });
        }
      }
      if (input.released && state.path.length > 0) finish();
    },
  };
}

/** Good play: it traces a way of the asked length, a stone per decision, and lets go on the lettuce. */
export function polylineBot(state: PolylineState, _context: BotContext): BotMove {
  if (state.result) return {};
  if (state.path.length === 0 && state.time - state.lastMoveAt < 0.8) return {};
  const onWay = state.path.every((n, i) => state.answer[i] === n);
  if (!onWay) return {};
  if (state.path.length === state.answer.length) return {};
  const next = state.answer[state.path.length];
  const at = next === undefined ? undefined : state.nodes[next];
  return at ? { touch: { ...at } } : {};
}
