// Jigsaw: a picture cut into square-ish pieces lies scattered in a tray; the child drags each piece onto the
// frame, where a faint copy of the picture shows where it goes. Dropped close to its place, a piece clicks in:
// a point. A finished picture makes way for a bigger one (6, then 9, then 12 pieces). A quick tap on a piece
// picks it up instead, and a tap on the frame puts it there, for a child who finds dragging hard.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type Arena, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const PICTURES = ['farm', 'sea', 'forest', 'garden'] as const;
export type PictureKind = (typeof PICTURES)[number];

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Piece {
  col: number;
  row: number;
  /** Centre now, and centre in its place on the frame. */
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  /** Drawn at this scale while it waits in the tray (smaller), 1 on the frame or in the hand. */
  scale: number;
  placed: boolean;
  /** Stacking order: higher is on top. */
  z: number;
}

export interface JigsawState {
  picture: PictureKind;
  cols: number;
  rows: number;
  board: Rect;
  tray: Rect;
  pieceW: number;
  pieceH: number;
  pieces: Piece[];
  /** The piece in the finger, with where on it the finger holds it. */
  held: { index: number; dx: number; dy: number; moved: number } | null;
  /** A piece picked by a tap, waiting for a tap on the frame. */
  selected: number;
  /** Seconds since the picture was finished (-1 while it is being made). */
  doneAgo: number;
  puzzles: number;
  score: number;
  time: number;
}

/** Puzzle sizes in order; after the last, the last repeats. */
const SIZES: ReadonlyArray<readonly [number, number]> = [
  [3, 2],
  [3, 3],
  [4, 3],
];
const TRAY_SCALE = 0.8;
const NEXT_SECONDS = 1.4;
/** A tap moves a finger less than this (units) between down and up. */
const TAP_MOVE = 14;

/** The frame and the tray for this screen: side by side when it is wide, stacked when it is tall. */
export function layout(arena: Arena): { board: Rect; tray: Rect } {
  const top = HUD_SAFE_TOP + 10;
  if (arena.width >= arena.height) {
    const w = Math.min(arena.width * 0.56, ((arena.height - top - 30) * 4) / 3);
    const h = (w * 3) / 4;
    const board = { x: 24, y: top + (arena.height - top - h) / 2, w, h };
    return { board, tray: { x: board.x + w + 30, y: top, w: arena.width - board.w - 78, h: arena.height - top - 20 } };
  }
  const w = arena.width - 40;
  const h = (w * 3) / 4;
  const board = { x: 20, y: top, w, h };
  return { board, tray: { x: 20, y: board.y + h + 24, w, h: arena.height - board.y - h - 44 } };
}

function scatter(rng: Rng, state: JigsawState): void {
  const { tray } = state;
  const pw = state.pieceW * TRAY_SCALE;
  const ph = state.pieceH * TRAY_SCALE;
  state.pieces.forEach((p, i) => {
    p.x = tray.x + pw / 2 + rng.range(0, Math.max(1, tray.w - pw));
    p.y = tray.y + ph / 2 + rng.range(0, Math.max(1, tray.h - ph));
    p.z = i;
  });
}

function startPuzzle(rng: Rng, state: JigsawState, arena: Arena): void {
  const [cols, rows] = SIZES[Math.min(state.puzzles, SIZES.length - 1)] ?? [3, 2];
  const { board, tray } = layout(arena);
  const pieceW = board.w / cols;
  const pieceH = board.h / rows;
  const kinds = PICTURES.filter((k) => k !== state.picture);
  state.picture = rng.pick(kinds as [PictureKind, ...PictureKind[]]);
  Object.assign(state, { cols, rows, board, tray, pieceW, pieceH, held: null, selected: -1, doneAgo: -1 });
  state.pieces = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      state.pieces.push({ col, row, x: 0, y: 0, homeX: board.x + (col + 0.5) * pieceW, homeY: board.y + (row + 0.5) * pieceH, scale: TRAY_SCALE, placed: false, z: 0 });
    }
  }
  // Shuffled order in the tray.
  for (let i = state.pieces.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    const a = state.pieces[i];
    const b = state.pieces[j];
    if (a && b) {
      state.pieces[i] = b;
      state.pieces[j] = a;
    }
  }
  scatter(rng, state);
}

/** How close (units) a dropped piece's centre must be to its place to click in. */
export const snapDistance = (state: JigsawState): number => Math.max(42, Math.min(state.pieceW, state.pieceH) * 0.4);

