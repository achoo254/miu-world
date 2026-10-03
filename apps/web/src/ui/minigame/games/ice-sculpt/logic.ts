// Ice sculpt ("Tạc tượng băng"): a block of ice made of 7 × 7 cubes, with the shape of the statue (a fish, a
// heart, a little house…) faintly drawn inside. The child taps cubes outside the shape (or slides a finger over
// them) to chip them off. Chipping a cube of the shape itself chips the statue: 5% less beautiful. When only
// the shape is left, the statue is finished: a point if it is still at least 90% beautiful. Then a new block.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const GRID = 7;
/** Shapes, '#' = part of the statue. */
export const SHAPES: Readonly<Record<string, readonly string[]>> = {
  heart: ['.......', '.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
  fish: ['.......', '..###..', '.####.#', '#######', '.####.#', '..###..', '.......'],
  house: ['...#...', '..###..', '.#####.', '#######', '.##.##.', '.##.##.', '.#####.'],
  tree: ['...#...', '..###..', '.#####.', '..###..', '.#####.', '#######', '...#...'],
  star: ['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '##...##'],
  bunny: ['.#...#.', '.#...#.', '.##.##.', '.#####.', '#######', '.#####.', '..#.#..'],
};
export const SHAPE_NAMES = Object.keys(SHAPES);

export interface IceSculptState {
  shape: string;
  /** Per cell: still ice? */
  ice: boolean[];
  /** Per cell: part of the statue? */
  inside: boolean[];
  /** When each cell was chipped (−1 while there). */
  chippedAt: number[];
  mistakes: number;
  origin: Point;
  cell: number;
  /** Seconds until the next block (0 while carving); whether the finished one counted. */
  nextIn: number;
  lastGood: boolean;
  statues: number;
  score: number;
  time: number;
}

export const MISTAKE_COST = 5;
const NEXT_SECONDS = 1.3;

export const beauty = (state: IceSculptState): number => Math.max(0, 100 - state.mistakes * MISTAKE_COST);

export function createIceSculpt({ arena, rng }: GameSetup): MinigameLogic<IceSculptState> {
  const events = eventQueue();
  const cell = Math.floor(Math.min((arena.width - 40) / GRID, (arena.height - HUD_SAFE_TOP - 70) / GRID));
  const origin = { x: (arena.width - cell * GRID) / 2, y: HUD_SAFE_TOP + 50 + (arena.height - HUD_SAFE_TOP - 70 - cell * GRID) / 2 };
  const state: IceSculptState = {
    shape: 'heart',
    ice: [],
    inside: [],
    chippedAt: [],
    mistakes: 0,
    origin,
    cell,
    nextIn: 0,
    lastGood: false,
    statues: 0,
    score: 0,
    time: 0,
  };
  let lastShape = '';
  const newBlock = (r: Rng): void => {
    let shape = SHAPE_NAMES[r.int(0, SHAPE_NAMES.length - 1)] ?? 'heart';
    if (shape === lastShape) shape = SHAPE_NAMES[(SHAPE_NAMES.indexOf(shape) + 1) % SHAPE_NAMES.length] ?? 'heart';
    lastShape = shape;
    const rows = SHAPES[shape] ?? [];
    state.shape = shape;
    state.inside = Array.from({ length: GRID * GRID }, (_, i) => rows[Math.floor(i / GRID)]?.[i % GRID] === '#');
    state.ice = state.inside.map(() => true);
    state.chippedAt = state.inside.map(() => -1);
    state.mistakes = 0;
  };
  newBlock(rng);

  const cellAt = (p: Point): number => {
    const c = Math.floor((p.x - origin.x) / cell);
    const r = Math.floor((p.y - origin.y) / cell);
    return c >= 0 && c < GRID && r >= 0 && r < GRID ? r * GRID + c : -1;
  };

  const chip = (i: number): void => {
    if (i < 0 || !state.ice[i]) return;
    state.ice[i] = false;
    state.chippedAt[i] = state.time;
    const x = origin.x + ((i % GRID) + 0.5) * cell;
    const y = origin.y + (Math.floor(i / GRID) + 0.5) * cell;
    if (state.inside[i]) {
      state.mistakes += 1;
      events.push({ type: 'hit', x, y });
    } else events.push({ type: 'action', x, y, note: 84 + (i % 5) * 2, voice: 'bell' });
    if (state.ice.every((ice, k) => !ice || state.inside[k])) {
      state.lastGood = beauty(state) >= 90;
      state.statues += 1;
      if (state.lastGood) {
        state.score += 1;
        events.push({ type: 'score', x: arena.width / 2, y: origin.y + cell * 3 });
      } else events.push({ type: 'miss', x: arena.width / 2, y: origin.y + cell * 3 });
      state.nextIn = NEXT_SECONDS;
    }
  };

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
      if (state.nextIn > 0) {
        state.nextIn -= dt;
        if (state.nextIn <= 0) newBlock(rng);
        return;
      }
      for (const tap of input.taps) chip(cellAt(tap));
      if (input.pointer && state.nextIn <= 0) chip(cellAt(input.pointer));
    },
  };
}

/** Good play: one cube outside the shape per tap, from the top. */
export function iceSculptBot(state: IceSculptState, _context: BotContext): BotMove {
  if (state.nextIn > 0) return {};
  const i = state.ice.findIndex((ice, k) => ice && !state.inside[k]);
  if (i < 0) return {};
  return { tap: { x: state.origin.x + ((i % GRID) + 0.5) * state.cell, y: state.origin.y + (Math.floor(i / GRID) + 0.5) * state.cell } };
}
