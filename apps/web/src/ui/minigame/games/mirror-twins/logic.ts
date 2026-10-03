// Mirror twins: two little gardens side by side with a mirror between them. The child walks in the left one,
// her twin in the right one, and every swipe moves both: the same way up and down, but the opposite way left
// and right, like a reflection. Rocks stop whoever walks into them (the other one still moves). When both stand
// on their own star at the same time, that pair of gardens is done: a point. "Lùi" takes a step back.
// Every garden is checked solvable before it is shown. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point, type SwipeDirection } from '../../types';

export const SIZE = 5;
const DIRS: Record<SwipeDirection, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const ORDER: SwipeDirection[] = ['up', 'down', 'left', 'right'];

export interface Garden {
  rocks: Set<number>;
  star: number;
}

export interface TwinsState {
  /** Left garden's corner, the right garden's corner, cell size. */
  leftX: number;
  rightX: number;
  top: number;
  cell: number;
  gardens: [Garden, Garden];
  /** Where the child (0) and her twin (1) stand (index row * SIZE + col). */
  at: [number, number];
  from: [number, number];
  movedAgo: number;
  /** Seconds since one of them bumped a rock. */
  bumpAgo: [number, number];
  history: Array<[number, number]>;
  undo: Point & { r: number };
  /** Shortest way to finish from here. */
  plan: SwipeDirection[];
  doneAgo: number;
  boards: number;
  score: number;
  time: number;
}

const DONE_SECONDS = 1.3;

/** Where one walker ends up after a swipe (the twin's left and right are swapped). */
export function stepOne(garden: Garden, at: number, dir: SwipeDirection, mirrored: boolean): number {
  const [dx0, dy] = DIRS[dir];
  const dx = mirrored ? -dx0 : dx0;
  const col = (at % SIZE) + dx;
  const row = Math.floor(at / SIZE) + dy;
  if (col < 0 || col >= SIZE || row < 0 || row >= SIZE) return at;
  const next = row * SIZE + col;
  return garden.rocks.has(next) ? at : next;
}

/** Shortest list of swipes that puts both on their stars (breadth-first over both positions), or null. */
export function solveTwins(gardens: readonly [Garden, Garden], at: readonly [number, number]): SwipeDirection[] | null {
  const key = (a: number, b: number): number => a * SIZE * SIZE + b;
  const prev = new Map<number, { from: number; dir: SwipeDirection } | null>([[key(at[0], at[1]), null]]);
  const queue: Array<[number, number]> = [[at[0], at[1]]];
  for (let q = 0; q < queue.length; q += 1) {
    const [a, b] = queue[q] ?? [0, 0];
    if (a === gardens[0].star && b === gardens[1].star) {
      const path: SwipeDirection[] = [];
      for (let k = key(a, b), node = prev.get(k); node; k = node.from, node = prev.get(k)) path.unshift(node.dir);
      return path;
    }
    for (const dir of ORDER) {
      const na = stepOne(gardens[0], a, dir, false);
      const nb = stepOne(gardens[1], b, dir, true);
      const k = key(na, nb);
      if (!prev.has(k)) {
        prev.set(k, { from: key(a, b), dir });
        queue.push([na, nb]);
      }
    }
  }
  return null;
}

function makeBoard(rng: Rng, minMoves: number): { gardens: [Garden, Garden]; at: [number, number]; plan: SwipeDirection[] } {
  let fallback: { gardens: [Garden, Garden]; at: [number, number]; plan: SwipeDirection[] } | null = null;
  for (let tries = 0; tries < 200; tries += 1) {
    const used: [Set<number>, Set<number>] = [new Set(), new Set()];
    const free = (g: 0 | 1): number => {
      let i = rng.int(0, SIZE * SIZE - 1);
      while (used[g].has(i)) i = rng.int(0, SIZE * SIZE - 1);
      used[g].add(i);
      return i;
    };
    const at: [number, number] = [free(0), free(1)];
    const stars = [free(0), free(1)];
    const gardens = ([0, 1] as const).map((g) => {
      const rocks = new Set<number>();
      const count = rng.int(3, 6);
      for (let n = 0; n < count; n += 1) rocks.add(free(g));
      return { rocks, star: stars[g] ?? 0 };
    }) as [Garden, Garden];
    const plan = solveTwins(gardens, at);
    if (!plan) continue;
    if (plan.length >= minMoves && plan.length <= 12) return { gardens, at, plan };
    if (plan.length >= 2 && (!fallback || plan.length > fallback.plan.length)) fallback = { gardens, at, plan };
  }
  return fallback ?? { gardens: [{ rocks: new Set(), star: 4 }, { rocks: new Set(), star: 0 }], at: [0, 4], plan: ['right', 'right', 'right', 'right'] };
}

