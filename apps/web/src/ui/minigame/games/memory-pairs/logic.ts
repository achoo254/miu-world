// Memory pairs: a board of face-down cards, two of each picture. The child taps a card to turn it over, then
// another: the same picture twice is a pair (it stays up, a point), two different ones turn back after a
// moment (or at once, on the next tap: no waiting). A cleared board is dealt again with new pictures, so a
// quick memory keeps scoring. Pictures are face numbers here; draw.ts picks the map's emoji for them.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** How many different pictures draw.ts has for every map (faces are 0 … FACE_COUNT - 1). */
export const FACE_COUNT = 12;
/** Seconds two different cards stay up before turning back on their own. */
const MISMATCH_SECONDS = 0.9;
/** Seconds between a cleared board and the next deal. */
const DEAL_SECONDS = 0.9;
/** Seconds a card takes to turn over (the picture swaps halfway). */
export const FLIP_SECONDS = 0.22;
const GAP = 16;

export type CardSide = 'down' | 'up' | 'matched';

export interface Card {
  face: number;
  x: number;
  y: number;
  w: number;
  h: number;
  side: CardSide;
  /** 0 = back showing … 1 = picture showing; eases toward the side. */
  turn: number;
  /** The child has seen its picture (the bot only remembers what was shown, like a child). */
  seen: boolean;
  /** Seconds since it was matched (a sparkle) or turned back after a mismatch (a wobble); large = long ago. */
  since: number;
}

export interface MemoryState {
  cards: Card[];
  /** Cards turned up and not yet matched or turned back (0, 1 or 2 indexes). */
  open: number[];
  /** Seconds until a mismatched pair turns back (0 when none waits). */
  closeIn: number;
  /** Seconds until the next board is dealt (0 while one is being played). */
  dealIn: number;
  boards: number;
  /** When the last card was turned (the bot takes a breath between cards, like a child). */
  lastTurnAt: number;
  score: number;
  time: number;
}

interface Layout {
  cols: number;
  rows: number;
}

/** The grid that gives the biggest cards for this many cards in the area (cards a little taller than wide). */
function bestLayout(count: number, width: number, height: number): Layout {
  let best: Layout = { cols: 2, rows: Math.ceil(count / 2) };
  let bestSize = 0;
  for (let cols = 2; cols <= 6; cols += 1) {
    const rows = Math.ceil(count / cols);
    const w = (width - GAP * (cols - 1)) / cols;
    const h = (height - GAP * (rows - 1)) / rows;
    // Cards may be a little taller than wide; the usable size is limited by the tighter side.
    const size = Math.min(w, h * 0.9);
    if (size > bestSize) {
      bestSize = size;
      best = { cols, rows };
    }
  }
  return best;
}

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

