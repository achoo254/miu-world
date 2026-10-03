// Cotton candy's picture: a fair stall (striped awning) with the spinning bowl; the stick in the middle with
// a pink fluffy candy that grows with every turn and swirls as it is wound; a dashed ring and arrows showing
// where to circle; a speed gauge (green, then red) under the bowl; the finished candies lined up on the
// counter; a flung candy flying off.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { DONE_RADIUS, FLING_SPEED, START_RADIUS, WARN_SPEED, type CottonState } from './logic';

function paintStall(ctx: CanvasRenderingContext2D, view: DrawView): void {
  const { arena, theme } = view;
  ctx.fillStyle = theme.sky[2];
  ctx.fillRect(0, 0, arena.width, arena.height);
  // Awning stripes along the top, scalloped.
  const stripe = 70;
  for (let x = 0, i = 0; x < arena.width; x += stripe, i += 1) {
    ctx.fillStyle = i % 2 === 0 ? theme.danger : theme.light;
    ctx.fillRect(x, 0, stripe, 96);
    ctx.beginPath();
    ctx.arc(x + stripe / 2, 96, stripe / 2, 0, Math.PI);
    ctx.fill();
  }
  // The counter.
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, arena.height - 120, arena.width, 120);
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(0, arena.height - 120, arena.width, 12);
}

/** A fluffy candy: overlapping puffs around (x, y), swirled by `turn`. */
function paintCandy(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, radius: number, turn: number): void {
  const { theme } = view;
  ctx.fillStyle = theme.primary;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  const puffs = 9;
  for (let i = 0; i < puffs; i += 1) {
    const a = turn + (i / puffs) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * radius * 0.78, y + Math.sin(a) * radius * 0.78, radius * 0.38, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = theme.light;
  for (let i = 0; i < 5; i += 1) {
    const a = turn * 1.3 + i * 1.3;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * radius * 0.45, y + Math.sin(a) * radius * 0.45, radius * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function paintStick(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, length: number): void {
  ctx.fillStyle = view.theme.wood;
  ctx.strokeStyle = view.theme.woodEdge;
  ctx.lineWidth = 3;
  roundRect(ctx, x - 7, y - 20, 14, length, 7);
  ctx.fill();
  ctx.stroke();
}

function paintGauge(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, speed: number): void {
  const { theme } = view;
  const w = 260;
  const left = x - w / 2;
  const max = FLING_SPEED * 1.15;
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.3;
  roundRect(ctx, left - 8, y - 18, w + 16, 36, 18);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.leaf;
  roundRect(ctx, left, y - 10, (w * WARN_SPEED) / max, 20, 10);
  ctx.fill();
  ctx.fillStyle = theme.star;
  ctx.fillRect(left + (w * WARN_SPEED) / max, y - 10, (w * (FLING_SPEED - WARN_SPEED)) / max, 20);
  ctx.fillStyle = theme.danger;
  roundRect(ctx, left + (w * FLING_SPEED) / max, y - 10, w - (w * FLING_SPEED) / max, 20, 10);
  ctx.fill();
  const nx = left + Math.min(1, speed / max) * w;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(nx, y - 6);
  ctx.lineTo(nx - 14, y - 32);
  ctx.lineTo(nx + 14, y - 32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

export function drawCottonCandy(ctx: CanvasRenderingContext2D, state: CottonState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintStall(ctx, view);
  const { cx, cy } = state;

  // The bowl, and the ring to circle in.
  ctx.fillStyle = theme.stone;
  ctx.strokeStyle = theme.stoneEdge;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 40, DONE_RADIUS + 70, (DONE_RADIUS + 70) * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const ring = (state.inner + state.outer) / 2;
  ctx.setLineDash([18, 16]);
  ctx.lineDashOffset = view.reducedMotion ? 0 : -view.time * 60;
  ctx.strokeStyle = theme.light;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(ring, DONE_RADIUS + 60), 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  if (state.fellAgo >= 0) {
    // The candy flies off and drops.
    const t = state.fellAgo;
    paintCandy(ctx, view, cx + t * 420, cy - 120 * t + 500 * t * t, DONE_RADIUS * 0.6, t * 8);
    paintLabel(ctx, view, 'Chậm thôi!', cx, cy - DONE_RADIUS - 40, 44, theme.light);
  }
  const fresh = state.doneAgo < 0.6;
  paintStick(ctx, view, cx, cy, 190);
  if (state.fellAgo < 0 && !fresh) paintCandy(ctx, view, cx, cy, state.radius, view.reducedMotion ? 0 : state.wound * 0.5);
  if (state.radius <= START_RADIUS + 4 && state.score === 0 && state.fellAgo < 0) {
    sprites.draw(ctx, 'paw-prints', cx + ring, cy, 56, { alpha: 0.8 });
    paintLabel(ctx, view, '↻', cx + ring, cy - 60, 54, theme.star);
  }
  if (state.speed > WARN_SPEED && state.fellAgo < 0) paintLabel(ctx, view, 'Chậm lại!', cx, cy - DONE_RADIUS - 40, 40, theme.star);

  // Finished candies standing on the counter, from both ends inward; the speed gauge in the middle.
  const shelfY = arena.height - 120;
  const perSide = Math.max(1, Math.floor((arena.width / 2 - 170) / 70));
  for (let i = 0; i < Math.min(state.score, perSide * 2); i += 1) {
    const slot = Math.floor(i / 2);
    const x = i % 2 === 0 ? 50 + slot * 70 : arena.width - 50 - slot * 70;
    paintStick(ctx, view, x, shelfY - 20, 50);
    paintCandy(ctx, view, x, shelfY - 40, 30, i);
  }
  if (fresh) sprites.draw(ctx, 'sparkles', cx, cy - 80, 90, { alpha: 1 - state.doneAgo / 0.6 });
  paintGauge(ctx, view, cx, arena.height - 55, state.speed);
}