export function createMirrorTwins({ arena, rng }: GameSetup): MinigameLogic<TwinsState> {
  const events = eventQueue();
  const gap = 40;
  const cell = Math.min((arena.width - 60 - gap) / (SIZE * 2), (arena.height - HUD_SAFE_TOP - 150) / SIZE, 90);
  const total = cell * SIZE * 2 + gap;
  const leftX = (arena.width - total) / 2;
  const top = HUD_SAFE_TOP + 40 + (arena.height - HUD_SAFE_TOP - 150 - cell * SIZE) / 2;
  const state: TwinsState = {
    leftX,
    rightX: leftX + cell * SIZE + gap,
    top,
    cell,
    gardens: [
      { rocks: new Set(), star: 0 },
      { rocks: new Set(), star: 0 },
    ],
    at: [0, 0],
    from: [0, 0],
    movedAgo: 9,
    bumpAgo: [9, 9],
    history: [],
    undo: { x: arena.width / 2, y: Math.min(arena.height - 50, top + cell * SIZE + 60), r: 46 },
    plan: [],
    doneAgo: -1,
    boards: 0,
    score: 0,
    time: 0,
  };

  function newBoard(): void {
    const board = makeBoard(rng, Math.min(7, 4 + state.boards));
    state.gardens = board.gardens;
    state.at = board.at;
    state.from = board.at;
    state.plan = board.plan;
    state.history = [];
    state.doneAgo = -1;
  }

  function swipe(dir: SwipeDirection): void {
    const a = stepOne(state.gardens[0], state.at[0], dir, false);
    const b = stepOne(state.gardens[1], state.at[1], dir, true);
    if (a === state.at[0] && b === state.at[1]) {
      state.bumpAgo = [0, 0];
      events.push({ type: 'miss', x: state.leftX + state.cell * SIZE, y: state.top });
      return;
    }
    if (a === state.at[0]) state.bumpAgo[0] = 0;
    if (b === state.at[1]) state.bumpAgo[1] = 0;
    state.history.push([state.at[0], state.at[1]]);
    state.from = [state.at[0], state.at[1]];
    state.at = [a, b];
    state.movedAgo = 0;
    if (state.plan[0] === dir) state.plan.shift();
    else state.plan = solveTwins(state.gardens, state.at) ?? [];
    events.push({ type: 'action', x: state.leftX + ((a % SIZE) + 0.5) * state.cell, y: state.top + (Math.floor(a / SIZE) + 0.5) * state.cell });
    if (a === state.gardens[0].star && b === state.gardens[1].star) {
      state.doneAgo = 0;
      state.score += 1;
      events.push({ type: 'score', x: state.leftX + state.cell * SIZE + 20, y: state.top + state.cell * 2 });
    }
  }

  newBoard();

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
      state.movedAgo += dt;
      state.bumpAgo = [state.bumpAgo[0] + dt, state.bumpAgo[1] + dt];
      if (state.doneAgo >= 0) {
        state.doneAgo += dt;
        if (state.doneAgo > DONE_SECONDS) {
          state.boards += 1;
          newBoard();
        }
        return;
      }
      for (const t of input.taps) {
        if (Math.hypot(t.x - state.undo.x, t.y - state.undo.y) <= state.undo.r + 10) {
          const last = state.history.pop();
          if (last) {
            state.from = [state.at[0], state.at[1]];
            state.at = last;
            state.movedAgo = 0;
            state.plan = solveTwins(state.gardens, state.at) ?? [];
          }
        }
      }
      for (const s of input.swipes) if (state.doneAgo < 0) swipe(s.direction);
    },
  };
}

/** Good play: follows the shortest way, a swipe every 0.6 s. */
export function twinsBot(state: TwinsState, context: BotContext): BotMove {
  const dir = state.plan[0];
  if (state.doneAgo >= 0 || state.movedAgo < 0.6 || !dir) return {};
  const [dx, dy] = DIRS[dir];
  return { swipe: { from: { x: context.arena.width / 2, y: context.arena.height * 0.6 }, dx: dx * 120, dy: dy * 120 } };
}
