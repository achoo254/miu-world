// Mini golf's picture: a striped putting green with a wooden rim, walls and blocks, the hole with its flag, the
// ball, and while pulling a dotted line showing where it will go (longer for a harder shot). Stroke count in
// the corner; the ball drops into the hole with sparkles.
import { paintLabel, paintShadow, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { BALL_R, HOLE_R, shotVelocity, type GolfState } from './logic';

export function drawMiniGolf(ctx: CanvasRenderingContext2D, state: GolfState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.groundDeep;
  ctx.fillRect(0, 0, arena.width, arena.height);
  const g = state.green;
  ctx.fillStyle = theme.wood;
  roundRect(ctx, g.x - 14, g.y - 14, g.w + 28, g.h + 28, 20);
  ctx.fill();
  ctx.fillStyle = theme.leaf;
  ctx.fillRect(g.x, g.y, g.w, g.h);
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = theme.light;
  for (let x = g.x; x < g.x + g.w; x += 80) ctx.fillRect(x, g.y, 40, g.h);
  ctx.globalAlpha = 1;
  for (const w of state.walls) {
    ctx.fillStyle = theme.wood;
    roundRect(ctx, w.x, w.y, w.w, w.h, 6);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = theme.woodEdge;
    ctx.stroke();
  }
  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.arc(state.hole.x, state.hole.y, HOLE_R, 0, Math.PI * 2);
  ctx.fill();
  sprites.draw(ctx, 'flag-in-hole', state.hole.x + 10, state.hole.y - 40, 80);
  if (state.aimFrom && state.aimTo) {
    const v = shotVelocity(state.aimFrom, state.aimTo);
    const s = Math.hypot(v.x, v.y);
    if (s > 0) {
      ctx.fillStyle = theme.light;
      const n = Math.round(s / 60);
      for (let i = 1; i <= n; i += 1) {
        ctx.beginPath();
        ctx.arc(state.ball.x + (v.x / s) * i * 22, state.ball.y + (v.y / s) * i * 22, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  if (state.sunk < 0) {
    paintShadow(ctx, view, state.ball.x + 3, state.ball.y + 8, 26);
    ctx.fillStyle = theme.light;
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = theme.stoneEdge;
    ctx.stroke();
  } else {
    sprites.draw(ctx, 'sparkles', state.hole.x, state.hole.y - 30 - state.sunk * 40, 56);
    paintLabel(ctx, view, state.strokes === 1 ? 'Một gậy vào lỗ!' : 'Vào lỗ!', arena.width / 2, g.y + 40, 44, theme.star);
  }
  paintLabel(ctx, view, `Gậy ${state.strokes}`, g.x + 70, g.y + g.h - 26, 28);
}
