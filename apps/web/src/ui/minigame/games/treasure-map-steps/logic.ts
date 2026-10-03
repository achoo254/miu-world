// Treasure map steps: an island of square tiles and a scroll with two or three moves ("3 bước ⬆", "2 bước ➡").
// The child taps the tile where each move ends; her character walks there step by step, counting. A wrong tile
// shakes and she stays at the start of that move (after two misses the right tile glows). After the last move
// she digs up a gift: a point, and a new map. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type Dir = 'up' | 'down' | 'left' | 'right';
export const DELTA: Readonly<Record<Dir, readonly [number, number]>> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPPOSITE: Readonly<Record<Dir, Dir>> = { up: 'down', down: 'up', left: 'right', right: 'left' };

export interface Move {
  dir: Dir;
  count: number;
}

export interface Cell {
  cx: number;
  cy: number;
}

export type Phase = 'play' | 'walk' | 'dig';

export interface TreasureState {
  cols: number;
  rows: number;
  cell: number;
  /** Top-left of the island and of the scroll. */
  grid: Point;
  scroll: { x: number; y: number; w: number; h: number; vertical: boolean };
  moves: Move[];
  /** Index of the move to do now. */
  moveIndex: number;
  /** Where the character stands (cell), and where it walks through (cells still ahead). */
  at: Cell;
  path: Cell[];
  /** Seconds into the current walking step. */
  stepTime: number;
  /** Steps counted on this move (shown as 1, 2, 3 over the character). */
  counted: number;
  misses: number;
  /** A shaking tile after a wrong tap. */
  wrong: Cell | null;
  wrongAgo: number;
  phase: Phase;
  phaseTime: number;
  maps: number;
  lastTapAt: number;
  score: number;
  time: number;
}

export const STEP_SECONDS = 0.2;
const DIG_SECONDS = 1.3;
const DIRS: readonly Dir[] = ['up', 'down', 'left', 'right'];

export function endOf(at: Cell, move: Move): Cell {
  const [dx, dy] = DELTA[move.dir];
  return { cx: at.cx + dx * move.count, cy: at.cy + dy * move.count };
}

/** A route of `count` moves that stays on the island and turns at every move. */
export function makeRoute(rng: Rng, cols: number, rows: number, count: number): { start: Cell; moves: Move[] } {
  for (;;) {
    const start = { cx: rng.int(0, cols - 1), cy: rng.int(0, rows - 1) };
    const moves: Move[] = [];
    let at = start;
    let last: Dir | null = null;
    for (let i = 0; i < count; i += 1) {
      const options = DIRS.filter((d) => d !== last && (last === null || d !== OPPOSITE[last])).filter((d) => {
        const [dx, dy] = DELTA[d];
        const nx = at.cx + dx;
        const ny = at.cy + dy;
        return nx >= 0 && ny >= 0 && nx < cols && ny < rows;
      });
      const dir = options[rng.int(0, options.length - 1)];
      if (!dir) break;
      const [dx, dy] = DELTA[dir];
      let room = 0;
      while (room < 4 && at.cx + dx * (room + 1) >= 0 && at.cx + dx * (room + 1) < cols && at.cy + dy * (room + 1) >= 0 && at.cy + dy * (room + 1) < rows) room += 1;
      const move = { dir, count: rng.int(1, room) };
      moves.push(move);
      at = endOf(at, move);
      last = dir;
    }
    if (moves.length === count) return { start, moves };
  }
}

