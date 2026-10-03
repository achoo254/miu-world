// Tens bundles (bó que tính): a friend asks for a number ("47") and that many counting sticks lie on the desk
// in little piles. The child draws a loop round sticks with one finger; a loop round exactly ten ties them
// into a bundle that goes to the tray (a count bubble follows the finger while she draws). A loop round any
// other number: the string slips off, no penalty. When fewer than ten sticks are left, the tray reads
// "4 bó và 7 que là 47" and the number is done (a point). Piles of one ten always lie side by side, and the
// piles are reshuffled if what is left could no longer make ten. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Stick {
  x: number;
  y: number;
  angle: number;
  colour: number;
  pile: number;
  /** Seconds since it was tied into a bundle (-1 while loose). */
  tiedAgo: number;
  /** Where its bundle gathered. */
  to: Point | null;
}

export interface TensState {
  target: number;
  sticks: Stick[];
  /** The loop being drawn. */
  loop: Point[];
  /** A loop let go that did not hold ten: its points, count and how long ago (it slips off). */
  slipped: { loop: Point[]; count: number; ago: number } | null;
  bundles: number;
  /** Seconds since the number was finished (the tray reads it out), -1 while working. */
  doneAgo: number;
  /** Where the piles may lie and where the tray is. */
  table: { x: number; y: number; w: number; h: number };
  tray: { x: number; y: number; w: number; h: number };
  slot: number;
  numbers: number;
  lastMoveAt: number;
  score: number;
  time: number;
}

const DONE_SECONDS = 2;
const TIE_SECONDS = 0.7;
const MIN_LOOP = 120;

export function inside(poly: readonly Point[], p: Point): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const a = poly[i];
    const b = poly[j];
    if (!a || !b) continue;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

/** Whether some of these pile sizes add up to exactly ten. */
export function canMakeTen(piles: readonly number[]): boolean {
  let reach = new Set([0]);
  for (const n of piles) reach = new Set([...reach, ...[...reach].map((r) => r + n).filter((r) => r <= 10)]);
  return reach.has(10);
}

/** Pile sizes for a number: each ten whole or split in two (lying side by side), the ones in one pile. */
export function pilesFor(rng: Rng, target: number, slots: number): number[][] {
  const tens = Math.floor(target / 10);
  const ones = target % 10;
  const groups: number[][] = [];
  let used = ones > 0 ? 1 : 0;
  for (let t = 0; t < tens; t += 1) {
    const roomForSplit = slots - used - (tens - t - 1) >= 2;
    if (roomForSplit && rng.chance(0.75)) {
      const a = rng.int(3, 7);
      groups.push([a, 10 - a]);
      used += 2;
    } else {
      groups.push([10]);
      used += 1;
    }
  }
  if (ones > 0) groups.push([ones]);
  return groups;
}

