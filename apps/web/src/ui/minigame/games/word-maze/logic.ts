// Word maze: a line of a nursery rhyme or folk verse is written at the top ("Con mèo mà trèo cây cau"). Its
// syllables are hidden in a grid, each one next to the one before (up, down, left or right), among syllables
// from other verses. The child starts at the lit first syllable and drags (or taps cell by cell) along the
// verse. The right next syllable lights up; any other cell shakes and the grid rests a moment, so tapping
// everywhere does not get through. The whole verse is a point and a new one comes. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Verse {
  text: string;
  picture: SpriteName;
}

/** Folk verses and nursery rhymes (ca dao, đồng dao): public, known to every Vietnamese child. */
export const VERSES: readonly Verse[] = [
  { text: 'Con mèo mà trèo cây cau', picture: 'cat' },
  { text: 'Con gà cục tác lá chanh', picture: 'chicken' },
  { text: 'Con lợn ủn ỉn mua hành cho tôi', picture: 'pig' },
  { text: 'Con cò mà đi ăn đêm', picture: 'bird' },
  { text: 'Gió đưa cây cải về trời', picture: 'leafy-green' },
  { text: 'Chú Cuội ngồi gốc cây đa', picture: 'full-moon' },
  { text: 'Bà còng đi chợ trời mưa', picture: 'cloud' },
  { text: 'Con kiến mà leo cành đa', picture: 'ant' },
  { text: 'Bắc thang lên hỏi ông trời', picture: 'sun' },
  { text: 'Con cóc là cậu ông trời', picture: 'frog' },
  { text: 'Ai ơi bưng bát cơm đầy', picture: 'cooked-rice' },
  { text: 'Con trâu là đầu cơ nghiệp', picture: 'cow' },
];

export const syllables = (verse: Verse): string[] => verse.text.split(' ');

export interface Cell {
  text: string;
  /** Part of the verse's path (its index), or -1 for a decoy. */
  path: number;
  /** Seconds since it shook after a wrong pick. */
  shook: number;
}

export interface MazeState {
  verse: number;
  cols: number;
  rows: number;
  cells: Cell[];
  left: number;
  top: number;
  size: number;
  /** Cells walked so far, in order (starts with the first syllable's cell). */
  walked: number[];
  /** Seconds left of the rest after a wrong cell. */
  sulk: number;
  /** Seconds since the verse was finished, -1 while walking. */
  finished: number;
  verses: number;
  score: number;
  time: number;
}

export const SULK_SECONDS = 0.8;
const NEXT_SECONDS = 1.2;

function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    const a = items[i];
    const b = items[j];
    if (a !== undefined && b !== undefined) {
      items[i] = b;
      items[j] = a;
    }
  }
  return items;
}

const neighbours = (i: number, cols: number, rows: number): number[] => {
  const r = Math.floor(i / cols);
  const c = i % cols;
  const out: number[] = [];
  if (r > 0) out.push(i - cols);
  if (r < rows - 1) out.push(i + cols);
  if (c > 0) out.push(i - 1);
  if (c < cols - 1) out.push(i + 1);
  return out;
};

/** A random path of `length` cells, each next to the one before, never crossing itself. */
export function randomPath(rng: Rng, cols: number, rows: number, length: number): number[] {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const path = [rng.int(0, cols * rows - 1)];
    const extend = (): boolean => {
      if (path.length === length) return true;
      const last = path[path.length - 1] ?? 0;
      for (const n of shuffle(neighbours(last, cols, rows), rng)) {
        if (path.includes(n)) continue;
        path.push(n);
        if (extend()) return true;
        path.pop();
      }
      return false;
    };
    if (extend()) return path;
  }
  return Array.from({ length }, (_, i) => i);
}

