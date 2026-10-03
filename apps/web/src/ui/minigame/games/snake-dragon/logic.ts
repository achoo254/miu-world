// Snake dragon ("rồng rắn lên mây"): the child leads a line of friends holding hands across the school yard,
// one cell at a time. Friends wait here and there in the yard; walking into one adds it to the end of the
// line. A swipe turns the leader; at the fence the line turns by itself (it never crashes). Walking into the
// line itself breaks it there: the friends behind let go and run off. The score is the longest line so far
// (friends only, not the leader), so a break never takes points away. Friends never wait on the cells along the
// fence, so a line left to walk the fence on its own picks nobody up. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type SwipeDirection } from '../../types';

export interface Cell {
  col: number;
  row: number;
}

export interface Segment extends Cell {
  /** Where it was before the last move (for a smooth slide between cells). */
  fromCol: number;
  fromRow: number;
  /** Which friend it is (0 is the leader, the child). */
  friend: number;
}

export interface Friend extends Cell {
  friend: number;
  /** Seconds since it appeared (a pop-in). */
  age: number;
}

export interface Runaway {
  x: number;
  y: number;
  dx: number;
  dy: number;
  friend: number;
  age: number;
}

export interface SnakeState {
  cols: number;
  rows: number;
  cell: number;
  /** Top-left of the grid in arena units. */
  left: number;
  top: number;
  line: Segment[];
  dir: SwipeDirection;
  /** The turn asked for by the last swipe, taken at the next step. */
  queued: SwipeDirection | null;
  waiting: Friend[];
  runaways: Runaway[];
  /** 0 → 1 between two moves (for drawing the slide). */
  progress: number;
  best: number;
  time: number;
}

/** Kinds of friends draw.ts has pictures for. */
export const FRIEND_KINDS = 8;
const STEPS_PER_SECOND = 4.4;
const WAITING = 3;
const TARGET_CELL = 68;

export const DELTA: Readonly<Record<SwipeDirection, Cell>> = { left: { col: -1, row: 0 }, right: { col: 1, row: 0 }, up: { col: 0, row: -1 }, down: { col: 0, row: 1 } };
const OPPOSITE: Readonly<Record<SwipeDirection, SwipeDirection>> = { left: 'right', right: 'left', up: 'down', down: 'up' };
const TURNS: Readonly<Record<SwipeDirection, readonly [SwipeDirection, SwipeDirection]>> = { left: ['up', 'down'], right: ['up', 'down'], up: ['left', 'right'], down: ['left', 'right'] };

