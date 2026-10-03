// Pair link (Shisen-Sho / Onet): a board of picture tiles. Tap two tiles with the same picture: if a line
// with at most two bends can join them through empty squares (or around the board's edge), both go (a
// point). Stuck for a while: a matching pair glows. No pair left that can be joined: the tiles reshuffle. A
// cleared board deals a new one. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const PICTURES = ['cat-face', 'dog-face', 'panda', 'frog', 'owl', 'penguin', 'turtle', 'octopus'] as const;

export interface Cell {
  col: number;
  row: number;
}

export interface PairLinkState {
  cols: number;
  rows: number;
  /** Picture index per square (row-major), -1 when empty. */
  tiles: number[];
  cell: number;
  /** Screen position of square (0, 0)'s top-left corner. */
  left: number;
  top: number;
  selected: number | null;
  /** The last join, drawn for a moment: the squares the line passes through (outside ones included). */
  link: { path: Cell[]; ago: number; picture: number; from: number; to: number } | null;
  /** A pair to glow after a while without a match. */
  hint: [number, number] | null;
  /** Seconds since the last match (hint after HINT_SECONDS), since a wrong pick, since a reshuffle. */
  sinceMatch: number;
  wrongAgo: number;
  shuffledAgo: number;
  score: number;
  time: number;
}

export const HINT_SECONDS = 6;
/** The bot looks this long for a pair before tapping it. */
const BOT_LOOK_SECONDS = 2.5;

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/** The squares of a line from a to b with at most two bends through empty squares (padded by one ring), or null. */
export function findLink(state: Pick<PairLinkState, 'cols' | 'rows' | 'tiles'>, a: number, b: number): Cell[] | null {
  const W = state.cols + 2;
  const H = state.rows + 2;
  const at = (i: number): Cell => ({ col: (i % state.cols) + 1, row: Math.floor(i / state.cols) + 1 });
  const start = at(a);
  const goal = at(b);
  const free = (c: number, r: number): boolean => {
    if (c < 0 || r < 0 || c >= W || r >= H) return false;
    if (c === goal.col && r === goal.row) return true;
    if (c === 0 || r === 0 || c === W - 1 || r === H - 1) return true;
    return (state.tiles[(r - 1) * state.cols + (c - 1)] ?? -1) < 0;
  };
  // Breadth-first over (square, direction) by number of bends.
  type Node = { c: number; r: number; d: number; turns: number; path: Cell[] };
  const best = new Map<string, number>();
  let queue: Node[] = DIRS.map((_, d) => ({ c: start.col, r: start.row, d, turns: 0, path: [start] }));
  while (queue.length > 0) {
    const next: Node[] = [];
    for (const node of queue) {
      const [dx, dy] = DIRS[node.d] ?? [0, 0];
      let c = node.c + dx;
      let r = node.r + dy;
      const path = [...node.path];
      while (free(c, r)) {
        path.push({ col: c, row: r });
        if (c === goal.col && r === goal.row) return path.map((p) => ({ col: p.col - 1, row: p.row - 1 }));
        if (node.turns < 2) {
          for (let d = 0; d < 4; d += 1) {
            if (d === node.d) continue;
            const key = `${c},${r},${d}`;
            if ((best.get(key) ?? 9) <= node.turns + 1) continue;
            best.set(key, node.turns + 1);
            next.push({ c, r, d, turns: node.turns + 1, path: [...path] });
          }
        }
        c += dx;
        r += dy;
      }
    }
    queue = next;
  }
  return null;
}

/** Some pair that can be joined now, or null. */
export function findPair(state: Pick<PairLinkState, 'cols' | 'rows' | 'tiles'>): [number, number] | null {
  for (let a = 0; a < state.tiles.length; a += 1) {
    const picture = state.tiles[a] ?? -1;
    if (picture < 0) continue;
    for (let b = a + 1; b < state.tiles.length; b += 1) if (state.tiles[b] === picture && findLink(state, a, b)) return [a, b];
  }
  return null;
}

