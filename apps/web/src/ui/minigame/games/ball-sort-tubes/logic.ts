// Ball sort: tubes of four mixed coloured balls and two empty tubes. Tap a tube to lift its top ball, tap
// another to drop it there: onto a ball of the same colour or into an empty tube. A tube filled with one
// colour is a point. A solved board brings the next (three colours, then four). An undo button takes a move
// back; after a while without a move the next good move pulses. Every board is checked solvable by a small
// search, which also gives the hint and the bot's moves. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const CAPACITY = 4;
const HINT_AFTER = 8;
const NEXT_BOARD = 1.1;
const MAX_SEARCH = 60000;

export type Tubes = number[][];

export interface BallSortState {
  tubes: Tubes;
  colours: number;
  /** Tube centres (the ball stack's bottom is at y + height / 2). */
  slots: Point[];
  tubeHalfWidth: number;
  tubeHeight: number;
  ballRadius: number;
  /** The tube whose top ball is lifted, or -1. */
  selected: number;
  /** Colours completed on this board (each counts once). */
  done: number[];
  /** Moves made on this board, for undo. */
  history: Array<[number, number]>;
  undo: Point;
  /** Seconds since the last move (hint), and since the board was solved (-1 while not). */
  idle: number;
  solved: number;
  /** The last move, for a little drop animation: [from, to, seconds ago]. */
  last: [number, number, number] | null;
  /** The tube that refused a drop (a shake), and how long ago. */
  refused: [number, number] | null;
  boards: number;
  score: number;
  time: number;
}

const key = (tubes: Tubes): string => tubes.map((t) => t.join('')).sort().join('|');
const complete = (t: number[]): boolean => t.length === CAPACITY && t.every((b) => b === t[0]);
export const isSolved = (tubes: Tubes): boolean => tubes.every((t) => t.length === 0 || complete(t));

export function canMove(tubes: Tubes, from: number, to: number): boolean {
  const a = tubes[from];
  const b = tubes[to];
  if (!a || !b || from === to || a.length === 0 || b.length >= CAPACITY) return false;
  return b.length === 0 || b[b.length - 1] === a[a.length - 1];
}

function apply(tubes: Tubes, from: number, to: number): Tubes {
  const next = tubes.map((t) => [...t]);
  const ball = next[from]?.pop();
  if (ball !== undefined) next[to]?.push(ball);
  return next;
}

const solutions = new Map<string, [number, number] | null>();

/** The next move of a shortest solution from here, or null when solved or stuck (cached per position). */
export function nextMove(tubes: Tubes): [number, number] | null {
  const start = tubes.map((t) => t.join('')).join('|');
  const cached = solutions.get(start);
  if (cached !== undefined) return cached;
  if (isSolved(tubes)) return null;
  const seen = new Set<string>([key(tubes)]);
  const queue: Array<{ tubes: Tubes; path: Array<[number, number]> }> = [{ tubes, path: [] }];
  for (let head = 0; head < queue.length && head < MAX_SEARCH; head += 1) {
    const node = queue[head];
    if (!node) break;
    for (let from = 0; from < node.tubes.length; from += 1) {
      const a = node.tubes[from];
      if (!a || a.length === 0 || complete(a)) continue;
      for (let to = 0; to < node.tubes.length; to += 1) {
        if (!canMove(node.tubes, from, to)) continue;
        // Moving a one-colour stack into an empty tube changes nothing.
        if (node.tubes[to]?.length === 0 && a.every((b) => b === a[0])) continue;
        const next = apply(node.tubes, from, to);
        const k = key(next);
        if (seen.has(k)) continue;
        seen.add(k);
        const path: Array<[number, number]> = [...node.path, [from, to]];
        if (isSolved(next)) {
          // Remember the rest of the way from every position along it.
          let walk = tubes;
          for (const move of path) {
            solutions.set(walk.map((t) => t.join('')).join('|'), move);
            walk = apply(walk, move[0], move[1]);
          }
          return path[0] ?? null;
        }
        queue.push({ tubes: next, path });
      }
    }
  }
  solutions.set(start, null);
  return null;
}

