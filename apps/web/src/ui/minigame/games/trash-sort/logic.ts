// Trash sort: rubbish drifts down from the top; three bins wait at the bottom (green for scraps and leaves,
// blue for what can be recycled, grey for the rest). The child drags a piece into a bin (or taps it, then
// taps a bin). Right bin: a point; wrong bin: a point back off (never below zero). Pieces that reach the
// ground lie there a moment and fade, no penalty. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type BinKind = 'organic' | 'recycle' | 'other';
export const BIN_ORDER: readonly BinKind[] = ['organic', 'recycle', 'other'];

export const TRASH: Readonly<Record<BinKind, readonly SpriteName[]>> = {
  organic: ['banana', 'red-apple', 'fallen-leaf', 'carrot', 'watermelon', 'egg'],
  recycle: ['newspaper', 'canned-food', 'beverage-box', 'package', 'envelope'],
  other: ['roll-of-paper', 'toothbrush', 'running-shoe'],
};

export interface Piece {
  id: number;
  kind: BinKind;
  sprite: SpriteName;
  x: number;
  y: number;
  vy: number;
  /** Seconds lying on the ground (-1 while falling or held). */
  grounded: number;
  /** Seconds since it went into a bin (-1 before); `right` tells how. */
  binned: number;
  right: boolean;
  /** The bin it went into (for the drop animation). */
  bin: number;
}

export interface Bin {
  kind: BinKind;
  x: number;
  y: number;
  half: number;
  /** Seconds since something went in (a wobble). */
  fed: number;
}

export interface TrashState {
  groundY: number;
  bins: Bin[];
  pieces: Piece[];
  /** The piece in the child's hand (dragged or picked by a tap), or -1. */
  held: number;
  /** Held by a drag (follows the finger) rather than picked by a tap. */
  dragging: boolean;
  score: number;
  time: number;
}

const PICK_REACH = TOUCH_RADIUS + 35;
/** How far above a bin's centre its mouth catches a dropped piece. */
export const BIN_MOUTH = 110;
const GROUND_WAIT = 1.6;
const FALL_START = 90;
const FALL_END = 150;
const GAP_START = 1.5;
const GAP_END = 0.95;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** The bin under a point, or -1: bins catch generously, the whole column above their mouth. */
export function binAt(state: TrashState, p: Point): number {
  return state.bins.findIndex((b) => Math.abs(p.x - b.x) <= b.half && p.y >= b.y - BIN_MOUTH);
}

export function createTrashSort({ arena, duration, params, rng }: GameSetup): MinigameLogic<TrashState> {
  const factor = typeof params.speed === 'number' ? clamp(params.speed, 0.6, 1.5) : 1;
  const events = eventQueue();
  const binY = arena.height - 110;
  const binHalf = Math.min(120, arena.width / 6.6);
  const state: TrashState = {
    groundY: binY - BIN_MOUTH - 40,
    bins: BIN_ORDER.map((kind, i) => ({ kind, x: (arena.width * (i + 0.5)) / 3, y: binY, half: binHalf, fed: 9 })),
    pieces: [],
    held: -1,
    dragging: false,
    score: 0,
    time: 0,
  };
  let nextId = 0;
  let nextDrop = 0.4;
  const margin = 60;

  const piece = (id: number): Piece | undefined => state.pieces.find((p) => p.id === id);
  const pickAt = (p: Point): Piece | undefined =>
    state.pieces
      .filter((q) => q.binned < 0 && Math.hypot(q.x - p.x, q.y - p.y) < PICK_REACH)
      .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];

  function drop(p: Piece, at: Point): void {
    const index = binAt(state, at);
    const bin = state.bins[index];
    if (!bin) {
      // Let go elsewhere: it falls on from there.
      p.grounded = -1;
      return;
    }
    p.binned = 0;
    p.bin = index;
    p.right = bin.kind === p.kind;
    bin.fed = 0;
    if (p.right) {
      state.score += 1;
      events.push({ type: 'score', x: bin.x, y: bin.y - 60 });
    } else {
      state.score = Math.max(0, state.score - 1);
      events.push({ type: 'hit', x: bin.x, y: bin.y - 60 });
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
      const progress = Math.min(1, state.time / duration);
      for (const b of state.bins) b.fed += dt;

      // Drag: press on a piece picks it up, it follows the finger, release over a bin drops it in.
      if (input.pressed && input.pointer) {
        const p = state.held >= 0 ? null : pickAt(input.pointer);
        if (p) {
          state.held = p.id;
          state.dragging = true;
        }
      }
      const held = piece(state.held);
      if (held && state.dragging && input.pointer) {
        held.x = clamp(input.pointer.x, 30, arena.width - 30);
        held.y = clamp(input.pointer.y, HUD_SAFE_TOP, arena.height - 40);
      }
      if (input.released && held && state.dragging) {
        state.dragging = false;
        // A drop that did not move far is a tap: the piece stays picked for a tap on a bin.
        if (binAt(state, held) >= 0) {
          drop(held, held);
          state.held = -1;
        } else if (!input.taps.length) state.held = -1;
      }
      // Taps: a tap on a bin drops the picked piece there; a tap on a piece picks it.
      for (const tap of input.taps) {
        const picked = piece(state.held);
        if (picked && binAt(state, tap) >= 0) {
          drop(picked, tap);
          state.held = -1;
          continue;
        }
        const p = pickAt(tap);
        if (p) state.held = p.id;
      }

      nextDrop -= dt;
      if (nextDrop <= 0) {
        const kind = BIN_ORDER[rng.int(0, 2)] ?? 'organic';
        const list = TRASH[kind];
        const sprite = list[rng.int(0, list.length - 1)] ?? 'banana';
        state.pieces.push({ id: nextId, kind, sprite, x: rng.range(margin, arena.width - margin), y: HUD_SAFE_TOP - 20, vy: (FALL_START + (FALL_END - FALL_START) * progress) * factor, grounded: -1, binned: -1, right: false, bin: -1 });
        nextId += 1;
        nextDrop += (GAP_START + (GAP_END - GAP_START) * progress) / factor;
      }

      for (const p of state.pieces) {
        if (p.binned >= 0) {
          p.binned += dt;
          continue;
        }
        if (p.id === state.held) continue;
        if (p.grounded >= 0) {
          p.grounded += dt;
          continue;
        }
        p.y += p.vy * dt;
        if (p.y >= state.groundY) {
          p.y = state.groundY;
          p.grounded = 0;
        }
      }
      state.pieces = state.pieces.filter((p) => {
        const keep = p.binned < 0.5 && p.grounded < GROUND_WAIT;
        if (!keep && p.grounded >= GROUND_WAIT) events.push({ type: 'miss', x: p.x, y: p.y });
        if (!keep && p.id === state.held) state.held = -1;
        return keep;
      });
    },
  };
}

/** Good play: pick the piece nearest the ground and drag it into its bin. */
export function trashBot(state: TrashState, _context: BotContext): BotMove {
  const held = state.pieces.find((p) => p.id === state.held);
  if (held && state.dragging) {
    const bin = state.bins.find((b) => b.kind === held.kind);
    if (!bin) return {};
    // Over its bin: let go.
    if (Math.abs(held.x - bin.x) < bin.half * 0.5 && held.y > bin.y - BIN_MOUTH) return {};
    return { touch: { x: bin.x, y: bin.y - 60 } };
  }
  const next = state.pieces.filter((p) => p.binned < 0).sort((a, b) => b.y - a.y)[0];
  return next ? { touch: { x: next.x, y: next.y } } : {};
}
