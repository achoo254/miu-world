// Paint splat's picture: an easel holding the picture, its parts white with a dot of the colour each wants,
// painted parts in full colour, smudged parts streaked with the wrong one, and the paint ball on a palette at
// the bottom, its colour changing with a little ring that runs down until the next colour.
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { PartShape, PaintSplatState } from './logic';

export const paintColour = (view: DrawView, paint: number): string => [view.theme.danger, view.theme.star, view.theme.secondary, view.theme.leaf][paint] ?? view.theme.danger;

function traceShape(ctx: CanvasRenderingContext2D, s: PartShape, box: { x: number; y: number; size: number }): void {
  const X = (v: number): number => box.x + v * box.size;
  const Y = (v: number): number => box.y + v * box.size;
  if (s.kind === 'rect') ctx.rect(X(s.x), Y(s.y), s.w * box.size, s.h * box.size);
  else if (s.kind === 'circle') {
    ctx.moveTo(X(s.x + s.r), Y(s.y));
    ctx.arc(X(s.x), Y(s.y), s.r * box.size, 0, Math.PI * 2);
  } else {
    s.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(X(x), Y(y)) : ctx.lineTo(X(x), Y(y))));
    ctx.closePath();
  }
}

export function drawPaintSplat(ctx: CanvasRenderingContext2D, state: PaintSplatState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { box } = state;
  paintSky(ctx, view, arena.height, 4);
  ctx.fillStyle = theme.wood;
  roundRect(ctx, box.x - 16, box.y - 16, box.size + 32, box.size + 32, 16);
  ctx.fill();
  ctx.fillStyle = theme.light;
  ctx.fillRect(box.x, box.y, box.size, box.size);
  for (const part of state.parts) {
    ctx.beginPath();
    for (const s of part.def.shapes) traceShape(ctx, s, box);
    const pop = view.reducedMotion ? 0 : Math.max(0, 1 - (state.time - part.changedAt) / 0.3);
    ctx.fillStyle = part.state === 'painted' ? paintColour(view, part.def.paint) : theme.light;
    ctx.fill();
    if (part.state === 'smudged') {
      ctx.save();
      ctx.clip();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = paintColour(view, part.smudge);
      ctx.lineWidth = 10;
      for (let k = -box.size; k < box.size * 2; k += 34) {
        ctx.beginPath();
        ctx.moveTo(box.x + k, box.y);
        ctx.lineTo(box.x + k - box.size, box.y + box.size);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4 + pop * 4;
    ctx.stroke();
    if (part.state !== 'painted') {
      const [ax, ay] = part.def.anchor;
      ctx.fillStyle = paintColour(view, part.def.paint);
      ctx.strokeStyle = theme.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(box.x + ax * box.size, box.y + ay * box.size, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  for (const t of state.throws) {
    const k = Math.min(1, (state.time - t.at) / 0.25);
    ctx.fillStyle = paintColour(view, t.paint);
    ctx.beginPath();
    ctx.arc(state.ball.x + (t.to.x - state.ball.x) * k, state.ball.y + (t.to.y - state.ball.y) * k - Math.sin(k * Math.PI) * 80, 22, 0, Math.PI * 2);
    ctx.fill();
  }
  // The palette and the ball.
  sprites.draw(ctx, 'artist-palette', state.ball.x - 110, state.ball.y + 10, 90);
  ctx.fillStyle = paintColour(view, state.paint);
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, 56, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - state.paintSince / state.paintFor));
  ctx.stroke();
  if (state.nextIn > 0) {
    sprites.draw(ctx, 'sparkles', box.x + box.size, box.y, 70);
    paintLabel(ctx, view, 'Đẹp quá!', arena.width / 2, box.y + box.size / 2, 52, theme.star);
  }
}
