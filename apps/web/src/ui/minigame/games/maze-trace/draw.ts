// Maze trace's picture: a sunny garden with a sandy path through a hedge maze (leafy hedges with a darker
// edge and round bushes at the corners), stars bobbing in the dead ends, home glowing at the far end, and the
// child walking along (bouncing a little while she walks, facing her way).
import { bob, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { DOWN, RIGHT, type MazeState } from './logic';

function paintHedges(ctx: CanvasRenderingContext2D, view: DrawView, state: MazeState): void {
  const { theme } = view;
  const { cols, rows, cell, left, top } = state;
  const segments: [number, number, number, number][] = [];
  // Outer border, then every closed right and bottom side.
  segments.push([left, top, left + cols * cell, top], [left, top, left, top + rows * cell], [left + cols * cell, top, left + cols * cell, top + rows * cell], [left, top + rows * cell, left + cols * cell, top + rows * cell]);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const open = state.open[row * cols + col] ?? 0;
      const x = left + col * cell;
      const y = top + row * cell;
      if (col < cols - 1 && !(open & RIGHT)) segments.push([x + cell, y, x + cell, y + cell]);
      if (row < rows - 1 && !(open & DOWN)) segments.push([x, y + cell, x + cell, y + cell]);
    }
  }
  const width = Math.max(12, cell * 0.2);
  for (const [w, colour] of [
    [width + 6, theme.ink],
    [width, theme.leaf],
  ] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.globalAlpha = colour === theme.ink ? 0.35 : 1;
    ctx.beginPath();
    for (const [x1, y1, x2, y2] of segments) {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Round bushes on every corner post.
  ctx.fillStyle = theme.leaf;
  for (let row = 0; row <= rows; row += 1) {
    for (let col = 0; col <= cols; col += 1) {
      ctx.beginPath();
      ctx.arc(left + col * cell, top + row * cell, width * 0.75, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.lineCap = 'butt';
}

export function drawMazeTrace(ctx: CanvasRenderingContext2D, state: MazeState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { cell, left, top, cols, rows } = state;
  paintSky(ctx, view, top, 6);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, top - 30, arena.width, arena.height - top + 30);
  // The path floor.
  ctx.fillStyle = theme.groundDeep;
  ctx.globalAlpha = 0.35;
  roundRect(ctx, left, top, cols * cell, rows * cell, 8);
  ctx.fill();
  ctx.globalAlpha = 1;

  const cx = (col: number): number => left + (col + 0.5) * cell;
  const cy = (row: number): number => top + (row + 0.5) * cell;
  const hx = cx(state.home.col);
  const hy = cy(state.home.row);
  ctx.globalAlpha = 0.4 + (view.reducedMotion ? 0 : 0.2 * Math.sin(view.time * 4));
  ctx.fillStyle = theme.star;
  ctx.beginPath();
  ctx.arc(hx, hy, cell * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  paintHedges(ctx, view, state);
  sprites.draw(ctx, 'house', hx, hy - 4, cell * 0.78);

  for (const star of state.stars) {
    const x = cx(star.col);
    const y = cy(star.row);
    if (star.taken >= 0) {
      if (star.taken < 0.6) sprites.draw(ctx, 'star', x, y - star.taken * 90, cell * 0.6 * (1 + star.taken), { alpha: 1 - star.taken / 0.6 });
      continue;
    }
    sprites.draw(ctx, 'star', x, y + bob(view, 4, 4, x * 0.03), cell * 0.62, { rotate: view.reducedMotion ? 0 : Math.sin(view.time * 3 + y) * 0.15 });
  }

  // The child.
  const x = left + (state.px + 0.5) * cell;
  const y = top + (state.py + 0.5) * cell;
  const step = state.walking && !view.reducedMotion ? Math.abs(Math.sin(view.time * 14)) * 6 : 0;
  const shrink = state.arrived >= 0 ? Math.max(0, 1 - state.arrived / 0.5) : 1;
  if (shrink > 0) {
    paintShadow(ctx, view, x, y + cell * 0.3, cell * 0.55);
    sprites.draw(ctx, view.player, x, y - step - 4, cell * 0.78 * shrink, { flipX: state.dir.dc < 0 });
  }
  if (state.arrived >= 0) {
    sprites.draw(ctx, 'sparkles', hx + cell * 0.4, hy - cell * 0.4 - state.arrived * 30, cell * 0.6, { alpha: Math.max(0, 1 - state.arrived) });
    paintLabel(ctx, view, 'Về tới nhà!', arena.width / 2, Math.max(HUD_SAFE_TOP + 10, top - 4), 40, theme.star);
  }
}
