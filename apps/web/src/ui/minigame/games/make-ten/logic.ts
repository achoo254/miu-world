// Make ten: columns of number tiles rise slowly from the bottom. The child taps two tiles that add up to ten
// (later a hundred: every tile turns into its tens, 3 → 30) and both pop; the tiles above drop down. Two that
// do not add up shake and let go, no penalty. A new row pushes in from below every few seconds; when a column
// reaches the line at the top the round stops, the pairs made so far kept. New rows mostly bring the partner
// of a number already on the board, so there is always something to pair; a nearly empty board fills up
// quickly. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Tile {
  id: number;
  value: number;
  /** Units it still has to drop after tiles under it popped (eases to 0). */
  fall: number;
  /** Seconds since a wrong pair shook it (large = long ago). */
  shook: number;
}

export interface MakeTenState {
  /** Columns of tiles, bottom first. */
  columns: Tile[][];
  /** The row waiting under the board (shown faintly, not playable yet). */
  incoming: number[];
  cols: number;
  rows: number;
  size: number;
  left: number;
  /** y of the board's floor and of the line a column must not reach. */
  floorY: number;
  topY: number;
  /** 0 → 1: how far the board has risen toward the next row. */
  lift: number;
  /** Seconds a row takes to rise now. */
  riseSeconds: number;
  /** Ten, then a hundred. */
  target: number;
  /** Seconds since the switch to a hundred (the "×10" flash). */
  switchedAgo: number;
  selected: number | null;
  /** Tiles that just popped, for the picture. */
  popped: { x: number; y: number; value: number; ago: number }[];
  lastTapAt: number;
  overflow: boolean;
  score: number;
  time: number;
}

/** Pairs before the board switches from ten to a hundred. */
export const HUNDRED_AFTER = 12;
const START_ROWS = 3;
const MAX_ROWS = 8;
const RISE_START = 9;
const RISE_END = 6;
const PARTNER_SHARE = 0.6;
const FALL_SPEED = 900;

export function tileCentre(state: MakeTenState, col: number, row: number, tile: Tile): Point {
  return { x: state.left + (col + 0.5) * state.size, y: state.floorY - (row + 0.5) * state.size - state.lift * state.size - tile.fall };
}