export function createWordMaze({ arena, rng }: GameSetup): MinigameLogic<MazeState> {
  const events = eventQueue();
  const top = HUD_SAFE_TOP + 110;
  const availW = arena.width - 40;
  const availH = arena.height - top - 24;
  // The grid with the biggest cells that still has room for a long verse and its decoys.
  let cols = 4;
  let rows = 4;
  let size = 0;
  for (let c = 3; c <= 7; c += 1) {
    for (let r = 3; r <= 7; r += 1) {
      if (c * r < 16 || c * r > 30) continue;
      const s = Math.min(availW / c, availH / r, 150);
      if (s > size + 0.5 || (Math.abs(s - size) <= 0.5 && c * r > cols * rows)) {
        cols = c;
        rows = r;
        size = s;
      }
    }
  }
  const state: MazeState = {
    verse: 0,
    cols,
    rows,
    cells: [],
    left: (arena.width - cols * size) / 2,
    top: top + (availH - rows * size) / 2,
    size,
    walked: [],
    sulk: 0,
    finished: -1,
    verses: 0,
    score: 0,
    time: 0,
  };
  let deck: number[] = [];

  function nextVerse(): void {
    if (deck.length === 0) deck = shuffle(VERSES.map((_, i) => i).filter((i) => i !== state.verse || state.verses === 0), rng);
    state.verse = deck.pop() ?? 0;
    const words = syllables(VERSES[state.verse] ?? { text: 'Con mèo', picture: 'cat' });
    const path = randomPath(rng, cols, rows, words.length);
    const own = new Set(words.map((w) => w.toLowerCase()));
    const decoys = shuffle(
      [...new Set(VERSES.flatMap((v) => syllables(v)).filter((w) => !own.has(w.toLowerCase())))],
      rng,
    );
    state.cells = Array.from({ length: cols * rows }, (_, i) => {
      const at = path.indexOf(i);
      return { text: at >= 0 ? (words[at] ?? '') : (decoys[i % decoys.length] ?? 'la'), path: at, shook: 99 };
    });
    state.walked = [path[0] ?? 0];
    state.finished = -1;
    state.verses += 1;
  }

  const cellAt = (p: Point, inner = 0.42): number => {
    const c = Math.floor((p.x - state.left) / size);
    const r = Math.floor((p.y - state.top) / size);
    if (c < 0 || c >= cols || r < 0 || r >= rows) return -1;
    // Only the middle of a cell counts while dragging, so brushing a corner picks nothing.
    const cx = state.left + (c + 0.5) * size;
    const cy = state.top + (r + 0.5) * size;
    return Math.abs(p.x - cx) <= size * inner && Math.abs(p.y - cy) <= size * inner ? r * cols + c : -1;
  };

  /** The finger is on cell `i`: the next syllable walks on; any other new cell is a wrong pick. */
  function visit(i: number): void {
    if (i < 0 || state.walked.includes(i) || state.sulk > 0) return;
    const words = syllables(VERSES[state.verse] ?? { text: '', picture: 'cat' });
    const next = words[state.walked.length];
    const last = state.walked[state.walked.length - 1] ?? -1;
    const cell = state.cells[i];
    if (!cell) return;
    const p = cellCentre(state, i);
    if (next !== undefined && cell.path === state.walked.length && neighbours(last, cols, rows).includes(i)) {
      state.walked.push(i);
      events.push({ type: 'action', x: p.x, y: p.y, note: 60 + ((state.walked.length * 2) % 12), voice: 'bell' });
      if (state.walked.length === words.length) {
        state.score += 1;
        state.finished = 0;
        events.push({ type: 'score', x: p.x, y: p.y - size / 2 });
      }
      return;
    }
    cell.shook = 0;
    state.sulk = SULK_SECONDS;
    events.push({ type: 'miss', x: p.x, y: p.y });
  }

  nextVerse();

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
      state.sulk = Math.max(0, state.sulk - dt);
      for (const c of state.cells) c.shook += dt;
      if (state.finished >= 0) {
        state.finished += dt;
        if (state.finished >= NEXT_SECONDS) nextVerse();
        return;
      }
      for (const tap of input.taps) visit(cellAt(tap, 0.5));
      if (input.pointer) visit(cellAt(input.pointer));
    },
  };
}

export function cellCentre(state: MazeState, i: number): Point {
  return { x: state.left + ((i % state.cols) + 0.5) * state.size, y: state.top + (Math.floor(i / state.cols) + 0.5) * state.size };
}

/** Good play: reads the verse and drags along it, a cell at a time. */
export function wordMazeBot(state: MazeState, _context: BotContext): BotMove {
  if (state.finished >= 0) return {};
  const next = state.cells.findIndex((c) => c.path === state.walked.length);
  if (next < 0) return {};
  return { touch: cellCentre(state, next) };
}
