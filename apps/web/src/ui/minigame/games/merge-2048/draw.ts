// Merge 2048's picture: a wooden board with a sunken cell for every place; number tiles in the theme's
// colours, a new colour for every doubling (a light tile for 2, gold for 8, pink for 16…), sliding to their new
// cells after a swipe and popping when they are made or merged. The biggest number so far shines in a badge
// above the board, next to the target, 64.
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { SLIDE_SECONDS, type MergeState } from './logic';

function tileColours(view: DrawView, value: number): { fill: string; text: string } {
  const { theme } = view;
  const steps = [theme.light, theme.waterLight, theme.star, theme.primary, theme.secondary, theme.leaf, theme.danger, theme.water, theme.wood, theme.ink];
  const i = Math.max(0, Math.round(Math.log2(value)) - 1);
  const fill = steps[i % steps.length] ?? theme.light;
  return { fill, text: i < 2 ? theme.ink : theme.light };
}

export function drawMerge2048(ctx: CanvasRenderingContext2D, state: MergeState, view: DrawView): void {
  const { arena, theme } = view;
  paintSky(ctx, view, arena.height, 5);
  const { left, top, cell, n } = state;
  const side = cell * n;
  const pad = 8;
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, left - pad, top - pad, side + pad * 2, side + pad * 2, 22);
  ctx.fill();
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      ctx.fillStyle = theme.wood;
      roundRect(ctx, left + c * cell + 6, top + r * cell + 6, cell - 12, cell - 12, 14);
      ctx.fill();
    }
  }
  const t = Math.min(1, (state.time - state.movedAt) / SLIDE_SECONDS);
  for (const tile of state.tiles) {
    const row = tile.fromRow + (tile.row - tile.fromRow) * t;
    const col = tile.fromCol + (tile.col - tile.fromCol) * t;
    const age = state.time - tile.bornAt;
    const pop = view.reducedMotion || age > 0.25 ? 1 : age < SLIDE_SECONDS && !tile.merged ? age / SLIDE_SECONDS : 1 + 0.15 * Math.sin((age / 0.25) * Math.PI);
    const size = (cell - 12) * pop;
    const cx = left + (col + 0.5) * cell;
    const cy = top + (row + 0.5) * cell;
    const { fill, text } = tileColours(view, tile.value);
    ctx.fillStyle = fill;
    roundRect(ctx, cx - size / 2, cy - size / 2, size, size, 14);
    ctx.fill();
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    ctx.stroke();
    const digits = String(tile.value).length;
    paintLabel(ctx, view, `${tile.value}`, cx, cy + 3, (cell * (digits > 2 ? 0.34 : 0.46)) * pop, text);
  }
  if (state.clearedAgo < 0.6) {
    ctx.globalAlpha = 1 - state.clearedAgo / 0.6;
    ctx.fillStyle = theme.light;
    roundRect(ctx, left - pad, top - pad, side + pad * 2, side + pad * 2, 22);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // The best so far, above the board when there is room.
  if (top - HUD_SAFE_TOP > 70) paintLabel(ctx, view, `Lớn nhất: ${state.best}  /  64`, arena.width / 2, top - 44, 34, state.best >= 64 ? theme.star : theme.light);
}
