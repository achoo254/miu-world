// Snake dragon's picture: the school yard as a soft checkerboard of grass inside a low fence, friends waiting
// on their cells (bobbing, in a glowing ring), the line of friends sliding from cell to cell holding hands (a
// thick ribbon behind them, the child in front facing the way she walks), and friends who let go running off.
import { bob, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import type { DrawView } from '../../types';
import { FRIEND_KINDS, type SnakeState } from './logic';

/** Pictures of the friends (kind 1 … FRIEND_KINDS). */
export const FRIENDS: readonly SpriteRef[] = ['rabbit', 'fox', 'bear', 'panda', 'cat', 'dog-face', 'monkey-face', 'frog'];

const friendPicture = (kind: number): SpriteRef => FRIENDS[(kind - 1 + FRIEND_KINDS) % FRIEND_KINDS] ?? 'rabbit';

export function drawSnakeDragon(ctx: CanvasRenderingContext2D, state: SnakeState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { cell, left, top, cols, rows } = state;
  const centre = (col: number, row: number): [number, number] => [left + (col + 0.5) * cell, top + (row + 0.5) * cell];

  ctx.fillStyle = theme.groundDeep;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.fillStyle = theme.ground;
  roundRect(ctx, left - 10, top - 10, cols * cell + 20, rows * cell + 20, 22);
  ctx.fill();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = theme.ink;
  for (let r = 0; r < rows; r += 1) for (let c = (r % 2); c < cols; c += 2) ctx.fillRect(left + c * cell, top + r * cell, cell, cell);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = theme.wood;
  ctx.lineWidth = 8;
  roundRect(ctx, left - 10, top - 10, cols * cell + 20, rows * cell + 20, 22);
  ctx.stroke();

  for (const f of state.waiting) {
    const [x, y] = centre(f.col, f.row);
    const pop = view.reducedMotion ? 1 : Math.min(1, f.age / 0.25);
    ctx.globalAlpha = 0.35 + (view.reducedMotion ? 0 : 0.15 * Math.sin(view.time * 5 + f.col));
    ctx.fillStyle = theme.star;
    ctx.beginPath();
    ctx.arc(x, y, cell * 0.48 * pop, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    sprites.draw(ctx, friendPicture(f.friend), x, y + bob(view, 5, 4, f.row), cell * 0.85 * pop, { rotate: view.reducedMotion ? 0 : Math.sin(view.time * 6 + f.col) * 0.12 });
  }

  const p = state.progress;
  const points = state.line.map((s) => {
    const [fx, fy] = centre(s.fromCol, s.fromRow);
    const [tx, ty] = centre(s.col, s.row);
    return { x: fx + (tx - fx) * p, y: fy + (ty - fy) * p, friend: s.friend };
  });
  if (points.length > 1) {
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = cell * 0.28;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (const [i, q] of points.entries()) {
      if (i === 0) ctx.moveTo(q.x, q.y);
      else ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();
  }
  for (let i = points.length - 1; i >= 0; i -= 1) {
    const q = points[i];
    if (!q) continue;
    const hop = view.reducedMotion ? 0 : Math.abs(Math.sin((p + i * 0.5) * Math.PI)) * 5;
    if (i === 0) sprites.draw(ctx, view.player, q.x, q.y - hop, cell * 1.05, { flipX: state.dir === 'left' });
    else sprites.draw(ctx, friendPicture(q.friend), q.x, q.y - hop, cell * 0.82);
  }

  for (const r of state.runaways) {
    sprites.draw(ctx, friendPicture(r.friend), r.x, r.y, cell * 0.8, { alpha: Math.max(0, 1 - r.age / 1.2), rotate: view.reducedMotion ? 0 : r.age * 4 });
  }
}
