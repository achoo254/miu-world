// Lights out's picture: a castle wall at night under the moon, arched windows in a grid, dark blue or warm
// and glowing; a window flickers as it switches, the hint window pulses with a star, a won board lights up
// with sparkles. The round "Làm lại" button sits beside or under the wall.
import { paintLabel, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { LightsState } from './logic';

function paintWindow(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, w: number, h: number, lit: boolean, flicker: number): void {
  const { theme } = view;
  const archR = w / 2;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + archR);
  ctx.arc(x + archR, y + archR, archR, Math.PI, 0);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  if (lit) {
    const glow = ctx.createRadialGradient(x + w / 2, y + h * 0.6, 4, x + w / 2, y + h * 0.6, h);
    glow.addColorStop(0, theme.light);
    glow.addColorStop(0.5, theme.star);
    glow.addColorStop(1, theme.secondary);
    ctx.fillStyle = glow;
  } else {
    ctx.fillStyle = theme.ink;
  }
  ctx.fill();
  if (flicker < 0.25) {
    ctx.globalAlpha = (1 - flicker / 0.25) * 0.6;
    ctx.fillStyle = theme.light;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.lineWidth = 6;
  ctx.strokeStyle = theme.stoneEdge;
  ctx.stroke();
  // Window bars.
  ctx.lineWidth = 4;
  ctx.strokeStyle = lit ? theme.woodEdge : theme.stone;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + 6);
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h * 0.58);
  ctx.lineTo(x + w, y + h * 0.58);
  ctx.stroke();
}

export function drawLightsOut(ctx: CanvasRenderingContext2D, state: LightsState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  // Night sky.
  const sky = ctx.createLinearGradient(0, 0, 0, arena.height);
  sky.addColorStop(0, theme.ink);
  sky.addColorStop(1, theme.secondary);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.fillStyle = theme.light;
  for (let i = 0; i < 24; i += 1) {
    const sx = (i * 197) % arena.width;
    const sy = (i * 83) % Math.max(1, arena.height * 0.5);
    ctx.globalAlpha = 0.4 + 0.4 * Math.sin(view.time * 2 + i);
    ctx.fillRect(sx, sy, 4, 4);
  }
  ctx.globalAlpha = 1;
  sprites.draw(ctx, 'full-moon', 80, HUD_SAFE_TOP + 40, 90);

  // The castle wall with battlements.
  const { left, top, cell, size } = state;
  const wallL = left - 30;
  const wallW = cell * size + 60;
  const wallT = top - 26;
  ctx.fillStyle = theme.stone;
  ctx.fillRect(wallL, wallT, wallW, arena.height - wallT);
  for (let x = wallL; x < wallL + wallW; x += 56) ctx.fillRect(x, wallT - 30, 32, 32);
  ctx.strokeStyle = theme.stoneEdge;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.5;
  for (let y = wallT + 20; y < arena.height; y += 34) {
    const shift = (Math.round((y - wallT) / 34) % 2) * 34;
    ctx.beginPath();
    ctx.moveTo(wallL, y);
    ctx.lineTo(wallL + wallW, y);
    ctx.stroke();
    for (let x = wallL + shift; x < wallL + wallW; x += 68) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 34);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  const pad = cell * 0.14;
  state.lit.forEach((lit, i) => {
    const x = left + (i % size) * cell + pad;
    const y = top + Math.floor(i / size) * cell + pad;
    paintWindow(ctx, view, x, y, cell - pad * 2, cell - pad * 2, lit, state.switched[i] ?? 9);
    if (i === state.hint) {
      const pulse = view.reducedMotion ? 1 : 0.6 + 0.4 * Math.sin(view.time * 6);
      ctx.globalAlpha = pulse;
      ctx.lineWidth = 8;
      ctx.strokeStyle = theme.star;
      roundRect(ctx, x - 8, y - 8, cell - pad * 2 + 16, cell - pad * 2 + 16, 20);
      ctx.stroke();
      ctx.globalAlpha = 1;
      sprites.draw(ctx, 'star', x + cell - pad * 2, y, 40);
    }
  });

  if (state.wonAgo >= 0) {
    const t = state.wonAgo;
    sprites.draw(ctx, 'sparkles', left + (cell * size) / 2, top + (cell * size) / 2 - t * 40, cell * 1.6, { alpha: Math.max(0, 1 - t / 1.3) });
    paintLabel(ctx, view, 'Sáng hết rồi!', left + (cell * size) / 2, top - 60, 44, theme.star);
  } else {
    paintLabel(ctx, view, 'Thắp sáng mọi cửa sổ', left + (cell * size) / 2, top - 60, 32, theme.light);
  }

  // "Làm lại".
  const { redo } = state;
  ctx.fillStyle = theme.light;
  ctx.beginPath();
  ctx.arc(redo.x, redo.y, redo.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = theme.ink;
  ctx.stroke();
  ctx.lineWidth = 7;
  ctx.strokeStyle = theme.primary;
  ctx.beginPath();
  ctx.arc(redo.x, redo.y - 6, redo.r * 0.42, -Math.PI * 0.2, Math.PI * 1.4);
  ctx.stroke();
  ctx.fillStyle = theme.primary;
  ctx.beginPath();
  const ax = redo.x + Math.cos(-Math.PI * 0.2) * redo.r * 0.42;
  const ay = redo.y - 6 + Math.sin(-Math.PI * 0.2) * redo.r * 0.42;
  ctx.moveTo(ax + 12, ay - 2);
  ctx.lineTo(ax - 8, ay - 12);
  ctx.lineTo(ax - 2, ay + 12);
  ctx.closePath();
  ctx.fill();
  paintLabel(ctx, view, 'Làm lại', redo.x, redo.y + redo.r * 0.55, 18);
}
