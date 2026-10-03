// Sled slalom's picture: a snowy slope seen from above with ski tracks, blue and red flag gates (a flag
// pair, a dotted line between them that lights up when passed), pine trees with shadows, and the child on
// her sled leaning into turns, a spray of snow behind.
import { paintLabel, paintShadow } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { SledState } from './logic';

function paintFlag(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, colour: string, flip: boolean): void {
  const { theme } = view;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x, y + 10);
  ctx.lineTo(x, y - 60);
  ctx.stroke();
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(x, y - 60);
  ctx.lineTo(x + (flip ? -40 : 40), y - 46);
  ctx.lineTo(x, y - 32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

export function drawSledSlalom(ctx: CanvasRenderingContext2D, state: SledState, view: DrawView): void {
  const { arena, sprites, theme } = view;
  ctx.fillStyle = theme.id === 'snow' ? theme.ground : theme.light;
  ctx.fillRect(0, 0, arena.width, arena.height);
  // Bumps and tracks scrolling up.
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = theme.waterLight;
  for (let i = 0; i < 14; i += 1) {
    const y = ((i * 173 - state.distance) % (arena.height + 200) + arena.height + 200) % (arena.height + 200) - 100;
    ctx.beginPath();
    ctx.ellipse((i * 271) % arena.width, y, 70, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  state.gates.forEach((g, i) => {
    const colour = i % 2 === 0 ? theme.secondary : theme.danger;
    ctx.globalAlpha = g.passed === false ? 0.4 : 1;
    ctx.strokeStyle = g.passed ? theme.star : colour;
    ctx.lineWidth = g.passed ? 8 : 4;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.moveTo(g.x - g.half, g.y);
    ctx.lineTo(g.x + g.half, g.y);
    ctx.stroke();
    ctx.setLineDash([]);
    paintFlag(ctx, view, g.x - g.half, g.y, colour, true);
    paintFlag(ctx, view, g.x + g.half, g.y, colour, false);
    ctx.globalAlpha = 1;
  });

  for (const t of state.trees) {
    paintShadow(ctx, view, t.x + 10, t.y + 30, 80);
    sprites.draw(ctx, 'evergreen-tree', t.x, t.y - 10, 100);
  }

  // Spray behind the sled.
  if (state.stopped <= 0 && !view.reducedMotion) {
    ctx.fillStyle = theme.light;
    for (let i = 0; i < 5; i += 1) {
      const t = (view.time * 3 + i / 5) % 1;
      ctx.globalAlpha = 0.8 * (1 - t);
      ctx.beginPath();
      ctx.arc(state.sledX + Math.sin(i * 2.3) * 20 - (state.vx / 600) * 30 * t, state.sledY - 40 - t * 70, 8 + t * 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  const lean = view.reducedMotion ? 0 : Math.max(-0.4, Math.min(0.4, state.vx / 1500));
  paintShadow(ctx, view, state.sledX + 8, state.sledY + 40, 100);
  sprites.draw(ctx, 'sled', state.sledX, state.sledY + 16, 104, { rotate: lean + Math.PI / 2 });
  sprites.draw(ctx, view.player, state.sledX, state.sledY - 4, 76, { rotate: lean });
  if (state.stopped > 0) paintLabel(ctx, view, 'Ui da!', state.sledX, state.sledY - 70, 36);
}
