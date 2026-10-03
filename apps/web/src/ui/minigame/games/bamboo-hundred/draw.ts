// The hundred-knot bamboo's picture: a field at the edge of the forest, the bamboo growing up the left side knot
// by knot (each with its number, the step on a badge at the top), the loose knots lying around with their
// numbers, a joined knot flying up to its place, a wrong one wobbling, and "Khắc nhập!" with sparkles when the
// bamboo is whole.
import { bob, paintGround, paintHills, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { KNOTS, type BambooState } from './logic';

function paintKnot(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, w: number, h: number, value: number, vertical: boolean): void {
  const { theme } = view;
  ctx.save();
  ctx.translate(x, y);
  if (vertical) ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = theme.leaf;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, -w / 2, -h / 2, w, h, h * 0.35);
  ctx.fill();
  ctx.stroke();
  // Node bands at both ends and a shine.
  ctx.fillStyle = theme.woodEdge;
  ctx.globalAlpha = 0.55;
  ctx.fillRect(-w / 2 + 6, -h / 2 + 4, 8, h - 8);
  ctx.fillRect(w / 2 - 14, -h / 2 + 4, 8, h - 8);
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.3;
  ctx.fillRect(-w / 2 + 18, -h / 2 + 8, w - 36, 7);
  ctx.globalAlpha = 1;
  ctx.restore();
  paintLabel(ctx, view, String(value), x, y + 2, Math.min(h * 0.62, 44));
}

export function drawBambooHundred(ctx: CanvasRenderingContext2D, state: BambooState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const horizon = Math.min(arena.height * 0.35, 260);
  paintSky(ctx, view, horizon, 8);
  paintHills(ctx, view, horizon, 40, 70, theme.leaf);
  paintGround(ctx, view, horizon);

  // The stalk.
  const { x: sx, bottom, segment } = state.stalk;
  const stalkW = 58;
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = theme.ink;
  ctx.setLineDash([10, 10]);
  ctx.lineWidth = 3;
  roundRect(ctx, sx - stalkW / 2, bottom - segment * KNOTS, stalkW, segment * KNOTS, 20);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  for (let i = 0; i < state.height; i += 1) {
    const value = state.sequence[i] ?? 0;
    const y = bottom - (i + 0.5) * segment;
    const knot = state.knots.find((k) => k.value === value && k.joined);
    const flying = knot ? Math.min(1, (state.time - knot.joinedAt) / 0.3) : 1;
    if (knot && flying < 1) {
      const x = knot.x + (sx - knot.x) * flying;
      const fy = knot.y + (y - knot.y) * flying;
      paintKnot(ctx, view, x, fy, state.knotW * (1 - flying) + (segment - 4) * flying, state.knotH * (1 - flying) + stalkW * flying, value, flying > 0.5);
    } else paintKnot(ctx, view, sx, y, segment - 4, stalkW, value, true);
  }
  // Leaves on top and the step badge.
  const topY = bottom - state.height * segment;
  sprites.draw(ctx, 'herb', sx + 10, topY - 26 + bob(view, 3, 3), 64);
  ctx.fillStyle = theme.star;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(sx + 44, topY - 4, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  paintLabel(ctx, view, `+${state.step}`, sx + 44, topY - 2, 28, theme.light);

  // Loose knots.
  for (const knot of state.knots) {
    if (knot.joined) continue;
    const since = state.time - knot.wobbleAt;
    const wobble = since < 0.4 && !view.reducedMotion ? Math.sin(since * 40) * 9 * (1 - since / 0.4) : 0;
    paintKnot(ctx, view, knot.x + wobble, knot.y, state.knotW, state.knotH, knot.value, false);
  }

  if (state.phase === 'magic') {
    const t = state.phaseAgo;
    paintLabel(ctx, view, 'Khắc nhập!', arena.width / 2 + 30, arena.height / 2, Math.min(80, arena.width / 9), theme.star);
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + t * 2;
      sprites.draw(ctx, 'sparkles', sx + Math.cos(a) * 60, topY + 80 + Math.sin(a) * 60 + i * segment * 0.8, 44, { alpha: Math.max(0, 1 - t / 1.3) });
    }
  }
}
