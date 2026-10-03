// Bottle flip's picture: a room with a floor, the target to land on (a step, a chair or a table) with a glowing
// spot, the bottle (a drawn plastic bottle with a cap and water inside) spinning through the air, and a swipe
// track next to it. A bottle that stands gets sparkles; one that topples lies on its side with a word on why.
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { BottleFlipState } from './logic';
import { BOTTLES } from './logic';

function paintBottle(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, angle: number): void {
  const { theme } = view;
  ctx.save();
  ctx.translate(x, y - 45);
  ctx.rotate(angle);
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.fillStyle = theme.waterLight;
  roundRect(ctx, -20, -30, 40, 75, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.water;
  roundRect(ctx, -18, 10, 36, 33, 10);
  ctx.fill();
  ctx.fillStyle = theme.waterLight;
  roundRect(ctx, -10, -46, 20, 18, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.secondary;
  roundRect(ctx, -11, -54, 22, 10, 3);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawBottleFlip(ctx: CanvasRenderingContext2D, state: BottleFlipState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const floorY = state.start.y;
  paintSky(ctx, view, floorY, 4);
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, floorY, arena.width, arena.height - floorY);
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(0, floorY, arena.width, 6);

  // The perch.
  const { target } = state;
  const w = state.perch === 'table' ? 180 : 130;
  ctx.fillStyle = state.perch === 'step' ? theme.stone : theme.wood;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  if (state.perch === 'step') {
    roundRect(ctx, target.x - w / 2, target.y, w, floorY - target.y, 6);
    ctx.fill();
    ctx.stroke();
  } else {
    roundRect(ctx, target.x - w / 2, target.y, w, 18, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = theme.woodEdge;
    ctx.fillRect(target.x - w / 2 + 10, target.y + 18, 12, floorY - target.y - 18);
    ctx.fillRect(target.x + w / 2 - 22, target.y + 18, 12, floorY - target.y - 18);
    if (state.perch === 'chair') ctx.fillRect(target.x + w / 2 - 22, target.y - 110, 12, 110);
  }
  ctx.globalAlpha = 0.4 + 0.2 * Math.sin(view.time * 5);
  ctx.fillStyle = theme.star;
  ctx.beginPath();
  ctx.ellipse(target.x, target.y - 2, 46, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // The swipe track beside the bottle.
  if (state.phase === 'ready') {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = theme.light;
    roundRect(ctx, state.start.x + 50, Math.max(HUD_SAFE_TOP + 20, floorY - 330), 50, Math.min(330, floorY - HUD_SAFE_TOP - 20), 25);
    ctx.fill();
    ctx.globalAlpha = 1;
    paintLabel(ctx, view, '↑', state.start.x + 75, floorY - 170, 54, theme.primary);
  }
  paintBottle(ctx, view, state.pos.x, state.pos.y, state.angle);
  if (state.phase === 'landed') {
    const r = state.result;
    paintLabel(ctx, view, r === 'stand' ? 'Đứng rồi!' : r === 'short' ? 'Nhẹ quá!' : 'Mạnh quá!', arena.width / 2, HUD_SAFE_TOP + 60, 44, r === 'stand' ? theme.star : theme.light);
    if (r === 'stand') sprites.draw(ctx, 'sparkles', state.pos.x + 40, state.pos.y - 110, 60);
  }
  for (let i = 0; i < BOTTLES; i += 1) {
    ctx.globalAlpha = i < BOTTLES - state.bottles ? 0.9 : 0.2;
    ctx.fillStyle = theme.water;
    roundRect(ctx, 20 + i * 20, floorY + 24, 14, 26, 5);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
