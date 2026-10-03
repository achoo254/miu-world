// Paper-io's picture: a wide green field, her land as brown ploughed soil with furrow lines, the open furrow
// as a dashed dark track, the farmhouse on her first patch, the tractor driving (facing the way it goes),
// buffaloes ambling about, a shine over newly claimed land and hoof prints where a furrow was trampled.
import { paintLabel } from '../../draw-kit';
import type { DrawView } from '../../types';
import { CELL, cellCentre, type PaperState } from './logic';

export function drawPaperIo(ctx: CanvasRenderingContext2D, state: PaperState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.leaf;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(state.left, state.top, state.cols * CELL, state.rows * CELL);
  // Her land.
  const shine = Math.max(0, 1 - state.claimedAgo / 0.6);
  ctx.fillStyle = theme.groundDeep;
  state.owned.forEach((v, i) => {
    if (!v) return;
    const x = state.left + (i % state.cols) * CELL;
    const y = state.top + Math.floor(i / state.cols) * CELL;
    ctx.fillRect(x, y, CELL + 0.5, CELL + 0.5);
  });
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;
  state.owned.forEach((v, i) => {
    if (!v) return;
    const x = state.left + (i % state.cols) * CELL;
    const y = state.top + Math.floor(i / state.cols) * CELL;
    ctx.beginPath();
    ctx.moveTo(x, y + CELL / 2);
    ctx.lineTo(x + CELL, y + CELL / 2);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
  if (shine > 0) {
    ctx.fillStyle = theme.star;
    ctx.globalAlpha = shine * 0.35;
    state.owned.forEach((v, i) => {
      if (v) ctx.fillRect(state.left + (i % state.cols) * CELL, state.top + Math.floor(i / state.cols) * CELL, CELL, CELL);
    });
    ctx.globalAlpha = 1;
  }
  // The open furrow.
  if (state.trail.length > 0) {
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 8;
    ctx.setLineDash([10, 6]);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    state.trail.forEach((i, k) => {
      const p = cellCentre(state, i);
      if (k === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.lineTo(state.tractor.x, state.tractor.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  sprites.draw(ctx, 'house', state.home.x, state.home.y - 30, 70);
  for (const b of state.buffaloes) sprites.draw(ctx, 'water-buffalo', b.x, b.y, 70, { flipX: b.vx > 0 });
  if (state.cutAgo < 1) {
    paintLabel(ctx, view, 'Trâu giẫm đứt luống rồi!', arena.width / 2, state.top + 40, 30, theme.light);
  }
  sprites.draw(ctx, 'tractor', state.tractor.x, state.tractor.y, 62, { flipX: Math.cos(state.heading) > 0 });
  paintLabel(ctx, view, `${state.score}%`, arena.width - 60, state.top + 30, 30, theme.star);
}
