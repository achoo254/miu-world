// Bubble shooter's picture: a board framed under the sky, glossy bubbles in four colours each carrying its
// own picture (heart, star, leaf, droplet), the dotted aiming line bouncing off the walls while the finger is
// down, the launcher with the bubble to shoot and the next one, a dashed danger line, popping bubbles
// bursting and loose ones dropping.
import { paintSky, roundRect } from '../../draw-kit';
import type { SpriteName } from '../../sprites';
import type { DrawView } from '../../types';
import { cellCentre, rowCols, trace, type BubbleState } from './logic';

const PICTURES: readonly SpriteName[] = ['heart', 'star', 'leaf', 'droplet'];

function colourOf(view: DrawView, colour: number): string {
  const { theme } = view;
  return [theme.danger, theme.star, theme.leaf, theme.secondary][colour] ?? theme.primary;
}

export function paintBubble(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, colour: number, radius: number, alpha = 1): void {
  const { theme, sprites } = view;
  const r = radius;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colourOf(view, colour);
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r - 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = alpha * 0.55;
  ctx.beginPath();
  ctx.ellipse(x - r * 0.35, y - r * 0.4, r * 0.28, r * 0.16, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha;
  sprites.draw(ctx, PICTURES[colour] ?? 'star', x, y + 2, r * 1.05, { alpha });
  ctx.globalAlpha = 1;
}

export function drawBubbleShooter(ctx: CanvasRenderingContext2D, state: BubbleState, view: DrawView): void {
  const { arena, theme } = view;
  paintSky(ctx, view, arena.height, 5);
  const width = state.cols * state.r * 2;
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.18;
  roundRect(ctx, state.left - 10, state.top - 8, width + 20, arena.height - state.top, 20);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Danger line.
  ctx.setLineDash([16, 12]);
  ctx.strokeStyle = theme.danger;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(state.left, state.dangerY);
  ctx.lineTo(state.left + width, state.dangerY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  for (let row = 0; row < state.rows; row += 1) {
    for (let col = 0; col < rowCols(state, row); col += 1) {
      const colour = state.grid[row]?.[col] ?? -1;
      if (colour < 0) continue;
      const p = cellCentre(state, { row, col });
      paintBubble(ctx, view, p.x, p.y, colour, state.r);
    }
  }

  if (state.aim !== null) {
    // The aiming line: dots along the path, to where it will stick.
    const { path } = trace(state, state.aim);
    ctx.fillStyle = theme.light;
    for (let i = 1; i < path.length; i += 1) {
      const a = path[i - 1];
      const b = path[i];
      if (!a || !b) continue;
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      for (let d = 0; d < length; d += 26) {
        ctx.beginPath();
        ctx.arc(a.x + ((b.x - a.x) * d) / length, a.y + ((b.y - a.y) * d) / length, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  for (const f of state.falling) {
    if (f.popped) paintBubble(ctx, view, f.x, f.y, f.colour, state.r * (1 + f.t * 2), 1 - f.t / 0.3);
    else paintBubble(ctx, view, f.x, f.y, f.colour, state.r * 0.9);
  }
  if (state.shot) paintBubble(ctx, view, state.shot.x, state.shot.y, state.shot.colour, state.r);

  // The launcher: a round base, the bubble to shoot, and the next one beside it.
  ctx.fillStyle = theme.woodEdge;
  ctx.beginPath();
  ctx.arc(state.shooterX, state.shooterY + 40, 70, Math.PI, 0);
  ctx.fill();
  if (!state.shot) paintBubble(ctx, view, state.shooterX, state.shooterY, state.current, Math.max(state.r * 1.1, 30));
  paintBubble(ctx, view, state.shooterX + 110, state.shooterY + 30, state.next, Math.max(state.r * 0.75, 22));
}
