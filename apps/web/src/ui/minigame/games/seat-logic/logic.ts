// Seat logic ("Xếp chỗ tiệc vua"): the king's feast table has a row of chairs, the first one under the crown.
// Picture cards say who must sit next to whom (a heart between two faces), who must not (a cross), and who
// gets the crown chair. The child drags the guests from the line onto chairs (or taps a guest, then a chair;
// a guest dropped on a taken chair swaps places). With every chair filled, if all the cards are kept the
// guests cheer (a point) and the next table comes; otherwise the broken cards blink red and the guests can be
// moved again. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const GUESTS = ['rabbit', 'turtle', 'cat', 'mouse', 'fox', 'frog', 'panda', 'penguin'] as const;
export type Guest = (typeof GUESTS)[number];

export type Clue = { kind: 'next'; a: number; b: number } | { kind: 'apart'; a: number; b: number } | { kind: 'crown'; a: number };

export interface SeatLogicState {
  guests: Guest[];
  /** Chair of each guest (−1 = still in the line). */
  seatOf: number[];
  /** One arrangement that keeps every card (guest per chair). */
  answer: number[];
  clues: Clue[];
  /** Cards broken at the last full table (blink red). */
  broken: number[];
  chairs: Point[];
  line: Point[];
  dragged: number;
  selected: number;
  finger: Point | null;
  checkedAt: number;
  nextIn: number;
  tables: number;
  score: number;
  time: number;
}

const NEXT_SECONDS = 1.4;

export function keeps(clue: Clue, seats: readonly number[]): boolean {
  const pa = seats[clue.a] ?? -9;
  if (clue.kind === 'crown') return pa === 0;
  const pb = seats[clue.b] ?? -9;
  return clue.kind === 'next' ? Math.abs(pa - pb) === 1 : Math.abs(pa - pb) !== 1;
}

