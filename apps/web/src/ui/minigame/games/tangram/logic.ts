// Tangram: the seven pieces of a square (two large triangles, a middle one, two small ones, a square and a
// parallelogram) lie in a tray; the shadow of a picture (a house, a sailboat, a fish, a gift box) waits beside
// them, with faint lines showing where each piece goes. The child drags a piece onto its place and taps a
// piece to turn it 45°. A piece dropped near a place of its shape snaps in when it is turned right or one
// turn off (it straightens itself). Seven pieces in: a point and the next picture. After a long wait one
// place and its piece glow as a hint. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';
import type { SpriteRef } from '../../sprites';

export type PieceKind = 'L' | 'M' | 'S' | 'Q' | 'P';
type Vec = readonly [number, number];

/**
 * Each shape around its centroid, in units of the tangram square (side 4), cut from the square
 * (0,0)-(4,4): L (0,0),(4,0),(2,2); M (4,4),(2,4),(4,2); S (4,0),(4,2),(3,1); Q (2,2),(3,1),(4,2),(3,3);
 * P (0,4),(1,3),(3,3),(2,4).
 */
const SHAPES: Readonly<Record<PieceKind, readonly Vec[]>> = {
  L: [
    [-2, -2 / 3],
    [2, -2 / 3],
    [0, 4 / 3],
  ],
  M: [
    [2 / 3, 2 / 3],
    [-4 / 3, 2 / 3],
    [2 / 3, -4 / 3],
  ],
  S: [
    [1 / 3, -1],
    [1 / 3, 1],
    [-2 / 3, 0],
  ],
  Q: [
    [-1, 0],
    [0, -1],
    [1, 0],
    [0, 1],
  ],
  P: [
    [-1.5, 0.5],
    [-0.5, -0.5],
    [1.5, -0.5],
    [0.5, 0.5],
  ],
};

/** Turns (of 45°) after which a shape looks the same: the square every 2, the parallelogram every 4. */
const SYMMETRY: Readonly<Record<PieceKind, number>> = { L: 8, M: 8, S: 8, Q: 2, P: 4 };
export const KINDS: readonly PieceKind[] = ['L', 'L', 'M', 'S', 'S', 'Q', 'P'];

/** The shape turned k × 45° clockwise (screen y down), around its centroid. */
export function turned(kind: PieceKind, k: number): Vec[] {
  const a = (((k % 8) + 8) % 8) * (Math.PI / 4);
  const c = Math.cos(a);
  const s = Math.sin(a);
  return SHAPES[kind].map(([x, y]): Vec => [x * c - y * s, x * s + y * c]);
}

/** Smallest number of 45° turns between two angles of a shape, counting its symmetry. */
export function turnsApart(kind: PieceKind, a: number, b: number): number {
  const sym = SYMMETRY[kind];
  const d = (((a - b) % sym) + sym) % sym;
  return Math.min(d, sym - d);
}

/**
 * A picture: each place is a piece kind, its turn, and the top-left corner of its bounding box on a grid
 * whose step is the small triangle's leg (√2 square units), which keeps the turned pieces on whole steps.
 */
export interface Figure {
  name: string;
  picture: SpriteRef;
  places: readonly { kind: PieceKind; k: number; at: Vec }[];
}

const R = Math.SQRT1_2;

export const FIGURES: readonly Figure[] = [
  {
    name: 'Ngôi nhà',
    picture: 'house',
    places: [
      { kind: 'M', k: 5, at: [0, 0] },
      { kind: 'L', k: 1, at: [0, 1] },
      { kind: 'L', k: 5, at: [0, 1] },
      { kind: 'S', k: 5, at: [2, 1] },
      { kind: 'S', k: 7, at: [3, 1] },
      { kind: 'Q', k: 1, at: [2.5, 2] },
      { kind: 'P', k: 1, at: [0, 3] },
    ],
  },
  {
    name: 'Thuyền buồm',
    picture: 'sailboat',
    places: [
      { kind: 'L', k: 7, at: [0, 0] },
      { kind: 'L', k: 1, at: [2, 0] },
      { kind: 'P', k: 1, at: [0, 2] },
      { kind: 'M', k: 1, at: [1, 2] },
      { kind: 'S', k: 5, at: [2, 2] },
      { kind: 'Q', k: 1, at: [3, 2] },
      { kind: 'S', k: 7, at: [2, -1] },
    ],
  },
  {
    name: 'Con cá',
    picture: 'tropical-fish',
    places: [
      { kind: 'L', k: 3, at: [0, 0] },
      { kind: 'L', k: 7, at: [0, 0] },
      { kind: 'M', k: 7, at: [-1, 0] },
      { kind: 'S', k: 7, at: [2, 0] },
      { kind: 'S', k: 1, at: [2, 1] },
      { kind: 'P', k: 1, at: [0, -1] },
      { kind: 'Q', k: 0, at: [1 - R, 2] },
    ],
  },
  {
    name: 'Hộp quà',
    picture: 'gift',
    places: [
      { kind: 'L', k: 0, at: [0, 0] },
      { kind: 'L', k: 6, at: [0, 0] },
      { kind: 'M', k: 0, at: [2 * R, 2 * R] },
      { kind: 'S', k: 0, at: [3 * R, 0] },
      { kind: 'Q', k: 0, at: [2 * R, R] },
      { kind: 'S', k: 2, at: [R, 2 * R] },
      { kind: 'P', k: 0, at: [0, 3 * R] },
    ],
  },
];

