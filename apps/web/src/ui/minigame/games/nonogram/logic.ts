// Nonogram (tranh ô số): a 5 × 5 grid hides a little picture. The numbers beside each row and above each column
// say how many squares in a row are filled there (for example "1 2": one square, a gap, then two). The child
// taps squares to fill them; a square that is not in the picture gets a cross and the pencil rests for a moment.
// A finished picture comes to life as its emoji: a point, and the next grid. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export const SIZE = 5;

export interface Picture {
  sprite: SpriteName;
  name: string;
  rows: readonly string[];
}

/** Pictures drawn on 5 × 5 squares ('#' filled). */
export const PICTURES: readonly Picture[] = [
  { sprite: 'heart', name: 'Trái tim', rows: ['##.##', '#####', '#####', '.###.', '..#..'] },
  { sprite: 'house', name: 'Ngôi nhà', rows: ['..#..', '.###.', '#####', '##.##', '##.##'] },
  { sprite: 'star', name: 'Ngôi sao', rows: ['..#..', '#####', '.###.', '.#.#.', '#...#'] },
  { sprite: 'deciduous-tree', name: 'Cái cây', rows: ['.###.', '#####', '#####', '..#..', '..#..'] },
  { sprite: 'fish', name: 'Con cá', rows: ['.##..', '####.', '#####', '####.', '.##..'] },
  { sprite: 'mushroom', name: 'Cây nấm', rows: ['.###.', '#####', '#####', '.#.#.', '.###.'] },
  { sprite: 'sailboat', name: 'Thuyền buồm', rows: ['..#..', '..##.', '..###', '#####', '.###.'] },
  { sprite: 'red-apple', name: 'Quả táo', rows: ['..#..', '##.##', '#####', '#####', '.###.'] },
  { sprite: 'cat-face', name: 'Mèo con', rows: ['#...#', '##.##', '#####', '#.#.#', '.###.'] },
  { sprite: 'snowman', name: 'Người tuyết', rows: ['.###.', '.###.', '..#..', '#####', '.###.'] },
];

/** Run lengths of filled squares along a line ("##.#." → [2, 1]; an empty line → [0]). */
export function clues(line: readonly boolean[]): number[] {
  const out: number[] = [];
  let run = 0;
  for (const f of line) {
    if (f) run += 1;
    else if (run > 0) {
      out.push(run);
      run = 0;
    }
  }
  if (run > 0) out.push(run);
  return out.length > 0 ? out : [0];
}

export interface NonogramState {
  left: number;
  top: number;
  cell: number;
  picture: Picture;
  solution: boolean[];
  /** Filled squares, and crossed-out squares (wrong taps). */
  filled: boolean[];
  crossed: boolean[];
  rowClues: number[][];
  colClues: number[][];
  /** Seconds the pencil still rests after a wrong square. */
  rest: number;
  /** Seconds since the picture was finished (-1 while solving). */
  solvedAgo: number;
  lastTapAt: number;
  pictures: number;
  score: number;
  time: number;
}

const REST_SECONDS = 1.1;
const SOLVED_SECONDS = 1.6;

export function createNonogram({ arena, rng }: GameSetup): MinigameLogic<NonogramState> {
  const events = eventQueue();
  const clueSpace = 110;
  const board = Math.min(arena.width - clueSpace - 40, arena.height - HUD_SAFE_TOP - clueSpace - 40, 480);
  const cell = board / SIZE;
  const order = [...PICTURES.keys()];
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    [order[i], order[j]] = [order[j] ?? 0, order[i] ?? 0];
  }
  const state: NonogramState = {
    left: (arena.width - board + clueSpace) / 2,
    top: HUD_SAFE_TOP + clueSpace + (arena.height - HUD_SAFE_TOP - clueSpace - 30 - board) / 2,
    cell,
    picture: PICTURES[0] ?? { sprite: 'heart', name: '', rows: [] },
    solution: [],
    filled: [],
    crossed: [],
    rowClues: [],
    colClues: [],
    rest: 0,
    solvedAgo: -1,
    lastTapAt: -9,
    pictures: 0,
    score: 0,
    time: 0,
  };

  function newPicture(): void {
    const picture = PICTURES[order[state.pictures % order.length] ?? 0] ?? state.picture;
    state.picture = picture;
    state.solution = picture.rows.flatMap((r) => [...r].map((c) => c === '#'));
    state.filled = state.solution.map(() => false);
    state.crossed = state.solution.map(() => false);
    state.rowClues = Array.from({ length: SIZE }, (_, r) => clues(state.solution.slice(r * SIZE, r * SIZE + SIZE)));
    state.colClues = Array.from({ length: SIZE }, (_, c) => clues(Array.from({ length: SIZE }, (__, r) => state.solution[r * SIZE + c] ?? false)));
    state.solvedAgo = -1;
  }

  newPicture();

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
      state.rest = Math.max(0, state.rest - dt);
      if (state.solvedAgo >= 0) {
        state.solvedAgo += dt;
        if (state.solvedAgo > SOLVED_SECONDS) {
          state.pictures += 1;
          newPicture();
        }
        return;
      }
      if (state.rest > 0) return;
      for (const t of input.taps) {
        const col = Math.floor((t.x - state.left) / state.cell);
        const row = Math.floor((t.y - state.top) / state.cell);
        if (col < 0 || col >= SIZE || row < 0 || row >= SIZE) continue;
        const i = row * SIZE + col;
        if (state.filled[i] || state.crossed[i]) continue;
        const x = state.left + (col + 0.5) * state.cell;
        const y = state.top + (row + 0.5) * state.cell;
        state.lastTapAt = state.time;
        if (state.solution[i]) {
          state.filled[i] = true;
          events.push({ type: 'action', x, y });
          if (state.solution.every((s, k) => !s || state.filled[k])) {
            state.solvedAgo = 0;
            state.score += 1;
            events.push({ type: 'score', x: state.left + (SIZE * state.cell) / 2, y: state.top + (SIZE * state.cell) / 2 });
          }
        } else {
          state.crossed[i] = true;
          state.rest = REST_SECONDS;
          events.push({ type: 'miss', x, y });
        }
        break;
      }
    },
  };
}

/**
 * Good play the way a child solves it: first the rows and columns whose numbers fill them for sure, then the
 * squares left; one square every 0.5 s.
 */
export function nonogramBot(state: NonogramState, _context: BotContext): BotMove {
  if (state.solvedAgo >= 0 || state.rest > 0 || state.time - state.lastTapAt < 0.5) return {};
  const full = (c: number[]): boolean => c.reduce((a, b) => a + b, 0) + c.length - 1 === SIZE;
  const todo = state.solution.map((s, i) => (s && !state.filled[i] ? i : -1)).filter((i) => i >= 0);
  const sure = todo.find((i) => full(state.rowClues[Math.floor(i / SIZE)] ?? []) || full(state.colClues[i % SIZE] ?? []));
  const i = sure ?? todo[0];
  if (i === undefined) return {};
  return { tap: { x: state.left + ((i % SIZE) + 0.5) * state.cell, y: state.top + (Math.floor(i / SIZE) + 0.5) * state.cell } };
}
