// Nonogram's picture: a sheet of squared paper on a desk, the row numbers on the left and column numbers on top
// (a line's numbers turn green once it is done), coloured squares where the child filled, red crosses on wrong
// squares, and the finished picture growing into its emoji with sparkles and its name.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { SIZE, type NonogramState } from './logic';

export function drawNonogram(ctx: CanvasRenderingContext2D, state: NonogramState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 0, arena.width, arena.height);
  const { left, top, cell } = state;
  const board = cell * SIZE;
  ctx.fillStyle = theme.light;
  roundRect(ctx, left - 120, top - 120, board + 140, board + 140, 18);
  ctx.fill();

  const lineDone = (cells: number[]): boolean => cells.every((i) => state.filled[i] === state.solution[i]);
  for (let r = 0; r < SIZE; r += 1) {
    const done = lineDone(Array.from({ length: SIZE }, (_, c) => r * SIZE + c));
    const text = (state.rowClues[r] ?? []).join(' ');
    paintLabel(ctx, view, text, left - 55, top + (r + 0.5) * cell, Math.min(34, cell * 0.42), done ? theme.leaf : theme.primary);
  }
  for (let c = 0; c < SIZE; c += 1) {
    const done = lineDone(Array.from({ length: SIZE }, (_, r) => r * SIZE + c));
    (state.colClues[c] ?? []).forEach((n, k, all) => {
      paintLabel(ctx, view, String(n), left + (c + 0.5) * cell, top - 22 - (all.length - 1 - k) * 32, Math.min(32, cell * 0.4), done ? theme.leaf : theme.primary);
    });
  }

  const solved = state.solvedAgo >= 0 ? Math.min(1, state.solvedAgo / 0.6) : 0;
  for (let i = 0; i < SIZE * SIZE; i += 1) {
    const x = left + (i % SIZE) * cell;
    const y = top + Math.floor(i / SIZE) * cell;
    ctx.strokeStyle = theme.stoneEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, cell, cell);
    if (state.filled[i]) {
      ctx.fillStyle = theme.secondary;
      ctx.globalAlpha = 1 - solved * 0.7;
      roundRect(ctx, x + 4, y + 4, cell - 8, cell - 8, 8);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (state.crossed[i]) {
      ctx.strokeStyle = theme.danger;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x + cell * 0.25, y + cell * 0.25);
      ctx.lineTo(x + cell * 0.75, y + cell * 0.75);
      ctx.moveTo(x + cell * 0.75, y + cell * 0.25);
      ctx.lineTo(x + cell * 0.25, y + cell * 0.75);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.strokeRect(left, top, board, board);

  if (solved > 0) {
    sprites.draw(ctx, state.picture.sprite, left + board / 2, top + board / 2, board * 0.8 * solved);
    sprites.draw(ctx, 'sparkles', left + board * 0.85, top + board * 0.15, 60);
    paintLabel(ctx, view, state.picture.name, left + board / 2, Math.min(arena.height - 24, top + board + 24), 32, theme.star);
  } else if (state.rest > 0) {
    paintLabel(ctx, view, 'Ô này không có trong tranh', left + board / 2, Math.min(arena.height - 24, top + board + 24), 26, theme.light);
  }
}
