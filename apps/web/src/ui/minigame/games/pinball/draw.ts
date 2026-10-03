// Pinball's picture: a tilted table in the theme's colours with a wooden rim, bells as round bumpers (they
// flash when hit), stars that shine until hit and come back later, the two flippers, the silver ball, and the
// balls left as small dots at the bottom.
import { roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { BALL_R, flipperTip, type PinballState } from './logic';

export function drawPinball(ctx: CanvasRenderingContext2D, state: PinballState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.ink;
  ctx.fillRect(0, 0, arena.width, arena.height);
  const t = state.table;
  ctx.fillStyle = theme.wood;
  roundRect(ctx, t.x - 16, t.y - 16, t.w + 32, t.h + 32, t.w / 2);
  ctx.fill();
  ctx.fillStyle = theme.secondary;
  roundRect(ctx, t.x, t.y, t.w, t.h, t.w / 2);
  ctx.fill();
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  for (const s of state.walls) {
    ctx.beginPath();
    ctx.moveTo(s.a.x, s.a.y);
    ctx.lineTo(s.b.x, s.b.y);
    ctx.stroke();
  }
  for (const b of state.bumpers) {
    const flash = b.hitAgo < 0.15;
    ctx.fillStyle = flash ? theme.star : theme.primary;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * (flash && !view.reducedMotion ? 1.12 : 1), 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = theme.light;
    ctx.stroke();
    sprites.draw(ctx, 'bell', b.x, b.y, b.r * 1.2, { rotate: flash ? Math.sin(view.time * 40) * 0.3 : 0 });
  }
  for (const s of state.stars) sprites.draw(ctx, 'star', s.x, s.y, 44, { alpha: s.dark > 0 ? 0.25 : 1, rotate: s.dark > 0 ? 0 : Math.sin(view.time * 3) * 0.15 });
  const length = t.w * 0.3;
  for (const f of state.flippers) {
    const tip = flipperTip(f, length);
    ctx.strokeStyle = theme.star;
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.moveTo(f.pivot.x, f.pivot.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    ctx.fillStyle = theme.ink;
    ctx.beginPath();
    ctx.arc(f.pivot.x, f.pivot.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineCap = 'butt';
  if (state.inPlay >= 0) {
    ctx.fillStyle = theme.stone;
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.light;
    ctx.beginPath();
    ctx.arc(state.ball.x - 4, state.ball.y - 4, BALL_R * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  // Which half raises which flipper.
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = theme.light;
  const leftUp = state.flippers[0]?.up;
  const rightUp = state.flippers[1]?.up;
  if (leftUp) ctx.fillRect(0, 0, arena.width / 2, arena.height);
  if (rightUp) ctx.fillRect(arena.width / 2, 0, arena.width / 2, arena.height);
  ctx.globalAlpha = 1;
}
