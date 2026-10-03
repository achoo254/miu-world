// Snowball fight's picture: a snowy field under the sky, snow forts with friends popping up behind them
// (a raised arm and a "!" while they wind up, dizzy stars when hit), snowballs flying in arcs (growing as
// they come at her), splats, a snowman for company, and the child's own fort across the bottom with her
// head peeking over it, or hidden when she ducks.
import { bob, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { SnowballState } from './logic';

function paintMound(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, w: number, h: number): void {
  const { theme } = view;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.waterLight;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(x, y, w / 2, h, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function paintSnowball(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, r: number): void {
  ctx.fillStyle = view.theme.light;
  ctx.strokeStyle = view.theme.stoneEdge;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

export function drawSnowballFight(ctx: CanvasRenderingContext2D, state: SnowballState, view: DrawView): void {
  const { arena, sprites, theme } = view;
  const horizon = (state.friends[0]?.y ?? 220) - 70;
  paintSky(ctx, view, horizon, 5);
  ctx.fillStyle = theme.light;
  ctx.fillRect(0, horizon, arena.width, arena.height - horizon);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = theme.waterLight;
  for (let y = horizon + 40; y < arena.height; y += 90) ctx.fillRect(0, y, arena.width, 30);
  ctx.globalAlpha = 1;
  sprites.draw(ctx, 'snowman', arena.width - 70, horizon + 10, 110);

  for (const f of state.friends) {
    const pop = f.up >= 0 ? Math.min(1, f.up / 0.2) : f.hit >= 0 ? Math.max(0, 1 - f.hit / 0.3) : 0;
    if (pop > 0) {
      const y = f.y + 20 - pop * 60;
      sprites.draw(ctx, f.sprite, f.x, y, 96, { rotate: f.hit >= 0 && !view.reducedMotion ? Math.sin(f.hit * 30) * 0.3 : 0 });
      if (f.up >= 0 && !f.threw) {
        // Winding up: a snowball held high and a warning.
        paintSnowball(ctx, view, f.x + 40, y - 46, 16);
        paintLabel(ctx, view, '!', f.x - 46, y - 50 + bob(view, 12, 4), 44, theme.danger);
      }
      if (f.hit >= 0) for (let i = 0; i < 3; i += 1) sprites.draw(ctx, 'star', f.x + Math.cos(view.time * 6 + i * 2.1) * 40, y - 60, 24);
    }
    paintMound(ctx, view, f.x, f.y + 40, 170, 70);
  }

  for (const b of state.balls) {
    const u = Math.min(1, b.t / b.flight);
    const x = b.splat >= 0 ? b.toX : b.fromX + (b.toX - b.fromX) * u;
    const y = b.splat >= 0 ? b.toY : b.fromY + (b.toY - b.fromY) * u - Math.sin(u * Math.PI) * 80;
    if (b.splat >= 0) {
      ctx.globalAlpha = 1 - b.splat / 0.5;
      ctx.fillStyle = theme.light;
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * 22, y + Math.sin(a) * 12, 12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      continue;
    }
    // Theirs grow as they come toward her; hers shrink as they go away.
    const r = b.target < 0 ? 14 + 26 * u : 24 - 12 * u;
    paintSnowball(ctx, view, x, y, r);
  }

  // Her fort and her peeking over it.
  const headY = state.ducking ? state.fortY + 10 : state.fortY - 60;
  const blink = state.hitAgo < 1 && Math.floor(state.hitAgo * 10) % 2 === 0;
  sprites.draw(ctx, view.player, state.playerX, headY, 110, { alpha: blink ? 0.45 : 1 });
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.waterLight;
  ctx.lineWidth = 8;
  roundRect(ctx, -20, state.fortY - 10, arena.width + 40, arena.height - state.fortY + 30, 40);
  ctx.fill();
  ctx.stroke();
  for (let x = 40; x < arena.width; x += 110) paintSnowball(ctx, view, x, state.fortY + 40, 22);
  if (state.ducking) paintLabel(ctx, view, 'Núp!', state.playerX, state.fortY + 70, 34);
}
