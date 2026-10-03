// Nesting dolls ("Búp bê lồng nhau"): six to eight wooden dolls of nearly the same size stand on the shelf. The
// child drags a doll onto the doll just one size bigger (or taps one, then the other) and it goes inside. A
// doll already holding smaller ones goes in whole; the bigger doll must still be empty. A wrong size bounces
// back. When all are inside one, the set is done (a point) and a new set comes. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Doll {
  /** Size rank of the outer doll (0 = smallest of the set). */
  rank: number;
  /** How many dolls it holds inside (0 = empty). */
  holds: number;
  home: Point;
  /** Where it is drawn (follows the finger while dragged). */
  at: Point;
  /** When it last refused a doll (a wobble) or took one in. */
  bounceAt: number;
  joinedAt: number;
}

export interface NestingDollsState {
  dolls: Doll[];
  /** Drawn height of a doll of each rank. */
  sizes: number[];
  dragged: number;
  selected: number;
  /** Seconds until the next set (0 while one is played). */
  nextIn: number;
  sets: number;
  score: number;
  time: number;
}

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

/** Whether `a` can go inside `b` (or `b` inside `a`); returns [inner, outer] or null. */
export function fits(a: Doll, b: Doll): [Doll, Doll] | null {
  if (b.rank === a.rank + 1 && b.holds === 0) return [a, b];
  if (a.rank === b.rank + 1 && a.holds === 0) return [b, a];
  return null;
}

export function createNestingDolls({ arena, rng }: GameSetup): MinigameLogic<NestingDollsState> {
  const events = eventQueue();
  const state: NestingDollsState = { dolls: [], sizes: [], dragged: -1, selected: -1, nextIn: 0, sets: 0, score: 0, time: 0 };
  let pressAt: Point | null = null;

  const deal = (): void => {
    const count = Math.min(8, 6 + state.sets);
    const cols = arena.width >= arena.height ? Math.ceil(count / 2) : count > 6 ? 3 : 2;
    const rows = Math.ceil(count / cols);
    const top = HUD_SAFE_TOP + 20;
    const cellW = (arena.width - 40) / cols;
    const cellH = (arena.height - top - 30) / rows;
    const big = Math.min(cellW * 1.2, cellH * 0.85, 200);
    state.sizes = Array.from({ length: count }, (_, r) => big * (0.6 + (0.4 * r) / (count - 1)));
    const slots = shuffle(
      Array.from({ length: count }, (_, i) => i),
      rng,
    );
    state.dolls = slots.map((rank, i) => {
      const home = { x: 20 + cellW * ((i % cols) + 0.5), y: top + cellH * (Math.floor(i / cols) + 0.5) };
      return { rank, holds: 0, home, at: { ...home }, bounceAt: -9, joinedAt: -9 };
    });
    state.dragged = -1;
    state.selected = -1;
  };

  const dollAt = (p: Point, except = -1): number => {
    let best = -1;
    let bestD = Infinity;
    for (const [i, d] of state.dolls.entries()) {
      if (i === except) continue;
      const size = state.sizes[d.rank] ?? 100;
      const dx = Math.abs(p.x - d.home.x);
      const dy = Math.abs(p.y - d.home.y);
      if (dx > Math.max(50, size * 0.45) || dy > Math.max(55, size * 0.6)) continue;
      const dist = dx + dy;
      if (dist < bestD) {
        best = i;
        bestD = dist;
      }
    }
    return best;
  };

  const join = (ai: number, bi: number): void => {
    const a = state.dolls[ai];
    const b = state.dolls[bi];
    if (!a || !b) return;
    const pair = fits(a, b);
    if (!pair) {
      a.bounceAt = state.time;
      b.bounceAt = state.time;
      events.push({ type: 'miss', x: b.home.x, y: b.home.y });
      return;
    }
    const [inner, outer] = pair;
    outer.holds += inner.holds + 1;
    outer.joinedAt = state.time;
    state.dolls = state.dolls.filter((d) => d !== inner);
    events.push({ type: 'action', x: outer.home.x, y: outer.home.y, note: 60 + outer.holds * 2, voice: 'bell' });
    if (state.dolls.length === 1) {
      state.score += 1;
      state.nextIn = NEXT_SECONDS;
      events.push({ type: 'score', x: outer.home.x, y: outer.home.y - 60 });
    }
  };

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
      if (state.nextIn > 0) {
        state.nextIn -= dt;
        if (state.nextIn <= 0) {
          state.sets += 1;
          deal();
        }
        return;
      }
      const tap = input.taps[0];
      if (input.pressed) {
        const at = input.pointer ?? tap;
        if (at) {
          pressAt = at;
          state.dragged = dollAt(at);
        }
      }
      const held = state.dolls[state.dragged];
      if (held && input.pointer) held.at = { ...input.pointer };
      if (!input.released) return;
      const end = input.pointer ?? held?.at ?? tap ?? null;
      const moved = pressAt && end ? Math.hypot(end.x - pressAt.x, end.y - pressAt.y) > 24 : false;
      if (held) held.at = { ...held.home };
      if (moved && held && end) {
        const target = dollAt(end, state.dragged);
        if (target >= 0) join(state.dragged, target);
        state.selected = -1;
      } else if (tap) {
        const index = dollAt(tap);
        if (index >= 0) {
          if (state.selected >= 0 && state.selected !== index) {
            join(state.selected, index);
            state.selected = -1;
          } else state.selected = index === state.selected ? -1 : index;
        }
      }
      state.dragged = -1;
      pressAt = null;
    },
  };
}

/** Good play: drag the smallest doll that fits into the doll one size up. */
export function nestingDollsBot(state: NestingDollsState, _context: BotContext): BotMove {
  if (state.nextIn > 0) return {};
  const held = state.dolls[state.dragged];
  const pairOf = (inner: { rank: number }): { home: Point } | undefined => state.dolls.find((d) => d.rank === inner.rank + 1 && d.holds === 0);
  if (held) {
    const outer = pairOf(held);
    if (outer && Math.hypot(held.at.x - outer.home.x, held.at.y - outer.home.y) > 5) return { touch: outer.home };
    return {};
  }
  const sorted = [...state.dolls].sort((a, b) => a.rank - b.rank);
  const inner = sorted.find((d) => pairOf(d));
  return inner ? { touch: inner.home } : {};
}
