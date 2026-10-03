// Lawn mower's picture: a garden fence round a lawn of tall grass squares (tufts), flowerbeds and rocks on
// the squares that are not grass, cut squares in light mown stripes, the mower (the child on a little
// mower body) on its square, the redo button below (pulsing when stuck), and "Xong!" for a finished lawn.
import { bob, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { cellCentre, stuck, type MowerState } from './logic';

export function drawLawnMower(ctx: CanvasRenderingContext2D, state: MowerState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, state.top, 4);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, state.top - 20, arena.width, arena.height);
  const { cellPx, cols, rows, left, top } = state;
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, left - 14, top - 14, cols * cellPx + 28, rows * cellPx + 28, 14);
  ctx.fill();
  const cut = new Set(state.cut);
  for (let cell = 0; cell < cols * rows; cell += 1) {
    const p = cellCentre(state, cell);
    const x = p.x - cellPx / 2;
    const y = p.y - cellPx / 2;
    if (state.blocked.has(cell)) {
      ctx.fillStyle = theme.groundDeep;
      ctx.fillRect(x, y, cellPx, cellPx);
      sprites.draw(ctx, cell % 2 === 0 ? 'tulip' : 'rock', p.x, p.y, cellPx * 0.75);
      continue;
    }
    ctx.fillStyle = cut.has(cell) ? theme.ground : theme.leaf;
    ctx.fillRect(x + 1, y + 1, cellPx - 2, cellPx - 2);
    if (cut.has(cell)) {
      // Mown stripes.
      ctx.fillStyle = theme.light;
      ctx.globalAlpha = 0.3;
      for (let s = 0; s < 3; s += 1) ctx.fillRect(x + 6, y + 8 + s * (cellPx / 3), cellPx - 12, cellPx / 7);
      ctx.globalAlpha = 1;
    } else sprites.draw(ctx, 'herb', p.x, p.y + bob(view, 2, 2, cell), cellPx * 0.6);
  }
  // The mower's trail.
  ctx.strokeStyle = theme.star;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = cellPx * 0.12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  state.cut.forEach((cell, i) => {
    const p = cellCentre(state, cell);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.globalAlpha = 1;

  const at = cellCentre(state, state.cut[state.cut.length - 1] ?? state.start);
  const hop = !view.reducedMotion && state.movedAgo < 0.12 ? 6 : 0;
  ctx.fillStyle = theme.danger;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  roundRect(ctx, at.x - cellPx * 0.36, at.y - cellPx * 0.05 - hop, cellPx * 0.72, cellPx * 0.36, 10);
  ctx.fill();
  ctx.stroke();
  sprites.draw(ctx, view.player, at.x, at.y - cellPx * 0.2 - hop, cellPx * 0.62);

  const isStuck = stuck(state);
  const pulse = isStuck && !view.reducedMotion ? 1 + 0.12 * Math.sin(view.time * 8) : 1;
  ctx.fillStyle = isStuck ? theme.star : theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, state.redo.x - 80 * pulse, state.redo.y - 30 * pulse, 160 * pulse, 60 * pulse, 30);
  ctx.fill();
  ctx.stroke();
  ctx.font = `800 28px ${theme.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = theme.ink;
  ctx.fillText('↺ Làm lại', state.redo.x, state.redo.y);
  if (isStuck) paintLabel(ctx, view, 'Kẹt rồi! Chạm Làm lại', arena.width / 2, top - 40, 32, theme.light);
  if (state.doneAgo >= 0) paintLabel(ctx, view, 'Xong!', arena.width / 2, top + (rows * cellPx) / 2, 70, theme.star);
}