/** A place of the current picture in arena units: its kind, turn, centroid and corners. */
export interface Slot {
  kind: PieceKind;
  k: number;
  x: number;
  y: number;
  points: Vec[];
  filled: boolean;
}

export interface Piece {
  kind: PieceKind;
  k: number;
  /** Centroid, arena units. */
  x: number;
  y: number;
  /** The slot it snapped into, or -1 while loose. */
  slot: number;
  /** Resting in the tray: drawn and touched at TRAY_SCALE so the seven fit side by side. */
  small: boolean;
  /** Seconds since it snapped (a pop), or since a refused drop (a wobble); large = long ago. */
  snapped: number;
  refused: number;
  /** Colour index for draw.ts. */
  colour: number;
}

export interface TangramState {
  figure: Figure;
  slots: Slot[];
  /** Pieces in drawing order (the last is on top). */
  pieces: Piece[];
  /** Arena units per square unit. */
  unit: number;
  /** The dragged piece (index), the finger's offset from its centroid and where the drag began. */
  drag: { piece: number; dx: number; dy: number; fromX: number; fromY: number } | null;
  /** Bounding box of the picture, and the tray. */
  board: { x: number; y: number; w: number; h: number };
  tray: { x: number; y: number; w: number; h: number };
  /** Seconds since the picture was finished, -1 while building. */
  done: number;
  /** Seconds since a piece last snapped in (hint after HINT_SECONDS). */
  sinceProgress: number;
  pictures: number;
  lastActAt: number;
  score: number;
  time: number;
}

const DONE_SECONDS = 1.8;
/** Size of a piece resting in the tray, against its size in the picture. */
export const TRAY_SCALE = 0.8;
export const HINT_SECONDS = 20;
/** How far (in square units) a dropped piece's centroid may be from its place and still snap. */
const SNAP_UNITS = 0.75;
/** A drag shorter than this (arena units) is a tap. */
const DRAG_MIN = 12;

/** Corners of a piece at its place, square units, and the centroid, from a place's grid corner. */
function placeOf(kind: PieceKind, k: number, at: Vec): { cx: number; cy: number; points: Vec[] } {
  const pts = turned(kind, k);
  const minX = Math.min(...pts.map((p) => p[0]));
  const minY = Math.min(...pts.map((p) => p[1]));
  const step = Math.SQRT2;
  const cx = at[0] * step - minX;
  const cy = at[1] * step - minY;
  return { cx, cy, points: pts.map(([x, y]): Vec => [x + cx, y + cy]) };
}

/** A picture's places in square units (for tests and layout): centroid and corners. */
export function figurePlaces(figure: Figure): { kind: PieceKind; k: number; cx: number; cy: number; points: Vec[] }[] {
  return figure.places.map((p) => ({ kind: p.kind, k: p.k, ...placeOf(p.kind, p.k, p.at) }));
}

export function pointInPolygon(x: number, y: number, pts: readonly Vec[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
    const a = pts[i];
    const b = pts[j];
    if (!a || !b) continue;
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

/** The piece's corners in arena units. */
export function pieceCorners(piece: Piece, unit: number): Vec[] {
  const size = piece.small ? unit * TRAY_SCALE : unit;
  return turned(piece.kind, piece.k).map(([x, y]): Vec => [piece.x + x * size, piece.y + y * size]);
}

function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    const a = list[i];
    const b = list[j];
    if (a !== undefined && b !== undefined) {
      list[i] = b;
      list[j] = a;
    }
  }
  return list;
}

