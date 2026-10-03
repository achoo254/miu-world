// Low to high: number tiles are shown for a moment, then turn face down; the child taps them from the smallest
// number to the largest. A right tile turns up and stays; a wrong one peeks its number, and the right next tile
// turns up by itself so the round can go on. A round with no slip is a point. Rounds grow from four tiles of
// 1–20 to six tiles of two-digit numbers (the class 2 range). Tapping during the show starts the round early.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Tile {
  value: number;
  x: number;
  y: number;
  size: number;
  /** Turned up for good (tapped in order, or shown as help). */
  done: boolean;
  /** Seconds left of a wrong tap's peek. */
  peek: number;
  /** Seconds since it was turned up (a pop). */
  since: number;
}

export type Phase = 'show' | 'play' | 'result';

export interface LowToHighState {
  tiles: Tile[];
  phase: Phase;
  phaseTime: number;
  showTime: number;
  /** Values in order; `next` indexes the one to tap. */
  order: number[];
  next: number;
  slips: number;
  rounds: number;
  /** When the child last turned a tile (the bot takes a breath). */
  lastTapAt: number;
  score: number;
  time: number;
}

const RESULT_SECONDS = 1.0;

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

/** Tile count and number range of a round (0-based). */
export function levelFor(round: number): { count: number; min: number; max: number } {
  if (round < 2) return { count: 4, min: 1, max: 20 };
  if (round < 5) return { count: 5, min: 1, max: 50 };
  return { count: 6, min: 10, max: 99 };
}

export function createLowToHigh({ arena, rng }: GameSetup): MinigameLogic<LowToHighState> {
  const events = eventQueue();
  const top = HUD_SAFE_TOP + 20;
  const area = { x: 20, y: top, w: arena.width - 40, h: arena.height - top - 20 };
  const landscape = area.w >= area.h;
  const cols = landscape ? 4 : 3;
  const rows = landscape ? 2 : Math.min(4, Math.max(3, Math.floor(area.h / (area.w / 3))));
  const cell = Math.min(area.w / cols, area.h / rows);
  const size = Math.min(cell * 0.8, 170);
  const gridLeft = area.x + (area.w - cell * cols) / 2;
  const gridTop = area.y + (area.h - cell * rows) / 2;
  const slots: Point[] = [];
  for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) slots.push({ x: gridLeft + cell * (c + 0.5), y: gridTop + cell * (r + 0.5) });

  const state: LowToHighState = { tiles: [], phase: 'show', phaseTime: 0, showTime: 0, order: [], next: 0, slips: 0, rounds: 0, lastTapAt: -1, score: 0, time: 0 };

  function deal(): void {
    const { count, min, max } = levelFor(state.rounds);
    const values = new Set<number>();
    while (values.size < count) values.add(rng.int(min, max));
    const places = shuffle([...slots], rng).slice(0, count);
    state.tiles = [...values].map((value, i) => {
      const at = places[i] ?? { x: 0, y: 0 };
      // A little jitter inside the cell so the board does not look like a form.
      const jx = rng.range(-1, 1) * (cell - size) * 0.35;
      const jy = rng.range(-1, 1) * (cell - size) * 0.35;
      return { value, x: at.x + jx, y: at.y + jy, size, done: false, peek: 0, since: 9 };
    });
    state.order = [...values].sort((a, b) => a - b);
    state.next = 0;
    state.slips = 0;
    state.phase = 'show';
    state.phaseTime = 0;
    state.showTime = 1.5 + 0.45 * count;
  }

  const tileAt = (p: Point): Tile | undefined => state.tiles.find((t) => Math.abs(p.x - t.x) <= t.size / 2 + 8 && Math.abs(p.y - t.y) <= t.size / 2 + 8);

  function turnUp(tile: Tile): void {
    tile.done = true;
    tile.since = 0;
    state.next += 1;
    if (state.next >= state.order.length) {
      state.phase = 'result';
      state.phaseTime = 0;
      if (state.slips === 0) {
        state.score += 1;
        events.push({ type: 'score', x: tile.x, y: tile.y - tile.size / 2 });
      } else {
        events.push({ type: 'miss', x: tile.x, y: tile.y });
      }
    }
  }

  function tap(p: Point): void {
    const tile = tileAt(p);
    if (!tile || tile.done) return;
    state.lastTapAt = state.time;
    if (tile.value === state.order[state.next]) {
      events.push({ type: 'action', x: tile.x, y: tile.y });
      turnUp(tile);
      return;
    }
    // A slip: the tapped tile peeks, the right one turns up as help.
    state.slips += 1;
    tile.peek = 0.7;
    events.push({ type: 'hit', x: tile.x, y: tile.y });
    const right = state.tiles.find((t) => t.value === state.order[state.next]);
    if (right) turnUp(right);
  }

  deal();

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
      for (const t of state.tiles) {
        t.since += dt;
        t.peek = Math.max(0, t.peek - dt);
      }
      if (state.phase === 'result') {
        if (state.phaseTime >= RESULT_SECONDS) {
          state.rounds += 1;
          deal();
        }
        return;
      }
      if (state.phase === 'show') {
        // A tap on a tile during the show starts the round at once (and counts).
        const early = input.taps.some((p) => tileAt(p));
        if (state.phaseTime < state.showTime && !early) return;
        state.phase = 'play';
        state.phaseTime = 0;
      }
      for (const p of input.taps) {
        if (state.phase !== 'play') break;
        tap(p);
      }
    },
  };
}

/** Good play: waits for the tiles to turn, then taps them in order with a short breath between. */
export function lowToHighBot(state: LowToHighState, _context: BotContext): BotMove {
  if (state.phase !== 'play' || state.time - state.lastTapAt < 0.35) return {};
  const tile = state.tiles.find((t) => t.value === state.order[state.next]);
  return tile ? { tap: { x: tile.x, y: tile.y } } : {};
}