export function createMakeTen({ arena, duration, params, rng }: GameSetup): MinigameLogic<MakeTenState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const cols = Math.max(5, Math.min(6, Math.floor((arena.width - 40) / 100)));
  const floorY = arena.height - 34;
  const room = floorY - HUD_SAFE_TOP - 80;
  const size = Math.min(104, (arena.width - 40) / cols, room / 5);
  // At most eight rows: a tall phone gets sky above the board, not a deep empty pit.
  const rows = Math.min(MAX_ROWS, Math.floor(room / size));
  const topY = floorY - rows * size;
  const state: MakeTenState = {
    columns: Array.from({ length: cols }, () => []),
    incoming: [],
    cols,
    rows,
    size,
    left: (arena.width - cols * size) / 2,
    floorY,
    topY,
    lift: 0,
    riseSeconds: RISE_START / factor,
    target: 10,
    switchedAgo: 99,
    selected: null,
    popped: [],
    lastTapAt: -9,
    overflow: false,
    score: 0,
    time: 0,
  };
  let nextId = 0;
  const unit = (): number => state.target / 10;

  const allTiles = (): Tile[] => state.columns.flat();

  /** One new row: mostly partners of numbers on the board, so a pair is always near. */
  function makeRow(): number[] {
    // In ones (1–9) whatever the target; scaled to tens at the end.
    const onBoard = allTiles().map((t) => t.value / unit());
    const row: number[] = [];
    for (let c = 0; c < cols; c += 1) {
      const pool = [...onBoard, ...row];
      row.push(pool.length > 0 && rng.chance(PARTNER_SHARE) ? 10 - (pool[rng.int(0, pool.length - 1)] ?? 5) : rng.int(1, 9));
    }
    return row.map((v) => v * unit());
  }

  function pushRow(): void {
    state.incoming.forEach((value, c) => state.columns[c]?.unshift({ id: (nextId += 1), value, fall: 0, shook: 99 }));
    state.incoming = makeRow();
    if (state.columns.some((col) => col.length > rows)) state.overflow = true;
  }

  for (let r = 0; r < START_ROWS; r += 1) {
    state.incoming = makeRow();
    pushRow();
  }

  function find(id: number): { col: number; row: number; tile: Tile } | null {
    for (let col = 0; col < cols; col += 1) {
      const row = state.columns[col]?.findIndex((t) => t.id === id) ?? -1;
      const tile = state.columns[col]?.[row];
      if (tile) return { col, row, tile };
    }
    return null;
  }

  /** The tile under a point (the whole cell, so a near tap counts). */
  function tileAt(p: Point): Tile | null {
    const col = Math.floor((p.x - state.left) / size);
    const column = state.columns[col];
    if (!column) return null;
    for (let row = 0; row < column.length; row += 1) {
      const tile = column[row];
      if (!tile) continue;
      const c = tileCentre(state, col, row, tile);
      if (Math.abs(p.y - c.y) <= size / 2) return tile;
    }
    return null;
  }

  function remove(id: number): void {
    const at = find(id);
    if (!at) return;
    const column = state.columns[at.col];
    if (!column) return;
    const c = tileCentre(state, at.col, at.row, at.tile);
    state.popped.push({ x: c.x, y: c.y, value: at.tile.value, ago: 0 });
    column.splice(at.row, 1);
    for (let r = at.row; r < column.length; r += 1) {
      const above = column[r];
      if (above) above.fall += size;
    }
  }

  function tap(p: Point): void {
    const tile = tileAt(p);
    if (!tile) return;
    state.lastTapAt = state.time;
    if (state.selected === null || state.selected === tile.id) {
      state.selected = state.selected === tile.id ? null : tile.id;
      const at = find(tile.id);
      if (at) events.push({ type: 'action', ...tileCentre(state, at.col, at.row, tile) });
      return;
    }
    const first = find(state.selected);
    const second = find(tile.id);
    state.selected = null;
    if (!first || !second) return;
    if (first.tile.value + second.tile.value === state.target) {
      const a = tileCentre(state, first.col, first.row, first.tile);
      const b = tileCentre(state, second.col, second.row, second.tile);
      remove(first.tile.id);
      remove(second.tile.id);
      state.score += 1;
      events.push({ type: 'score', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, note: 72 + (state.score % 5) * 2, voice: 'bell' });
      if (state.score === HUNDRED_AFTER && state.target === 10) {
        // Every number becomes its tens: the same pairs now make a hundred.
        state.target = 100;
        state.switchedAgo = 0;
        for (const t of allTiles()) t.value *= 10;
        state.incoming = state.incoming.map((v) => v * 10);
      }
    } else {
      first.tile.shook = 0;
      second.tile.shook = 0;
      events.push({ type: 'miss', ...tileCentre(state, second.col, second.row, second.tile) });
    }
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.overflow;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      if (state.overflow) return;
      state.time += dt;
      state.switchedAgo += dt;
      const progress = Math.min(1, state.time / duration);
      state.riseSeconds = (RISE_START + (RISE_END - RISE_START) * progress) / factor;
      for (const tile of allTiles()) {
        tile.fall = Math.max(0, tile.fall - FALL_SPEED * dt);
        tile.shook += dt;
      }
      for (const p of state.popped) p.ago += dt;
      state.popped = state.popped.filter((p) => p.ago < 0.6);
      for (const p of input.taps) tap(p);
      // A nearly empty board fills up quickly: nobody waits for numbers.
      const hurry = allTiles().length < cols ? 4 : 1;
      state.lift += (dt * hurry) / state.riseSeconds;
      if (state.lift >= 1) {
        state.lift -= 1;
        pushRow();
        if (state.overflow) events.push({ type: 'hit', x: arena.width / 2, y: topY });
      }
    },
  };
}

/** Seconds the bot looks before its next tap. */
const BOT_PAUSE = 0.35;

/** Good play: pair up from the tallest columns first. */
export function makeTenBot(state: MakeTenState, _context: BotContext): BotMove {
  if (state.time - state.lastTapAt < BOT_PAUSE) return {};
  const cells = state.columns.flatMap((column, col) => column.map((tile, row) => ({ tile, col, row, height: column.length })));
  const centre = (c: (typeof cells)[number]): Point => tileCentre(state, c.col, c.row, c.tile);
  if (state.selected !== null) {
    const first = cells.find((c) => c.tile.id === state.selected);
    const partner = first ? cells.filter((c) => c.tile.id !== first.tile.id && c.tile.value + first.tile.value === state.target).sort((a, b) => b.height - a.height)[0] : undefined;
    // No partner on the board: let go of the first tile.
    if (!partner) return first ? { tap: centre(first) } : {};
    return { tap: centre(partner) };
  }
  const ordered = [...cells].sort((a, b) => b.height - a.height || b.row - a.row);
  for (const a of ordered) {
    if (a.tile.fall > 0) continue;
    const partner = cells.find((b) => b.tile.id !== a.tile.id && b.tile.fall === 0 && a.tile.value + b.tile.value === state.target);
    if (partner) return { tap: centre(a) };
  }
  return {};
}
