// Unblock ferry's picture: the river landing from above, a wooden pier frame with a gap on the right of the
// yellow boat's row (an arrow points out), boats as long hulls with a seat stripe (the yellow one carries the
// child), the held boat lifted with a shadow, the yellow boat sailing off when it is free, and the "Lùi" button.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { EXIT_ROW, SIZE, type Boat, type FerryState } from './logic';

function paintBoat(ctx: CanvasRenderingContext2D, view: DrawView, state: FerryState, b: Boat, pos: number, colour: string, lifted: boolean): void {
  const { theme } = view;
  const { left, top, cell } = state;
  const pad = cell * 0.1;
  const x = b.across ? left + pos * cell + pad : left + b.line * cell + pad;
  const y = b.across ? top + b.line * cell + pad : top + pos * cell + pad;
  const w = (b.across ? b.length : 1) * cell - pad * 2;
  const h = (b.across ? 1 : b.length) * cell - pad * 2;
  if (lifted) {
    ctx.fillStyle = theme.ink;
    ctx.globalAlpha = 0.25;
    roundRect(ctx, x + 8, y + 10, w, h, cell * 0.35);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = colour;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, x, y - (lifted ? 6 : 0), w, h, cell * 0.38);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.woodEdge;
  ctx.globalAlpha = 0.6;
  for (let k = 1; k < b.length; k += 1) {
    if (b.across) ctx.fillRect(x + k * cell - pad - 4, y + h * 0.2 - (lifted ? 6 : 0), 8, h * 0.6);
    else ctx.fillRect(x + w * 0.2, y + k * cell - pad - 4 - (lifted ? 6 : 0), w * 0.6, 8);
  }
  ctx.globalAlpha = 1;
}

export function drawUnblockFerry(ctx: CanvasRenderingContext2D, state: FerryState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { left, top, cell } = state;
  const board = cell * SIZE;
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.fillStyle = theme.water;
  ctx.fillRect(left + board, top + EXIT_ROW * cell, arena.width, cell);
  // Pier frame around the water.
  ctx.fillStyle = theme.wood;
  roundRect(ctx, left - 16, top - 16, board + 32, board + 32, 14);
  ctx.fill();
  const water = ctx.createLinearGradient(left, top, left, top + board);
  water.addColorStop(0, theme.water);
  water.addColorStop(1, theme.waterLight);
  ctx.fillStyle = water;
  ctx.fillRect(left, top, board, board);
  ctx.fillRect(left + board - 2, top + EXIT_ROW * cell, 20, cell);
  ctx.strokeStyle = theme.light;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 2;
  for (let k = 1; k < SIZE; k += 1) {
    ctx.beginPath();
    ctx.moveTo(left + k * cell, top);
    ctx.lineTo(left + k * cell, top + board);
    ctx.moveTo(left, top + k * cell);
    ctx.lineTo(left + board, top + k * cell);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // The way out.
  const ax = left + board + 24;
  const ay = top + (EXIT_ROW + 0.5) * cell;
  ctx.fillStyle = theme.star;
  ctx.beginPath();
  ctx.moveTo(ax + 30, ay);
  ctx.lineTo(ax, ay - 22);
  ctx.lineTo(ax, ay + 22);
  ctx.closePath();
  ctx.fill();

  const colours = [theme.primary, theme.secondary, theme.leaf, theme.danger, theme.woodEdge];
  state.boats.forEach((b, i) => {
    if (i === 0) return;
    const held = i === state.held;
    paintBoat(ctx, view, state, b, held ? state.heldPos : b.pos, colours[i % colours.length] ?? theme.primary, held);
  });
  const yellow = state.boats[0];
  if (yellow) {
    const held = state.held === 0;
    const sail = state.outAgo >= 0 ? state.outAgo * 6 : 0;
    const pos = (held ? state.heldPos : yellow.pos) + sail;
    paintBoat(ctx, view, state, yellow, pos, theme.star, held);
    sprites.draw(ctx, view.player, left + (pos + 1) * cell, top + (EXIT_ROW + 0.5) * cell - (held ? 6 : 0), cell * 0.8);
  }

  const { undo } = state;
  ctx.globalAlpha = state.history.length > 0 ? 1 : 0.45;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(undo.x, undo.y, undo.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  paintLabel(ctx, view, 'Lùi', undo.x, undo.y + 2, 30, theme.primary);
  ctx.globalAlpha = 1;
  if (state.outAgo >= 0) paintLabel(ctx, view, 'Thuyền vàng ra được rồi!', arena.width / 2, top + board / 2, 38, theme.star);
}
