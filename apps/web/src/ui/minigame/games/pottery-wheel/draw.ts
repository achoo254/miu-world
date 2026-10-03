// Pottery wheel's picture: a workshop wall with a shelf of finished pots, the potter's wheel (a turning disc),
// the clay spinning (ridges slide round it), the pot to make as a dashed outline on both sides, the finger's
// dot, and a bar for how close the clay is (the 80 % mark in gold). A finished pot is glazed white with blue
// patterns and lifts off to the shelf.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { HUD_SAFE_TOP } from '../../types';
import { MATCH_NEEDED, SLICES, type PotteryState } from './logic';

function potPath(ctx: CanvasRenderingContext2D, profile: readonly number[], x: number, baseY: number, topY: number, scale = 1): void {
  const yOf = (k: number): number => baseY - (k / (SLICES - 1)) * (baseY - topY);
  ctx.beginPath();
  ctx.moveTo(x - (profile[0] ?? 0) * scale, baseY);
  for (let k = 0; k < SLICES; k += 1) ctx.lineTo(x - (profile[k] ?? 0) * scale, yOf(k));
  for (let k = SLICES - 1; k >= 0; k -= 1) ctx.lineTo(x + (profile[k] ?? 0) * scale, yOf(k));
  ctx.closePath();
}

function paintGlaze(ctx: CanvasRenderingContext2D, view: DrawView, x: number, baseY: number, topY: number, width: number): void {
  const { theme } = view;
  ctx.strokeStyle = theme.secondary;
  ctx.lineWidth = 4;
  for (let i = 1; i < 4; i += 1) {
    const y = baseY - ((baseY - topY) * i) / 4;
    ctx.beginPath();
    for (let dx = -width; dx <= width; dx += 12) ctx.lineTo(x + dx, y + Math.sin(dx / 10) * 5);
    ctx.stroke();
  }
}

export function drawPotteryWheel(ctx: CanvasRenderingContext2D, state: PotteryState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.sky[2];
  ctx.fillRect(0, 0, arena.width, arena.height);
  // Wall and shelf.
  ctx.fillStyle = theme.groundDeep;
  ctx.globalAlpha = 0.3;
  for (let y = HUD_SAFE_TOP; y < arena.height; y += 40) ctx.fillRect(0, y, arena.width, 2);
  ctx.globalAlpha = 1;
  const shelfY = HUD_SAFE_TOP + 70;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(16, shelfY, arena.width - 32, 12);
  state.shelf.slice(-8).forEach((profile, i) => {
    const x = 60 + i * 80;
    if (x > arena.width - 40) return;
    ctx.save();
    potPath(ctx, profile, x, shelfY, shelfY - 60, 0.28);
    ctx.fillStyle = theme.light;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = theme.secondary;
    ctx.stroke();
    ctx.restore();
  });

  // The wheel.
  const { axisX, baseY, topY } = state;
  ctx.fillStyle = theme.stoneEdge;
  roundRect(ctx, axisX - 40, baseY + 20, 80, arena.height - baseY, 10);
  ctx.fill();
  ctx.fillStyle = theme.stone;
  ctx.beginPath();
  ctx.ellipse(axisX, baseY + 14, state.maxRadius + 40, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.ink;
  ctx.stroke();
  const spin = view.reducedMotion ? 0 : view.time * 6;
  ctx.strokeStyle = theme.stoneEdge;
  for (let i = 0; i < 6; i += 1) {
    const a = spin + (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(axisX + Math.cos(a) * 30, baseY + 14 + Math.sin(a) * 6);
    ctx.lineTo(axisX + Math.cos(a) * (state.maxRadius + 30), baseY + 14 + Math.sin(a) * 24);
    ctx.stroke();
  }

  // The clay (or the glazed pot rising to the shelf).
  const fired = state.firedAgo >= 0;
  const lift = fired ? Math.max(0, state.firedAgo - 0.6) * 300 : 0;
  ctx.save();
  ctx.translate(0, -lift);
  potPath(ctx, state.profile, axisX, baseY, topY);
  ctx.fillStyle = fired ? theme.light : theme.wood;
  ctx.fill();
  ctx.save();
  ctx.clip();
  if (fired) paintGlaze(ctx, view, axisX, baseY, topY, state.maxRadius + 20);
  else {
    // Ridges sliding round as it spins.
    ctx.strokeStyle = theme.woodEdge;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 3;
    for (let k = 0; k < 9; k += 1) {
      const x = axisX - state.maxRadius + ((k * 37 + view.time * 120) % (state.maxRadius * 2));
      ctx.beginPath();
      ctx.moveTo(x, topY);
      ctx.lineTo(x + 6, baseY);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  potPath(ctx, state.profile, axisX, baseY, topY);
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.ink;
  ctx.stroke();
  ctx.restore();

  if (!fired) {
    // The outline to make.
    ctx.setLineDash([12, 10]);
    ctx.lineWidth = 5;
    ctx.strokeStyle = theme.star;
    potPath(ctx, state.target, axisX, baseY, topY);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (state.finger && !fired) {
    ctx.fillStyle = theme.light;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(state.finger.x, state.finger.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Match bar.
  const barW = Math.min(360, arena.width - 80);
  const barX = arena.width / 2 - barW / 2;
  const barY = shelfY + 34;
  ctx.fillStyle = theme.light;
  roundRect(ctx, barX, barY, barW, 26, 13);
  ctx.fill();
  ctx.fillStyle = state.match >= MATCH_NEEDED ? theme.star : theme.leaf;
  roundRect(ctx, barX, barY, barW * state.match, 26, 13);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = theme.ink;
  roundRect(ctx, barX, barY, barW, 26, 13);
  ctx.stroke();
  ctx.fillStyle = theme.danger;
  ctx.fillRect(barX + barW * MATCH_NEEDED - 2, barY - 6, 4, 38);
  paintLabel(ctx, view, fired ? 'Đẹp quá! Lên kệ thôi' : `Giống mẫu ${Math.round(state.match * 100)}%`, arena.width / 2, barY + 54, 28, fired ? theme.star : theme.light);
  if (fired) sprites.draw(ctx, 'sparkles', axisX + 60, (baseY + topY) / 2 - lift, 90);
}
