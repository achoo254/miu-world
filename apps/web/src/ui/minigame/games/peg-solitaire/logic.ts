// Peg solitaire on the 15-hole triangle: gems fill every hole but one. The child taps a gem, then an empty hole
// two steps away in a straight line with a gem between: the gem hops over and the one jumped is taken. The score
// is the gems taken; leaving two or fewer (12 taken) wins. A board with no hop left and three or more gems is
// stuck: the "Lùi" button takes hops back (it may be used any time). A board finished with two or fewer gems is
// banked and a fresh one is set. Every start offered is solvable to one gem. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const ROWS = 5;
export const HOLES = (ROWS * (ROWS + 1)) / 2;
/** Hops in the triangle's six directions (row, col steps). */
const DIRECTIONS: readonly (readonly [number, number])[] = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
  [1, 1],
  [-1, -1],
];

export const indexOf = (row: number, col: number): number => (row < 0 || col < 0 || col > row || row >= ROWS ? -1 : (row * (row + 1)) / 2 + col);
export const rowCol = (i: number): [number, number] => {
  let row = 0;
  while (indexOf(row + 1, 0) <= i && row + 1 < ROWS) row += 1;
  return [row, i - indexOf(row, 0)];
};

export type Hop = readonly [from: number, over: number, to: number];

/** Every legal hop on a board (bit i set = gem in hole i). */
export function hops(board: number): Hop[] {
  const out: Hop[] = [];
  for (let i = 0; i < HOLES; i += 1) {
    if (!(board & (1 << i))) continue;
    const [r, c] = rowCol(i);
    for (const [dr, dc] of DIRECTIONS) {
      const over = indexOf(r + dr, c + dc);
      const to = indexOf(r + 2 * dr, c + 2 * dc);
      if (over >= 0 && to >= 0 && board & (1 << over) && !(board & (1 << to))) out.push([i, over, to]);
    }
  }
  return out;
}

export const gems = (board: number): number => {
  let n = 0;
  for (let b = board; b; b &= b - 1) n += 1;
  return n;
};

const solutions = new Map<number, Hop[] | null>();
/** Hops that bring a board down to one gem, or null when it cannot be done. */
export function solve(board: number): Hop[] | null {
  if (gems(board) === 1) return [];
  const known = solutions.get(board);
  if (known !== undefined) return known;
  let found: Hop[] | null = null;
  for (const hop of hops(board)) {
    const [from, over, to] = hop;
    const rest = solve((board & ~(1 << from) & ~(1 << over)) | (1 << to));
    if (rest) {
      found = [hop, ...rest];
      break;
    }
  }
  solutions.set(board, found);
  return found;
}

const FULL = (1 << HOLES) - 1;
/** Empty holes a board can start from and still be cleared to one gem. */
export const STARTS: readonly number[] = Array.from({ length: HOLES }, (_, i) => i).filter((i) => solve(FULL & ~(1 << i)) !== null);

export interface PegState {
  board: number;
  /** Boards before each hop on this board (for "Lùi"). */
  history: number[];
  selected: number;
  /** Hole centres and the radius a tap reaches. */
  holes: Point[];
  reach: number;
  undo: Point;
  undoRadius: number;
  /** The last hop and how long ago (the gem's arc). */
  lastHop: Hop | null;
  hopAgo: number;
  /** Gems taken on boards already finished. */
  banked: number;
  /** Seconds since this board was finished (it sparkles, then a new one), -1 while playing. */
  cleared: number;
  stuck: boolean;
  boards: number;
  time: number;
}

const NEXT_SECONDS = 1.2;
export const HOP_SECONDS = 0.3;

