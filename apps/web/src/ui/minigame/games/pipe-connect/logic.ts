// Pipe connect: a grid of pipe tiles (straight and bends) lies between a well on the left and a dry field on
// the right. A tap turns a tile a quarter round. Water runs through every tile joined to the well, so the
// child sees how far it gets; once it reaches the field the board is done (a point) and a new one comes. The
// first board is 4 × 4, then 5 × 5. Every board has a way through. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type Arena, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

/** Openings of a tile: one bit per side. */
export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;

export interface Tile {
  /** Sides it opens to now. */
  open: number;
  /** Sides it must open to on the way through (0 for a tile off the way). */
  need: number;
  /** Seconds since it was last turned (a quick spin). */
  turned: number;
}

export interface PipeState {
  size: number;
  cell: number;
  left: number;
  top: number;
  tiles: Tile[];
  /** Rows of the well (enters the left column) and of the field (leaves the right column). */
  sourceRow: number;
  targetRow: number;
  /** Tiles the water reaches, by index. */
  wet: boolean[];
  /** Seconds since the water reached the field (-1 before). */
  doneAgo: number;
  boards: number;
  turns: number;
  score: number;
  time: number;
}

const NEXT_SECONDS = 1.5;
const STRAIGHTS = [N | S, E | W] as const;
const BENDS = [N | E, E | S, S | W, W | N] as const;

/** The same tile a quarter turn clockwise. */
export const turn = (open: number): number => ((open << 1) | (open >> 3)) & 15;
const opposite = (side: number): number => turn(turn(side));
const STEPS: ReadonlyArray<readonly [number, number, number]> = [
  [N, 0, -1],
  [E, 1, 0],
  [S, 0, 1],
  [W, -1, 0],
];

/** Same shape (a straight matches either way round). */
export const fits = (tile: Tile): boolean => tile.need === 0 || tile.open === tile.need;

export function boardLayout(arena: Arena, size: number): { cell: number; left: number; top: number } {
  const cell = Math.min(110, (arena.width - 150) / size, (arena.height - HUD_SAFE_TOP - 40) / size);
  return { cell, left: (arena.width - cell * size) / 2, top: HUD_SAFE_TOP + 20 + (arena.height - HUD_SAFE_TOP - 40 - cell * size) / 2 };
}

/** A random way from the left column to the right one, never crossing itself. */
function findWay(rng: Rng, size: number, from: number, to: number): Array<[number, number]> {
  const seen = new Set<number>();
  const way: Array<[number, number]> = [];
  const walk = (x: number, y: number): boolean => {
    seen.add(y * size + x);
    way.push([x, y]);
    if (x === size - 1 && y === to) return true;
    // Mostly rightward, sometimes up or down, rarely back: a winding but short way.
    const moves = STEPS.map(([, dx, dy]) => ({ dx, dy, w: rng.next() + (dx === 1 ? 0.6 : dx === -1 ? -0.5 : 0) })).sort((a, b) => b.w - a.w);
    for (const { dx, dy } of moves) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size || seen.has(ny * size + nx)) continue;
      if (walk(nx, ny)) return true;
    }
    way.pop();
    return false;
  };
  walk(0, from);
  return way;
}

