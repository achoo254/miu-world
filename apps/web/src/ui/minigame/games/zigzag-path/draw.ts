// Zigzag path's picture: a forest floor seen from above, the stone path drawn as a raised band with a darker
// side, pines on both sides, gems glinting on the path, and the shiny ball (it squashes on a tap and shrinks
// as it drops off the edge). The path scrolls down while the ball stays low on the screen.
import { paintLabel } from '../../draw-kit';
import type { DrawView } from '../../types';
import { BALL_RADIUS, type ZigzagState } from './logic';

export function drawZigzagPath(ctx: CanvasRenderingContext2D, state: ZigzagState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { ball, halfWidth } = state;
  const toY = (d: number): number => state.ballScreenY - (d - ball.d);
  ctx.fillStyle = theme.leaf;
  ctx.fillRect(0, 0, arena.width, arena.height);
  // Soft grass patches, scrolling with the path.
  ctx.fillStyle = theme.ground;
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 18; i += 1) {
    const y = ((((i * 173 + ball.d) % (arena.height + 200)) + arena.height + 200) % (arena.height + 200)) - 100;
    ctx.beginPath();
    ctx.ellipse((i * 211) % arena.width, y, 40, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // The path: its side first (lower), then its top.
  const corners = state.corners;
  const band = (shift: number, colour: string): void => {
    ctx.fillStyle = colour;
    for (let i = 0; i + 1 < corners.length; i += 1) {
      const a = corners[i];
      const b = corners[i + 1];
      if (!a || !b) continue;
      const ya = toY(a.d) + shift;
      const yb = toY(b.d) + shift;
      if (Math.max(ya, yb) < -60 || Math.min(ya, yb) > arena.height + 60) continue;
      ctx.beginPath();
      ctx.moveTo(a.x - halfWidth, ya);
      ctx.lineTo(b.x - halfWidth, yb);
      ctx.lineTo(b.x + halfWidth, yb);
      ctx.lineTo(a.x + halfWidth, ya);
      ctx.closePath();
      ctx.fill();
      // Round the corner joints.
      ctx.beginPath();
      ctx.ellipse(b.x, yb, halfWidth, halfWidth * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  band(18, theme.stoneEdge);
  band(0, theme.stone);
  ctx.globalAlpha = 0.35;
  band(-2, theme.light);
  ctx.globalAlpha = 1;
  band(4, theme.stone);

  for (const tree of state.trees) {
    const y = toY(tree.d);
    if (y < -80 || y > arena.height + 80) continue;
    sprites.draw(ctx, 'evergreen-tree', tree.x, y - 30, 90);
  }
  for (const gem of state.gems) {
    if (gem.taken) continue;
    const y = toY(gem.d);
    if (y < -40 || y > arena.height + 40) continue;
    sprites.draw(ctx, 'gem', gem.x, y - 10 - (view.reducedMotion ? 0 : Math.abs(Math.sin(view.time * 4 + gem.d)) * 8), 44);
  }

  // The ball.
  const fall = state.falling > 0 ? 1 - state.falling / 0.9 : 0;
  const r = BALL_RADIUS * (1 - fall * 0.6);
  const squash = !view.reducedMotion && state.tappedAgo < 0.15 ? 0.2 * (1 - state.tappedAgo / 0.15) : 0;
  const by = state.ballScreenY + fall * 60;
  ctx.globalAlpha = 1 - fall * 0.5;
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha *= 0.3;
  ctx.beginPath();
  ctx.ellipse(ball.x + 6, by + 10, r, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1 - fall * 0.5;
  ctx.fillStyle = theme.primary;
  ctx.beginPath();
  ctx.ellipse(ball.x, by, r * (1 + squash), r * (1 - squash), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.ink;
  ctx.stroke();
  ctx.fillStyle = theme.light;
  ctx.beginPath();
  ctx.arc(ball.x - r * 0.35, by - r * 0.35, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (state.time < 2.5) paintLabel(ctx, view, 'Chạm để rẽ!', arena.width / 2, state.ballScreenY + 90, 36);
}
