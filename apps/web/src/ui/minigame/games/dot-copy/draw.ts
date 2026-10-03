// Dot copy's picture: a page of a vở ô li (fine squares, bolder lines, the red margin), the sample picture on
// a little card, the big grid of dots with the lines drawn so far, a wrong line fading in red, the line being
// pulled from the current dot to the finger, and a star when the copy is finished.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView, Point } from '../../types';
import { DOTS, type DotCopyState } from './logic';

function paintPage(ctx: CanvasRenderingContext2D, view: DrawView): void {
  const { arena, theme } = view;
  ctx.fillStyle = theme.light;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.strokeStyle = theme.secondary;
  for (let y = 0; y < arena.height; y += 16) {
    ctx.globalAlpha = y % 64 === 0 ? 0.35 : 0.1;
    ctx.lineWidth = y % 64 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(arena.width, y);
    ctx.stroke();
  }
  for (let x = 0; x < arena.width; x += 64) {
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, arena.height);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(48, 0);
  ctx.lineTo(48, arena.height);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function line(ctx: CanvasRenderingContext2D, key: string, at: (i: number) => Point): void {
  const [a, b] = key.split('-').map(Number);
  const p = at(a ?? 0);
  const q = at(b ?? 0);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(q.x, q.y);
  ctx.stroke();
}

export function drawDotCopy(ctx: CanvasRenderingContext2D, state: DotCopyState, view: DrawView): void {
  const { theme, sprites } = view;
  paintPage(ctx, view);

  // The sample card.
  const s = state.sampleSpacing;
  ctx.fillStyle = theme.star;
  ctx.globalAlpha = 0.25;
  roundRect(ctx, state.sampleX - 30, state.sampleY - 30, s * 3 + 60, s * 3 + 60, 18);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, state.sampleX - 30, state.sampleY - 30, s * 3 + 60, s * 3 + 60, 18);
  ctx.stroke();
  paintLabel(ctx, view, 'Mẫu', state.sampleX + s * 1.5, state.sampleY - 52, 30, theme.star);
  const sampleAt = (i: number): Point => ({ x: state.sampleX + (i % DOTS) * s, y: state.sampleY + Math.floor(i / DOTS) * s });
  ctx.strokeStyle = theme.secondary;
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  for (const key of state.picture) line(ctx, key, sampleAt);
  ctx.fillStyle = theme.ink;
  for (let i = 0; i < DOTS * DOTS; i += 1) {
    ctx.beginPath();
    ctx.arc(sampleAt(i).x, sampleAt(i).y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // The big grid.
  const at = (i: number): Point => ({ x: state.gridX + (i % DOTS) * state.spacing, y: state.gridY + Math.floor(i / DOTS) * state.spacing });
  const done = state.doneAgo >= 0;
  ctx.strokeStyle = done ? theme.star : theme.primary;
  ctx.lineWidth = 16;
  for (const key of state.drawn) line(ctx, key, at);
  ctx.strokeStyle = theme.danger;
  for (const w of state.wrong) {
    ctx.globalAlpha = 1 - w.age / 0.7;
    line(ctx, w.key, at);
  }
  ctx.globalAlpha = 1;
  if (state.current !== null && state.pen) {
    const from = at(state.current);
    ctx.strokeStyle = theme.primary;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 10;
    ctx.setLineDash([14, 12]);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(state.pen.x, state.pen.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  for (let i = 0; i < DOTS * DOTS; i += 1) {
    const p = at(i);
    const active = i === state.current;
    ctx.fillStyle = active ? theme.primary : theme.ink;
    ctx.beginPath();
    ctx.arc(p.x, p.y, active ? 20 : 13, 0, Math.PI * 2);
    ctx.fill();
  }
  if (done) {
    const t = Math.min(1, state.doneAgo / 0.4);
    sprites.draw(ctx, 'glowing-star', state.gridX + state.spacing * 1.5, state.gridY + state.spacing * 1.5, 140 * t);
    paintLabel(ctx, view, 'Giống rồi!', state.gridX + state.spacing * 1.5, state.gridY - 40, 44, theme.star);
  }
}