function makeBoard(rng: Rng, state: PipeState, arena: Arena): void {
  const size = state.boards === 0 ? 4 : 5;
  const { cell, left, top } = boardLayout(arena, size);
  const sourceRow = rng.int(0, size - 1);
  const targetRow = rng.int(0, size - 1);
  const tiles: Tile[] = Array.from({ length: size * size }, () => {
    const open = rng.chance(0.5) ? rng.pick(STRAIGHTS) : rng.pick(BENDS);
    return { open, need: 0, turned: 9 };
  });
  const way = findWay(rng, size, sourceRow, targetRow);
  way.forEach(([x, y], i) => {
    const prev = way[i - 1];
    const next = way[i + 1];
    const sideTo = (a: readonly [number, number], b: readonly [number, number]): number => STEPS.find(([, dx, dy]) => a[0] + dx === b[0] && a[1] + dy === b[1])?.[0] ?? 0;
    const inSide = prev ? sideTo([x, y], prev) : W;
    const outSide = next ? sideTo([x, y], next) : E;
    const tile = tiles[y * size + x];
    if (tile) {
      tile.need = inSide | outSide;
      tile.open = tile.need;
    }
  });
  // Turn every tile at random; the way through must not be open from the start.
  for (const tile of tiles) for (let k = rng.int(0, 3); k > 0; k -= 1) tile.open = turn(tile.open);
  if (tiles.every(fits)) {
    const first = tiles.find((t) => t.need !== 0);
    if (first) first.open = turn(first.open);
  }
  Object.assign(state, { size, cell, left, top, tiles, sourceRow, targetRow, doneAgo: -1 });
  state.wet = flow(state);
}

/** Tiles joined to the well through matching openings. */
export function flow(state: PipeState): boolean[] {
  const { size, tiles } = state;
  const wet = tiles.map(() => false);
  const start = state.sourceRow * size;
  if (!((tiles[start]?.open ?? 0) & W)) return wet;
  const queue = [start];
  wet[start] = true;
  while (queue.length > 0) {
    const i = queue.shift() ?? 0;
    const x = i % size;
    const y = Math.floor(i / size);
    const open = tiles[i]?.open ?? 0;
    for (const [side, dx, dy] of STEPS) {
      const nx = x + dx;
      const ny = y + dy;
      if (!(open & side) || nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      const j = ny * size + nx;
      if (wet[j] || !((tiles[j]?.open ?? 0) & opposite(side))) continue;
      wet[j] = true;
      queue.push(j);
    }
  }
  return wet;
}

export const reachesField = (state: PipeState): boolean => {
  const i = state.targetRow * state.size + state.size - 1;
  return Boolean(state.wet[i]) && Boolean((state.tiles[i]?.open ?? 0) & E);
};

export function createPipeConnect({ arena, rng }: GameSetup): MinigameLogic<PipeState> {
  const events = eventQueue();
  const state: PipeState = { size: 4, cell: 100, left: 0, top: 0, tiles: [], sourceRow: 0, targetRow: 0, wet: [], doneAgo: -1, boards: 0, turns: 0, score: 0, time: 0 };
  makeBoard(rng, state, arena);

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
      for (const tile of state.tiles) tile.turned += dt;
      if (state.doneAgo >= 0) {
        state.doneAgo += dt;
        if (state.doneAgo >= NEXT_SECONDS) makeBoard(rng, state, arena);
        return;
      }
      const press = input.pressed ? (input.pointer ?? input.taps[0] ?? null) : null;
      if (!press) return;
      const x = Math.floor((press.x - state.left) / state.cell);
      const y = Math.floor((press.y - state.top) / state.cell);
      if (x < 0 || y < 0 || x >= state.size || y >= state.size) return;
      const tile = state.tiles[y * state.size + x];
      if (!tile) return;
      tile.open = turn(tile.open);
      tile.turned = 0;
      state.turns += 1;
      events.push({ type: 'action', x: state.left + (x + 0.5) * state.cell, y: state.top + (y + 0.5) * state.cell });
      state.wet = flow(state);
      if (reachesField(state)) {
        state.boards += 1;
        state.score += 1;
        state.doneAgo = 0;
        events.push({ type: 'score', x: state.left + state.size * state.cell + 40, y: state.top + (state.targetRow + 0.5) * state.cell });
      }
    },
  };
}

/** Good play: turn the tiles on the way through until each one fits. */
export function pipeConnectBot(state: PipeState, _context: BotContext): BotMove {
  if (state.doneAgo >= 0) return {};
  const i = state.tiles.findIndex((t) => !fits(t));
  if (i < 0) return {};
  return { tap: { x: state.left + ((i % state.size) + 0.5) * state.cell, y: state.top + (Math.floor(i / state.size) + 0.5) * state.cell } };
}
