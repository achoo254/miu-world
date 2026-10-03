// High dive's picture: a sky over the pool, the tall tower with the board at this dive's height, the water with
// rippling lines, and the child: standing on the board, rolled up spinning in the air, or stretched straight
// once opened. A clean entry leaves a small neat splash and sparkles; a flop sends up a big splash with "Bẹp!".
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { HighDiveState } from './logic';
import { DIVES } from './logic';

export function drawHighDive(ctx: CanvasRenderingContext2D, state: HighDiveState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, state.waterY, 6);
  // Tower and board.
  const towerX = state.x - 150;
  ctx.fillStyle = theme.stone;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, towerX - 40, state.boardY, 60, state.waterY - state.boardY, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.light;
  roundRect(ctx, towerX - 40, state.boardY - 8, 200, 16, 8);
  ctx.fill();
  ctx.stroke();
  // Water.
  ctx.fillStyle = theme.water;
  ctx.fillRect(0, state.waterY, arena.width, arena.height - state.waterY);
  ctx.strokeStyle = theme.waterLight;
  ctx.lineWidth = 4;
  for (let row = 0; row < 3; row += 1) {
    const y = state.waterY + 20 + row * 26;
    const drift = view.reducedMotion ? 0 : (view.time * (20 + row * 8)) % 70;
    for (let x = drift - 70; x < arena.width; x += 70) {
      ctx.beginPath();
      ctx.arc(x, y, 12, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  }

  const size = 96;
  if (state.phase === 'ready') {
    sprites.draw(ctx, view.player, state.x, state.boardY - size * 0.45, size);
    paintLabel(ctx, view, 'Chạm để nhảy!', arena.width / 2, state.waterY + 60, 34, theme.light);
  } else if (state.phase === 'air') {
    // Tucked: round and small; opened: long and thin along the body.
    const squash: readonly [number, number] = state.opened ? [0.72, 1.3] : [0.9, 0.9];
    sprites.draw(ctx, view.player, state.x, state.y - size * 0.3, size, { rotate: state.angle, squash });
  } else {
    const t = state.phaseAgo;
    const clean = state.lastClean;
    const height = (clean ? 70 : 170) * Math.sin(Math.min(1, t / 0.8) * Math.PI);
    ctx.fillStyle = theme.waterLight;
    for (let i = -2; i <= 2; i += 1) {
      const w = clean ? 10 : 22;
      ctx.beginPath();
      ctx.ellipse(state.x + i * (clean ? 14 : 34), state.waterY - height * (1 - Math.abs(i) * 0.2) / 2, w, Math.max(1, height / 2), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    paintLabel(ctx, view, clean ? 'Đẹp quá!' : 'Bẹp!', state.x, state.waterY - 200, 46, clean ? theme.star : theme.light);
    if (clean) sprites.draw(ctx, 'sparkles', state.x + 60, state.waterY - 120, 60);
  }
  // Dives left, as little drops.
  for (let i = 0; i < DIVES; i += 1) {
    sprites.draw(ctx, 'droplet', arena.width - 30 - i * 34, state.waterY + 100, 30, { alpha: i < DIVES - state.dives ? 1 : 0.25 });
  }
}