export function createTangram({ arena, rng }: GameSetup): MinigameLogic<TangramState> {
  const events = eventQueue();
  const landscape = arena.width > arena.height;
  // The picture's area and the tray's: side by side on a wide screen, one over the other on a tall one.
  const areaTop = HUD_SAFE_TOP + 50;
  const pictureArea = landscape
    ? { x: 20, y: areaTop, w: arena.width * 0.5 - 30, h: arena.height - areaTop - 20 }
    : { x: 20, y: areaTop, w: arena.width - 40, h: (arena.height - areaTop) * 0.5 };
  const tray = landscape
    ? { x: arena.width * 0.5 + 10, y: HUD_SAFE_TOP + 10, w: arena.width * 0.5 - 30, h: arena.height - HUD_SAFE_TOP - 20 }
    : { x: 20, y: pictureArea.y + pictureArea.h + 20, w: arena.width - 40, h: arena.height - (pictureArea.y + pictureArea.h + 20) - 16 };
  // One size for every picture: the largest picture (about 4 × 4 grid steps) fits the area.
  const unit = Math.min(pictureArea.w, pictureArea.h, 470) / (4.4 * Math.SQRT2);
  let deck: Figure[] = [];

  const first = FIGURES[0];
  if (!first) throw new Error('tangram has no figures');
  const state: TangramState = {
    figure: first,
    slots: [],
    pieces: [],
    unit,
    drag: null,
    board: { x: 0, y: 0, w: 0, h: 0 },
    tray,
    done: -1,
    sinceProgress: 0,
    pictures: 0,
    lastActAt: -1,
    score: 0,
    time: 0,
  };

  function layOut(figure: Figure): void {
    const places = figurePlaces(figure);
    const xs = places.flatMap((p) => p.points.map((q) => q[0]));
    const ys = places.flatMap((p) => p.points.map((q) => q[1]));
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const w = (Math.max(...xs) - minX) * unit;
    const h = (Math.max(...ys) - minY) * unit;
    const ox = pictureArea.x + (pictureArea.w - w) / 2 - minX * unit;
    const oy = pictureArea.y + (pictureArea.h - h) / 2 - minY * unit;
    state.figure = figure;
    state.board = { x: ox + minX * unit, y: oy + minY * unit, w, h };
    state.slots = places.map((p) => ({ kind: p.kind, k: p.k, x: ox + p.cx * unit, y: oy + p.cy * unit, points: p.points.map(([x, y]): Vec => [ox + x * unit, oy + y * unit]), filled: false }));
    // Pieces rest in the tray in rows (big ones first), each turned away from its place.
    const rows: number[][] = landscape ? [[0, 1], [2, 6], [3, 5, 4]] : [[0, 1, 2], [6, 3, 5, 4]];
    const order = shuffled(rows, rng);
    state.pieces = [];
    order.forEach((row, r) => {
      shuffled(row, rng).forEach((kindIndex, c) => {
        const kind = KINDS[kindIndex] ?? 'S';
        const target = places.find((p) => p.kind === kind)?.k ?? 0;
        let k = rng.int(0, 7);
        if (turnsApart(kind, k, target) === 0) k = (k + (kind === 'Q' ? 1 : 2)) % 8;
        const x = tray.x + ((c + 0.5) / row.length) * tray.w;
        const y = tray.y + ((r + 0.5) / order.length) * tray.h;
        state.pieces.push({ kind, k, x, y, slot: -1, small: true, snapped: 99, refused: 99, colour: kindIndex });
      });
    });
    state.drag = null;
    state.done = -1;
    state.sinceProgress = 0;
  }

  function nextFigure(): void {
    if (deck.length === 0) deck = shuffled(FIGURES, rng);
    const figure = deck.shift();
    if (figure) layOut(figure);
  }

  /** The loose piece under a point (the top one), or -1; a little margin makes thin corners easy to grab. */
  function pieceAt(p: Point): number {
    for (let i = state.pieces.length - 1; i >= 0; i -= 1) {
      const piece = state.pieces[i];
      if (!piece || piece.slot >= 0) continue;
      const corners = pieceCorners(piece, unit);
      if (pointInPolygon(p.x, p.y, corners) || Math.hypot(p.x - piece.x, p.y - piece.y) < Math.max(42, unit * 0.45)) return i;
    }
    return -1;
  }

  const inTray = (p: Point): boolean => p.x >= tray.x && p.x <= tray.x + tray.w && p.y >= tray.y && p.y <= tray.y + tray.h;

  function raise(index: number): number {
    const [piece] = state.pieces.splice(index, 1);
    if (!piece) return index;
    state.pieces.push(piece);
    return state.pieces.length - 1;
  }

  function drop(index: number): void {
    const piece = state.pieces[index];
    if (!piece) return;
    const reach = SNAP_UNITS * unit;
    const slots = state.slots
      .map((s, i) => ({ s, i, d: Math.hypot(s.x - piece.x, s.y - piece.y) }))
      .filter(({ s, d }) => !s.filled && s.kind === piece.kind && d <= reach)
      .sort((a, b) => a.d - b.d);
    const fit = slots.find(({ s }) => turnsApart(piece.kind, piece.k, s.k) <= 1);
    if (!fit) {
      if (slots.length > 0) {
        piece.refused = 0;
        events.push({ type: 'miss', x: piece.x, y: piece.y });
      }
      return;
    }
    piece.x = fit.s.x;
    piece.y = fit.s.y;
    piece.k = fit.s.k;
    piece.slot = fit.i;
    piece.snapped = 0;
    piece.small = false;
    fit.s.filled = true;
    state.sinceProgress = 0;
    // Locked pieces go under the loose ones.
    state.pieces.splice(index, 1);
    state.pieces.unshift(piece);
    const placed = state.pieces.filter((p) => p.slot >= 0).length;
    events.push({ type: 'action', x: piece.x, y: piece.y, note: [60, 62, 64, 65, 67, 69, 71][placed - 1] ?? 72, voice: 'bell' });
    if (placed === state.slots.length) {
      state.done = 0;
      state.score += 1;
      state.pictures += 1;
      events.push({ type: 'score', x: state.board.x + state.board.w / 2, y: state.board.y + state.board.h / 2 });
    }
  }

  function turn(p: Point): void {
    const index = pieceAt(p);
    const piece = state.pieces[index];
    if (!piece) return;
    piece.k = (piece.k + 1) % 8;
    state.lastActAt = state.time;
    events.push({ type: 'action', x: piece.x, y: piece.y });
  }

  nextFigure();

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
      state.sinceProgress += dt;
      for (const piece of state.pieces) {
        piece.snapped += dt;
        piece.refused += dt;
      }
      if (state.done >= 0) {
        state.done += dt;
        if (state.done >= DONE_SECONDS) nextFigure();
        return;
      }
      const finger = input.pointer;
      if (input.pressed && finger && !state.drag) {
        const index = pieceAt(finger);
        const piece = state.pieces[index];
        if (piece) {
          piece.small = false;
          const top = raise(index);
          state.drag = { piece: top, dx: piece.x - finger.x, dy: piece.y - finger.y, fromX: piece.x, fromY: piece.y };
          state.lastActAt = state.time;
        }
      }
      const drag = state.drag;
      if (drag && finger) {
        const piece = state.pieces[drag.piece];
        if (piece) {
          piece.x = Math.min(arena.width - 20, Math.max(20, finger.x + drag.dx));
          piece.y = Math.min(arena.height - 20, Math.max(HUD_SAFE_TOP, finger.y + drag.dy));
        }
      }
      if (drag && !finger) {
        state.drag = null;
        state.lastActAt = state.time;
        const piece = state.pieces[drag.piece];
        if (piece && Math.hypot(piece.x - drag.fromX, piece.y - drag.fromY) >= DRAG_MIN) drop(drag.piece);
        else if (piece) {
          // A touch that hardly moved is a tap: the piece stays where it was (the tap below turns it).
          piece.x = drag.fromX;
          piece.y = drag.fromY;
        }
        if (piece && piece.slot < 0) piece.small = inTray(piece);
      }
      for (const tap of input.taps) turn(tap);
    },
  };
}

