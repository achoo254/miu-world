// Hundred chart's picture: a paper board of 100 cells, every other row lightly tinted so the tens are easy to
// follow, the numbers in the display font; the gaps are dashed and glow softly. The pieces wait in the tray
// as round wooden tokens with their number; a chosen one is ringed in gold, a dragged one follows the finger,
// one that hit the wrong gap shakes. Placed pieces sit in their cells in the theme's colour; a full board shines.
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { cellCentre, type ChartState, type Piece } from './logic';

function paintToken(ctx: CanvasRenderingContext2D, view: DrawView, piece: Piece, x: number, y: number, r: number, chosen: boolean): void {
  const { theme } = view;
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.arc(x + 3, y + 6, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.wood;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = chosen ? 8 : 5;
  ctx.strokeStyle = chosen ? theme.star : theme.woodEdge;
  ctx.stroke();
  paintLabel(ctx, view, `${piece.value}`, x, y + 2, r * 0.8);
}

export function drawHundredChart(ctx: CanvasRenderingContext2D, state: ChartState, view: DrawView): void {
  const { arena, theme } = view;
  const { left, top, cell } = state;
  paintSky(ctx, view, arena.height, 5);
  const side = cell * 10;
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.2;
  roundRect(ctx, left - 6, top - 2, side + 12, side + 14, 14);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.light;
  roundRect(ctx, left - 8, top - 8, side + 16, side + 16, 14);
  ctx.fill();

  const placed = new Map(state.pieces.filter((p) => p.placed).map((p) => [p.value, p]));
  const shine = state.cleared >= 0 && !view.reducedMotion ? 0.5 + 0.5 * Math.sin(state.cleared * 14) : 0;
  ctx.font = `800 ${Math.round(cell * 0.42)}px ${theme.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let n = 1; n <= 100; n += 1) {
    const c = cellCentre(state, n);
    const row = Math.floor((n - 1) / 10);
    const x = c.x - cell / 2;
    const y = c.y - cell / 2;
    if (row % 2 === 1) {
      ctx.fillStyle = theme.sky[1];
      ctx.fillRect(x, y, cell, cell);
    }
    const hole = state.holes.includes(n);
    if (hole && !placed.has(n)) {
      ctx.globalAlpha = 0.35 + (view.reducedMotion ? 0 : 0.15 * Math.sin(view.time * 4));
      ctx.fillStyle = theme.star;
      ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
      ctx.globalAlpha = 1;
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = theme.ink;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 4, y + 4, cell - 8, cell - 8);
      ctx.setLineDash([]);
      continue;
    }
    if (hole) {
      ctx.fillStyle = theme.primary;
      ctx.globalAlpha = 0.85 + shine * 0.15;
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
      ctx.globalAlpha = 1;
      ctx.fillStyle = theme.light;
    } else {
      ctx.fillStyle = theme.ink;
    }
    ctx.fillText(`${n}`, c.x, c.y + 1);
  }
  ctx.strokeStyle = theme.stone;
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= 10; i += 1) {
    ctx.beginPath();
    ctx.moveTo(left + i * cell, top);
    ctx.lineTo(left + i * cell, top + side);
    ctx.moveTo(left, top + i * cell);
    ctx.lineTo(left + side, top + i * cell);
    ctx.stroke();
  }

  // The tray pieces; the dragged one last, on top.
  state.pieces.forEach((piece, i) => {
    if (piece.placed || (state.pick.dragging && state.pick.held === i)) return;
    const shake = piece.bounced < 0.45 && !view.reducedMotion ? Math.sin(piece.bounced * 45) * 10 * (1 - piece.bounced / 0.45) : 0;
    paintToken(ctx, view, piece, piece.home.x + shake, piece.home.y, state.pieceRadius, state.pick.selected === i);
  });
  const dragged = state.pick.dragging ? state.pieces[state.pick.held] : undefined;
  if (dragged && state.pick.at) paintToken(ctx, view, dragged, state.pick.at.x, state.pick.at.y - 20, state.pieceRadius * 1.08, true);
}
