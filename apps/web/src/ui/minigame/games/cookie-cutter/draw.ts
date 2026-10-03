// Cookie cutter's picture: a floury table, the dough sheet (rounded, with a few rolling-pin marks), cut cookies
// (golden; a squashed one is a grey lump), the cutter waiting at the side with its next shape, the sheet count,
// and the tray sliding off to the oven when the dough is used up.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { SHEETS, type CookieState } from './logic';

function shapePath(ctx: CanvasRenderingContext2D, shape: number, x: number, y: number, r: number): void {
  ctx.beginPath();
  if (shape === 0) {
    ctx.arc(x, y, r, 0, Math.PI * 2);
    return;
  }
  if (shape === 1) {
    for (let i = 0; i < 10; i += 1) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? r : r * 0.5;
      if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    return;
  }
  // Heart.
  ctx.moveTo(x, y + r * 0.85);
  ctx.bezierCurveTo(x - r * 1.3, y - r * 0.1, x - r * 0.6, y - r * 1.1, x, y - r * 0.4);
  ctx.bezierCurveTo(x + r * 0.6, y - r * 1.1, x + r * 1.3, y - r * 0.1, x, y + r * 0.85);
  ctx.closePath();
}

export function drawCookieCutter(ctx: CanvasRenderingContext2D, state: CookieState, view: DrawView): void {
  const { arena, theme } = view;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.fillStyle = theme.woodEdge;
  for (let y = 0; y < arena.height; y += 60) ctx.fillRect(0, y, arena.width, 3);
  const slide = state.full >= 0 && !view.reducedMotion ? Math.max(0, state.full - 0.5) * 1600 : 0;
  ctx.save();
  ctx.translate(slide, 0);
  const { x, y, w, h } = state.dough;
  ctx.fillStyle = theme.light;
  roundRect(ctx, x - 14, y - 14, w + 28, h + 28, 40);
  ctx.fill();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = theme.groundDeep;
  for (let i = 1; i < 4; i += 1) ctx.fillRect(x, y + (h * i) / 4, w, 6);
  ctx.globalAlpha = 1;
  for (const c of state.cookies) {
    const pop = view.reducedMotion ? 1 : Math.min(1, 0.7 + c.age * 1.5);
    if (c.good) {
      shapePath(ctx, c.shape, c.x, c.y, state.r * 0.92 * pop);
      ctx.fillStyle = theme.star;
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = theme.woodEdge;
      ctx.stroke();
      ctx.fillStyle = theme.woodEdge;
      for (let k = 0; k < 3; k += 1) {
        ctx.beginPath();
        ctx.arc(c.x + Math.cos(k * 2.1) * state.r * 0.35, c.y + Math.sin(k * 2.1) * state.r * 0.35, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = theme.stone;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, state.r * 1.05, state.r * 0.75, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  // The cutter with its next shape, and the sheets.
  const cx = arena.width / 2;
  const cy = arena.height - 55;
  shapePath(ctx, state.shape, cx, cy, 34);
  ctx.lineWidth = 8;
  ctx.strokeStyle = theme.stoneEdge;
  ctx.stroke();
  paintLabel(ctx, view, `Tấm ${Math.min(SHEETS, state.sheet + 1)}/${SHEETS}`, 90, cy, 30);
  if (state.full >= 0) paintLabel(ctx, view, 'Vào lò!', arena.width / 2, arena.height / 2, 56, theme.star);
}