/** The topmost loose piece under a point (its picture is a little bigger to touch), or -1. */
export function pieceAt(state: JigsawState, at: Point): number {
  let best = -1;
  let bestZ = -Infinity;
  state.pieces.forEach((p, i) => {
    if (p.placed) return;
    const hw = (state.pieceW * p.scale) / 2 + 8;
    const hh = (state.pieceH * p.scale) / 2 + 8;
    if (Math.abs(at.x - p.x) <= hw && Math.abs(at.y - p.y) <= hh && p.z > bestZ) {
      best = i;
      bestZ = p.z;
    }
  });
  return best;
}

export function createJigsaw({ arena, rng }: GameSetup): MinigameLogic<JigsawState> {
  const events = eventQueue();
  const state: JigsawState = {
    picture: 'farm',
    cols: 3,
    rows: 2,
    board: { x: 0, y: 0, w: 1, h: 1 },
    tray: { x: 0, y: 0, w: 1, h: 1 },
    pieceW: 1,
    pieceH: 1,
    pieces: [],
    held: null,
    selected: -1,
    doneAgo: -1,
    puzzles: 0,
    score: 0,
    time: 0,
  };
  startPuzzle(rng, state, arena);
  let topZ = state.pieces.length;

  const clampInside = (p: Piece): void => {
    p.x = Math.min(arena.width - 20, Math.max(20, p.x));
    p.y = Math.min(arena.height - 20, Math.max(HUD_SAFE_TOP, p.y));
  };

  /** Drops a piece where it is: in its place it clicks in, elsewhere it stays (back to tray size off the frame). */
  const drop = (index: number): void => {
    const p = state.pieces[index];
    if (!p) return;
    clampInside(p);
    if (Math.hypot(p.x - p.homeX, p.y - p.homeY) <= snapDistance(state)) {
      p.x = p.homeX;
      p.y = p.homeY;
      p.placed = true;
      p.scale = 1;
      state.score += 1;
      events.push({ type: 'score', x: p.x, y: p.y });
      if (state.pieces.every((q) => q.placed)) {
        state.doneAgo = 0;
        state.puzzles += 1;
      }
      return;
    }
    const b = state.board;
    p.scale = p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h ? 1 : TRAY_SCALE;
    events.push({ type: 'miss', x: p.x, y: p.y });
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
      if (state.doneAgo >= 0) {
        state.doneAgo += dt;
        if (state.doneAgo >= NEXT_SECONDS) {
          startPuzzle(rng, state, arena);
          topZ = state.pieces.length;
        }
        return;
      }
      const press = input.pressed ? (input.pointer ?? input.taps[0] ?? null) : null;
      if (press && !state.held) {
        const index = pieceAt(state, press);
        const piece = state.pieces[index];
        if (piece) {
          topZ += 1;
          piece.z = topZ;
          piece.scale = 1;
          state.held = { index, dx: piece.x - press.x, dy: piece.y - press.y, moved: 0 };
          events.push({ type: 'action', x: piece.x, y: piece.y });
        } else if (state.selected >= 0) {
          // A tap on an empty spot puts the picked piece there.
          const picked = state.pieces[state.selected];
          if (picked) {
            picked.x = press.x;
            picked.y = press.y;
            drop(state.selected);
          }
          state.selected = -1;
        }
      }
      const held = state.held;
      if (!held) return;
      const piece = state.pieces[held.index];
      if (!piece) return;
      if (input.pointer) {
        const x = input.pointer.x + held.dx;
        const y = input.pointer.y + held.dy;
        held.moved += Math.hypot(x - piece.x, y - piece.y);
        piece.x = x;
        piece.y = y;
      }
      if (!input.pointer || input.released) {
        state.held = null;
        if (held.moved < TAP_MOVE) {
          // A tap: the piece is picked, waiting for a tap on the frame.
          state.selected = held.index;
          return;
        }
        state.selected = -1;
        drop(held.index);
      }
    },
  };
}

/** Good play: take the topmost loose piece and carry it straight to its place. */
export function jigsawBot(state: JigsawState, _context: BotContext): BotMove {
  if (state.doneAgo >= 0) return {};
  if (state.held) {
    const piece = state.pieces[state.held.index];
    if (!piece) return {};
    const atHome = Math.hypot(piece.x - piece.homeX, piece.y - piece.homeY) < 2;
    return atHome ? {} : { touch: { x: piece.homeX - state.held.dx, y: piece.homeY - state.held.dy } };
  }
  const loose = state.pieces.filter((p) => !p.placed).sort((a, b) => b.z - a.z)[0];
  return loose ? { touch: { x: loose.x, y: loose.y } } : {};
}
