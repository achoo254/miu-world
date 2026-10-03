// Story order: four pictures of a little story (a chick hatching, the tortoise and the hare…) lie shuffled at
// the top; four numbered places wait below. The child drags each picture to its place, or taps the picture
// that happens next and it goes to the first empty place. The right place keeps it; a wrong one shakes it back
// and the pictures rest a moment before the next try (nothing is taken away). The story done is a point and
// the next story comes; stories do not repeat until all were told. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';
import { STORIES } from './stories';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Card {
  /** Its place in the story (0–3). */
  frame: number;
  home: Rect;
  /** The place it sits in, or -1 while in the tray. */
  placed: number;
  shook: number;
}

export interface StoryState {
  story: number;
  cards: Card[];
  slots: Rect[];
  /** The card held by the finger (-1: none) and where it is while dragged. */
  held: number;
  dragAt: Point | null;
  pressAt: Point | null;
  /** Seconds left of the rest after a wrong place. */
  sulk: number;
  /** Seconds since the story was finished, -1 while ordering. */
  finished: number;
  told: number;
  score: number;
  time: number;
}

export const SULK_SECONDS = 1;
const NEXT_SECONDS = 1.2;
const DRAG_START = 16;

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

const inside = (p: Point, r: Rect, pad = 0): boolean => p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad;
export const centre = (r: Rect): Point => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/** Four tray places and four story places: rows of four on a wide screen, 2 × 2 blocks on a tall one. */
export function storyLayout(width: number, height: number): { tray: Rect[]; slots: Rect[] } {
  const top = HUD_SAFE_TOP + 56;
  const gap = 18;
  const wide = width >= height;
  const cols = wide ? 4 : 2;
  const rowsEach = wide ? 1 : 2;
  const band = (height - top - 40 - 40) / 2;
  const w = Math.min((width - gap * (cols + 1)) / cols, (band - gap * (rowsEach - 1)) / rowsEach / 0.9);
  const h = w * 0.9;
  const blockW = cols * w + (cols - 1) * gap;
  const left = (width - blockW) / 2;
  const blockH = rowsEach * h + (rowsEach - 1) * gap;
  const places = (y0: number): Rect[] => Array.from({ length: 4 }, (_, i) => ({ x: left + (i % cols) * (w + gap), y: y0 + Math.floor(i / cols) * (h + gap), w, h }));
  const trayY = top + (band - blockH) / 2;
  const slotY = top + band + 40 + (band - blockH) / 2;
  return { tray: places(trayY), slots: places(slotY) };
}

export function createStoryOrder({ arena, rng }: GameSetup): MinigameLogic<StoryState> {
  const events = eventQueue();
  const { tray, slots } = storyLayout(arena.width, arena.height);
  const state: StoryState = { story: 0, cards: [], slots, held: -1, dragAt: null, pressAt: null, sulk: 0, finished: -1, told: 0, score: 0, time: 0 };
  let deck: number[] = [];

  function nextStory(): void {
    if (deck.length === 0) deck = shuffle(STORIES.map((_, i) => i).filter((i) => i !== state.story || state.told === 0), rng);
    state.story = deck.pop() ?? 0;
    const order = shuffle([0, 1, 2, 3], rng);
    // Never already in order.
    if (order.every((f, i) => f === i)) order.reverse();
    state.cards = order.map((frame, i) => ({ frame, home: tray[i] ?? tray[0] ?? { x: 0, y: 0, w: 100, h: 90 }, placed: -1, shook: 99 }));
    state.finished = -1;
    state.told += 1;
  }

  const cardAt = (p: Point): number => state.cards.findIndex((c) => c.placed < 0 && inside(p, c.home, 8));

  function place(index: number, slot: number): void {
    const card = state.cards[index];
    const rect = slots[slot];
    if (!card || !rect || state.cards.some((c) => c.placed === slot)) return;
    if (card.frame === slot) {
      card.placed = slot;
      events.push({ type: 'action', x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 });
      if (state.cards.every((c) => c.placed >= 0)) {
        state.score += 1;
        state.finished = 0;
        events.push({ type: 'score', x: arena.width / 2, y: rect.y });
      }
      return;
    }
    card.shook = 0;
    state.sulk = SULK_SECONDS;
    events.push({ type: 'miss', x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 });
  }

  const firstEmpty = (): number => slots.findIndex((_, i) => !state.cards.some((c) => c.placed === i));

  nextStory();

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
      for (const c of state.cards) c.shook += dt;
      if (state.finished >= 0) {
        state.finished += dt;
        if (state.finished >= NEXT_SECONDS) nextStory();
        return;
      }
      const ready = state.sulk <= 0;
      const press = input.pressed ? (input.pointer ?? input.taps[0] ?? null) : null;
      if (press && ready) {
        state.held = cardAt(press);
        state.pressAt = state.held >= 0 ? press : null;
        state.dragAt = null;
      }
      if (input.pointer && state.held >= 0 && state.pressAt) {
        if (state.dragAt || Math.hypot(input.pointer.x - state.pressAt.x, input.pointer.y - state.pressAt.y) > DRAG_START) state.dragAt = input.pointer;
      }
      if (ready) {
        for (const tap of input.taps) {
          const i = cardAt(tap);
          if (i >= 0 && !state.dragAt) place(i, firstEmpty());
        }
      }
      if (input.released) {
        if (state.held >= 0 && state.dragAt && ready) {
          const at = state.dragAt;
          const slot = slots.findIndex((r) => inside(at, r, 20));
          if (slot >= 0) place(state.held, slot);
        }
        state.held = -1;
        state.dragAt = null;
        state.pressAt = null;
      }
    },
  };
}

/** Good play: knows how the story goes; taps the picture that comes next. */
export function storyOrderBot(state: StoryState, _context: BotContext): BotMove {
  if (state.finished >= 0 || state.sulk > 0 || Math.floor(state.time * 10) % 5 !== 0) return {};
  const next = state.slots.findIndex((_, i) => !state.cards.some((c) => c.placed === i));
  const card = state.cards.find((c) => c.frame === next);
  return card ? { tap: centre(card.home) } : {};
}
