// Beach volleyball's picture: sea and sky, a sandy court with palm trees, the net in the middle, the child on
// the left and the crab on the right (each hops when it plays the ball), the ball spinning (a spiked ball
// leaves a streak), its shadow on the sand marking where it comes down, and the set's score on a board.
import { paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { HUD_SAFE_TOP } from '../../types';
import { landingX, type VolleyState } from './logic';

export function drawVolleyballBeach(ctx: CanvasRenderingContext2D, state: VolleyState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const seaY = state.groundY - 90;
  paintSky(ctx, view, seaY, 10);
  ctx.fillStyle = theme.water;
  ctx.fillRect(0, seaY, arena.width, 60);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, seaY + 50, arena.width, arena.height - seaY - 50);
  sprites.draw(ctx, 'palm-tree', 50, seaY + 10, 130);
  sprites.draw(ctx, 'palm-tree', arena.width - 50, seaY + 10, 130, { flipX: true });

  // The net.
  const { netX, netTop, groundY } = state;
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(netX - 5, netTop - 10, 10, groundY - netTop + 10);
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 2;
  for (let y = netTop; y < netTop + 70; y += 14) {
    ctx.beginPath();
    ctx.moveTo(netX - 4, y);
    ctx.lineTo(netX + 4, y);
    ctx.stroke();
  }
  ctx.fillStyle = theme.light;
  ctx.fillRect(netX - 6, netTop - 6, 12, 8);
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = theme.light;
  for (let y = netTop; y < netTop + 70; y += 10) ctx.fillRect(netX - 3, y, 6, 2);
  ctx.globalAlpha = 1;

  // Where the ball will come down: a ring on the sand.
  const { ball } = state;
  const land = state.phase === 'rally' ? landingX(ball, state.contactY) : null;
  if (land !== null && ball.to === 'child') {
    ctx.strokeStyle = theme.star;
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.ellipse(land, groundY + 4, 40, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  paintShadow(ctx, view, ball.x, groundY + 4, 60, Math.min(1, (groundY - ball.y) / 400));

  // Players.
  const hop = (ago: number): number => (!view.reducedMotion && ago < 0.3 ? Math.sin((ago / 0.3) * Math.PI) * 26 : 0);
  paintShadow(ctx, view, state.child.x, groundY + 6, 90);
  sprites.draw(ctx, view.player, state.child.x, groundY - 55 - hop(state.child.hitAgo), 110);
  paintShadow(ctx, view, state.crab.x, groundY + 6, 90);
  sprites.draw(ctx, 'crab', state.crab.x, groundY - 50 - hop(state.crab.hitAgo), 100);

  // The ball.
  if (ball.spiked && state.phase === 'rally' && !view.reducedMotion) {
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 8;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(ball.x - ball.vx * 0.08, ball.y - ball.vy * 0.08);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  sprites.draw(ctx, 'volleyball', ball.x, ball.y, 52, { rotate: view.reducedMotion ? 0 : state.time * 6 });

  // Score board.
  const boardW = 220;
  ctx.fillStyle = theme.light;
  roundRect(ctx, arena.width / 2 - boardW / 2, HUD_SAFE_TOP + 4, boardW, 52, 20);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.ink;
  ctx.stroke();
  paintLabel(ctx, view, `Bé ${state.set.child} – ${state.set.crab} Cua`, arena.width / 2, HUD_SAFE_TOP + 31, 30, theme.primary);
  if (state.phase === 'point' && state.lastPoint) {
    paintLabel(ctx, view, state.lastPoint === 'child' ? 'Ghi điểm!' : 'Cua ghi điểm', arena.width / 2, HUD_SAFE_TOP + 100, 42, state.lastPoint === 'child' ? theme.star : theme.light);
  } else if (state.time < 4) {
    paintLabel(ctx, view, 'Chạm khi bóng trên đầu để đập!', arena.width / 2, HUD_SAFE_TOP + 100, Math.min(32, arena.width / 20));
  }
}