export function createTensBundles({ arena, rng }: GameSetup): MinigameLogic<TensState> {
  const events = eventQueue();
  const landscape = arena.width > arena.height * 1.15;
  const top = HUD_SAFE_TOP + 90;
  const tray = landscape ? { x: arena.width - 190, y: top, w: 170, h: arena.height - top - 20 } : { x: 20, y: arena.height - 150, w: arena.width - 40, h: 130 };
  const table = landscape ? { x: 20, y: top, w: arena.width - 230, h: arena.height - top - 20 } : { x: 20, y: top, w: arena.width - 40, h: tray.y - top - 16 };
  const slot = Math.min(150, Math.max(118, Math.min(table.w / 4, table.h / 3)));
  const cols = Math.floor(table.w / slot);
  const rows = Math.floor(table.h / slot);
  const state: TensState = { target: 0, sticks: [], loop: [], slipped: null, bundles: 0, doneAgo: -1, table, tray, slot, numbers: 0, lastMoveAt: 0, score: 0, time: 0 };

  const slotCentre = (i: number): Point => {
    const ox = table.x + (table.w - cols * slot) / 2;
    const oy = table.y + (table.h - rows * slot) / 2;
    return { x: ox + ((i % cols) + 0.5) * slot, y: oy + (Math.floor(i / cols) + 0.5) * slot };
  };

  /** Lays piles out over the desk: each group's piles in neighbouring slots of one row, groups anywhere. */
  function layOut(groups: number[][]): void {
    state.sticks = state.sticks.filter((s) => s.tiedAgo >= 0);
    const free = new Set(Array.from({ length: cols * rows }, (_, i) => i));
    let pile = 0;
    for (const group of groups) {
      const k = group.length;
      const fits = [...free].filter((p) => (p % cols) + k <= cols && group.every((_, j) => free.has(p + j)));
      const at = fits.length > 0 ? (fits[rng.int(0, fits.length - 1)] ?? 0) : ([...free][0] ?? 0);
      group.forEach((size, j) => {
        const c = slotCentre(at + j);
        free.delete(at + j);
        for (let n = 0; n < size; n += 1) {
          const a = rng.range(0, Math.PI * 2);
          const r = rng.range(0, slot * 0.22);
          state.sticks.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r, angle: rng.range(-1.2, 1.2), colour: rng.int(0, 4), pile, tiedAgo: -1, to: null });
        }
        pile += 1;
      });
    }
  }

  function next(): void {
    const level = state.numbers;
    const [lo, hi] = level < 2 ? [12, 29] : level < 4 ? [21, 39] : [31, 59];
    const slots = cols * rows;
    let target = rng.int(lo, hi);
    // Never more piles than places on the desk.
    while (Math.floor(target / 10) + (target % 10 > 0 ? 1 : 0) > slots) target -= 10;
    state.target = target;
    state.bundles = 0;
    state.sticks = [];
    state.loop = [];
    state.slipped = null;
    state.doneAgo = -1;
    state.numbers += 1;
    state.lastMoveAt = state.time;
    layOut(pilesFor(rng, target, slots));
  }
  next();

  const loose = (): Stick[] => state.sticks.filter((s) => s.tiedAgo < 0);

  function close(loop: Point[]): void {
    let length = 0;
    for (let i = 1; i < loop.length; i += 1) length += Math.hypot((loop[i]?.x ?? 0) - (loop[i - 1]?.x ?? 0), (loop[i]?.y ?? 0) - (loop[i - 1]?.y ?? 0));
    if (length < MIN_LOOP) return;
    const caught = loose().filter((s) => inside(loop, s));
    if (caught.length === 0) return;
    const centre = { x: caught.reduce((a, s) => a + s.x, 0) / caught.length, y: caught.reduce((a, s) => a + s.y, 0) / caught.length };
    if (caught.length !== 10) {
      state.slipped = { loop, count: caught.length, ago: 0 };
      events.push({ type: 'miss', ...centre });
      return;
    }
    for (const s of caught) {
      s.tiedAgo = 0;
      s.to = centre;
    }
    state.bundles += 1;
    events.push({ type: 'action', ...centre, note: 64 + state.bundles * 2, voice: 'bell' });
    const left = loose();
    if (left.length < 10) {
      state.doneAgo = 0;
      state.score += 1;
      events.push({ type: 'score', x: tray.x + tray.w / 2, y: tray.y + 30 });
      return;
    }
    // Piles left that cannot make ten any more (a loop took sticks from several piles): lay them out afresh.
    const sizes = new Map<number, number>();
    for (const s of left) sizes.set(s.pile, (sizes.get(s.pile) ?? 0) + 1);
    if (!canMakeTen([...sizes.values()])) {
      const tens = Math.floor(left.length / 10);
      const groups: number[][] = Array.from({ length: tens }, () => [10]);
      if (left.length % 10 > 0) groups.push([left.length % 10]);
      layOut(groups);
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
      for (const s of state.sticks) if (s.tiedAgo >= 0) s.tiedAgo += dt;
      if (state.slipped) {
        state.slipped.ago += dt;
        if (state.slipped.ago > 1) state.slipped = null;
      }
      if (state.doneAgo >= 0) {
        state.doneAgo += dt;
        if (state.doneAgo >= DONE_SECONDS) next();
        return;
      }
      state.sticks = state.sticks.filter((s) => s.tiedAgo < 0 || s.tiedAgo < TIE_SECONDS);
      if (input.pressed && input.pointer) state.loop = [{ ...input.pointer }];
      if (input.pointer && state.loop.length > 0) {
        const last = state.loop[state.loop.length - 1];
        if (!last || Math.hypot(input.pointer.x - last.x, input.pointer.y - last.y) >= 8) state.loop.push({ ...input.pointer });
        state.lastMoveAt = state.time;
      }
      if (input.released && state.loop.length > 0) {
        const loop = state.loop;
        state.loop = [];
        close(loop);
      }
    },
  };
}

/** Loose sticks inside the loop being drawn (the count bubble). */
export function countInLoop(state: TensState): number {
  return state.loop.length < 3 ? 0 : state.sticks.filter((s) => s.tiedAgo < 0 && inside(state.loop, s)).length;
}

/** A loop round these sticks: their bounding circle, a little wider, as eight points. */
function loopRound(sticks: Stick[], extra: number): Point[] {
  const cx = sticks.reduce((a, s) => a + s.x, 0) / sticks.length;
  const cy = sticks.reduce((a, s) => a + s.y, 0) / sticks.length;
  const rx = Math.max(...sticks.map((s) => Math.abs(s.x - cx))) + extra;
  const ry = Math.max(...sticks.map((s) => Math.abs(s.y - cy))) + extra;
  return Array.from({ length: 9 }, (_, i) => ({ x: cx + Math.cos((i / 8) * Math.PI * 2) * rx, y: cy + Math.sin((i / 8) * Math.PI * 2) * ry }));
}

/**
 * Good play: finds piles making ten whose loop holds nothing else and draws it, a corner per decision (each
 * corner adds one point to the loop, so the loop's length says how far it got), then lets go.
 */
export function tensBundlesBot(state: TensState, _context: BotContext): BotMove {
  if (state.doneAgo >= 0 || state.slipped) return {};
  if (state.loop.length === 0 && state.time - state.lastMoveAt < 0.6) return {};
  const plan = botPlan(state.sticks.filter((s) => s.tiedAgo < 0));
  const corner = plan[state.loop.length];
  return corner ? { touch: corner } : {};
}

function botPlan(loose: Stick[]): Point[] {
  const piles = new Map<number, Stick[]>();
  for (const s of loose) piles.set(s.pile, [...(piles.get(s.pile) ?? []), s]);
  const list = [...piles.values()];
  const tries: Stick[][] = [];
  for (let i = 0; i < list.length; i += 1) {
    const a = list[i] ?? [];
    if (a.length === 10) tries.push(a);
    for (let j = i + 1; j < list.length; j += 1) {
      const b = list[j] ?? [];
      if (a.length + b.length === 10) tries.push([...a, ...b]);
    }
  }
  for (const group of tries) {
    const loop = loopRound(group, 34);
    if (loose.filter((s) => inside(loop, s)).length === 10) return loop;
  }
  return [];
}
