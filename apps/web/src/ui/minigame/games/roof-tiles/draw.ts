// Roof tiles' picture: a village lane, the house walls with a door and window, the bare roof frame with its
// battens, red clay tiles lapping one over another, the stack of tiles by the house, the tile following the
// finger (green outline where it may sit), a tile sliding back when it cannot, and passing showers that drip
// through the holes into a bucket.
import { paintGround, paintHills, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { canLay, COLS, ROWS, type RoofState } from './logic';

function paintTile(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, w: number, h: number): void {
  const { theme } = view;
  ctx.fillStyle = theme.danger;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - 10);
  for (let k = 3; k >= 0; k -= 1) ctx.quadraticCurveTo(x + (k + 0.5) * (w / 4), y + h + 6, x + k * (w / 4), y + h - 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.25;
  ctx.fillRect(x + 6, y + 6, w - 12, 6);
  ctx.globalAlpha = 1;
}

export function drawRoofTiles(ctx: CanvasRenderingContext2D, state: RoofState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const groundY = arena.height - 40;
  paintSky(ctx, view, groundY, 10);
  if (state.rainAgo >= 0) {
    ctx.fillStyle = theme.ink;
    ctx.globalAlpha = 0.15;
    ctx.fillRect(0, 0, arena.width, arena.height);
    ctx.globalAlpha = 1;
  }
  paintHills(ctx, view, groundY - 10, 20, 50, theme.leaf);
  paintGround(ctx, view, groundY);
  const { left, bottom, cellW, cellH } = state;
  const roofW = cellW * COLS;
  const roofH = cellH * ROWS;
  // Walls.
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.fillRect(left + 20, bottom, roofW - 40, groundY - bottom);
  ctx.strokeRect(left + 20, bottom, roofW - 40, groundY - bottom);
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, left + roofW / 2 - 34, groundY - Math.min(110, groundY - bottom - 10), 68, Math.min(110, groundY - bottom - 10), 8);
  ctx.fill();
  // Roof frame: gable ends and battens.
  ctx.fillStyle = theme.wood;
  ctx.beginPath();
  ctx.moveTo(left - 24, bottom);
  ctx.lineTo(left + 16, bottom - roofH - 14);
  ctx.lineTo(left + roofW - 16, bottom - roofH - 14);
  ctx.lineTo(left + roofW + 24, bottom);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = theme.woodEdge;
  for (let r = 0; r <= ROWS; r += 1) {
    ctx.beginPath();
    ctx.moveTo(left, bottom - r * cellH);
    ctx.lineTo(left + roofW, bottom - r * cellH);
    ctx.stroke();
  }
  // Places a tile may go now: faint green.
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const i = r * COLS + c;
      const x = left + c * cellW;
      const y = bottom - (r + 1) * cellH;
      if (!state.tiles[i] && canLay(state.tiles, r, c) && state.carrying) {
        ctx.fillStyle = theme.leaf;
        ctx.globalAlpha = 0.35 + 0.15 * Math.sin(view.time * 6);
        ctx.fillRect(x + 4, y + 4, cellW - 8, cellH - 8);
        ctx.globalAlpha = 1;
      }
    }
  }
  // Tiles, top rows drawn last so they lap over the row below.
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const i = r * COLS + c;
      if (!state.tiles[i]) continue;
      const drop = Math.max(0, 1 - (state.laidAgo[i] ?? 9) / 0.15) * 20;
      paintTile(ctx, view, left + c * cellW, bottom - (r + 1) * cellH - drop - 8, cellW, cellH + 8);
    }
  }
  // Rain, and drips through the holes into the bucket.
  if (state.rainAgo >= 0) {
    ctx.strokeStyle = theme.water;
    ctx.lineWidth = 3;
    for (let i = 0; i < 40; i += 1) {
      const x = (i * 97) % arena.width;
      const y = (view.time * 600 + i * 53) % groundY;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 5, y + 18);
      ctx.stroke();
    }
    const holes = state.tiles.filter((t) => !t).length;
    if (holes > 0) {
      sprites.draw(ctx, 'bucket', left + roofW / 2 + 70, groundY - 30, 60);
      sprites.draw(ctx, 'droplet', left + roofW / 2 + 70, bottom + ((view.time * 300) % Math.max(20, groundY - bottom - 60)), 26);
      paintLabel(ctx, view, 'Mưa rồi! Lợp nhanh lên!', arena.width / 2, HUD_LABEL_Y, 30, theme.light);
    }
  }
  // The stack.
  const { stack } = state;
  for (let k = 0; k < 4; k += 1) paintTile(ctx, view, stack.x - cellW * 0.45, stack.y - 20 - k * 10, cellW * 0.9, cellH * 0.6);
  paintLabel(ctx, view, 'Ngói', stack.x, stack.y + 40, 24, theme.light);
  if (state.rejected) {
    const t = state.rejected.ago / 0.4;
    const x = state.rejected.from.x + (stack.x - state.rejected.from.x) * t;
    const y = state.rejected.from.y + (stack.y - state.rejected.from.y) * t;
    paintTile(ctx, view, x - cellW / 2, y - cellH / 2, cellW, cellH);
    paintLabel(ctx, view, 'Lợp từ dưới lên nhé', arena.width / 2, bottom - roofH - 50, 28, theme.light);
  }
  if (state.carrying && state.carryAt) paintTile(ctx, view, state.carryAt.x - cellW / 2, state.carryAt.y - cellH / 2 - 30, cellW, cellH);
  if (state.doneAgo >= 0) paintLabel(ctx, view, 'Mái kín rồi!', left + roofW / 2, bottom - roofH - 50, 40, theme.star);
}

const HUD_LABEL_Y = 140;
