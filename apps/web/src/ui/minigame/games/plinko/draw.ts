// Plinko's picture: a wooden board with a light face, round pegs (a peg glints when a coin is near), the bins
// along the bottom with their points (a bin flashes when a coin lands), the gift box gliding above them, the
// floating star, the coin waiting at the top (a guide line under the finger) or bouncing down, and the coins
// already resting in their bins.
import { bob, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { BALL_RADIUS, BALLS, GIFT_RADIUS, giftAt, PEG_RADIUS, STAR_RADIUS, starAt, type PlinkoState } from './logic';

export function drawPlinko(ctx: CanvasRenderingContext2D, state: PlinkoState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const b = state.board;
  paintSky(ctx, view, arena.height, 6);
  // The board: wooden frame and a light face.
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, b.left - 18, b.dropY - 50, b.right - b.left + 36, b.bottom - b.dropY + 64, 28);
  ctx.fill();
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.9;
  roundRect(ctx, b.left, b.dropY - 34, b.right - b.left, b.bottom - b.dropY + 34, 20);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Bins with their points.
  b.bins.forEach((bin, i) => {
    const flash = Math.max(0, 1 - bin.hitAgo / 0.6);
    ctx.fillStyle = bin.value >= 20 ? theme.star : i % 2 === 0 ? theme.primary : theme.secondary;
    ctx.globalAlpha = 0.55 + 0.45 * flash;
    roundRect(ctx, bin.x0 + 4, b.binsTop, bin.x1 - bin.x0 - 8, b.bottom - b.binsTop, 12);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.wood;
    ctx.fillRect(bin.x0 - 4, b.binsTop - 6, 8, b.bottom - b.binsTop + 6);
    const grow = view.reducedMotion ? 1 : 1 + 0.3 * flash;
    paintLabel(ctx, view, String(bin.value), (bin.x0 + bin.x1) / 2, b.bottom - 34, 34 * grow);
  });
  ctx.fillStyle = theme.wood;
  ctx.fillRect(b.right - 4, b.binsTop - 6, 8, b.bottom - b.binsTop + 6);

  // Pegs.
  const ball = state.ball;
  for (const p of b.pegs) {
    const near = ball && Math.hypot(ball.x - p.x, ball.y - p.y) < BALL_RADIUS + PEG_RADIUS + 14;
    ctx.fillStyle = near ? theme.star : theme.stoneEdge;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PEG_RADIUS + (near ? 3 : 0), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.light;
    ctx.beginPath();
    ctx.arc(p.x - 3, p.y - 3, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bonuses.
  if (state.giftAway <= 0) {
    const g = giftAt(b, state.time);
    sprites.draw(ctx, 'gift', g.x, g.y + bob(view, 4, 3), GIFT_RADIUS * 2.1, { rotate: view.reducedMotion ? 0 : Math.sin(view.time * 3) * 0.08 });
    paintLabel(ctx, view, '+25', g.x, g.y - GIFT_RADIUS - 6, 22, theme.star);
  }
  if (state.starAway <= 0) {
    const s = starAt(b, state.time);
    sprites.draw(ctx, 'star', s.x, s.y, STAR_RADIUS * 2.2, { rotate: view.reducedMotion ? 0 : view.time * 1.5 });
  }

  // Landed coins sit along the top of their bin, above its number.
  for (const c of state.landed) sprites.draw(ctx, 'coin', c.x, b.binsTop + BALL_RADIUS + 6 - Math.max(0, 0.2 - c.settled) * 150, BALL_RADIUS * 2.1);

  if (ball) {
    sprites.draw(ctx, 'coin', ball.x, ball.y, BALL_RADIUS * 2.4, { rotate: view.reducedMotion ? 0 : ball.x * 0.05 });
  } else if (state.ballsLeft > 0) {
    // The next coin waits at the top; a finger on the board shows where it would drop.
    ctx.setLineDash([12, 10]);
    ctx.strokeStyle = theme.ink;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 4;
    const x = (b.left + b.right) / 2;
    ctx.beginPath();
    ctx.moveTo(x, b.dropY);
    ctx.lineTo(x, b.binsTop);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    sprites.draw(ctx, 'coin', x, b.dropY + bob(view, 4, 5), BALL_RADIUS * 2.4);
    if (state.ballsLeft === BALLS) paintLabel(ctx, view, 'Chạm chỗ muốn thả', x, b.dropY + 50, 28);
  }
  // Coins left, along the top of the board.
  for (let i = 0; i < state.ballsLeft - (ball ? 0 : 1); i += 1) sprites.draw(ctx, 'coin', b.left + 22 + i * 30, b.dropY - 2, 26);
}