/** Seconds the bot looks between two moves. */
const BOT_PAUSE = 0.3;

/** Good play: picks a loose piece and its place, turns it until it is right, then drags it there. */
export function tangramBot(state: TangramState, _context: BotContext): BotMove {
  if (state.done >= 0) return {};
  const drag = state.drag;
  if (drag) {
    const piece = state.pieces[drag.piece];
    const slot = piece ? nearestFreeSlot(state, piece) : undefined;
    if (!piece || !slot) return {};
    // Still on its way: keep the finger down at the place; there: lift it.
    if (Math.hypot(piece.x - slot.x, piece.y - slot.y) > 2) return { touch: { x: slot.x - drag.dx, y: slot.y - drag.dy } };
    return {};
  }
  if (state.time - state.lastActAt < BOT_PAUSE) return {};
  // The top loose piece: a tap on its centre always reaches it.
  const loose = [...state.pieces].reverse().find((p) => p.slot < 0);
  if (!loose) return {};
  const slot = nearestFreeSlot(state, loose);
  if (!slot) return {};
  if (turnsApart(loose.kind, loose.k, slot.k) > 0) return { tap: { x: loose.x, y: loose.y } };
  return { touch: { x: loose.x, y: loose.y } };
}

function nearestFreeSlot(state: TangramState, piece: Piece): Slot | undefined {
  return state.slots.filter((s) => !s.filled && s.kind === piece.kind).sort((a, b) => Math.hypot(a.x - piece.x, a.y - piece.y) - Math.hypot(b.x - piece.x, b.y - piece.y))[0];
}