/** A mixed, solvable board of `colours` colours with two empty tubes, no tube already complete. */
export function dealBoard(colours: number, rng: Rng): Tubes {
  for (;;) {
    const balls: number[] = [];
    for (let c = 0; c < colours; c += 1) for (let i = 0; i < CAPACITY; i += 1) balls.push(c);
    for (let i = balls.length - 1; i > 0; i -= 1) {
      const j = rng.int(0, i);
      const a = balls[i] ?? 0;
      balls[i] = balls[j] ?? 0;
      balls[j] = a;
    }
    const tubes: Tubes = [];
    for (let c = 0; c < colours; c += 1) tubes.push(balls.slice(c * CAPACITY, (c + 1) * CAPACITY));
    tubes.push([], []);
    const mixed = tubes.every((t) => t.length === 0 || new Set(t).size >= 2);
    if (mixed && nextMove(tubes)) return tubes;
  }
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function createBallSort({ arena, params, rng }: GameSetup): MinigameLogic<BallSortState> {
  const first = typeof params.colours === 'number' ? clamp(Math.round(params.colours), 2, 4) : 3;
  const events = eventQueue();
  const state: BallSortState = {
    tubes: [],
    colours: first,
    slots: [],
    tubeHalfWidth: 0,
    tubeHeight: 0,
    ballRadius: 0,
    selected: -1,
    done: [],
    history: [],
    undo: { x: 70, y: arena.height - 70 },
    idle: 0,
    solved: -1,
    last: null,
    refused: null,
    boards: 0,
    score: 0,
    time: 0,
  };

  function layout(): void {
    const n = state.tubes.length;
    const gap = Math.min(130, (arena.width - 40) / n);
    state.tubeHalfWidth = Math.min(40, gap * 0.4);
    state.ballRadius = state.tubeHalfWidth - 8;
    state.tubeHeight = CAPACITY * state.ballRadius * 2.1 + 34;
    const cy = Math.max(HUD_SAFE_TOP + 80 + state.tubeHeight / 2, arena.height / 2);
    state.slots = state.tubes.map((_, i) => ({ x: arena.width / 2 + (i - (n - 1) / 2) * gap, y: cy }));
  }

  function newBoard(): void {
    state.colours = state.boards === 0 ? first : Math.max(first, 4);
    state.tubes = dealBoard(state.colours, rng);
    state.selected = -1;
    state.done = [];
    state.history = [];
    state.idle = 0;
    state.solved = -1;
    state.last = null;
    layout();
  }
  newBoard();

  /** The tube under a tap: its whole column, generously. */
  const tubeAt = (p: Point): number =>
    state.slots.findIndex((s) => Math.abs(p.x - s.x) <= Math.max(state.tubeHalfWidth + 14, 44) && Math.abs(p.y - s.y) <= state.tubeHeight / 2 + 70);

  function move(from: number, to: number): void {
    state.tubes = apply(state.tubes, from, to);
    state.history.push([from, to]);
    state.last = [from, to, 0];
    state.idle = 0;
    const slot = state.slots[to];
    events.push({ type: 'action', x: slot?.x ?? 0, y: slot?.y ?? 0 });
    const tube = state.tubes[to];
    const colour = tube?.[0];
    if (tube && colour !== undefined && complete(tube) && !state.done.includes(colour)) {
      state.done.push(colour);
      state.score += 1;
      events.push({ type: 'score', x: slot?.x ?? 0, y: (slot?.y ?? 0) - state.tubeHeight / 2 - 20 });
    }
    if (isSolved(state.tubes)) state.solved = 0;
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
      state.idle += dt;
      if (state.last) state.last[2] += dt;
      if (state.refused) state.refused[1] += dt;
      if (state.solved >= 0) {
        state.solved += dt;
        if (state.solved >= NEXT_BOARD) {
          state.boards += 1;
          newBoard();
        }
        return;
      }
      for (const tap of input.taps) {
        if (Math.hypot(tap.x - state.undo.x, tap.y - state.undo.y) < 56) {
          const back = state.history.pop();
          if (back) {
            state.tubes = apply(state.tubes, back[1], back[0]);
            state.selected = -1;
            state.last = null;
            events.push({ type: 'action', x: state.undo.x, y: state.undo.y });
          }
          continue;
        }
        const i = tubeAt(tap);
        if (i < 0) continue;
        if (state.selected < 0) {
          if ((state.tubes[i]?.length ?? 0) > 0) state.selected = i;
        } else if (state.selected === i) state.selected = -1;
        else if (canMove(state.tubes, state.selected, i)) {
          move(state.selected, i);
          state.selected = -1;
        } else {
          state.refused = [i, 0];
          events.push({ type: 'miss', x: state.slots[i]?.x ?? 0, y: state.slots[i]?.y ?? 0 });
          // Tapping another full tube picks it instead, as a child would expect.
          state.selected = (state.tubes[i]?.length ?? 0) > 0 ? i : -1;
        }
      }
    },
  };
}

/** The hinted move, once the child has been still a while. */
export const hint = (state: BallSortState): [number, number] | null => (state.idle >= HINT_AFTER && state.solved < 0 ? nextMove(state.tubes) : null);

/** Good play: follow a shortest solution, one tap at a time. */
export function ballSortBot(state: BallSortState, _context: BotContext): BotMove {
  if (state.solved >= 0) return {};
  const move = nextMove(state.tubes);
  if (!move) {
    const back = state.history.length > 0;
    return back ? { tap: state.undo } : {};
  }
  const target = state.selected === move[0] ? move[1] : state.selected >= 0 && state.selected !== move[0] ? state.selected : move[0];
  const slot = state.slots[target];
  return slot ? { tap: slot } : {};
}
