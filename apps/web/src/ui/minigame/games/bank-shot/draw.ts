// Bank shot's picture: a school gym with wooden walls and a lit ceiling strip (the bouncing walls), the stack
// of crates in the middle, the child on the left with the ball, the friend on the right holding out his hands
// (a ring shows where the ball must reach), the dotted aiming line up to the first bounce, the flying ball with
// a flash on each bounce, and balls left shown at the bottom.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { BALLS, CATCH_RADIUS, type BankState } from './logic';

/** Dotted aim up to the first wall, ceiling or crate the line meets. */
function paintAim(ctx: CanvasRenderingContext2D, view: DrawView, state: BankState): void {
  const aim = state.aim;
  if (!aim) return;
  const { theme } = view;
  ctx.fillStyle = theme.light;
  let x = state.thrower.x;
  let y = state.thrower.y;
  for (let k = 0; k < 120; k += 1) {
    x += aim.x * 14;
    y += aim.y * 14;
    const c = state.crates;
    if (x < state.left + 18 || x > state.right - 18 || y < state.ceiling + 18 || (x > c.x - 18 && x < c.x + c.w + 18 && y > c.y - 18)) break;
    if (k % 2 === 0) {
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawBankShot(ctx: CanvasRenderingContext2D, state: BankState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.sky[2];
  ctx.fillRect(0, 0, arena.width, arena.height);
  // Walls and ceiling.
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 0, state.left, arena.height);
  ctx.fillRect(state.right, 0, arena.width - state.right, arena.height);
  ctx.fillRect(0, 0, arena.width, state.ceiling);
  ctx.fillStyle = theme.star;
  ctx.fillRect(state.left, state.ceiling - 6, state.right - state.left, 6);
  // Floor.
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(0, state.floor, arena.width, arena.height - state.floor);
  // Crates.
  const c = state.crates;
  const rows = Math.max(1, Math.round(c.h / 80));
  for (let r = 0; r < rows; r += 1) sprites.draw(ctx, 'package', c.x + c.w / 2, c.y + c.h - (r + 0.5) * (c.h / rows), Math.min(c.w * 1.2, c.h / rows * 1.15));
  // Friend with a catch ring.
  ctx.strokeStyle = theme.star;
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.arc(state.friend.x, state.friend.y, CATCH_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  sprites.draw(ctx, 'bear', state.friend.x, state.friend.y, 90);
  // Thrower.
  sprites.draw(ctx, view.player, state.thrower.x, state.thrower.y + 10, 90);
  paintAim(ctx, view, state);
  if (!state.ball && state.balls < BALLS) sprites.draw(ctx, 'volleyball', state.thrower.x + 30, state.thrower.y - 40, 40);
  if (state.ball) sprites.draw(ctx, 'volleyball', state.ball.x, state.ball.y, 40, { rotate: state.ball.age * 10 });
  if (state.bounceAt && state.bounceAgo < 0.3) {
    ctx.globalAlpha = 1 - state.bounceAgo / 0.3;
    ctx.fillStyle = theme.light;
    ctx.beginPath();
    ctx.arc(state.bounceAt.x, state.bounceAt.y, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (state.result && state.resultAgo < 1) {
    paintLabel(ctx, view, state.result === 'caught' ? 'Bắt được rồi!' : 'Chưa tới tay bạn', arena.width / 2, state.ceiling + 60, 34, state.result === 'caught' ? theme.star : theme.light);
  }
  // Balls left.
  const left = BALLS - state.balls;
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.3;
  roundRect(ctx, arena.width / 2 - 140, arena.height - 34, 280, 30, 15);
  ctx.fill();
  ctx.globalAlpha = 1;
  paintLabel(ctx, view, `Còn ${left} quả bóng`, arena.width / 2, arena.height - 19, 22, theme.light);
}
