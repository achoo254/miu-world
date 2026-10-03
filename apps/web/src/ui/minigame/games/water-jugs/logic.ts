// Water jugs: three cans of different sizes (3, 5 and 8 litres, or other sets), some full. The cow's trough
// asks for an exact amount. The child taps a can, then another: water pours from the first into the second
// until the second is full or the first is empty. As soon as a can holds the asked amount, it goes into the
// trough: a point, and the next puzzle. A "Làm lại" button puts the cans back as they were. Every puzzle is
// checked solvable (and how many pours it takes) by a search over all the ways the water can be.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Puzzle {
  caps: readonly number[];
  start: readonly number[];
  target: number;
  /** Fewest pours that solve it. */
  moves: number;
}

/** Can sets: sizes and how they start (the biggest full). */
const SETS: readonly { caps: readonly number[]; start: readonly number[] }[] = [
  { caps: [3, 5, 8], start: [0, 0, 8] },
  { caps: [3, 4, 7], start: [0, 0, 7] },
  { caps: [2, 5, 7], start: [0, 0, 7] },
  { caps: [4, 5, 9], start: [0, 0, 9] },
  { caps: [3, 5, 8], start: [3, 0, 5] },
  { caps: [2, 3, 6], start: [0, 0, 6] },
];

export type Move = readonly [number, number];

/** The cans after pouring `from` into `to`. */
export function pour(levels: readonly number[], caps: readonly number[], from: number, to: number): number[] {
  const out = [...levels];
  const amount = Math.min(out[from] ?? 0, (caps[to] ?? 0) - (out[to] ?? 0));
  out[from] = (out[from] ?? 0) - amount;
  out[to] = (out[to] ?? 0) + amount;
  return out;
}

/** Fewest pours from `levels` to a can holding `target` (empty when one already does; null if impossible). */
export function solve(levels: readonly number[], caps: readonly number[], target: number): Move[] | null {
  const key = (l: readonly number[]): string => l.join(',');
  const seen = new Map<string, { prev: string | null; move: Move | null; levels: readonly number[] }>([[key(levels), { prev: null, move: null, levels }]]);
  const queue: (readonly number[])[] = [levels];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    if (current.includes(target)) {
      const moves: Move[] = [];
      let k: string | null = key(current);
      while (k) {
        const node = seen.get(k);
        if (!node?.move) break;
        moves.unshift(node.move);
        k = node.prev;
      }
      return moves;
    }
    for (let from = 0; from < caps.length; from += 1) {
      for (let to = 0; to < caps.length; to += 1) {
        if (from === to) continue;
        const next = pour(current, caps, from, to);
        const k = key(next);
        if (seen.has(k)) continue;
        seen.set(k, { prev: key(current), move: [from, to], levels: next });
        queue.push(next);
      }
    }
  }
  return null;
}

/** Every puzzle the sets make whose fewest pours lie in [min, max]. */
export function puzzles(min: number, max: number): Puzzle[] {
  const out: Puzzle[] = [];
  for (const set of SETS) {
    const top = Math.max(...set.caps);
    for (let target = 1; target < top; target += 1) {
      const moves = solve(set.start, set.caps, target)?.length;
      if (moves !== undefined && moves >= min && moves <= max) out.push({ caps: set.caps, start: set.start, target, moves });
    }
  }
  return out;
}

const EASY = puzzles(2, 3);
const MEDIUM = puzzles(3, 5);
const HARD = puzzles(4, 7);

export interface Jug {
  cap: number;
  level: number;
  x: number;
  /** Bottom of the can, and its height (taller for more litres). */
  bottom: number;
  height: number;
  width: number;
}

export interface JugsState {
  puzzle: Puzzle;
  jugs: Jug[];
  /** The can chosen to pour from (-1: none). */
  selected: number;
  /** A pour in progress: from, to, amount and seconds into it. */
  pouring: { from: number; to: number; amount: number; t: number } | null;
  trough: Point;
  reset: Point;
  resetRadius: number;
  /** Seconds since solved (the cow drinks), -1 while working. */
  solved: number;
  /** Which can held the answer. */
  answer: number;
  pours: number;
  solvedCount: number;
  score: number;
  time: number;
}

export const POUR_SECONDS = 0.5;
const DRINK_SECONDS = 1.1;

