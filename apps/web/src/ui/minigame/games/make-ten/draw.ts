// Make ten's picture: a classroom board in a wooden frame, number tiles in soft colours (each number its own
// colour, so partners are easy to spot again), the tile in hand lifted with a star ring, the waiting row
// peeking in under the board, and the line at the top that blinks when a column comes close.
import { bob, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { tileCentre, type MakeTenState, type Tile } from './logic';

function tileColour(view: DrawView, value: number): string {
  const { theme } = view;
  const palette = [theme.primary, theme.secondary, theme.leaf, theme.star, theme.danger, theme.water, theme.wood, theme.stone, theme.waterLight];
  const digit = value >= 10 ? value / 10 : value;
  return palette[(digit - 1) % palette.length] ?? theme.primary;
}

function paintTile(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, size: number, tile: Pick<Tile, 'value' | 'shook'>, selected: boolean, alpha = 1): void {
  const { theme } = view;
  const shake = tile.shook < 0.35 && !view.reducedMotion ? Math.sin(tile.shook * 60) * 8 * (1 - tile.shook / 0.35) : 0;
  const lift = selected && !view.reducedMotion ? -6 : 0;
  const s = size - 10;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = alpha * 0.25;
  roundRect(ctx, x - s / 2 + shake + 3, y - s / 2 + 6, s, s, 16);
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = tileColour(view, tile.value);
  roundRect(ctx, x - s / 2 + shake, y - s / 2 + lift, s, s, 16);
  ctx.fill();
  ctx.lineWidth = selected ? 8 : 4;
  ctx.strokeStyle = selected ? theme.star : theme.ink;
  ctx.stroke();
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = alpha * 0.35;
  roundRect(ctx, x - s / 2 + shake + 8, y - s / 2 + lift + 6, s - 16, s * 0.28, 10);
  ctx.fill();
  ctx.globalAlpha = alpha;
  paintLabel(ctx, view, String(tile.value), x + shake, y + lift + 3, tile.value >= 100 ? size * 0.36 : size * 0.48);
  ctx.globalAlpha = 1;
}

export function drawMakeTen(ctx: CanvasRenderingContext2D, state: MakeTenState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, arena.height, 5);
  const { left, size, cols, floorY, topY } = state;
  const width = cols * size;
  // The board and its frame.
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, left - 18, topY - 22, width + 36, floorY - topY + 40, 22);
  ctx.fill();
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.82;
  roundRect(ctx, left - 6, topY - 10, width + 12, floorY - topY + 16, 14);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.beginPath();
  ctx.rect(left - 6, topY - 10, width + 12, floorY - topY + 16);
  ctx.clip();
  // The row on its way in, faint under the floor.
  state.incoming.forEach((value, col) => {
    const tile = { value, shook: 99 };
    paintTile(ctx, view, left + (col + 0.5) * size, floorY + size * 0.5 - state.lift * size, size, tile, false, 0.4);
  });
  state.columns.forEach((column, col) => {
    column.forEach((tile, row) => {
      const c = tileCentre(state, col, row, tile);
      paintTile(ctx, view, c.x, c.y, size, tile, state.selected === tile.id);
    });
  });
  ctx.restore();

  for (const p of state.popped) {
    const t = p.ago / 0.6;
    sprites.draw(ctx, 'sparkles', p.x, p.y - t * 40, size * (0.6 + t * 0.6), { alpha: 1 - t });
  }

  // The line a column must not reach: blinks when one is close.
  const tallest = Math.max(...state.columns.map((c) => c.length));
  const close = tallest >= state.rows - 1;
  const blink = close && !view.reducedMotion ? 0.5 + 0.5 * Math.sin(view.time * 10) : 1;
  ctx.strokeStyle = close ? theme.danger : theme.light;
  ctx.globalAlpha = close ? blink : 0.6;
  ctx.lineWidth = 6;
  ctx.setLineDash([18, 12]);
  ctx.beginPath();
  ctx.moveTo(left - 6, topY);
  ctx.lineTo(left + width + 6, topY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // The child's character sits on the board's corner and cheers.
  sprites.draw(ctx, view.player, left + width - 34, topY - 58 + bob(view, 3, 4), 84);
  // What to make, on a tag hanging over the board.
  const tagW = 300;
  ctx.fillStyle = theme.light;
  roundRect(ctx, arena.width / 2 - tagW / 2, topY - 70, tagW, 56, 26);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.ink;
  ctx.stroke();
  const pop = state.switchedAgo < 0.6 && !view.reducedMotion ? 1 + 0.3 * Math.sin((state.switchedAgo / 0.6) * Math.PI) : 1;
  paintLabel(ctx, view, `Hai số cộng = ${state.target}`, arena.width / 2, topY - 42, 32 * pop, state.target === 100 ? theme.star : theme.light);
  if (state.switchedAgo < 1.6) paintLabel(ctx, view, 'Mỗi số × 10!', arena.width / 2, (topY + floorY) / 2, 54, theme.star);
  if (state.overflow) paintLabel(ctx, view, 'Đầy bảng rồi!', arena.width / 2, (topY + floorY) / 2, 54, theme.light);
}
