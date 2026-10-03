// Breakout's picture: the sky with a wall of rounded bricks in the theme's colours, row by row (star bricks
// carry a star), the ball, falling apples, and the paddle: a wooden board the child's character holds up from
// below, squashing a little at each bounce and stretching while long. A broken brick crumbles and fades.
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { BreakoutState } from './logic';

export function drawBreakout(ctx: CanvasRenderingContext2D, state: BreakoutState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, arena.height, 6);
  const palette = [theme.danger, theme.primary, theme.star, theme.leaf, theme.secondary, theme.water, theme.wood, theme.stone];
  for (const brick of state.bricks) {
    if (!brick.alive && brick.brokeAgo > 0.35) continue;
    const t = brick.alive ? 0 : brick.brokeAgo / 0.35;
    const shrink = 1 - t * 0.5;
    const w = brick.w * shrink;
    const h = brick.h * shrink;
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = palette[brick.row % palette.length] ?? theme.primary;
    roundRect(ctx, brick.x + (brick.w - w) / 2, brick.y + (brick.h - h) / 2 + t * 20, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.globalAlpha = (1 - t) * 0.35;
    ctx.fillStyle = theme.light;
    roundRect(ctx, brick.x + 6, brick.y + 4, brick.w - 12, 6, 3);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (brick.star) sprites.draw(ctx, 'star', brick.x + brick.w / 2, brick.y + brick.h / 2 + t * 20, brick.h * 0.9, { alpha: 1 - t });
  }
  for (const apple of state.apples) sprites.draw(ctx, 'red-apple', apple.x, apple.y, 44, { rotate: view.reducedMotion ? 0 : Math.sin(view.time * 6 + apple.x) * 0.3 });

  // The paddle, held up by the child's character.
  const squash = view.reducedMotion ? 0 : Math.max(0, 1 - state.bouncedAgo / 0.15) * 5;
  sprites.draw(ctx, view.player, state.paddleX, state.paddleY + 42, 64);
  ctx.fillStyle = state.longFor > 0 ? theme.star : theme.wood;
  roundRect(ctx, state.paddleX - state.paddleWidth / 2, state.paddleY - 12 + squash, state.paddleWidth, 22 - squash, 11);
  ctx.fill();
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 4;
  ctx.stroke();

  const b = state.ball;
  sprites.draw(ctx, 'soccer-ball', b.x, b.y, state.ballRadius * 2.4, { rotate: view.reducedMotion ? 0 : state.time * 6 });
  if (state.onPaddle) paintLabel(ctx, view, 'Chạm để bắn bóng!', arena.width / 2, state.paddleY - 90, 30);
}