export function createMemoryPairs({ arena, params, rng }: GameSetup): MinigameLogic<MemoryState> {
  const pairs = typeof params.pairs === 'number' ? Math.round(Math.min(8, Math.max(3, params.pairs))) : 6;
  const events = eventQueue();
  const area = { x: 24, y: HUD_SAFE_TOP + 14, w: arena.width - 48, h: arena.height - HUD_SAFE_TOP - 38 };
  const { cols, rows } = bestLayout(pairs * 2, area.w, area.h);
  const cellW = (area.w - GAP * (cols - 1)) / cols;
  const cellH = (area.h - GAP * (rows - 1)) / rows;
  const cardW = Math.min(cellW, cellH * 0.9);
  const cardH = Math.min(cellH, cardW * 1.25);
  const gridW = cols * cardW + (cols - 1) * GAP;
  const gridH = rows * cardH + (rows - 1) * GAP;
  const left = area.x + (area.w - gridW) / 2;
  const top = area.y + (area.h - gridH) / 2;

  const state: MemoryState = { cards: [], open: [], closeIn: 0, dealIn: 0, boards: 0, lastTurnAt: -1, score: 0, time: 0 };

  function deal(): void {
    const faces = shuffle(
      Array.from({ length: FACE_COUNT }, (_, i) => i),
      rng,
    ).slice(0, pairs);
    const deck = shuffle([...faces, ...faces], rng);
    // The last row is centred when it is not full.
    state.cards = deck.map((face, i) => {
      const row = Math.floor(i / cols);
      const inRow = row === rows - 1 ? deck.length - row * cols : cols;
      const col = i % cols;
      const rowLeft = left + ((cols - inRow) * (cardW + GAP)) / 2;
      return { face, x: rowLeft + col * (cardW + GAP), y: top + row * (cardH + GAP), w: cardW, h: cardH, side: 'down' as CardSide, turn: 0, seen: false, since: 99 };
    });
    state.open = [];
    state.closeIn = 0;
    state.boards += 1;
  }

  function closeOpen(): void {
    for (const i of state.open) {
      const card = state.cards[i];
      if (card) {
        card.side = 'down';
        card.since = 0;
      }
    }
    state.open = [];
    state.closeIn = 0;
  }

  /** The card under a tap; the hit box reaches halfway into the gaps so a near tap still counts. */
  function cardAt(p: Point): number {
    return state.cards.findIndex((c) => p.x >= c.x - GAP / 2 && p.x <= c.x + c.w + GAP / 2 && p.y >= c.y - GAP / 2 && p.y <= c.y + c.h + GAP / 2);
  }

  function tap(p: Point): void {
    if (state.dealIn > 0) return;
    const index = cardAt(p);
    const card = state.cards[index];
    if (!card || card.side !== 'down') return;
    // A third card while two different ones are still up: they turn back right away.
    if (state.open.length === 2) closeOpen();
    card.side = 'up';
    card.seen = true;
    state.lastTurnAt = state.time;
    state.open.push(index);
    events.push({ type: 'action', x: card.x + card.w / 2, y: card.y + card.h / 2 });
    if (state.open.length < 2) return;
    const [a, b] = state.open.map((i) => state.cards[i]);
    if (a && b && a.face === b.face) {
      a.side = 'matched';
      b.side = 'matched';
      a.since = 0;
      b.since = 0;
      state.open = [];
      state.score += 1;
      events.push({ type: 'score', x: (a.x + b.x + a.w) / 2, y: (a.y + b.y + a.h) / 2 });
      if (state.cards.every((c) => c.side === 'matched')) state.dealIn = DEAL_SECONDS;
    } else {
      state.closeIn = MISMATCH_SECONDS;
      if (b) events.push({ type: 'miss', x: b.x + b.w / 2, y: b.y + b.h / 2 });
    }
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
      for (const card of state.cards) {
        card.since += dt;
        const target = card.side === 'down' ? 0 : 1;
        const delta = dt / FLIP_SECONDS;
        card.turn = card.turn < target ? Math.min(target, card.turn + delta) : Math.max(target, card.turn - delta);
      }
      if (state.dealIn > 0) {
        state.dealIn -= dt;
        if (state.dealIn <= 0) {
          state.dealIn = 0;
          deal();
        }
        return;
      }
      if (state.closeIn > 0) {
        state.closeIn -= dt;
        if (state.closeIn <= 0) closeOpen();
      }
      for (const p of input.taps) tap(p);
    },
  };
}

/** Seconds the bot looks at a card before turning the next. */
const BOT_PAUSE = 0.6;

const centre = (c: Card): Point => ({ x: c.x + c.w / 2, y: c.y + c.h / 2 });

/**
 * Good play with an honest memory: it only knows pictures it has seen. A known pair is taken at once; otherwise
 * it turns an unseen card, and then its twin if that was seen before.
 */
export function memoryBot(state: MemoryState, _context: BotContext): BotMove {
  if (state.dealIn > 0 || state.time - state.lastTurnAt < BOT_PAUSE) return {};
  const hidden = state.cards.map((c, i) => ({ c, i })).filter(({ c }) => c.side === 'down');
  const openCards = state.open.length === 1 ? state.open : [];
  const first = openCards[0] !== undefined ? state.cards[openCards[0]] : undefined;
  if (first) {
    const twin = hidden.find(({ c }) => c.seen && c.face === first.face);
    const pick = twin ?? hidden.find(({ c }) => !c.seen) ?? hidden[0];
    return pick ? { tap: centre(pick.c) } : {};
  }
  for (const a of hidden) {
    if (!a.c.seen) continue;
    const b = hidden.find(({ c, i }) => i !== a.i && c.seen && c.face === a.c.face);
    if (b) return { tap: centre(a.c) };
  }
  const unseen = hidden.find(({ c }) => !c.seen);
  return unseen ? { tap: centre(unseen.c) } : {};
}