export function createWaterJugs({ arena, params, rng }: GameSetup): MinigameLogic<JugsState> {
  const hard = params.hard === true;
  const events = eventQueue();
  const baseY = arena.height - 50;
  const trough = { x: arena.width - 150, y: HUD_SAFE_TOP + 50 };
  const resetRadius = Math.max(TOUCH_RADIUS + 4, 46);
  const reset = { x: resetRadius + 24, y: HUD_SAFE_TOP + 56 };
  const pickPuzzle = (): Puzzle => {
    const pool = hard ? HARD : state.solvedCount < 1 ? EASY : state.solvedCount < 3 ? MEDIUM : HARD;
    return pool[rng.int(0, pool.length - 1)] ?? { caps: [3, 5, 8], start: [0, 0, 8], target: 4, moves: 6 };
  };
  const state: JugsState = {
    puzzle: { caps: [3, 5, 8], start: [0, 0, 8], target: 4, moves: 6 },
    jugs: [],
    selected: -1,
    pouring: null,
    trough,
    reset,
    resetRadius,
    solved: -1,
    answer: -1,
    pours: 0,
    solvedCount: 0,
    score: 0,
    time: 0,
  };

  function setUp(puzzle: Puzzle): void {
    const n = puzzle.caps.length;
    const top = Math.max(...puzzle.caps);
    const maxH = Math.min(440, baseY - (HUD_SAFE_TOP + 180));
    const width = Math.min(150, (arena.width - 60) / n - 30);
    state.puzzle = puzzle;
    state.jugs = puzzle.caps.map((cap, i) => ({
      cap,
      level: puzzle.start[i] ?? 0,
      x: (arena.width / n) * (i + 0.5),
      bottom: baseY,
      height: maxH * (0.35 + 0.65 * (cap / top)),
      width,
    }));
    state.selected = -1;
    state.pouring = null;
    state.solved = -1;
    state.answer = -1;
  }

  const jugAt = (p: Point): number =>
    state.jugs.findIndex((j) => p.x >= j.x - j.width / 2 - 24 && p.x <= j.x + j.width / 2 + 24 && p.y >= j.bottom - j.height - 50 && p.y <= j.bottom + 30);

  setUp(pickPuzzle());

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
      if (state.solved >= 0) {
        state.solved += dt;
        if (state.solved >= DRINK_SECONDS) setUp(pickPuzzle());
        return;
      }
      if (state.pouring) {
        state.pouring.t += dt;
        if (state.pouring.t < POUR_SECONDS) return;
        const { from, to } = state.pouring;
        const next = pour(
          state.jugs.map((j) => j.level),
          state.puzzle.caps,
          from,
          to,
        );
        state.jugs.forEach((j, i) => {
          j.level = next[i] ?? j.level;
        });
        state.pouring = null;
        state.pours += 1;
        const answer = state.jugs.findIndex((j) => j.level === state.puzzle.target);
        if (answer >= 0) {
          const jug = state.jugs[answer];
          state.answer = answer;
          state.solved = 0;
          state.solvedCount += 1;
          state.score += 1;
          events.push({ type: 'score', x: jug?.x ?? trough.x, y: (jug?.bottom ?? trough.y) - (jug?.height ?? 0) });
        }
        return;
      }
      for (const tap of input.taps) {
        if (Math.hypot(tap.x - reset.x, tap.y - reset.y) <= resetRadius * 1.3) {
          state.jugs.forEach((j, i) => {
            j.level = state.puzzle.start[i] ?? 0;
          });
          state.selected = -1;
          events.push({ type: 'action', x: reset.x, y: reset.y });
          continue;
        }
        const i = jugAt(tap);
        if (i < 0) continue;
        if (state.selected < 0) {
          if ((state.jugs[i]?.level ?? 0) > 0) state.selected = i;
          continue;
        }
        if (state.selected === i) {
          state.selected = -1;
          continue;
        }
        const from = state.selected;
        const amount = Math.min(state.jugs[from]?.level ?? 0, (state.jugs[i]?.cap ?? 0) - (state.jugs[i]?.level ?? 0));
        state.selected = -1;
        const jug = state.jugs[i];
        if (amount <= 0 || !jug) {
          events.push({ type: 'miss', x: jug?.x ?? 0, y: (jug?.bottom ?? 0) - (jug?.height ?? 0) });
          continue;
        }
        state.pouring = { from, to: i, amount, t: 0 };
        events.push({ type: 'action', x: jug.x, y: jug.bottom - jug.height });
        break;
      }
    },
  };
}

/** Good play: works out the fewest pours and makes them, one tap at a time. */
export function waterJugsBot(state: JugsState, _context: BotContext): BotMove {
  if (state.solved >= 0 || state.pouring || Math.floor(state.time * 10) % 3 !== 0) return {};
  const plan = solve(
    state.jugs.map((j) => j.level),
    state.puzzle.caps,
    state.puzzle.target,
  );
  const move = plan?.[0];
  if (!move) return { tap: state.reset };
  const [from, to] = move;
  const target = state.selected === from ? state.jugs[to] : state.selected < 0 ? state.jugs[from] : state.jugs[state.selected];
  return target ? { tap: { x: target.x, y: target.bottom - target.height / 2 } } : {};
}
