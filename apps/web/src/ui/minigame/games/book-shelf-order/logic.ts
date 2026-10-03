// Book shelf order: a library shelf holds numbered books (12 to 98) in increasing order. A new book waits on
// the cart; the child drags it onto the shelf (or taps the gap) where it belongs so the row still goes up from
// left to right. In the right gap it slides in (a point); in a wrong one it tips over and slides back to the
// cart, which takes a moment. A full shelf is boxed up and a fresh one starts. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** Books a shelf holds before it is boxed up. */
export const CAPACITY = 7;
const START_BOOKS = 3;
const TIP_SECONDS = 1.5;
const PACK_SECONDS = 0.9;

export interface ShelfState {
  shelf: number[];
  /** The book waiting to be shelved. */
  book: number;
  /** Where the book is drawn: on the cart, or under the finger. */
  bookAt: Point;
  cart: Point;
  dragging: boolean;
  /** The gap the dragged book would go into (for the caret), or -1. */
  hoverGap: number;
  /** Tipped over in a wrong gap: until this time nothing is taken. */
  tipUntil: number;
  tipGap: number;
  phase: 'shelve' | 'pack';
  phaseAgo: number;
  /** When the last book slid in (index on the shelf), for its slide. */
  placedAt: number;
  placedIndex: number;
  shelfY: number;
  bookW: number;
  bookH: number;
  score: number;
  time: number;
}

/** X of the book at `index` on a shelf of `count` books, centred on the screen. */
export const bookX = (state: Pick<ShelfState, 'bookW'>, width: number, index: number, count: number): number => width / 2 + (index - (count - 1) / 2) * (state.bookW + 8);

/** The gap a point on the shelf falls in: how many books stand left of it. */
export const gapAt = (state: ShelfState, width: number, x: number): number => state.shelf.filter((_, i) => bookX(state, width, i, state.shelf.length) < x).length;

/** The right gap for the book. */
export const rightGap = (state: Pick<ShelfState, 'shelf' | 'book'>): number => state.shelf.filter((v) => v < state.book).length;

export function createBookShelfOrder({ arena, rng }: GameSetup): MinigameLogic<ShelfState> {
  const events = eventQueue();
  const free = arena.height - HUD_SAFE_TOP;
  const bookH = Math.min(170, free * 0.3);
  const bookW = Math.min(80, (arena.width - 60) / (CAPACITY + 0.6));
  const shelfY = HUD_SAFE_TOP + 30 + bookH;
  const cart = { x: arena.width / 2, y: Math.min(arena.height - bookH / 2 - 30, shelfY + bookH * 0.5 + free * 0.32) };
  const state: ShelfState = {
    shelf: [],
    book: 0,
    bookAt: { ...cart },
    cart,
    dragging: false,
    hoverGap: -1,
    tipUntil: 0,
    tipGap: -1,
    phase: 'shelve',
    phaseAgo: 0,
    placedAt: -9,
    placedIndex: -1,
    shelfY,
    bookW,
    bookH,
    score: 0,
    time: 0,
  };

  const freshNumber = (r: Rng): number => {
    // Often close to a book already there (same tens), so the ones digit matters too.
    for (let tries = 0; tries < 40; tries += 1) {
      const near = state.shelf.length > 0 && r.chance(0.45) ? (state.shelf[r.int(0, state.shelf.length - 1)] ?? 50) + r.pick([-3, -2, -1, 1, 2, 3] as const) : r.int(12, 98);
      if (near >= 12 && near <= 98 && !state.shelf.includes(near)) return near;
    }
    return state.shelf.length > 0 ? Math.max(...state.shelf) + 1 : 50;
  };

  const newShelf = (count: number): void => {
    state.shelf = [];
    while (state.shelf.length < count) state.shelf.push(freshNumber(rng));
    state.shelf.sort((a, b) => a - b);
  };

  const nextBook = (): void => {
    state.book = freshNumber(rng);
    state.bookAt = { ...cart };
  };

  const onShelf = (p: Point): boolean => p.y >= shelfY - bookH - 40 && p.y <= shelfY + 50;

  const place = (gap: number, at: Point): void => {
    state.dragging = false;
    state.hoverGap = -1;
    if (gap === rightGap(state)) {
      state.shelf.splice(gap, 0, state.book);
      state.placedAt = state.time;
      state.placedIndex = gap;
      state.score += 1;
      events.push({ type: 'score', x: bookX(state, arena.width, gap, state.shelf.length), y: shelfY - bookH / 2 });
      if (state.shelf.length >= CAPACITY) {
        state.phase = 'pack';
        state.phaseAgo = 0;
      } else nextBook();
    } else {
      state.tipUntil = state.time + TIP_SECONDS;
      state.tipGap = gap;
      state.bookAt = { x: at.x, y: shelfY - bookH / 2 };
      events.push({ type: 'miss', x: at.x, y: shelfY - bookH / 2 });
    }
  };

  newShelf(START_BOOKS);
  nextBook();

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
      state.phaseAgo += dt;
      if (state.phase === 'pack') {
        if (state.phaseAgo >= PACK_SECONDS) {
          state.phase = 'shelve';
          newShelf(2);
          nextBook();
        }
        return;
      }
      if (state.time < state.tipUntil) {
        state.dragging = false;
        return;
      }
      if (state.tipGap >= 0) {
        state.tipGap = -1;
        state.bookAt = { ...cart };
      }
      const pointer = input.pointer;
      if (input.pressed && pointer && Math.abs(pointer.x - state.bookAt.x) <= bookW / 2 + 40 && Math.abs(pointer.y - state.bookAt.y) <= bookH / 2 + 30) state.dragging = true;
      if (state.dragging && pointer) {
        state.bookAt = { ...pointer };
        state.hoverGap = onShelf(pointer) ? gapAt(state, arena.width, pointer.x) : -1;
      }
      if (input.released && state.dragging) {
        const at = state.bookAt;
        if (onShelf(at)) place(gapAt(state, arena.width, at.x), at);
        else {
          state.dragging = false;
          state.hoverGap = -1;
          state.bookAt = { ...cart };
        }
        return;
      }
      // A tap on the shelf puts the book in that gap.
      const tap = input.taps.find(onShelf);
      if (tap && !state.dragging) place(gapAt(state, arena.width, tap.x), tap);
    },
  };
}

/** Good play: a look at the number, then a tap in the right gap. */
export function bookShelfBot(state: ShelfState, context: BotContext): BotMove {
  if (state.phase !== 'shelve' || state.time < state.tipUntil || state.time - state.placedAt < 0.4) return {};
  const gap = rightGap(state);
  const n = state.shelf.length;
  const width = context.arena.width;
  const left = gap > 0 ? bookX(state, width, gap - 1, n) : bookX(state, width, 0, n) - state.bookW;
  const right = gap < n ? bookX(state, width, gap, n) : bookX(state, width, n - 1, n) + state.bookW;
  return { tap: { x: (left + right) / 2, y: state.shelfY - state.bookH / 2 } };
}