export function createPegSolitaire({ arena, rng }: GameSetup): MinigameLogic<PegState> {
  const events = eventQueue();
  const undoRadius = Math.max(TOUCH_RADIUS + 6, 48);
  const availH = arena.height - HUD_SAFE_TOP - undoRadius * 2 - 90;
  const s = Math.min((arena.width - 60) / ROWS, availH / (ROWS * 0.88), 130);
  const top = HUD_SAFE_TOP + 60 + (availH - 30 - ROWS * 0.88 * s) / 2 + s * 0.44;
  const holes: Point[] = Array.from({ length: HOLES }, (_, i) => {
    const [r, c] = rowCol(i);
    return { x: arena.width / 2 + (c - r / 2) * s, y: top + r * s * 0.88 };
  });
  const state: PegState = {
    board: 0,
    history: [],
    selected: -1,
    holes,
    reach: s * 0.5,
    undo: { x: arena.width / 2, y: arena.height - undoRadius - 24 },
    undoRadius,
    lastHop: null,
    hopAgo: 99,
    banked: 0,
    cleared: -1,
    stuck: false,
    boards: 0,
    time: 0,
  };

  function newBoard(): void {
    const empty = STARTS[rng.int(0, STARTS.length - 1)] ?? 0;
    state.board = FULL & ~(1 << empty);
    state.history = [];
    state.selected = -1;
    state.lastHop = null;
    state.cleared = -1;
    state.stuck = false;
    state.boards += 1;
  }

  const holeAt = (p: Point): number => {
    let best = -1;
    let bestD = state.reach;
    holes.forEach((h, i) => {
      const d = Math.hypot(h.x - p.x, h.y - p.y);
      if (d <= bestD) {
        best = i;
        bestD = d;
      }
    });
    return best;
  };

  function tap(p: Point): void {
    if (Math.hypot(p.x - state.undo.x, p.y - state.undo.y) <= undoRadius * 1.3) {
      const before = state.history.pop();
      if (before !== undefined) {
        state.board = before;
        state.selected = -1;
        state.stuck = false;
        state.lastHop = null;
        events.push({ type: 'action', x: state.undo.x, y: state.undo.y });
      }
      return;
    }
    const i = holeAt(p);
    if (i < 0) return;
    const hasGem = (state.board & (1 << i)) !== 0;
    if (hasGem) {
      state.selected = state.selected === i ? -1 : hops(state.board).some(([from]) => from === i) ? i : -1;
      if (state.selected < 0 && !hops(state.board).some(([from]) => from === i)) events.push({ type: 'miss', x: holes[i]?.x ?? 0, y: holes[i]?.y ?? 0 });
      return;
    }
    const hop = hops(state.board).find(([from, , to]) => from === state.selected && to === i);
    if (!hop) return;
    const [from, over, to] = hop;
    state.history.push(state.board);
    state.board = (state.board & ~(1 << from) & ~(1 << over)) | (1 << to);
    state.selected = -1;
    state.lastHop = hop;
    state.hopAgo = 0;
    const o = holes[over] ?? { x: 0, y: 0 };
    events.push({ type: 'score', x: o.x, y: o.y });
    if (hops(state.board).length === 0) {
      if (gems(state.board) <= 2) state.cleared = 0;
      else state.stuck = true;
    }
  }

  newBoard();

  return {
    state,
    get score() {
      return state.banked + (HOLES - 1 - gems(state.board));
    },
    get done() {
      return false;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.hopAgo += dt;
      if (state.cleared >= 0) {
        state.cleared += dt;
        if (state.cleared >= NEXT_SECONDS) {
          state.banked += HOLES - 1 - gems(state.board);
          newBoard();
        }
        return;
      }
      for (const p of input.taps) tap(p);
    },
  };
}

/** Good play: plans the whole board to one gem and plays it, a gem and then its hole. */
export function pegSolitaireBot(state: PegState, _context: BotContext): BotMove {
  if (state.cleared >= 0 || state.hopAgo < HOP_SECONDS || Math.floor(state.time * 10) % 3 !== 0) return {};
  const plan = solve(state.board);
  const hop = plan?.[0];
  if (!hop) return { tap: state.undo };
  const [from, , to] = hop;
  const target = state.selected === from ? state.holes[to] : state.holes[from];
  return target ? { tap: target } : {};
}
