// Knight hop's picture: a castle hall, a chequered stone floor of 5 × 5 squares, golden stars twinkling on some
// squares, glowing hoof-print rings on the squares the horse can reach, the horse arcing through the air on a
// hop, a shake and a faint L drawn from the horse when a square is out of reach, and sparkles on a cleared floor.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { knightMoves, SIZE, type KnightState } from './logic';

export function drawKnightHop(ctx: CanvasRenderingContext2D, state: KnightState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  // Castle wall with banners.
  ctx.fillStyle = theme.stone;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.strokeStyle = theme.stoneEdge;
  ctx.lineWidth = 3;
  for (let y = 0; y < arena.height; y += 44) {
    const shift = (Math.round(y / 44) % 2) * 50;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(arena.width, y);
    ctx.stroke();
    for (let x = shift; x < arena.width; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 44);
      ctx.stroke();
    }
  }
  const { left, top, cell } = state;
  const board = cell * SIZE;
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, left - 14, top - 14, board + 28, board + 28, 16);
  ctx.fill();
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      ctx.fillStyle = (r + c) % 2 === 0 ? theme.light : theme.stoneEdge;
      ctx.fillRect(left + c * cell, top + r * cell, cell, cell);
    }
  }
  const centre = (i: number) => ({ x: left + ((i % SIZE) + 0.5) * cell, y: top + (Math.floor(i / SIZE) + 0.5) * cell });

  // Squares the horse can reach.
  if (state.clearedAgo < 0) {
    for (const m of knightMoves(state.at.col, state.at.row)) {
      const p = centre(m.row * SIZE + m.col);
      ctx.fillStyle = theme.leaf;
      ctx.globalAlpha = 0.35 + 0.15 * Math.sin(view.time * 4);
      ctx.beginPath();
      ctx.arc(p.x, p.y, cell * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  for (const s of state.stars) {
    const p = centre(s);
    sprites.draw(ctx, 'star', p.x, p.y, cell * 0.66, { rotate: view.reducedMotion ? 0 : Math.sin(view.time * 2 + s) * 0.15 });
  }
  if (state.pickedAgo < 0.8) {
    const p = centre(state.picked);
    sprites.draw(ctx, 'sparkles', p.x, p.y - state.pickedAgo * 60, cell * 0.7, { alpha: 1 - state.pickedAgo / 0.8 });
  }
  // A square out of reach: a red flash.
  if (state.wrongAgo < 0.6 && state.wrongAt >= 0) {
    const p = centre(state.wrongAt);
    ctx.globalAlpha = 1 - state.wrongAgo / 0.6;
    ctx.strokeStyle = theme.danger;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(p.x - cell * 0.25, p.y - cell * 0.25);
    ctx.lineTo(p.x + cell * 0.25, p.y + cell * 0.25);
    ctx.moveTo(p.x + cell * 0.25, p.y - cell * 0.25);
    ctx.lineTo(p.x - cell * 0.25, p.y + cell * 0.25);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // The horse, arcing on a hop.
  const t = Math.min(1, state.hopAgo / 0.28);
  const a = centre(state.from.row * SIZE + state.from.col);
  const b = centre(state.at.row * SIZE + state.at.col);
  const x = a.x + (b.x - a.x) * t;
  const y = a.y + (b.y - a.y) * t - (view.reducedMotion ? 0 : Math.sin(t * Math.PI) * cell * 0.6);
  const shake = state.wrongAgo < 0.3 && !view.reducedMotion ? Math.sin(state.wrongAgo * 60) * 6 : 0;
  sprites.draw(ctx, 'horse', x + shake, y, cell * 0.92, { flipX: b.x < a.x });

  if (state.clearedAgo >= 0) {
    paintLabel(ctx, view, 'Nhặt hết sao rồi!', arena.width / 2, top + board / 2, 40, theme.star);
  } else if (state.wrongAgo < 1) {
    paintLabel(ctx, view, 'Mã đi hình chữ L', arena.width / 2, top + board + 30, 28, theme.light);
  }
}
