// Tangram's picture: a wooden board holding the picture's shadow (with faint lines where each piece goes) and
// its name with a little picture of it, a cloth tray with the loose pieces, and the pieces themselves in seven
// bright colours. A dragged piece is lifted with a shadow; a snapped piece pops; a refused drop wobbles. After
// a long wait one place and a piece that fits it glow. A finished picture shines.
import { bob, paintLabel, paintSky, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { HINT_SECONDS, pieceCorners, turnsApart, type Piece, type TangramState } from './logic';

type Vec = readonly [number, number];

function path(ctx: CanvasRenderingContext2D, pts: readonly Vec[]): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

function pieceColour(view: DrawView, i: number): string {
  const { theme } = view;
  const colours = [theme.danger, theme.primary, theme.star, theme.leaf, theme.secondary, theme.water, theme.wood];
  return colours[i % colours.length] ?? theme.primary;
}

function paintPiece(ctx: CanvasRenderingContext2D, view: DrawView, state: TangramState, piece: Piece, lifted: boolean, glow: boolean): void {
  const { theme } = view;
  let pts = pieceCorners(piece, state.unit);
  const pop = piece.snapped < 0.25 && !view.reducedMotion ? 1 + 0.12 * Math.sin((piece.snapped / 0.25) * Math.PI) : lifted ? 1.05 : 1;
  const wobble = piece.refused < 0.4 && !view.reducedMotion ? Math.sin(piece.refused * 40) * 8 * (1 - piece.refused / 0.4) : 0;
  pts = pts.map(([x, y]): Vec => [piece.x + (x - piece.x) * pop + wobble, piece.y + (y - piece.y) * pop]);
  if (lifted) {
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = theme.ink;
    path(
      ctx,
      pts.map(([x, y]): Vec => [x + 8, y + 12]),
    );
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (glow) {
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(view.time * 6);
    ctx.strokeStyle = theme.star;
    ctx.lineWidth = 16;
    ctx.lineJoin = 'round';
    path(ctx, pts);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = pieceColour(view, piece.colour);
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  path(ctx, pts);
  ctx.fill();
  ctx.stroke();
  // A highlight along the first edge, for a little depth.
  const [a, b] = pts;
  if (a && b) {
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(a[0] + (piece.x - a[0]) * 0.15, a[1] + (piece.y - a[1]) * 0.15);
    ctx.lineTo(b[0] + (piece.x - b[0]) * 0.15, b[1] + (piece.y - b[1]) * 0.15);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

export function drawTangram(ctx: CanvasRenderingContext2D, state: TangramState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, arena.height, 5);
  const { board, tray } = state;
  const pad = 26;
  // The wooden board under the picture.
  ctx.fillStyle = theme.wood;
  roundRect(ctx, board.x - pad, board.y - pad, board.w + pad * 2, board.h + pad * 2, 24);
  ctx.fill();
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 6;
  ctx.stroke();
  // The tray's cloth.
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = theme.light;
  roundRect(ctx, tray.x, tray.y, tray.w, tray.h, 26);
  ctx.fill();
  ctx.globalAlpha = 1;

  // The shadow and its faint guide lines.
  const finished = state.done >= 0;
  ctx.fillStyle = finished ? theme.star : theme.ink;
  ctx.globalAlpha = finished ? 0.6 : 0.55;
  for (const slot of state.slots) {
    path(ctx, slot.points);
    ctx.fill();
  }
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 7]);
  for (const slot of state.slots) {
    path(ctx, slot.points);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // The picture's name with a small picture of it, above the board.
  const nameY = Math.max(HUD_SAFE_TOP + 18, board.y - pad - 26);
  paintLabel(ctx, view, state.figure.name, board.x + board.w / 2 + 24, nameY, 32);
  sprites.draw(ctx, state.figure.picture, board.x + board.w / 2 + 24 - ctx.measureText(state.figure.name).width / 2 - 30, nameY, 44);

  // A hint after a long wait: a free place and a loose piece of its shape glow.
  const hinting = !finished && state.sinceProgress > HINT_SECONDS;
  const hintSlot = hinting ? state.slots.find((s) => !s.filled) : undefined;
  const hintPiece = hintSlot ? state.pieces.find((p) => p.slot < 0 && p.kind === hintSlot.kind) : undefined;
  if (hintSlot) {
    ctx.globalAlpha = 0.45 + 0.35 * Math.sin(view.time * 6);
    ctx.fillStyle = theme.star;
    path(ctx, hintSlot.points);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  const dragged = state.drag ? state.pieces[state.drag.piece] : undefined;
  for (const piece of state.pieces) {
    const right = hintSlot && piece === hintPiece && turnsApart(piece.kind, piece.k, hintSlot.k) <= 1;
    paintPiece(ctx, view, state, piece, piece === dragged, piece === hintPiece && (right === true || hinting));
  }

  if (finished) {
    const t = state.done;
    const grow = view.reducedMotion ? 1 : Math.min(1, t / 0.25);
    sprites.draw(ctx, state.figure.picture, board.x + board.w / 2, board.y + board.h / 2 + bob(view, 4, 6), Math.min(board.w, board.h) * 0.5 * grow, { alpha: Math.min(1, t * 2) });
    sprites.draw(ctx, 'sparkles', board.x + board.w * 0.85, board.y + board.h * 0.15 - t * 20, 70, { alpha: Math.max(0, 1 - t / 1.6) });
    paintLabel(ctx, view, 'Đẹp quá!', board.x + board.w / 2, board.y + board.h + pad + 6, 40 * grow, theme.star);
  }
}
