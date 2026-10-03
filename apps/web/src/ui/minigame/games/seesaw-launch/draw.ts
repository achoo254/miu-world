// Seesaw launch's picture: a playground, a pole with height marks above the seesaw's left end (a flag at the
// last drop height), the seesaw tipping as the sandbag lands, the ball flying in an arc, and the basket on the
// right. The sandbag is a drawn sack; a ball in the basket sparkles.
import { paintGround, paintHills, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { SeesawLaunchState } from './logic';
import { BAGS } from './logic';

export function drawSeesawLaunch(ctx: CanvasRenderingContext2D, state: SeesawLaunchState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { pivot, half } = state;
  const groundY = pivot.y + 40;
  paintSky(ctx, view, groundY, 6);
  paintHills(ctx, view, groundY, 0, 80, theme.leaf);
  paintGround(ctx, view, groundY);

  // Pole with marks.
  const poleX = pivot.x - half;
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.55;
  roundRect(ctx, poleX - 34, state.poleTop - 10, 68, pivot.y - state.poleTop - 10, 20);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.ink;
  for (let y = pivot.y - 40; y >= state.poleTop; y -= 40) ctx.fillRect(poleX - 20, y, 40, 3);
  if (state.lastDrop > 0) {
    const fy = pivot.y - state.lastDrop;
    ctx.fillStyle = theme.danger;
    ctx.beginPath();
    ctx.moveTo(poleX + 34, fy);
    ctx.lineTo(poleX + 70, fy - 12);
    ctx.lineTo(poleX + 34, fy - 24);
    ctx.closePath();
    ctx.fill();
  }

  // The seesaw: tipped right end down before the drop, left end down after.
  const down = state.phase === 'aim' || state.phase === 'drop' ? 1 : -1;
  const tilt = down * 0.2;
  ctx.fillStyle = theme.woodEdge;
  ctx.beginPath();
  ctx.moveTo(pivot.x, pivot.y);
  ctx.lineTo(pivot.x + 30, groundY);
  ctx.lineTo(pivot.x - 30, groundY);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.translate(pivot.x, pivot.y);
  ctx.rotate(tilt);
  ctx.fillStyle = theme.wood;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, -half - 20, -9, half * 2 + 40, 18, 9);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Sandbag.
  if (state.phase === 'drop' || state.phase === 'fly' || state.phase === 'result') {
    const by = state.phase === 'drop' ? state.bag.y : pivot.y - 30 + Math.sin(0.2) * half;
    ctx.fillStyle = theme.groundDeep;
    ctx.strokeStyle = theme.ink;
    roundRect(ctx, state.bag.x - 30, by - 30, 60, 50, 16);
    ctx.fill();
    ctx.stroke();
  }
  // Basket and ball.
  sprites.draw(ctx, 'basket', state.basketX, pivot.y - 20, 110);
  const ballY = state.phase === 'aim' || state.phase === 'drop' ? pivot.y - 30 - Math.sin(0.2) * half : state.ball.y;
  const ballX = state.phase === 'aim' || state.phase === 'drop' ? pivot.x + half : state.ball.x;
  if (!(state.phase === 'result' && state.lastIn)) sprites.draw(ctx, 'basketball', ballX, ballY - 10, 56, { rotate: view.reducedMotion ? 0 : state.phaseAgo * 8 });
  if (state.phase === 'result' && state.lastIn) {
    sprites.draw(ctx, 'basketball', state.basketX, pivot.y - 44, 50);
    sprites.draw(ctx, 'sparkles', state.basketX + 40, pivot.y - 90, 60);
  }
  if (state.phase === 'aim') paintLabel(ctx, view, 'Chạm độ cao để thả bao cát', arena.width / 2, state.poleTop - 20, Math.min(32, arena.width / 19), theme.light);
  for (let i = 0; i < BAGS; i += 1) {
    ctx.globalAlpha = i < BAGS - state.bags ? 1 : 0.25;
    ctx.fillStyle = theme.groundDeep;
    roundRect(ctx, arena.width - 34 - i * 28, groundY + 30, 22, 20, 6);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
