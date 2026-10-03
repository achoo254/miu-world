// Jigsaw's picture: a wooden frame with a faint copy of the picture to match, the tray of loose pieces, and
// each piece drawn as its own window onto the picture (a sky, hills or sea and a few Fluent pictures: a farm,
// the sea, a forest, a garden). The piece in the finger is lifted with a shadow; a picked piece glows.
import { paintLabel, roundRect } from '../../draw-kit';
import type { SpriteName } from '../../sprites';
import type { DrawView } from '../../types';
import type { JigsawState, Piece, PictureKind, Rect } from './logic';

type Prop = readonly [SpriteName, number, number, number];

/** Pictures on each scene: name, x and y (0–1 across the picture) and size (share of its height). */
const PROPS: Record<PictureKind, readonly Prop[]> = {
  farm: [
    ['sun', 0.85, 0.16, 0.24],
    ['house', 0.3, 0.52, 0.42],
    ['deciduous-tree', 0.72, 0.48, 0.44],
    ['chicken', 0.55, 0.78, 0.24],
    ['tulip', 0.12, 0.84, 0.18],
    ['sunflower', 0.9, 0.8, 0.22],
  ],
  sea: [
    ['sun', 0.15, 0.16, 0.24],
    ['cloud', 0.62, 0.15, 0.22],
    ['sailboat', 0.42, 0.42, 0.38],
    ['dolphin', 0.78, 0.66, 0.28],
    ['tropical-fish', 0.22, 0.8, 0.22],
    ['crab', 0.6, 0.88, 0.18],
  ],
  forest: [
    ['evergreen-tree', 0.14, 0.45, 0.5],
    ['deciduous-tree', 0.84, 0.45, 0.5],
    ['fox', 0.5, 0.7, 0.32],
    ['mushroom', 0.26, 0.84, 0.2],
    ['butterfly', 0.6, 0.24, 0.18],
    ['owl', 0.5, 0.32, 0.2],
  ],
  garden: [
    ['rainbow', 0.5, 0.25, 0.4],
    ['sunflower', 0.16, 0.66, 0.36],
    ['tulip', 0.36, 0.78, 0.24],
    ['rabbit', 0.64, 0.72, 0.3],
    ['honeybee', 0.84, 0.36, 0.16],
    ['strawberry', 0.86, 0.84, 0.18],
  ],
};

export const JIGSAW_SPRITES: readonly SpriteName[] = [...new Set(Object.values(PROPS).flatMap((props) => props.map(([name]) => name)))];

/** The whole picture painted into `r`. */
function paintPicture(ctx: CanvasRenderingContext2D, view: DrawView, kind: PictureKind, r: Rect): void {
  const { theme, sprites } = view;
  const sky = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  sky.addColorStop(0, theme.sky[0]);
  sky.addColorStop(1, theme.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  // The ground: sea for the sea picture, rolling green for the rest.
  ctx.fillStyle = kind === 'sea' ? theme.water : theme.leaf;
  ctx.beginPath();
  ctx.moveTo(r.x, r.y + r.h);
  for (let i = 0; i <= 20; i += 1) {
    const u = i / 20;
    const wave = kind === 'sea' ? Math.sin(u * Math.PI * 6) * 0.015 : Math.sin(u * Math.PI * 2 + 1) * 0.06;
    ctx.lineTo(r.x + u * r.w, r.y + r.h * (0.58 + wave));
  }
  ctx.lineTo(r.x + r.w, r.y + r.h);
  ctx.closePath();
  ctx.fill();
  if (kind !== 'sea') {
    ctx.fillStyle = theme.ground;
    ctx.fillRect(r.x, r.y + r.h * 0.86, r.w, r.h * 0.14);
  }
  for (const [name, x, y, size] of PROPS[kind]) sprites.draw(ctx, name, r.x + x * r.w, r.y + y * r.h, size * r.h);
}

function paintPiece(ctx: CanvasRenderingContext2D, view: DrawView, state: JigsawState, piece: Piece, lifted: boolean, glow: boolean): void {
  const { theme } = view;
  const w = state.pieceW * piece.scale;
  const h = state.pieceH * piece.scale;
  const left = piece.x - w / 2;
  const top = piece.y - h / 2;
  if (lifted) {
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = theme.ink;
    roundRect(ctx, left + 10, top + 14, w, h, 12);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.save();
  roundRect(ctx, left, top, w, h, piece.placed ? 2 : 12);
  ctx.clip();
  // The piece is a window onto the picture: the picture is laid so this piece's part shows through.
  const b = state.board;
  ctx.translate(piece.x, piece.y);
  ctx.scale(piece.scale, piece.scale);
  ctx.translate(-piece.homeX, -piece.homeY);
  paintPicture(ctx, view, state.picture, b);
  ctx.restore();
  roundRect(ctx, left, top, w, h, piece.placed ? 2 : 12);
  ctx.lineWidth = piece.placed ? 1.5 : glow ? 7 : 4;
  ctx.strokeStyle = glow ? theme.star : piece.placed ? theme.light : theme.ink;
  ctx.stroke();
}

export function drawJigsaw(ctx: CanvasRenderingContext2D, state: JigsawState, view: DrawView): void {
  const { arena, theme } = view;
  const { board, tray } = state;
  ctx.fillStyle = theme.groundDeep;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = theme.ink;
  for (let x = 0; x < arena.width; x += 60) ctx.fillRect(x, 0, 3, arena.height);
  ctx.globalAlpha = 1;

  // The tray: a soft mat.
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.25;
  roundRect(ctx, tray.x - 10, tray.y - 10, tray.w + 20, tray.h + 20, 24);
  ctx.fill();
  ctx.globalAlpha = 1;

  // The frame with the faint picture and a grid where the pieces go.
  ctx.fillStyle = theme.wood;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 5;
  roundRect(ctx, board.x - 14, board.y - 14, board.w + 28, board.h + 28, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.light;
  ctx.fillRect(board.x, board.y, board.w, board.h);
  ctx.globalAlpha = 0.28;
  paintPicture(ctx, view, state.picture, board);
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  for (let c = 1; c < state.cols; c += 1) {
    ctx.moveTo(board.x + c * state.pieceW, board.y);
    ctx.lineTo(board.x + c * state.pieceW, board.y + board.h);
  }
  for (let r = 1; r < state.rows; r += 1) {
    ctx.moveTo(board.x, board.y + r * state.pieceH);
    ctx.lineTo(board.x + board.w, board.y + r * state.pieceH);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  const heldIndex = state.held?.index ?? -1;
  const order = state.pieces.map((p, i) => ({ p, i })).sort((a, b) => (a.p.placed === b.p.placed ? a.p.z - b.p.z : a.p.placed ? -1 : 1));
  for (const { p, i } of order) paintPiece(ctx, view, state, p, i === heldIndex, i === state.selected);

  if (state.doneAgo >= 0) {
    const grow = view.reducedMotion ? 1 : Math.min(1, state.doneAgo / 0.2);
    paintLabel(ctx, view, 'Xong một bức tranh!', board.x + board.w / 2, board.y + board.h / 2, 48 * grow, theme.star);
  }
}
