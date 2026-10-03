// Roof tiles: a little house needs its roof tiled before the rain. Tiles go on from the bottom up, each row
// lapping over the row below, so a tile only fits where the place below it (or the eaves) is already tiled. The
// child drags tiles from the stack onto the roof; a tile dropped where it cannot sit slides back. Every tile is
// a point; a finished roof brings the next house. Now and then a shower passes: holes drip into a bucket (it
// only splashes, nothing is lost). Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const ROWS = 3;
export const COLS = 3;

export interface RoofState {
  /** Roof grid's lower-left corner (row 0 is the eaves, at the bottom), cell size. */
  left: number;
  bottom: number;
  cellW: number;
  cellH: number;
  tiles: boolean[];
  /** Seconds since each tile was laid (a little drop). */
  laidAgo: number[];
  stack: Point;
  carrying: boolean;
  carryAt: Point | null;
  /** A tile sliding back to the stack (from where), and seconds since. */
  rejected: { from: Point; ago: number } | null;
  /** Seconds into the shower (-1 when dry), and seconds until the next one. */
  rainAgo: number;
  rainIn: number;
  doneAgo: number;
  roofs: number;
  score: number;
  time: number;
}

const RAIN_EVERY = 16;
const RAIN_SECONDS = 4;
const DONE_SECONDS = 1.2;

/** Can a tile sit at row r, column c (empty, and on the eaves or on a tile)? */
export const canLay = (tiles: readonly boolean[], r: number, c: number): boolean => !tiles[r * COLS + c] && (r === 0 || tiles[(r - 1) * COLS + c] === true);

export function createRoofTiles({ arena }: GameSetup): MinigameLogic<RoofState> {
  const events = eventQueue();
  const wide = arena.width > arena.height;
  const cellW = Math.min(115, (wide ? arena.width - 260 : arena.width - 80) / COLS);
  const cellH = cellW * 0.72;
  const roofW = cellW * COLS;
  const left = wide ? (arena.width - 170 - roofW) / 2 : (arena.width - roofW) / 2;
  const bottom = Math.min(arena.height - 230, HUD_SAFE_TOP + 90 + cellH * ROWS + (wide ? 20 : (arena.height - HUD_SAFE_TOP - 600) / 2));
  const state: RoofState = {
    left,
    bottom,
    cellW,
    cellH,
    tiles: Array.from({ length: ROWS * COLS }, () => false),
    laidAgo: Array.from({ length: ROWS * COLS }, () => 9),
    stack: wide ? { x: arena.width - 100, y: arena.height - 120 } : { x: arena.width / 2, y: arena.height - 80 },
    carrying: false,
    carryAt: null,
    rejected: null,
    rainAgo: -1,
    rainIn: 9,
    doneAgo: -1,
    roofs: 0,
    score: 0,
    time: 0,
  };

  const cellCentre = (r: number, c: number): Point => ({ x: left + (c + 0.5) * cellW, y: bottom - (r + 0.5) * cellH });

  function drop(at: Point): void {
    const c = Math.floor((at.x - left) / cellW);
    const r = Math.floor((bottom - at.y) / cellH);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) {
      state.rejected = { from: at, ago: 0 };
      return;
    }
    if (!canLay(state.tiles, r, c)) {
      state.rejected = { from: at, ago: 0 };
      events.push({ type: 'miss', ...at });
      return;
    }
    const i = r * COLS + c;
    state.tiles[i] = true;
    state.laidAgo[i] = 0;
    state.score += 1;
    events.push({ type: 'score', ...cellCentre(r, c) });
    if (state.tiles.every(Boolean)) {
      state.doneAgo = 0;
      events.push({ type: 'score', x: left + roofW / 2, y: bottom - cellH * ROWS - 30, points: 0 });
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
      state.laidAgo = state.laidAgo.map((a) => a + dt);
      if (state.rejected) {
        state.rejected.ago += dt;
        if (state.rejected.ago > 0.4) state.rejected = null;
      }
      if (state.rainAgo >= 0) {
        state.rainAgo += dt;
        if (state.rainAgo > RAIN_SECONDS) {
          state.rainAgo = -1;
          state.rainIn = RAIN_EVERY;
        }
      } else {
        state.rainIn -= dt;
        if (state.rainIn <= 0) state.rainAgo = 0;
      }
      if (state.doneAgo >= 0) {
        state.doneAgo += dt;
        state.carrying = false;
        if (state.doneAgo > DONE_SECONDS) {
          state.roofs += 1;
          state.tiles = state.tiles.map(() => false);
          state.doneAgo = -1;
        }
        return;
      }
      const p = input.pointer;
      if (p && input.pressed && Math.hypot(p.x - state.stack.x, p.y - state.stack.y) <= TOUCH_RADIUS + 40) state.carrying = true;
      if (p && state.carrying) state.carryAt = p;
      if (!p && state.carrying) {
        if (state.carryAt) drop(state.carryAt);
        state.carrying = false;
        state.carryAt = null;
      }
    },
  };
}

/** Good play: lays the lowest open place first, left to right, a short breath between tiles. */
export function roofBot(state: RoofState, _context: BotContext): BotMove {
  if (state.doneAgo >= 0) return {};
  let target: Point | null = null;
  for (let r = 0; r < ROWS && !target; r += 1) {
    for (let c = 0; c < COLS && !target; c += 1) {
      if (canLay(state.tiles, r, c)) target = { x: state.left + (c + 0.5) * state.cellW, y: state.bottom - (r + 0.5) * state.cellH };
    }
  }
  if (!target) return {};
  if (!state.carrying) return Math.min(...state.laidAgo) < 0.3 ? {} : { touch: state.stack };
  if (state.carryAt && Math.hypot(state.carryAt.x - target.x, state.carryAt.y - target.y) < 4) return {};
  return { touch: target };
}
