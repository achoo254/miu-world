// Ball sort's picture: a shelf in a cosy library, glass tubes standing on it, balls in four colours each with
// its own white mark (dot, triangle, square, diamond: the colours never have to be told apart by colour
// alone), the lifted ball floating over its tube, a sparkle on a finished tube, the hinted pair pulsing, and
// the round undo button.
import { bob, paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { CAPACITY, hint, type BallSortState } from './logic';

function paintBall(ctx: CanvasRenderingContext2D, view: DrawView, colour: number, x: number, y: number, r: number): void {
  const { theme } = view;
  const fills = [theme.primary, theme.secondary, theme.star, theme.leaf];
  ctx.fillStyle = fills[colour] ?? theme.stone;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Shine.
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.95;
  const m = r * 0.32;
  ctx.beginPath();
  if (colour === 0) ctx.arc(x, y + 2, m, 0, Math.PI * 2);
  else if (colour === 1) {
    ctx.moveTo(x, y - m);
    ctx.lineTo(x + m, y + m * 0.8);
    ctx.lineTo(x - m, y + m * 0.8);
  } else if (colour === 2) ctx.rect(x - m * 0.8, y - m * 0.8, m * 1.6, m * 1.6);
  else {
    ctx.moveTo(x, y - m);
    ctx.lineTo(x + m, y);
    ctx.lineTo(x, y + m);
    ctx.lineTo(x - m, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawBallSort(ctx: CanvasRenderingContext2D, state: BallSortState, view: DrawView): void {
  const { arena, sprites, theme } = view;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.fillStyle = theme.woodEdge;
  for (let y = 60; y < arena.height; y += 170) ctx.fillRect(0, y, arena.width, 14);
  const shelfY = (state.slots[0]?.y ?? 300) + state.tubeHeight / 2;
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, 10, shelfY - 4, arena.width - 20, 26, 8);
  ctx.fill();

  const hinted = hint(state);
  const r = state.ballRadius;
  state.tubes.forEach((tube, i) => {
    const slot = state.slots[i];
    if (!slot) return;
    const shake = state.refused && state.refused[0] === i && state.refused[1] < 0.3 && !view.reducedMotion ? Math.sin(state.refused[1] * 60) * 6 : 0;
    const x = slot.x + shake;
    const top = slot.y - state.tubeHeight / 2;
    const w = state.tubeHalfWidth;
    if (hinted && (hinted[0] === i || hinted[1] === i)) {
      ctx.globalAlpha = 0.35 + 0.3 * Math.sin(view.time * 6);
      ctx.fillStyle = theme.star;
      roundRect(ctx, x - w - 14, top - 14, w * 2 + 28, state.tubeHeight + 28, w);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = theme.light;
    ctx.globalAlpha = 0.45;
    roundRect(ctx, x - w, top, w * 2, state.tubeHeight, w);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = i === state.selected ? theme.star : theme.ink;
    ctx.lineWidth = i === state.selected ? 7 : 4;
    roundRect(ctx, x - w, top, w * 2, state.tubeHeight, w);
    ctx.stroke();
    const bottom = top + state.tubeHeight - 12 - r;
    tube.forEach((colour, k) => {
      const lifted = i === state.selected && k === tube.length - 1;
      const dropping = state.last && state.last[1] === i && k === tube.length - 1 && state.last[2] < 0.15 && !view.reducedMotion;
      const y = lifted ? top - r - 16 + bob(view, 8, 4) : bottom - k * r * 2.1 - (dropping ? (1 - (state.last?.[2] ?? 0) / 0.15) * 60 : 0);
      paintBall(ctx, view, colour, x, y, r);
    });
    if (tube.length === CAPACITY && tube.every((b) => b === tube[0])) sprites.draw(ctx, 'sparkles', x + w, top - 6, 46);
  });

  // Undo.
  const u = state.undo;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  ctx.globalAlpha = state.history.length > 0 ? 1 : 0.5;
  ctx.beginPath();
  ctx.arc(u.x, u.y, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  paintLabel(ctx, view, '↶', u.x, u.y + 2, 54, theme.secondary);
  ctx.globalAlpha = 1;

  if (state.solved >= 0) paintLabel(ctx, view, 'Xong!', arena.width / 2, (state.slots[0]?.y ?? 300) - state.tubeHeight / 2 - 60, 64, theme.star);
}
