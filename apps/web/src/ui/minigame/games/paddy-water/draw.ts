// Paddy water's picture: a green hillside with four terraces stepping down, the stream along the left with a
// wooden sluice gate per terrace (raised and splashing when open), water in each terrace rising as a blue band
// with the "enough" line marked, rice seedlings that turn tall and green when a terrace is done.
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { PaddyWaterState } from './logic';
import { HIGH, LOW } from './logic';

export function drawPaddyWater(ctx: CanvasRenderingContext2D, state: PaddyWaterState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, arena.height, 5);
  // The stream.
  ctx.fillStyle = theme.water;
  ctx.fillRect(30, 0, 64, arena.height);
  ctx.fillStyle = theme.waterLight;
  for (let y = (view.time * 80) % 60; y < arena.height; y += 60) ctx.fillRect(48, y, 6, 24);
  for (const t of state.terraces) {
    // Earth bank, then water up to its level, the line, the rice.
    ctx.fillStyle = theme.groundDeep;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4;
    roundRect(ctx, t.x, t.y, t.w, t.h, 14);
    ctx.fill();
    ctx.stroke();
    const waterH = (t.h - 10) * Math.min(1, t.level);
    ctx.fillStyle = t.level > HIGH ? theme.secondary : theme.water;
    roundRect(ctx, t.x + 5, t.y + t.h - 5 - waterH, t.w - 10, waterH, 10);
    ctx.fill();
    const lineY = (v: number): number => t.y + t.h - 5 - (t.h - 10) * v;
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = theme.star;
    ctx.fillRect(t.x + 5, lineY(HIGH), t.w - 10, lineY(LOW) - lineY(HIGH));
    ctx.globalAlpha = 1;
    ctx.strokeStyle = theme.star;
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.moveTo(t.x + 5, lineY((LOW + HIGH) / 2));
    ctx.lineTo(t.x + t.w - 5, lineY((LOW + HIGH) / 2));
    ctx.stroke();
    ctx.setLineDash([]);
    const grow = t.done ? Math.min(1, (state.time - t.doneAt) / 0.5) : 0;
    for (let x = t.x + 40; x < t.x + t.w - 20; x += 54) {
      sprites.draw(ctx, t.done ? 'sheaf-of-rice' : 'seedling', x, t.y + t.h * 0.45, (t.done ? 30 + 20 * grow : 26) * Math.min(1, t.h / 80), { alpha: 0.95 });
    }
    // The gate.
    ctx.fillStyle = t.open ? theme.leaf : theme.wood;
    roundRect(ctx, t.gate.x - 26, t.gate.y - (t.open ? 40 : 24), 52, 48, 10);
    ctx.fill();
    ctx.strokeStyle = theme.ink;
    ctx.stroke();
    if (t.open) sprites.draw(ctx, 'droplet', t.gate.x + 36, t.gate.y + 8 + ((view.time * 40) % 16), 26);
    if (t.done) sprites.draw(ctx, 'sparkles', t.x + t.w - 30, t.y + 14, 36, { alpha: Math.max(0, 1 - (state.time - t.doneAt) / 1) });
  }
  if (state.nextIn > 0) paintLabel(ctx, view, 'Đủ nước cả sườn đồi!', arena.width / 2, arena.height / 2, 40, theme.star);
}
