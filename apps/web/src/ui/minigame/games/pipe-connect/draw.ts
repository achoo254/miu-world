// Pipe connect's picture: grass with a stone well on the left and a dry field on the right, the board of soil
// tiles with grey pipes, water filling every pipe joined to the well, a tile spinning as it turns, and the
// field turning green with sprouts and sunflowers once the water arrives.
import { bob, paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { E, N, S, W, type PipeState } from './logic';

const SIDES: ReadonlyArray<readonly [number, number, number]> = [
  [N, 0, -1],
  [E, 1, 0],
  [S, 0, 1],
  [W, -1, 0],
];

function paintPipes(ctx: CanvasRenderingContext2D, cx: number, cy: number, half: number, open: number, width: number, colour: string): void {
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const [side, dx, dy] of SIDES) {
    if (!(open & side)) continue;
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + dx * half, cy + dy * half);
  }
  ctx.stroke();
  ctx.lineCap = 'butt';
}

export function drawPipeConnect(ctx: CanvasRenderingContext2D, state: PipeState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { cell, left, top, size } = state;
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = theme.ink;
  for (let i = 0; i < 40; i += 1) ctx.fillRect((i * 197) % arena.width, (i * 131) % arena.height, 18, 6);
  ctx.globalAlpha = 1;

  const boardW = cell * size;
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, left - 12, top - 12, boardW + 24, boardW + 24, 16);
  ctx.fill();

  // The well and the field, each joined to its row by a pipe.
  const sourceY = top + (state.sourceRow + 0.5) * cell;
  const targetY = top + (state.targetRow + 0.5) * cell;
  const done = state.doneAgo >= 0;
  paintPipes(ctx, left - 20, sourceY, 20, E, cell * 0.3, theme.water);
  paintPipes(ctx, left + boardW + 20, targetY, 20, W, cell * 0.3, done ? theme.water : theme.stone);
  ctx.fillStyle = theme.stone;
  ctx.strokeStyle = theme.stoneEdge;
  ctx.lineWidth = 4;
  roundRect(ctx, left - 66, sourceY - 34, 50, 68, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.water;
  ctx.beginPath();
  ctx.ellipse(left - 41, sourceY - 30, 20, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  sprites.draw(ctx, 'droplet', left - 41, sourceY - 58 + bob(view, 4, 5), 40);
  const fieldX = left + boardW + 18;
  ctx.fillStyle = done ? theme.leaf : theme.groundDeep;
  roundRect(ctx, fieldX - 4, targetY - 50, 52, 100, 12);
  ctx.fill();
  const grow = done ? Math.min(1, state.doneAgo / 0.5) : 0;
  for (let k = 0; k < 3; k += 1) {
    const y = targetY - 30 + k * 30;
    if (done) sprites.draw(ctx, k === 1 ? 'sunflower' : 'seedling', fieldX + 24, y - 8, (k === 1 ? 52 : 36) * grow);
    else {
      ctx.strokeStyle = theme.woodEdge;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(fieldX + 4, y);
      ctx.lineTo(fieldX + 44, y);
      ctx.stroke();
    }
  }

  // The tiles.
  state.tiles.forEach((tile, i) => {
    const x = left + (i % size) * cell;
    const y = top + Math.floor(i / size) * cell;
    ctx.fillStyle = theme.groundDeep;
    ctx.strokeStyle = theme.woodEdge;
    ctx.lineWidth = 3;
    roundRect(ctx, x + 3, y + 3, cell - 6, cell - 6, 10);
    ctx.fill();
    ctx.stroke();
    const cx = x + cell / 2;
    const cy = y + cell / 2;
    // A quick quarter spin after a tap, drawn from where it came from.
    const spin = !view.reducedMotion && tile.turned < 0.15 ? (1 - tile.turned / 0.15) * (Math.PI / 2) : 0;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-spin);
    ctx.translate(-cx, -cy);
    paintPipes(ctx, cx, cy, cell / 2, tile.open, cell * 0.34, theme.stoneEdge);
    paintPipes(ctx, cx, cy, cell / 2, tile.open, cell * 0.24, state.wet[i] ? theme.water : theme.stone);
    ctx.fillStyle = state.wet[i] ? theme.water : theme.stone;
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  if (done) paintLabel(ctx, view, 'Nước tới ruộng rồi!', arena.width / 2, top + boardW / 2, 46, theme.star);
}
