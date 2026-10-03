// Fire hose's picture: a street with a house front of windows, fires in some windows (bigger as they grow,
// with smoke over the biggest and a red glow when the bell rang), steam puffs where a fire went out, the fire
// engine and the firefighter at the bottom with the hose, and the arcing stream of drops.
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { FireHoseState } from './logic';

export function drawFireHose(ctx: CanvasRenderingContext2D, state: FireHoseState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, state.groundY, 8);
  // The house front.
  const first = state.windows[0];
  const last = state.windows[state.windows.length - 1];
  if (first && last) {
    const l = first.x - 40;
    const r = last.x + last.w + 40;
    const t = first.y - 50;
    ctx.fillStyle = theme.danger;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(l - 10, t + 10, r - l + 20, state.groundY - t);
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.stone;
    roundRect(ctx, l, t, r - l, state.groundY - t + 10, 12);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = theme.stoneEdge;
    ctx.stroke();
    // Roof.
    ctx.fillStyle = theme.danger;
    ctx.beginPath();
    ctx.moveTo(l - 26, t);
    ctx.lineTo((l + r) / 2, t - 46);
    ctx.lineTo(r + 26, t);
    ctx.closePath();
    ctx.fill();
  }
  for (const w of state.windows) {
    ctx.fillStyle = w.fire > 0 ? theme.star : theme.sky[1];
    roundRect(ctx, w.x, w.y, w.w, w.h, 8);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = theme.woodEdge;
    ctx.stroke();
    if (w.fire > 0) {
      const flicker = view.reducedMotion ? 0 : Math.sin(view.time * 14 + w.x) * 0.05;
      if (w.rang) {
        ctx.globalAlpha = 0.35 + 0.2 * Math.sin(view.time * 8);
        ctx.fillStyle = theme.danger;
        roundRect(ctx, w.x - 8, w.y - 8, w.w + 16, w.h + 16, 12);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      sprites.draw(ctx, 'fire', w.x + w.w / 2, w.y + w.h * 0.62 - w.fire * 16, (40 + w.fire * 90) * (1 + flicker));
      if (w.fire > 0.7) {
        ctx.fillStyle = theme.stoneEdge;
        for (let k = 0; k < 3; k += 1) {
          const a = (view.time * 0.8 + k / 3) % 1;
          ctx.globalAlpha = 0.5 * (1 - a);
          ctx.beginPath();
          ctx.arc(w.x + w.w / 2 + Math.sin(a * 6 + k) * 10, w.y - a * 70, 14 + a * 16, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
    if (w.outAgo < 1) {
      ctx.fillStyle = theme.light;
      ctx.globalAlpha = 1 - w.outAgo;
      ctx.beginPath();
      ctx.arc(w.x + w.w / 2, w.y + w.h / 2 - w.outAgo * 50, 20 + w.outAgo * 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  // Street.
  ctx.fillStyle = theme.stoneEdge;
  ctx.fillRect(0, state.groundY, arena.width, arena.height - state.groundY);
  ctx.fillStyle = theme.light;
  for (let x = 20; x < arena.width; x += 90) ctx.fillRect(x, state.groundY + 90, 50, 8);
  sprites.draw(ctx, 'fire-engine', 110, state.groundY + 60, 150);
  // Hose from the engine to the nozzle.
  const { nozzle } = state;
  ctx.strokeStyle = theme.danger;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(170, state.groundY + 70);
  ctx.quadraticCurveTo((170 + nozzle.x) / 2, state.groundY + 120, nozzle.x - 20, nozzle.y + 20);
  ctx.stroke();
  sprites.draw(ctx, 'firefighter', nozzle.x - 40, nozzle.y + 20, 100);

  // The stream.
  ctx.fillStyle = theme.waterLight;
  for (const d of state.drops) {
    ctx.beginPath();
    ctx.arc(d.x, d.y, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  if (state.aim) {
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(state.aim.x, state.aim.y, 24, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (state.time < 3 && !state.aim) paintLabel(ctx, view, 'Giữ ngón tay lên đám lửa để phun nước', arena.width / 2, state.groundY - 20, Math.min(30, arena.width / 24));
}
