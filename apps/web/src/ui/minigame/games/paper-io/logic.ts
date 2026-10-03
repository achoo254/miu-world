// Paper-io (cày ruộng khoanh vùng): the child's tractor drives toward her finger over a big field. On her own
// ploughed land it leaves no mark; outside, it leaves a furrow behind it. Driving back onto her land closes the
// loop: the furrow and everything inside it become hers. A buffalo wanders the field; if it walks across an
// open furrow, the furrow is trampled and the tractor goes back to the farmhouse (her land stays hers). Points
// are the share of the field she owns, in percent. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const CELL = 24;
const SPEED = 230;
const BUFFALO_SPEED = 55;

export interface Buffalo extends Point {
  vx: number;
  vy: number;
  turnIn: number;
}

export interface PaperState {
  left: number;
  top: number;
  cols: number;
  rows: number;
  /** 1 where the field is hers. */
  owned: Uint8Array;
  /** Cells of the open furrow, in the order ploughed. */
  trail: number[];
  tractor: Point;
  heading: number;
  home: Point;
  buffaloes: Buffalo[];
  /** Seconds since the last loop closed (a shine) and since a furrow was trampled. */
  claimedAgo: number;
  cutAgo: number;
  score: number;
  time: number;
}

export const cellIndex = (s: Pick<PaperState, 'left' | 'top' | 'cols' | 'rows'>, p: Point): number => {
  const c = Math.floor((p.x - s.left) / CELL);
  const r = Math.floor((p.y - s.top) / CELL);
  return c < 0 || r < 0 || c >= s.cols || r >= s.rows ? -1 : r * s.cols + c;
};
export const cellCentre = (s: Pick<PaperState, 'left' | 'top' | 'cols'>, i: number): Point => ({ x: s.left + ((i % s.cols) + 0.5) * CELL, y: s.top + (Math.floor(i / s.cols) + 0.5) * CELL });

/** Marks the furrow hers and fills in everything it closed off from the field's edge. */
export function claim(s: Pick<PaperState, 'cols' | 'rows' | 'owned' | 'trail'>): void {
  for (const i of s.trail) s.owned[i] = 1;
  const outside = new Uint8Array(s.cols * s.rows);
  const stack: number[] = [];
  for (let c = 0; c < s.cols; c += 1) stack.push(c, (s.rows - 1) * s.cols + c);
  for (let r = 0; r < s.rows; r += 1) stack.push(r * s.cols, r * s.cols + s.cols - 1);
  while (stack.length > 0) {
    const i = stack.pop() ?? 0;
    if (outside[i] || s.owned[i]) continue;
    outside[i] = 1;
    const c = i % s.cols;
    if (c > 0) stack.push(i - 1);
    if (c < s.cols - 1) stack.push(i + 1);
    if (i >= s.cols) stack.push(i - s.cols);
    if (i < s.cols * (s.rows - 1)) stack.push(i + s.cols);
  }
  for (let i = 0; i < s.owned.length; i += 1) if (!outside[i]) s.owned[i] = 1;
  s.trail.length = 0;
}

export const percentOwned = (owned: Uint8Array): number => Math.floor((owned.reduce((a, b) => a + b, 0) / owned.length) * 100);

export function createPaperIo({ arena, rng }: GameSetup): MinigameLogic<PaperState> {
  const events = eventQueue();
  const cols = Math.floor((arena.width - 30) / CELL);
  const rows = Math.floor((arena.height - HUD_SAFE_TOP - 30) / CELL);
  const left = (arena.width - cols * CELL) / 2;
  const top = HUD_SAFE_TOP + 10;
  const owned = new Uint8Array(cols * rows);
  // The farm: a small patch at the bottom middle.
  const hc = Math.floor(cols / 2) - 2;
  const hr = rows - 5;
  for (let r = hr; r < hr + 4; r += 1) for (let c = hc; c < hc + 5; c += 1) owned[r * cols + c] = 1;
  const home = { x: left + (hc + 2.5) * CELL, y: top + (hr + 2) * CELL };
  const buffaloCount = cols * rows > 900 ? 2 : 1;
  const state: PaperState = {
    left,
    top,
    cols,
    rows,
    owned,
    trail: [],
    tractor: { ...home },
    heading: -Math.PI / 2,
    home,
    buffaloes: Array.from({ length: buffaloCount }, (_, i) => {
      const a = rng.range(0, Math.PI * 2);
      return { x: left + cols * CELL * (0.25 + 0.5 * i), y: top + rows * CELL * 0.3, vx: Math.cos(a) * BUFFALO_SPEED, vy: Math.sin(a) * BUFFALO_SPEED, turnIn: rng.range(2, 4) };
    }),
    claimedAgo: 9,
    cutAgo: 9,
    score: percentOwned(owned),
    time: 0,
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
      state.claimedAgo += dt;
      state.cutAgo += dt;
      // The tractor heads for the finger.
      const p = input.pointer;
      if (p) {
        const dx = p.x - state.tractor.x;
        const dy = p.y - state.tractor.y;
        const d = Math.hypot(dx, dy);
        if (d > 4) {
          const step = Math.min(d, SPEED * dt);
          state.heading = Math.atan2(dy, dx);
          state.tractor.x = Math.max(left + 2, Math.min(left + cols * CELL - 2, state.tractor.x + (dx / d) * step));
          state.tractor.y = Math.max(top + 2, Math.min(top + rows * CELL - 2, state.tractor.y + (dy / d) * step));
        }
      }
      const here = cellIndex(state, state.tractor);
      if (here >= 0) {
        if (!state.owned[here]) {
          if (!state.trail.includes(here)) state.trail.push(here);
        } else if (state.trail.length > 0) {
          const before = state.score;
          claim(state);
          state.score = percentOwned(state.owned);
          state.claimedAgo = 0;
          events.push({ type: 'score', ...state.tractor, points: Math.max(1, state.score - before) });
        }
      }
      // Buffaloes wander and bounce off the field's edges.
      for (const b of state.buffaloes) {
        b.turnIn -= dt;
        if (b.turnIn <= 0) {
          const a = rng.range(0, Math.PI * 2);
          b.vx = Math.cos(a) * BUFFALO_SPEED;
          b.vy = Math.sin(a) * BUFFALO_SPEED;
          b.turnIn = rng.range(2, 4);
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.x < left + 20 || b.x > left + cols * CELL - 20) b.vx = -b.vx;
        if (b.y < top + 20 || b.y > top + rows * CELL - 20) b.vy = -b.vy;
        b.x = Math.max(left + 20, Math.min(left + cols * CELL - 20, b.x));
        b.y = Math.max(top + 20, Math.min(top + rows * CELL - 20, b.y));
        const at = cellIndex(state, b);
        if (at >= 0 && state.trail.includes(at)) {
          state.trail.length = 0;
          state.tractor = { ...state.home };
          state.cutAgo = 0;
          events.push({ type: 'hit', x: b.x, y: b.y });
        }
      }
    },
  };
}