function permutations(n: number): number[][] {
  if (n === 1) return [[0]];
  const out: number[][] = [];
  for (const p of permutations(n - 1)) for (let i = 0; i <= p.length; i += 1) out.push([...p.slice(0, i), n - 1, ...p.slice(i)]);
  return out;
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

/** Cards for a table of `n` from a hidden answer (`seatOf` per guest): few enough to read, enough to narrow it down. */
export function makeClues(rng: Rng, n: number, seatOf: number[]): Clue[] {
  const candidates: Clue[] = [];
  for (let a = 0; a < n; a += 1) {
    for (let b = a + 1; b < n; b += 1) {
      const next = Math.abs((seatOf[a] ?? 0) - (seatOf[b] ?? 0)) === 1;
      candidates.push(next ? { kind: 'next', a, b } : { kind: 'apart', a, b });
    }
  }
  shuffle(candidates, rng);
  const crown = seatOf.indexOf(0);
  const clues: Clue[] = [{ kind: 'crown', a: crown }];
  const all = permutations(n).map((p) => p.map((guestAtChair) => guestAtChair)).map((order) => {
    // order[chair] = guest → seats[guest] = chair
    const seats = Array.from({ length: n }, () => 0);
    order.forEach((g, chair) => {
      seats[g] = chair;
    });
    return seats;
  });
  let fitting = all.filter((s) => clues.every((c) => keeps(c, s)));
  // Prefer "next to" cards (easier to read), and stop once at most two seatings fit.
  candidates.sort((x, y) => (x.kind === 'next' ? 0 : 1) - (y.kind === 'next' ? 0 : 1));
  for (const clue of candidates) {
    if (fitting.length <= 2 || clues.length >= n + 1) break;
    const after = fitting.filter((s) => keeps(clue, s));
    if (after.length < fitting.length) {
      clues.push(clue);
      fitting = after;
    }
  }
  return clues;
}

export function createSeatLogic({ arena, rng }: GameSetup): MinigameLogic<SeatLogicState> {
  const events = eventQueue();
  const state: SeatLogicState = { guests: [], seatOf: [], answer: [], clues: [], broken: [], chairs: [], line: [], dragged: -1, selected: -1, finger: null, checkedAt: -9, nextIn: 0, tables: 0, score: 0, time: 0 };
  let pressAt: Point | null = null;

  const deal = (r: Rng): void => {
    const n = state.tables < 2 ? 4 : 5;
    state.guests = shuffle([...GUESTS], r).slice(0, n);
    const answerSeat = shuffle(
      Array.from({ length: n }, (_, i) => i),
      r,
    );
    state.answer = Array.from({ length: n }, (_, chair) => answerSeat.indexOf(chair));
    state.clues = makeClues(r, n, answerSeat);
    state.seatOf = Array.from({ length: n }, () => -1);
    const gap = Math.min(160, (arena.width - 40) / n);
    const tableY = HUD_SAFE_TOP + (arena.height - HUD_SAFE_TOP) * 0.5;
    state.chairs = Array.from({ length: n }, (_, i) => ({ x: arena.width / 2 + (i - (n - 1) / 2) * gap, y: tableY }));
    state.line = Array.from({ length: n }, (_, i) => ({ x: arena.width / 2 + (i - (n - 1) / 2) * gap, y: arena.height - 80 }));
    state.broken = [];
    state.dragged = -1;
    state.selected = -1;
  };

  const posOf = (g: number): Point => {
    const seat = state.seatOf[g] ?? -1;
    return seat >= 0 ? (state.chairs[seat] ?? { x: 0, y: 0 }) : (state.line[g] ?? { x: 0, y: 0 });
  };
  const near = (p: Point, q: Point): boolean => Math.abs(p.x - q.x) < 62 && Math.abs(p.y - q.y) < 70;
  const guestAt = (p: Point): number => state.guests.findIndex((_, g) => near(p, posOf(g)));
  const chairAt = (p: Point): number => state.chairs.findIndex((c) => near(p, c));

  const place = (g: number, chair: number): void => {
    const other = state.seatOf.indexOf(chair);
    if (other >= 0 && other !== g) state.seatOf[other] = state.seatOf[g] ?? -1;
    state.seatOf[g] = chair;
    const c = state.chairs[chair] ?? { x: 0, y: 0 };
    events.push({ type: 'action', x: c.x, y: c.y });
    if (state.seatOf.some((s) => s < 0)) {
      state.broken = [];
      return;
    }
    state.broken = state.clues.map((clue, i) => (keeps(clue, state.seatOf) ? -1 : i)).filter((i) => i >= 0);
    state.checkedAt = state.time;
    if (state.broken.length === 0) {
      state.score += 1;
      state.nextIn = NEXT_SECONDS;
      events.push({ type: 'score', x: arena.width / 2, y: c.y - 60 });
    } else events.push({ type: 'miss', x: arena.width / 2, y: c.y });
  };

  deal(rng);

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
          state.tables += 1;
          deal(rng);
        }
        return;
      }
      const tap = input.taps[0];
      if (input.pressed) {
        const at = input.pointer ?? tap;
        if (at) {
          pressAt = at;
          state.dragged = guestAt(at);
        }
      }
      if (input.pointer) state.finger = input.pointer;
      if (!input.released) return;
      const end = input.pointer ?? state.finger ?? tap ?? null;
      const moved = pressAt && end ? Math.hypot(end.x - pressAt.x, end.y - pressAt.y) > 24 : false;
      if (moved && state.dragged >= 0 && end) {
        const chair = chairAt(end);
        if (chair >= 0) place(state.dragged, chair);
        state.selected = -1;
      } else if (tap) {
        const g = guestAt(tap);
        const chair = chairAt(tap);
        if (state.selected >= 0 && chair >= 0 && g !== state.selected) {
          place(state.selected, chair);
          state.selected = -1;
        } else if (g >= 0) state.selected = g === state.selected ? -1 : g;
      }
      state.dragged = -1;
      state.finger = null;
      pressAt = null;
    },
  };
}

/** Good play: each guest dragged to its chair in the answer. */
export function seatLogicBot(state: SeatLogicState, _context: BotContext): BotMove {
  if (state.nextIn > 0) return {};
  const posOf = (g: number): Point => {
    const seat = state.seatOf[g] ?? -1;
    return seat >= 0 ? (state.chairs[seat] ?? { x: 0, y: 0 }) : (state.line[g] ?? { x: 0, y: 0 });
  };
  if (state.dragged >= 0) {
    const chair = state.chairs[state.answer.indexOf(state.dragged)];
    if (!chair) return {};
    return state.finger && Math.hypot(state.finger.x - chair.x, state.finger.y - chair.y) < 2 ? {} : { touch: chair };
  }
  const g = state.guests.findIndex((_, k) => state.seatOf[k] !== state.answer.indexOf(k));
  return g >= 0 ? { touch: posOf(g) } : {};
}
