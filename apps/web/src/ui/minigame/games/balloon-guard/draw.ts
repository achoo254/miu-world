// Balloon guard's picture: an open sky with clouds sliding down past (so the balloon seems to rise), a height
// ruler at the side, the balloon with the child's friend hanging under it (shaking red after a hit), leaves,
// chestnuts and pebbles dropping, the umbrella the child steers, and knocked things tumbling away.
import { bob, paintLabel } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import type { DrawView } from '../../types';
import { BALLOON_R, UMBRELLA_R, type BalloonState } from './logic';

export const FALLERS: readonly SpriteRef[] = ['fallen-leaf', 'chestnut', 'rock'];

export function drawBalloonGuard(ctx: CanvasRenderingContext2D, state: BalloonState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const sky = ctx.createLinearGradient(0, 0, 0, arena.height);
  sky.addColorStop(0, theme.sky[0]);
  sky.addColorStop(1, theme.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, arena.width, arena.height);
  // Clouds drifting down as the balloon climbs.
  const rise = state.metres * 40;
  for (let i = 0; i < 6; i += 1) {
    const y = ((i * 260 + rise) % (arena.height + 200)) - 100;
    sprites.draw(ctx, 'cloud', (i * 331) % arena.width, y, 120 + (i % 3) * 40, { alpha: 0.85 });
  }
  // Height ruler.
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.6;
  for (let m = Math.floor(state.metres) - 10; m < state.metres + 20; m += 1) {
    if (m % 5 !== 0) continue;
    const y = state.balloon.y - (m - state.metres) * 40;
    ctx.fillRect(arena.width - 34, y, m % 10 === 0 ? 30 : 16, 4);
  }
  ctx.globalAlpha = 1;
  paintLabel(ctx, view, `${Math.floor(state.metres)} m`, arena.width - 60, state.balloon.y + 60, 26);

  // Balloon and friend.
  const { balloon } = state;
  const hit = state.time - state.hitAt < 0.5;
  const shake = hit && !view.reducedMotion ? Math.sin(state.time * 60) * 6 : 0;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(balloon.x + shake, balloon.y - 40 + BALLOON_R);
  ctx.lineTo(balloon.x, balloon.y + 70);
  ctx.stroke();
  sprites.draw(ctx, 'balloon', balloon.x + shake, balloon.y - 40 + bob(view, 2, 4), BALLOON_R * 2.6);
  sprites.draw(ctx, view.player, balloon.x, balloon.y + 100, 80);
  if (hit) {
    ctx.strokeStyle = theme.danger;
    ctx.lineWidth = 6;
    ctx.globalAlpha = 1 - (state.time - state.hitAt) / 0.5;
    ctx.beginPath();
    ctx.arc(balloon.x, balloon.y - 40, BALLOON_R + 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  for (const f of state.fallers) {
    sprites.draw(ctx, FALLERS[f.kind] ?? 'rock', f.x, f.y, 52, { rotate: f.knocked ? state.time * 10 : 0 });
  }
  sprites.draw(ctx, 'umbrella', state.umbrella.x, state.umbrella.y + 10, UMBRELLA_R * 2.3);
}
