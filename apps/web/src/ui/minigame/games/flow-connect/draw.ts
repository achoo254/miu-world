// Flow connect's picture: a tiled board under the sky, each pair of dots a coloured disc with its own
// picture (so colour is never the only clue), pipes drawn as thick rounded lines in the pair's colour, a
// joined pair's squares tinted, empty squares pulsing when every pair is joined but the board is not full,
// and a "Xong bàn!" when it is.
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { SpriteName } from '../../sprites';
import type { DrawView } from '../../types';
import { cellCentre, complete, type FlowState } from './logic';

const PICTURES: readonly SpriteName[] = ['heart', 'star', 'clover', 'droplet', 'tulip'];

const colourOf = (view: DrawView, colour: number): string => {
  const { theme } = view;
  return [theme.danger, theme.star, theme.leaf, theme.secondary, theme.primary][colour] ?? theme.primary;
};

export function drawFlowConnect(ctx: CanvasRenderingContext2D, state: FlowState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, arena.height, 4);
  const { size, cellPx, left, top } = state;
  const board = size * cellPx;
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.8;
  roundRect(ctx, left - 12, top - 12, board + 24, board + 24, 20);
  ctx.fill();
  ctx.globalAlpha = 1;
  const filled = new Set(state.paths.flat());
  for (let cell = 0; cell < size * size; cell += 1) {
    const x = left + (cell % size) * cellPx;
    const y = top + Math.floor(cell / size) * cellPx;
    ctx.fillStyle = theme.stone;
    ctx.globalAlpha = 0.35;
    if (state.gaps && !filled.has(cell)) ctx.globalAlpha = 0.35 + 0.35 * Math.abs(Math.sin(view.time * 5));
    roundRect(ctx, x + 3, y + 3, cellPx - 6, cellPx - 6, 10);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Tint behind a joined pair's squares.
  state.paths.forEach((path, colour) => {
    if (!complete(state, colour)) return;
    ctx.fillStyle = colourOf(view, colour);
    ctx.globalAlpha = 0.25;
    for (const cell of path) {
      const p = cellCentre(state, cell);
      roundRect(ctx, p.x - cellPx / 2 + 3, p.y - cellPx / 2 + 3, cellPx - 6, cellPx - 6, 10);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
  // Pipes.
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  state.paths.forEach((path, colour) => {
    if (path.length < 1) return;
    ctx.strokeStyle = colourOf(view, colour);
    ctx.lineWidth = cellPx * 0.36;
    ctx.beginPath();
    path.forEach((cell, i) => {
      const p = cellCentre(state, cell);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    if (path.length === 1) {
      const p = cellCentre(state, path[0] ?? 0);
      ctx.lineTo(p.x + 0.1, p.y);
    }
    ctx.stroke();
  });
  ctx.lineCap = 'butt';
  // Dots.
  state.dots.forEach((pair, colour) => {
    for (const cell of pair) {
      const p = cellCentre(state, cell);
      ctx.fillStyle = colourOf(view, colour);
      ctx.strokeStyle = theme.light;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, cellPx * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      sprites.draw(ctx, PICTURES[colour] ?? 'star', p.x, p.y, cellPx * 0.42);
    }
  });
  if (state.gaps) paintLabel(ctx, view, 'Tô kín các ô trống nhé!', arena.width / 2, top - 30, 30, theme.light);
  if (state.solvedAgo >= 0) paintLabel(ctx, view, 'Xong bàn!', arena.width / 2, top + board / 2, 64, theme.star);
}
