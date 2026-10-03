// Rotating maze's picture: a castle hall, a round turning plate with arrows showing it can be turned, the
// square maze board on it (wooden floor, stone walls) turned to the board's angle, the gap in the outer wall
// with a star outside it, and the ball rolling from square to square. The ball rolls out and the star bursts.
import { paintLabel } from '../../draw-kit';
import type { DrawView } from '../../types';
import { DIRS, type MazeState } from './logic';

export function drawRotatingMaze(ctx: CanvasRenderingContext2D, state: MazeState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const bg = ctx.createRadialGradient(state.centre.x, state.centre.y, 40, state.centre.x, state.centre.y, Math.max(arena.width, arena.height));
  bg.addColorStop(0, theme.stone);
  bg.addColorStop(1, theme.stoneEdge);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, arena.width, arena.height);

  const { centre, side, cell, maze, ball } = state;
  const ring = side * 0.72;
  // The turning plate.
  ctx.fillStyle = theme.woodEdge;
  ctx.beginPath();
  ctx.arc(centre.x, centre.y, ring, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = theme.star;
  ctx.lineWidth = 6;
  for (let k = 0; k < 4; k += 1) {
    const a = state.angle + (k * Math.PI) / 2 + Math.PI / 4;
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, ring - 14, a - 0.25, a + 0.25);
    ctx.stroke();
    const tip = { x: centre.x + Math.cos(a + 0.25) * (ring - 14), y: centre.y + Math.sin(a + 0.25) * (ring - 14) };
    ctx.fillStyle = theme.star;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(centre.x, centre.y);
  ctx.rotate(state.angle);
  const half = side / 2;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(-half, -half, side, side);
  // Walls.
  ctx.strokeStyle = theme.ink;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(6, cell * 0.14);
  for (let i = 0; i < maze.n * maze.n; i += 1) {
    const x = -half + (i % maze.n) * cell;
    const y = -half + Math.floor(i / maze.n) * cell;
    const w = maze.walls[i];
    if (!w) continue;
    ctx.beginPath();
    if (w[0]) {
      ctx.moveTo(x + cell, y);
      ctx.lineTo(x + cell, y + cell);
    }
    if (w[1]) {
      ctx.moveTo(x, y + cell);
      ctx.lineTo(x + cell, y + cell);
    }
    if (w[2]) {
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + cell);
    }
    if (w[3]) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + cell, y);
    }
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  // The star outside the gap.
  const [ex, ey] = DIRS[maze.exitDir] ?? [0, 1];
  const exitX = -half + ((maze.exit % maze.n) + 0.5 + ex * 0.9) * cell;
  const exitY = -half + (Math.floor(maze.exit / maze.n) + 0.5 + ey * 0.9) * cell;
  sprites.draw(ctx, 'star', exitX, exitY, cell * 0.8, { rotate: -state.angle });
  // The ball.
  const [dc, dr] = ball.dir >= 0 ? (DIRS[ball.dir] ?? [0, 0]) : [0, 0];
  const t = state.outAgo >= 0 ? 1 + state.outAgo * 2 : ball.t;
  const bx = -half + ((ball.cell % maze.n) + 0.5 + dc * t) * cell;
  const by = -half + (Math.floor(ball.cell / maze.n) + 0.5 + dr * t) * cell;
  ctx.fillStyle = theme.primary;
  ctx.beginPath();
  ctx.arc(bx, by, cell * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = theme.ink;
  ctx.stroke();
  ctx.restore();
  // Shine on the ball, always up-left on the screen.
  const sx = centre.x + Math.cos(state.angle) * bx - Math.sin(state.angle) * by;
  const sy = centre.y + Math.sin(state.angle) * bx + Math.cos(state.angle) * by;
  ctx.fillStyle = theme.light;
  ctx.beginPath();
  ctx.arc(sx - cell * 0.1, sy - cell * 0.1, cell * 0.09, 0, Math.PI * 2);
  ctx.fill();

  if (state.outAgo >= 0) {
    sprites.draw(ctx, 'sparkles', centre.x, centre.y, side * 0.6, { alpha: 1 - state.outAgo });
    paintLabel(ctx, view, 'Ra được rồi!', centre.x, centre.y, 54, theme.star);
  } else if (state.mazes === 1 && state.time < 4) {
    paintLabel(ctx, view, 'Kéo vòng quanh để xoay mê cung', arena.width / 2, 110 + 20, Math.min(32, arena.width / 22));
  }
}
