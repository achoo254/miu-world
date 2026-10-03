// Sheepdog herd's picture: a meadow with a few flowers, the pen (wooden fence with a gap, an arrow showing
// the way in, its floor of straw), ducks waddling (leaning the way they go), ducks in the pen, the dog the
// child drags, and a faint circle round the dog where ducks get scared.
import { bob, paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { HerdState } from './logic';

export function drawSheepdogHerd(ctx: CanvasRenderingContext2D, state: HerdState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, arena.width, arena.height);
  for (let i = 0; i < 9; i += 1) sprites.draw(ctx, i % 2 === 0 ? 'tulip' : 'sunflower', ((i * 211) % (arena.width - 60)) + 30, 140 + ((i * 337) % (arena.height - 180)), 34, { alpha: 0.7 });
  const { pen } = state;
  ctx.fillStyle = theme.star;
  ctx.globalAlpha = 0.35;
  roundRect(ctx, pen.left, pen.top, pen.right - pen.left, pen.bottom - pen.top, 12);
  ctx.fill();
  ctx.globalAlpha = 1;
  // Fence: every side but the gap.
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (pen.side === 'left') {
    ctx.moveTo(pen.left, pen.gap.y - pen.gapHalf);
    ctx.lineTo(pen.left, pen.top);
    ctx.lineTo(pen.right, pen.top);
    ctx.lineTo(pen.right, pen.bottom);
    ctx.lineTo(pen.left, pen.bottom);
    ctx.lineTo(pen.left, pen.gap.y + pen.gapHalf);
  } else {
    ctx.moveTo(pen.gap.x - pen.gapHalf, pen.bottom);
    ctx.lineTo(pen.left, pen.bottom);
    ctx.lineTo(pen.left, pen.top);
    ctx.lineTo(pen.right, pen.top);
    ctx.lineTo(pen.right, pen.bottom);
    ctx.lineTo(pen.gap.x + pen.gapHalf, pen.bottom);
  }
  ctx.stroke();
  ctx.lineCap = 'butt';
  const arrowAt = pen.side === 'left' ? { x: pen.left - 50, y: pen.gap.y } : { x: pen.gap.x, y: pen.bottom + 50 };
  paintLabel(ctx, view, pen.side === 'left' ? '▶' : '▲', arrowAt.x + (view.reducedMotion ? 0 : bob(view, 4, 6)), arrowAt.y, 44, theme.star);

  // The dog's scare circle.
  ctx.strokeStyle = theme.light;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(state.dogX, state.dogY, 170, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  for (const d of state.ducks) {
    const lean = view.reducedMotion ? 0 : Math.max(-0.3, Math.min(0.3, d.vx / 400)) + Math.sin(view.time * 12 + d.id) * (Math.hypot(d.vx, d.vy) > 40 ? 0.1 : 0.03);
    sprites.draw(ctx, 'duck', d.x, d.y, 64, { rotate: lean, flipX: d.vx > 0 });
    if (d.penned >= 0 && d.penned < 0.6) sprites.draw(ctx, 'sparkles', d.x, d.y - 40, 40, { alpha: 1 - d.penned / 0.6 });
  }
  sprites.draw(ctx, 'dog-face', state.dogX, state.dogY + bob(view, 8, 3), 92, { flipX: !state.dogLeft });
}