export function createSnakeDragon({ arena, params, rng }: GameSetup): MinigameLogic<SnakeState> {
  const speed = typeof params.speed === 'number' ? Math.min(1.4, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const areaW = arena.width - 40;
  const areaH = arena.height - HUD_SAFE_TOP - 34;
  const cols = Math.max(7, Math.round(areaW / TARGET_CELL));
  const rows = Math.max(6, Math.round(areaH / TARGET_CELL));
  const cell = Math.min(areaW / cols, areaH / rows);
  const left = (arena.width - cols * cell) / 2;
  const top = HUD_SAFE_TOP + 14 + (areaH - rows * cell) / 2;
  const startCol = Math.floor(cols / 2);
  const startRow = rows - 2;
  const state: SnakeState = {
    cols,
    rows,
    cell,
    left,
    top,
    line: [{ col: startCol, row: startRow, fromCol: startCol, fromRow: startRow, friend: 0 }],
    dir: 'up',
    queued: null,
    waiting: [],
    runaways: [],
    progress: 0,
    best: 0,
    time: 0,
  };

  const inside = (c: Cell): boolean => c.col >= 0 && c.row >= 0 && c.col < cols && c.row < rows;
  const occupied = (c: Cell): boolean => state.line.some((s) => s.col === c.col && s.row === c.row) || state.waiting.some((f) => f.col === c.col && f.row === c.row);

  function addFriend(): void {
    // Inner cells only, not right in front of the leader.
    const head = state.line[0];
    for (let i = 0; i < 60; i += 1) {
      const c = { col: rng.int(1, cols - 2), row: rng.int(1, rows - 2) };
      if (occupied(c)) continue;
      if (head && Math.abs(c.col - head.col) + Math.abs(c.row - head.row) < 3) continue;
      state.waiting.push({ ...c, friend: rng.int(1, FRIEND_KINDS), age: 0 });
      return;
    }
  }
  for (let i = 0; i < WAITING; i += 1) addFriend();

  function move(): void {
    const head = state.line[0];
    if (!head) return;
    if (state.queued && state.queued !== OPPOSITE[state.dir]) state.dir = state.queued;
    state.queued = null;
    let next = { col: head.col + DELTA[state.dir].col, row: head.row + DELTA[state.dir].row };
    if (!inside(next)) {
      // The fence: turn whichever way is open, toward the nearest waiting friend if both are.
      const [a, b] = TURNS[state.dir];
      const options = [a, b].filter((d) => inside({ col: head.col + DELTA[d].col, row: head.row + DELTA[d].row }));
      const goal = state.waiting[0];
      const pick =
        options.length === 2 && goal
          ? options.sort((x, y) => Math.abs(head.col + DELTA[x].col - goal.col) + Math.abs(head.row + DELTA[x].row - goal.row) - (Math.abs(head.col + DELTA[y].col - goal.col) + Math.abs(head.row + DELTA[y].row - goal.row)))[0]
          : options[0];
      state.dir = pick ?? OPPOSITE[state.dir];
      next = { col: head.col + DELTA[state.dir].col, row: head.row + DELTA[state.dir].row };
    }
    const met = state.waiting.findIndex((f) => f.col === next.col && f.row === next.row);
    // Everyone steps into the place of the one in front.
    const tail = state.line[state.line.length - 1];
    const tailCell = tail ? { col: tail.col, row: tail.row } : next;
    for (let i = state.line.length - 1; i >= 0; i -= 1) {
      const s = state.line[i];
      if (!s) continue;
      s.fromCol = s.col;
      s.fromRow = s.row;
      const ahead = i === 0 ? next : state.line[i - 1];
      if (ahead) {
        s.col = ahead.col;
        s.row = ahead.row;
      }
    }
    const x = left + (next.col + 0.5) * cell;
    const y = top + (next.row + 0.5) * cell;
    if (met >= 0) {
      const [friend] = state.waiting.splice(met, 1);
      if (friend) state.line.push({ col: tailCell.col, row: tailCell.row, fromCol: tailCell.col, fromRow: tailCell.row, friend: friend.friend });
      const length = state.line.length - 1;
      if (length > state.best) state.best = length;
      events.push({ type: 'score', x, y, note: 60 + ((length * 2) % 14), voice: 'bell' });
      addFriend();
      return;
    }
    // Into the line itself: everyone from there back lets go.
    const cut = state.line.findIndex((s, i) => i > 0 && s.col === next.col && s.row === next.row);
    if (cut > 0) {
      const gone = state.line.splice(cut);
      for (const s of gone) {
        const angle = rng.range(0, Math.PI * 2);
        state.runaways.push({ x: left + (s.col + 0.5) * cell, y: top + (s.row + 0.5) * cell, dx: Math.cos(angle) * 260, dy: Math.sin(angle) * 260, friend: s.friend, age: 0 });
      }
      events.push({ type: 'hit', x, y });
    }
  }

  let clock = 0;
  return {
    state,
    get score() {
      return state.best;
    },
    get done() {
      return false;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      const swipe = input.swipes.at(-1);
      if (swipe) state.queued = swipe.direction;
      for (const f of state.waiting) f.age += dt;
      for (const r of state.runaways) {
        r.age += dt;
        r.x += r.dx * dt;
        r.y += r.dy * dt;
      }
      state.runaways = state.runaways.filter((r) => r.age < 1.2);
      const period = 1 / (STEPS_PER_SECOND * speed);
      clock += dt;
      if (clock >= period) {
        clock -= period;
        move();
      }
      state.progress = Math.min(1, clock / period);
    },
  };
}

/**
 * Good play: walks the shortest way to the nearest waiting friend, never through the line (the very end of the
 * line moves on, so it is free), and swipes only when the way turns.
 */
export function snakeBot(state: SnakeState, _context: BotContext): BotMove {
  const head = state.line[0];
  if (!head) return {};
  const blocked = new Set(state.line.slice(0, -1).map((s) => s.row * state.cols + s.col));
  const goals = new Set(state.waiting.map((f) => f.row * state.cols + f.col));
  const start = head.row * state.cols + head.col;
  const first = new Map<number, SwipeDirection>();
  const queue: number[] = [];
  const order: SwipeDirection[] = [state.dir, ...TURNS[state.dir]];
  for (const d of order) {
    const c = { col: head.col + DELTA[d].col, row: head.row + DELTA[d].row };
    const k = c.row * state.cols + c.col;
    if (c.col < 0 || c.row < 0 || c.col >= state.cols || c.row >= state.rows || blocked.has(k) || first.has(k)) continue;
    first.set(k, d);
    queue.push(k);
  }
  let found: SwipeDirection | undefined;
  for (let i = 0; i < queue.length && !found; i += 1) {
    const k = queue[i];
    if (k === undefined) break;
    const d = first.get(k);
    if (goals.has(k)) {
      found = d;
      break;
    }
    const col = k % state.cols;
    const row = Math.floor(k / state.cols);
    for (const step of Object.values(DELTA)) {
      const c = { col: col + step.col, row: row + step.row };
      const n = c.row * state.cols + c.col;
      if (c.col < 0 || c.row < 0 || c.col >= state.cols || c.row >= state.rows || blocked.has(n) || first.has(n) || n === start) continue;
      if (d) first.set(n, d);
      queue.push(n);
    }
  }
  const want = found ?? order.find((d) => first.has((head.row + DELTA[d].row) * state.cols + head.col + DELTA[d].col));
  if (!want || want === state.dir || want === state.queued) return {};
  const x = state.left + (head.col + 0.5) * state.cell;
  const y = state.top + (head.row + 0.5) * state.cell;
  return { swipe: { from: { x, y }, dx: DELTA[want].col * 90, dy: DELTA[want].row * 90 } };
}
