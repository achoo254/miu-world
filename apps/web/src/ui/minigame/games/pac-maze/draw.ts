// Pac maze's picture: a garden maze seen from above (paths on a lawn, hedges as thick green walls), golden
// seeds in the paths, stars in the corners, the ghosts drifting (pale and wobbly while scared), and the child
// walking, blinking while safe after a catch.
import { bob, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { DOWN, isOpen, LEFT, position, RIGHT, UP, type PacState } from './logic';

export function drawPacMaze(ctx: CanvasRenderingContext2D, state: PacState, view: DrawView): void {
  const { arena, sprites, theme } = view;
  const s = state.cell;
  ctx.fillStyle = theme.leaf;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.fillStyle = theme.groundDeep;
  roundRect(ctx, state.originX - 8, state.originY - 8, state.cols * s + 16, state.rows * s + 16, 14);
  ctx.fill();
  ctx.fillStyle = theme.ground;
  ctx.fillRect(state.originX, state.originY, state.cols * s, state.rows * s);

  // Hedges along every closed side.
  ctx.strokeStyle = theme.leaf;
  ctx.lineWidth = s * 0.26;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let y = 0; y < state.rows; y += 1) {
    for (let x = 0; x < state.cols; x += 1) {
      const px = state.originX + x * s;
      const py = state.originY + y * s;
      if (!isOpen(state, x, y, UP)) {
        ctx.moveTo(px, py);
        ctx.lineTo(px + s, py);
      }
      if (!isOpen(state, x, y, LEFT)) {
        ctx.moveTo(px, py);
        ctx.lineTo(px, py + s);
      }
      if (y === state.rows - 1 && !isOpen(state, x, y, DOWN)) {
        ctx.moveTo(px, py + s);
        ctx.lineTo(px + s, py + s);
      }
      if (x === state.cols - 1 && !isOpen(state, x, y, RIGHT)) {
        ctx.moveTo(px + s, py);
        ctx.lineTo(px + s, py + s);
      }
    }
  }
  ctx.stroke();

  state.food.forEach((f, k) => {
    if (f === 0) return;
    const x = state.originX + ((k % state.cols) + 0.5) * s;
    const y = state.originY + (Math.floor(k / state.cols) + 0.5) * s;
    if (f === 2) {
      sprites.draw(ctx, 'star', x, y + bob(view, 5, 3, k), s * 0.7);
      return;
    }
    ctx.fillStyle = theme.star;
    ctx.strokeStyle = theme.woodEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  for (const g of state.ghosts) {
    const p = position(g);
    const x = state.originX + (p.x + 0.5) * s;
    const y = state.originY + (p.y + 0.5) * s;
    if (state.scared > 0) {
      const ending = state.scared < 1.5 && Math.floor(state.scared * 6) % 2 === 0;
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = ending ? theme.light : theme.secondary;
      ctx.beginPath();
      ctx.arc(x, y, s * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      sprites.draw(ctx, 'ghost', x + (view.reducedMotion ? 0 : Math.sin(view.time * 20) * 3), y, s * 0.8, { alpha: 0.6 });
    } else sprites.draw(ctx, 'ghost', x, y + bob(view, 4, 3, g.homeX), s * 0.9, { flipX: g.tx < g.x });
  }

  const p = position(state.player);
  const blink = state.safe > 0 && Math.floor(state.safe * 10) % 2 === 0;
  sprites.draw(ctx, view.player, state.originX + (p.x + 0.5) * s, state.originY + (p.y + 0.5) * s, s * 0.95, { flipX: state.player.tx < state.player.x, alpha: blink ? 0.4 : 1 });
}
