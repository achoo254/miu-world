// Portal maze's picture: castle flagstones, hedge-like stone walls between cells, the three parts of the maze
// tinted a little differently, glowing coloured doors (same colour = joined), the treasure chest, and the child
// with a sparkle burst when she comes out of a door.
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import { type DrawView } from '../../types';
import type { PortalMazeState } from './logic';
import { DOWN, RIGHT } from './logic';

export function drawPortalMaze(ctx: CanvasRenderingContext2D, state: PortalMazeState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { cols, rows, cell, origin } = state;
  paintSky(ctx, view, arena.height, 3);
  const tints = [theme.stone, theme.waterLight, theme.ground];
  for (let i = 0; i < cols * rows; i += 1) {
    const x = origin.x + (i % cols) * cell;
    const y = origin.y + Math.floor(i / cols) * cell;
    ctx.fillStyle = tints[state.region[i] ?? 0] ?? theme.stone;
    ctx.fillRect(x, y, cell, cell);
  }
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.rect(origin.x, origin.y, cols * cell, rows * cell);
  for (let i = 0; i < cols * rows; i += 1) {
    const x = origin.x + (i % cols) * cell;
    const y = origin.y + Math.floor(i / cols) * cell;
    const open = state.open[i] ?? 0;
    if ((i % cols) < cols - 1 && (open & RIGHT) === 0) {
      ctx.moveTo(x + cell, y);
      ctx.lineTo(x + cell, y + cell);
    }
    if (Math.floor(i / cols) < rows - 1 && (open & DOWN) === 0) {
      ctx.moveTo(x, y + cell);
      ctx.lineTo(x + cell, y + cell);
    }
  }
  ctx.stroke();
  ctx.lineCap = 'butt';
  const centre = (i: number): { x: number; y: number } => ({ x: origin.x + ((i % cols) + 0.5) * cell, y: origin.y + (Math.floor(i / cols) + 0.5) * cell });
  const colours = [theme.danger, theme.secondary, theme.leaf];
  for (const p of state.portals) {
    for (const end of [p.a, p.b]) {
      const c = centre(end);
      ctx.fillStyle = colours[p.colour] ?? theme.primary;
      ctx.strokeStyle = theme.light;
      ctx.lineWidth = 4;
      const pulse = view.reducedMotion ? 0 : Math.sin(view.time * 4 + end) * 3;
      roundRect(ctx, c.x - cell * 0.32, c.y - cell * 0.4 - pulse / 2, cell * 0.64, cell * 0.8 + pulse, cell * 0.3);
      ctx.fill();
      ctx.stroke();
    }
  }
  const chest = centre(state.chest);
  sprites.draw(ctx, 'gift', chest.x, chest.y, cell * 0.85);
  const child = centre(state.child);
  sprites.draw(ctx, view.player, child.x, child.y, cell * 0.9);
  if (state.time - state.jumpedAt < 0.5) sprites.draw(ctx, 'sparkles', child.x, child.y - cell * 0.3, cell, { alpha: 1 - (state.time - state.jumpedAt) / 0.5 });
  if (state.nextIn > 0) paintLabel(ctx, view, 'Tìm được kho báu!', arena.width / 2, origin.y + (rows * cell) / 2, 44, theme.star);
}
