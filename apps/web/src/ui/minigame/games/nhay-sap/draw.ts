// Nhảy sạp's picture: a festival floor under paper lanterns, two long bamboo poles lying across it (drawn in
// depth: a far one and a near one) that clack together and swing apart, a friend kneeling at each end, the
// child hopping between the poles and back, four beat lights (red for the clacks, green for "in"), the
// streak, and the word for each step.
import { bob, paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { HUD_SAFE_TOP } from '../../types';
import { gapAt, OPEN, type NhaySapState } from './logic';

function paintPole(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, half: number): void {
  const { theme } = view;
  ctx.fillStyle = theme.leaf;
  roundRect(ctx, x - half, y - 11, half * 2, 22, 11);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = theme.ink;
  ctx.stroke();
  // Bamboo joints.
  ctx.strokeStyle = theme.woodEdge;
  for (let k = -half + 60; k < half; k += 90) {
    ctx.beginPath();
    ctx.moveTo(x + k, y - 10);
    ctx.lineTo(x + k, y + 10);
    ctx.stroke();
  }
}

export function drawNhaySap(ctx: CanvasRenderingContext2D, state: NhaySapState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { poles } = state;
  // Evening sky, lanterns, the floor.
  const sky = ctx.createLinearGradient(0, 0, 0, arena.height);
  sky.addColorStop(0, theme.secondary);
  sky.addColorStop(1, theme.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, arena.width, arena.height);
  const floorY = poles.y - poles.gap - 60;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, floorY, arena.width, arena.height - floorY);
  ctx.strokeStyle = theme.woodEdge;
  ctx.globalAlpha = 0.4;
  for (let y = floorY + 30; y < arena.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(arena.width, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, HUD_SAFE_TOP + 10);
  ctx.quadraticCurveTo(arena.width / 2, HUD_SAFE_TOP + 50, arena.width, HUD_SAFE_TOP + 10);
  ctx.stroke();
  for (let i = 0; i < 7; i += 1) {
    const x = ((i + 0.5) / 7) * arena.width;
    const t = (x / arena.width - 0.5) * 2;
    sprites.draw(ctx, 'red-paper-lantern', x, HUD_SAFE_TOP + 40 - t * t * 30 + bob(view, 2, 3, i), 56);
  }

  const b = ((state.beat % 4) + 4) % 4;
  const open = state.beat < 0 ? 0.5 : gapAt(b);
  const half = (poles.gap / 2) * open;
  const farY = poles.y - half;
  const nearY = poles.y + half;
  // Friends kneeling at both ends.
  sprites.draw(ctx, 'rabbit', poles.x - poles.half - 50, poles.y + 10, 90);
  sprites.draw(ctx, 'fox', poles.x + poles.half + 50, poles.y + 10, 90, { flipX: true });
  paintPole(ctx, view, poles.x, farY, poles.half);

  // The dancer: between the poles or in front of them, hopping between.
  const inY = poles.y;
  const outY = state.outAt.y;
  const t = Math.min(1, state.hopAgo / 0.2);
  const fromY = state.inside ? outY : inY;
  const toY = state.inside ? inY : outY;
  const y = fromY + (toY - fromY) * t - (view.reducedMotion ? 0 : Math.sin(t * Math.PI) * 50);
  const stumbling = state.stumble > 0;
  if (state.inside) {
    sprites.draw(ctx, view.player, poles.x, y - 50, 110, { rotate: stumbling ? 0.4 : 0 });
    paintPole(ctx, view, poles.x, nearY, poles.half);
  } else {
    paintPole(ctx, view, poles.x, nearY, poles.half);
    sprites.draw(ctx, view.player, poles.x, y - 50, 110, { rotate: stumbling ? -0.5 : 0 });
  }

  // Beat lights.
  const lightsY = arena.height - 70;
  for (let k = 0; k < 4; k += 1) {
    const lit = state.beat >= 0 && Math.floor(b) === k;
    const x = arena.width / 2 + (k - 1.5) * 64;
    ctx.fillStyle = k < OPEN ? theme.danger : theme.leaf;
    ctx.globalAlpha = lit ? 1 : 0.35;
    ctx.beginPath();
    ctx.arc(x, lightsY, lit ? 22 : 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 3;
    ctx.strokeStyle = theme.ink;
    ctx.stroke();
  }
  ['cạch', 'cạch', 'vào', 'ra'].forEach((word, k) => paintLabel(ctx, view, word, arena.width / 2 + (k - 1.5) * 64, lightsY + 40, 22, k < OPEN ? theme.light : theme.star));

  if (state.said && state.time - state.said.at < 0.6) paintLabel(ctx, view, state.said.text, poles.x, farY - 120, 46, state.said.good ? theme.star : theme.light);
  if (state.streak >= 2) paintLabel(ctx, view, `Chuỗi ${state.streak}`, arena.width - 110, HUD_SAFE_TOP + 30, 30, theme.star);
  if (state.beat < 0) paintLabel(ctx, view, 'Chạm để nhảy vào, nhảy ra', arena.width / 2, farY - 120, 34);
}
