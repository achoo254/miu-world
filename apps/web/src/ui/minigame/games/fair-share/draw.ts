// Fair share's picture: a picnic table, friends with empty plates in a row above, the long cake (sponge, cream
// and strawberries) or watermelon slab, white knife flashes along each cut, pieces that slide apart and onto
// the plates when the share is fair, and a glowing too-big piece with the fair cut lines dashed when it is not.
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { ShareState } from './logic';

function paintSlab(ctx: CanvasRenderingContext2D, view: DrawView, state: ShareState, x: number, w: number, y: number, h: number): void {
  const { theme, sprites } = view;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  if (state.cake.kind === 'cake') {
    ctx.fillStyle = theme.star;
    roundRect(ctx, x, y - h / 2, w, h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = theme.light;
    ctx.fillRect(x + 2, y - h / 2 + 4, w - 4, 22);
    ctx.fillRect(x + 2, y + 2, w - 4, 14);
    for (let sx = x + 26; sx < x + w - 10; sx += 56) sprites.draw(ctx, 'strawberry', sx, y - h / 2 - 6, 40);
  } else {
    ctx.fillStyle = theme.leaf;
    roundRect(ctx, x, y - h / 2, w, h, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = theme.light;
    roundRect(ctx, x + 4, y - h / 2 + 4, w - 8, h - 22, 12);
    ctx.fill();
    ctx.fillStyle = theme.danger;
    roundRect(ctx, x + 8, y - h / 2 + 8, w - 16, h - 34, 10);
    ctx.fill();
    ctx.fillStyle = theme.ink;
    for (let sx = x + 22; sx < x + w - 12; sx += 34) {
      ctx.beginPath();
      ctx.ellipse(sx, y - 14 + ((sx / 34) % 2) * 22, 4, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawFairShare(ctx: CanvasRenderingContext2D, state: ShareState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { cake } = state;
  const tableY = cake.y - cake.h / 2 - 40;
  paintSky(ctx, view, tableY, 8);
  // The table cloth.
  ctx.fillStyle = theme.light;
  ctx.fillRect(0, tableY, arena.width, arena.height - tableY);
  ctx.fillStyle = theme.danger;
  ctx.globalAlpha = 0.25;
  for (let x = 0; x < arena.width; x += 60) ctx.fillRect(x, tableY, 30, arena.height - tableY);
  for (let y = tableY; y < arena.height; y += 60) ctx.fillRect(0, y, arena.width, 30);
  ctx.globalAlpha = 1;

  // Friends with plates, evenly over the cake.
  const n = state.friends.length;
  const span = cake.x1 - cake.x0;
  const shared = state.phase === 'shared' ? Math.min(1, state.phaseTime / 0.7) : 0;
  state.friends.forEach((who, i) => {
    const fx = cake.x0 + (span * (i + 0.5)) / n;
    const fy = tableY - 90;
    sprites.draw(ctx, who, fx, fy, Math.min(120, cake.h * 0.8));
    ctx.fillStyle = theme.light;
    ctx.strokeStyle = theme.stoneEdge;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(fx, tableY + 10, 56, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  // The cake, in pieces once cut.
  const edges = [cake.x0, ...[...state.cuts].sort((a, b) => a - b), cake.x1];
  const spread = state.phase === 'shared' ? 1 : state.cuts.length > 0 ? 0.3 : 0;
  const pieceCount = edges.length - 1;
  for (let i = 0; i < pieceCount; i += 1) {
    const a = edges[i] ?? cake.x0;
    const b = edges[i + 1] ?? cake.x1;
    const offset = (i - (pieceCount - 1) / 2) * 10 * spread;
    // On a fair share, each piece rises to its friend's plate.
    const plateX = cake.x0 + (span * (i + 0.5)) / n;
    const scale = 1 - 0.5 * shared;
    const w = (b - a) * scale;
    const cx = (a + b) / 2 + offset + (plateX - (a + b) / 2) * shared;
    const cy = cake.y + (tableY - 10 - cake.y) * shared;
    paintSlab(ctx, view, state, cx - w / 2, w, cy, cake.h * scale);
    if (state.tooBig.includes(i)) {
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(view.time * 10);
      ctx.fillStyle = theme.danger;
      roundRect(ctx, cx - w / 2, cy - cake.h / 2, w, cake.h, 10);
      ctx.fill();
      ctx.globalAlpha = 1;
      paintLabel(ctx, view, 'To quá', cx, cy + cake.h / 2 + 30, 26, theme.danger);
    }
  }

  // Knife flashes.
  state.cuts.forEach((x, i) => {
    const ago = state.cutAgo[i] ?? 9;
    if (ago > 0.35) return;
    ctx.globalAlpha = 1 - ago / 0.35;
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x, cake.y - cake.h / 2 - 60);
    ctx.lineTo(x, cake.y + cake.h / 2 + 60);
    ctx.stroke();
    ctx.globalAlpha = 1;
  });
  if (state.phase === 'uneven') {
    ctx.setLineDash([12, 10]);
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 5;
    for (let k = 1; k < n; k += 1) {
      const x = cake.x0 + (span * k) / n;
      ctx.beginPath();
      ctx.moveTo(x, cake.y - cake.h / 2 - 30);
      ctx.lineTo(x, cake.y + cake.h / 2 + 30);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  const label =
    state.phase === 'shared' ? 'Chia đều rồi!' : state.phase === 'uneven' ? 'Chưa đều, cắt lại nhé' : `Chia đều cho ${n} bạn: còn ${n - 1 - state.cuts.length} nhát`;
  paintLabel(ctx, view, label, arena.width / 2, Math.min(arena.height - 50, cake.y + cake.h / 2 + 90), 32, state.phase === 'shared' ? theme.star : theme.primary);
}