type SideName = 'top' | 'bottom' | 'left' | 'right';
interface Box {
  c0: number;
  c1: number;
  r0: number;
  r1: number;
}

/** Bounding box of her land, in cells. */
function landBox(s: PaperState): Box {
  const box = { c0: s.cols, c1: -1, r0: s.rows, r1: -1 };
  s.owned.forEach((v, i) => {
    if (!v) return;
    const c = i % s.cols;
    const r = Math.floor(i / s.cols);
    box.c0 = Math.min(box.c0, c);
    box.c1 = Math.max(box.c1, c);
    box.r0 = Math.min(box.r0, r);
    box.r1 = Math.max(box.r1, r);
  });
  return box;
}

/** A loop along one whole side of the land: out `depth` cells, across, and back in. Corners as cell [c, r]. */
function loopFor(box: Box, side: SideName, depth: number): Array<[number, number]> {
  switch (side) {
    case 'top':
      return [[box.c0, box.r0], [box.c0, box.r0 - depth], [box.c1, box.r0 - depth], [box.c1, box.r0]];
    case 'bottom':
      return [[box.c0, box.r1], [box.c0, box.r1 + depth], [box.c1, box.r1 + depth], [box.c1, box.r1]];
    case 'left':
      return [[box.c0, box.r0], [box.c0 - depth, box.r0], [box.c0 - depth, box.r1], [box.c0, box.r1]];
    default:
      return [[box.c1, box.r0], [box.c1 + depth, box.r0], [box.c1 + depth, box.r1], [box.c1, box.r1]];
  }
}

const roomOn = (s: PaperState, box: Box, side: SideName): number =>
  side === 'top' ? box.r0 : side === 'bottom' ? s.rows - 1 - box.r1 : side === 'left' ? box.c0 : s.cols - 1 - box.c1;

/** Which side the open furrow left from (its first cell is just outside the land). */
function sideOfTrail(s: PaperState, box: Box): SideName | null {
  const first = s.trail[0];
  if (first === undefined) return null;
  const c = first % s.cols;
  const r = Math.floor(first / s.cols);
  if (r < box.r0) return 'top';
  if (r > box.r1) return 'bottom';
  if (c < box.c0) return 'left';
  if (c > box.c1) return 'right';
  return null;
}

/**
 * Good play: grows the land in strips. It loops out along a whole side and back in (a strip at most four rows
 * deep), choosing the side with room that is farthest from the buffaloes.
 */
export function paperIoBot(state: PaperState, _context: BotContext): BotMove {
  const box = landBox(state);
  const sides: SideName[] = ['top', 'left', 'right', 'bottom'];
  const at = (cell: [number, number]): Point => ({ x: state.left + (cell[0] + 0.5) * CELL, y: state.top + (cell[1] + 0.5) * CELL });
  let side = sideOfTrail(state, box);
  if (!side) {
    let best = -Infinity;
    for (const s of sides) {
      const room = roomOn(state, box, s);
      if (room <= 0) continue;
      const loop = loopFor(box, s, Math.min(4, room)).map(at);
      const near = Math.min(...state.buffaloes.map((b) => Math.min(...loop.map((p) => Math.hypot(p.x - b.x, p.y - b.y)))));
      const score = Math.min(4, room) * 10 + Math.min(near, 250) / 10;
      if (score > best) {
        best = score;
        side = s;
      }
    }
  }
  if (!side) return {};
  const depth = Math.min(4, roomOn(state, box, side));
  const loop = loopFor(box, side, depth).map(at);
  const [start, out, across, back] = loop;
  if (!start || !out || !across || !back) return {};
  if (state.trail.length === 0) {
    // On her own land: go to the corner, then step out.
    const atStart = Math.hypot(state.tractor.x - start.x, state.tractor.y - start.y) < 6;
    return { touch: atStart ? out : start };
  }
  // Which leg of the loop: checked from the last leg back, since each leg ends where the next begins.
  const acrossAxis = side === 'top' || side === 'bottom';
  const alongDone = acrossAxis ? state.tractor.x >= across.x - 6 : state.tractor.y >= across.y - 6;
  if (alongDone) return { touch: back };
  const outDone = side === 'top' ? state.tractor.y <= out.y + 6 : side === 'bottom' ? state.tractor.y >= out.y - 6 : side === 'left' ? state.tractor.x <= out.x + 6 : state.tractor.x >= out.x - 6;
  return { touch: outDone ? across : out };
}
