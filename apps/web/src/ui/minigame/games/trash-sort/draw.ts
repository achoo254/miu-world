// Trash sort's picture: a park under the sky, rubbish drifting down (a ring under the piece in her hand),
// pieces lying on the grass strip, and three big bins (green, blue, grey) each marked with its picture, the
// lid wobbling when something goes in and a tick or a cross over it for a right or wrong bin.
import { paintHills, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { BIN_MOUTH, type BinKind, type TrashState } from './logic';

const BIN_ICON = { organic: 'leaf', recycle: 'recycling-symbol', other: 'wastebasket' } as const;

export function drawTrashSort(ctx: CanvasRenderingContext2D, state: TrashState, view: DrawView): void {
  const { arena, sprites, theme } = view;
  const binColour = (kind: BinKind): string => (kind === 'organic' ? theme.leaf : kind === 'recycle' ? theme.secondary : theme.stoneEdge);
  paintSky(ctx, view, state.groundY, 6);
  paintHills(ctx, view, state.groundY - 10, 60, 90, theme.leaf);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, state.groundY + 20, arena.width, arena.height - state.groundY - 20);
  ctx.fillStyle = theme.groundDeep;
  ctx.fillRect(0, state.groundY + 50, arena.width, arena.height - state.groundY - 50);

  for (const bin of state.bins) {
    const wobble = view.reducedMotion ? 0 : Math.max(0, 1 - bin.fed / 0.4) * Math.sin(bin.fed * 40) * 0.12;
    const top = bin.y - BIN_MOUTH + 30;
    ctx.fillStyle = binColour(bin.kind);
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 6;
    roundRect(ctx, bin.x - bin.half * 0.8, top, bin.half * 1.6, arena.height - top + 20, 18);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.translate(bin.x, top);
    ctx.rotate(wobble);
    roundRect(ctx, -bin.half * 0.95, -22, bin.half * 1.9, 26, 12);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = theme.light;
    ctx.beginPath();
    ctx.arc(bin.x, top + 70, 44, 0, Math.PI * 2);
    ctx.fill();
    sprites.draw(ctx, BIN_ICON[bin.kind], bin.x, top + 70, 66);
  }

  for (const p of state.pieces) {
    if (p.binned >= 0) {
      const bin = state.bins[p.bin];
      if (!bin) continue;
      const u = Math.min(1, p.binned / 0.25);
      const y = bin.y - BIN_MOUTH + 40 * u;
      sprites.draw(ctx, p.sprite, bin.x, y, 70 * (1 - 0.5 * u), { alpha: 1 - u });
      paintLabel(ctx, view, p.right ? '✓' : '✗', bin.x, bin.y - BIN_MOUTH - 50 - p.binned * 40, 56, p.right ? theme.star : theme.danger);
      continue;
    }
    const held = p.id === state.held;
    if (held) {
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = theme.star;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 52 + (view.reducedMotion ? 0 : Math.sin(view.time * 10) * 4), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const fade = p.grounded > 1 ? Math.max(0.2, 1 - (p.grounded - 1) / 0.6) : 1;
    const sway = view.reducedMotion || held || p.grounded >= 0 ? 0 : Math.sin(view.time * 2 + p.id) * 0.25;
    sprites.draw(ctx, p.sprite, p.x, p.y, held ? 92 : 80, { rotate: sway, alpha: fade });
  }
}