export function createPairLink({ arena, rng }: GameSetup): MinigameLogic<PairLinkState> {
  const events = eventQueue();
  const landscape = arena.width >= arena.height;
  const cols = landscape ? 8 : 4;
  const rows = landscape ? 4 : 8;
  const top0 = HUD_SAFE_TOP + 16;
  const cell = Math.min(120, (arena.width - 40) / cols, (arena.height - top0 - 24) / rows);
  const state: PairLinkState = {
    cols,
    rows,
    tiles: [],
    cell,
    left: (arena.width - cell * cols) / 2,
    top: top0 + (arena.height - top0 - 10 - cell * rows) / 2,
    selected: null,
    link: null,
    hint: null,
    sinceMatch: 0,
    wrongAgo: 9,
    shuffledAgo: 9,
    score: 0,
    time: 0,
  };

  function shuffle(values: number[]): number[] {
    const out = [...values];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = rng.int(0, i);
      const t = out[i] ?? 0;
      out[i] = out[j] ?? 0;
      out[j] = t;
    }
    return out;
  }
  /** Moves the remaining tiles around until some pair can be joined. */
  function reshuffle(): void {
    for (let tries = 0; tries < 50; tries += 1) {
      const slots = state.tiles.map((t, i) => (t >= 0 ? i : -1)).filter((i) => i >= 0);
      const pictures = shuffle(slots.map((i) => state.tiles[i] ?? 0));
      slots.forEach((slot, k) => (state.tiles[slot] = pictures[k] ?? 0));
      if (findPair(state)) return;
    }
  }
  function deal(): void {
    const count = cols * rows;
    state.tiles = shuffle(Array.from({ length: count }, (_, i) => Math.floor(i / 4) % PICTURES.length));
    if (!findPair(state)) reshuffle();
    state.selected = null;
  }
  deal();

  const tileAt = (p: Point): number => {
    const col = Math.floor((p.x - state.left) / state.cell);
    const row = Math.floor((p.y - state.top) / state.cell);
    if (col < 0 || row < 0 || col >= cols || row >= rows) return -1;
    const i = row * cols + col;
    return (state.tiles[i] ?? -1) >= 0 ? i : -1;
  };
  const centre = (i: number): Point => ({ x: state.left + ((i % cols) + 0.5) * state.cell, y: state.top + (Math.floor(i / cols) + 0.5) * state.cell });

  function pick(i: number): void {
    const first = state.selected;
    if (first === null || first === i) {
      state.selected = first === i ? null : i;
      if (first !== i) events.push({ type: 'action', ...centre(i) });
      return;
    }
    const picture = state.tiles[i] ?? -1;
    const path = picture === state.tiles[first] ? findLink(state, first, i) : null;
    if (!path) {
      state.selected = i;
      state.wrongAgo = 0;
      events.push({ type: 'miss', ...centre(i) });
      return;
    }
    state.tiles[first] = -1;
    state.tiles[i] = -1;
    state.link = { path, ago: 0, picture, from: first, to: i };
    state.selected = null;
    state.hint = null;
    state.sinceMatch = 0;
    state.score += 1;
    const a = centre(first);
    const b = centre(i);
    events.push({ type: 'score', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    if (state.tiles.every((t) => t < 0)) deal();
    else if (!findPair(state)) {
      reshuffle();
      state.shuffledAgo = 0;
    }
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
      state.sinceMatch += dt;
      state.wrongAgo += dt;
      state.shuffledAgo += dt;
      if (state.link) {
        state.link.ago += dt;
        if (state.link.ago > 0.5) state.link = null;
      }
      for (const tap of input.taps) {
        const i = tileAt(tap);
        if (i >= 0) pick(i);
      }
      if (state.sinceMatch > HINT_SECONDS && !state.hint) state.hint = findPair(state);
    },
  };
}

/** Good play: find a pair that joins and tap its two tiles, one per decision. */
export function pairLinkBot(state: PairLinkState, _context: BotContext): BotMove {
  // A child looks over the board before picking: a moment between pairs.
  if (state.selected === null && state.sinceMatch < BOT_LOOK_SECONDS) return {};
  const pair = findPair(state);
  if (!pair) return {};
  const [a, b] = pair;
  // With a or b already picked, tap the other; otherwise start with a (it replaces any other pick).
  const target = state.selected === a ? b : state.selected === b ? a : a;
  return { tap: { x: state.left + ((target % state.cols) + 0.5) * state.cell, y: state.top + (Math.floor(target / state.cols) + 0.5) * state.cell } };
}