export function createTreasureMap({ arena, rng }: GameSetup): MinigameLogic<TreasureState> {
  const events = eventQueue();
  const top = HUD_SAFE_TOP + 14;
  const landscape = arena.width > arena.height;
  const scroll = landscape
    ? { x: arena.width - 190, y: top, w: 170, h: arena.height - top - 20, vertical: true }
    : { x: 20, y: top, w: arena.width - 40, h: 120, vertical: false };
  const area = landscape ? { x: 20, y: top, w: arena.width - 230, h: arena.height - top - 20 } : { x: 20, y: top + 136, w: arena.width - 40, h: arena.height - top - 156 };
  const cols = Math.min(8, Math.max(5, Math.floor(area.w / 92)));
  const rows = Math.min(8, Math.max(5, Math.floor(area.h / 92)));
  const cell = Math.min(area.w / cols, area.h / rows, 120);
  const grid = { x: area.x + (area.w - cell * cols) / 2, y: area.y + (area.h - cell * rows) / 2 };

  const state: TreasureState = {
    cols,
    rows,
    cell,
    grid,
    scroll,
    moves: [],
    moveIndex: 0,
    at: { cx: 0, cy: 0 },
    path: [],
    stepTime: 0,
    counted: 0,
    misses: 0,
    wrong: null,
    wrongAgo: 9,
    phase: 'play',
    phaseTime: 0,
    maps: 0,
    lastTapAt: 0,
    score: 0,
    time: 0,
  };

  function newMap(): void {
    const route = makeRoute(rng, cols, rows, state.maps < 2 ? 2 : 3);
    state.moves = route.moves;
    state.at = route.start;
    state.moveIndex = 0;
    state.path = [];
    state.misses = 0;
    state.counted = 0;
    state.phase = 'play';
    state.phaseTime = 0;
    state.lastTapAt = state.time;
  }

  const centre = (c: Cell): Point => ({ x: grid.x + (c.cx + 0.5) * cell, y: grid.y + (c.cy + 0.5) * cell });

  function tap(p: Point): void {
    const cx = Math.floor((p.x - grid.x) / cell);
    const cy = Math.floor((p.y - grid.y) / cell);
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return;
    const move = state.moves[state.moveIndex];
    if (!move) return;
    state.lastTapAt = state.time;
    const target = endOf(state.at, move);
    if (cx === target.cx && cy === target.cy) {
      const [dx, dy] = DELTA[move.dir];
      state.path = Array.from({ length: move.count }, (_, i) => ({ cx: state.at.cx + dx * (i + 1), cy: state.at.cy + dy * (i + 1) }));
      state.phase = 'walk';
      state.stepTime = 0;
      state.counted = 0;
      state.misses = 0;
      events.push({ type: 'action', ...centre(target) });
      return;
    }
    state.misses += 1;
    state.wrong = { cx, cy };
    state.wrongAgo = 0;
    events.push({ type: 'miss', ...centre({ cx, cy }) });
  }

  newMap();

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
      state.phaseTime += dt;
      state.wrongAgo += dt;
      if (state.phase === 'walk') {
        state.stepTime += dt;
        if (state.stepTime >= STEP_SECONDS) {
          state.stepTime -= STEP_SECONDS;
          const next = state.path.shift();
          if (next) {
            state.at = next;
            state.counted += 1;
            events.push({ type: 'action', ...centre(next), note: 60 + state.counted * 2, voice: 'bell' });
          }
          if (state.path.length === 0) {
            state.moveIndex += 1;
            state.phase = state.moveIndex >= state.moves.length ? 'dig' : 'play';
            state.phaseTime = 0;
          }
        }
        return;
      }
      if (state.phase === 'dig') {
        if (state.phaseTime >= DIG_SECONDS) {
          state.score += 1;
          state.maps += 1;
          events.push({ type: 'score', ...centre(state.at) });
          newMap();
        }
        return;
      }
      for (const p of input.taps) {
        tap(p);
        if (state.phase !== 'play') break;
      }
    },
  };
}

/** The tile a move ends on, for drawing the hint and for the bot. */
export function targetCell(state: TreasureState): Cell | null {
  const move = state.moves[state.moveIndex];
  return move ? endOf(state.at, move) : null;
}

/** Good play: reads the move, counts, taps the end tile. */
export function treasureBot(state: TreasureState, _context: BotContext): BotMove {
  if (state.phase !== 'play' || state.time - state.lastTapAt < 0.6) return {};
  const target = targetCell(state);
  if (!target) return {};
  return { tap: { x: state.grid.x + (target.cx + 0.5) * state.cell, y: state.grid.y + (target.cy + 0.5) * state.cell } };
}
