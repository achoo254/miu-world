// Balance scale's picture: a market stall, a big brass-coloured scale (pillar, beam tilting to the heavier
// side, two pans on chains), the load on the left pan with its weight in a round tag, fruits with their own
// tags on the right pan and on the shelf below, the sum of the right pan beside it, and a "level!" flash.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { panSpot, pans, panWeight, type BalanceState } from './logic';

function tag(ctx: CanvasRenderingContext2D, view: DrawView, text: string, x: number, y: number, size = 30): void {
  ctx.fillStyle = view.theme.light;
  ctx.strokeStyle = view.theme.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, size * 0.75, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  paintLabel(ctx, view, text, x, y + 1, size, view.theme.secondary);
}

function pan(ctx: CanvasRenderingContext2D, view: DrawView, hookX: number, hookY: number, at: { x: number; y: number }): void {
  const { theme } = view;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(hookX, hookY);
  ctx.lineTo(at.x - 90, at.y);
  ctx.moveTo(hookX, hookY);
  ctx.lineTo(at.x + 90, at.y);
  ctx.stroke();
  ctx.fillStyle = theme.star;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(at.x, at.y, 100, 20, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

export function drawBalanceScale(ctx: CanvasRenderingContext2D, state: BalanceState, view: DrawView): void {
  const { arena, sprites, theme } = view;
  const gradient = ctx.createLinearGradient(0, 0, 0, arena.height);
  gradient.addColorStop(0, theme.sky[0]);
  gradient.addColorStop(1, theme.sky[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, arena.width, arena.height);
  // Stall awning stripes.
  for (let x = 0, i = 0; x < arena.width; x += 70, i += 1) {
    ctx.fillStyle = i % 2 === 0 ? theme.primary : theme.light;
    ctx.fillRect(x, 0, 70, 96);
  }
  // Counter and shelf.
  const shelfY = state.fruits[0]?.home.y ?? arena.height - 90;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, shelfY + 30, arena.width, arena.height - shelfY - 30);
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(0, shelfY + 30, arena.width, 10);

  // The scale.
  const { left, right } = pans(state);
  const { pivotX: px, pivotY: py } = state;
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, px - 14, py, 28, Math.max(60, shelfY - py - 120), 8);
  ctx.fill();
  roundRect(ctx, px - 70, py + Math.max(60, shelfY - py - 120) - 10, 140, 24, 10);
  ctx.fill();
  const ends = { lx: px - Math.cos(state.tilt) * state.arm, ly: py - Math.sin(state.tilt) * state.arm, rx: px + Math.cos(state.tilt) * state.arm, ry: py + Math.sin(state.tilt) * state.arm };
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ends.lx, ends.ly);
  ctx.lineTo(ends.rx, ends.ry);
  ctx.stroke();
  ctx.strokeStyle = theme.star;
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.fillStyle = theme.star;
  ctx.beginPath();
  ctx.arc(px, py, 16, 0, Math.PI * 2);
  ctx.fill();

  pan(ctx, view, ends.lx, ends.ly, left);
  pan(ctx, view, ends.rx, ends.ry, right);
  sprites.draw(ctx, state.loadSprite, left.x, left.y - 50, 104);
  tag(ctx, view, String(state.load), left.x + 62, left.y - 88, 34);

  state.fruits.forEach((f, i) => {
    if (f.onPan) {
      const at = panSpot(state, i, right);
      sprites.draw(ctx, f.sprite, at.x, at.y, 64);
      tag(ctx, view, String(f.weight), at.x + 20, at.y - 30, 22);
      return;
    }
    const at = f.dragAt ?? f.home;
    if (!f.dragAt) {
      ctx.fillStyle = theme.light;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(at.x, at.y, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    sprites.draw(ctx, f.sprite, at.x, at.y, f.dragAt ? 92 : 80);
    tag(ctx, view, String(f.weight), at.x + 32, at.y - 34, 26);
  });
  // The right pan's total.
  tag(ctx, view, String(panWeight(state)), right.x, right.y + 46, 28);

  if (state.balanced >= 0) {
    paintLabel(ctx, view, 'Thăng bằng!', px, py - 40, 52, theme.star);
    sprites.draw(ctx, 'sparkles', px + 150, py - 50, 60);
  }
}
