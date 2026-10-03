// Block fit's picture: a road seen from above, the delivery truck (cab and wooden bed with its grid), parcels
// as coloured boxes with a parcel picture, the three waiting parcels in their tray boxes, the parcel in the
// finger with a shadow of where it will land, full lines flying off, and the truck driving away when stuck.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { GRID, landing, fitsAt, SHAPES, shapeSize, type BlockFitState } from './logic';

const colours = (view: DrawView): readonly string[] => [view.theme.primary, view.theme.secondary, view.theme.star, view.theme.leaf];

function paintBox(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, size: number, colour: string, alpha = 1): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.strokeStyle = view.theme.ink;
  ctx.lineWidth = Math.max(2, size * 0.05);
  roundRect(ctx, x + size * 0.05, y + size * 0.05, size * 0.9, size * 0.9, size * 0.16);
  ctx.fill();
  ctx.stroke();
  view.sprites.draw(ctx, 'package', x + size / 2, y + size / 2, size * 0.62, { alpha });
  ctx.globalAlpha = 1;
}

function paintParcel(ctx: CanvasRenderingContext2D, view: DrawView, shape: number, colour: string, cx: number, cy: number, cell: number, alpha = 1): void {
  const { w, h } = shapeSize(shape);
  const left = cx - (w * cell) / 2;
  const top = cy - (h * cell) / 2;
  for (const [c, r] of SHAPES[shape] ?? []) paintBox(ctx, view, left + c * cell, top + r * cell, cell, colour, alpha);
}

export function drawBlockFit(ctx: CanvasRenderingContext2D, state: BlockFitState, view: DrawView): void {
  const { arena, theme } = view;
  const { cell, left, top } = state;
  const palette = colours(view);
  // The road.
  ctx.fillStyle = theme.stone;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.6;
  for (let y = 40; y < arena.height; y += 120) ctx.fillRect(40, y, 14, 60);
  ctx.globalAlpha = 1;

  // The truck (slides away while leaving, and the empty one rolls in).
  const bed = GRID * cell;
  const leave = state.leaving >= 0 ? state.leaving / 1.6 : 0;
  const shift = leave < 0.6 ? (leave / 0.6) ** 2 * arena.width : (1 - (leave - 0.6) / 0.4) * -arena.width * 0.6;
  ctx.save();
  ctx.translate(view.reducedMotion ? 0 : shift, 0);
  ctx.fillStyle = theme.ink;
  // Wheels peeking out on both sides of the cab and the bed.
  for (const wx of [left - 66, left + bed * 0.72]) {
    roundRect(ctx, wx, top - 18, 56, 24, 8);
    ctx.fill();
    roundRect(ctx, wx, top + bed - 6, 56, 24, 8);
    ctx.fill();
  }
  ctx.fillStyle = theme.primary;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  roundRect(ctx, left - 88, top + bed * 0.12, 80, bed * 0.76, 24);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.waterLight;
  roundRect(ctx, left - 80, top + bed * 0.2, 26, bed * 0.6, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.wood;
  roundRect(ctx, left - 8, top - 8, bed + 16, bed + 16, 12);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 1; i < GRID; i += 1) {
    ctx.moveTo(left + i * cell, top);
    ctx.lineTo(left + i * cell, top + bed);
    ctx.moveTo(left, top + i * cell);
    ctx.lineTo(left + bed, top + i * cell);
  }
  ctx.stroke();
  state.cells.forEach((v, i) => {
    if (v > 0) paintBox(ctx, view, left + (i % GRID) * cell, top + Math.floor(i / GRID) * cell, cell, palette[v - 1] ?? theme.primary);
  });
  ctx.restore();

  if (state.clearing) {
    const t = state.clearing.ago / 0.6;
    state.clearing.cells.forEach((i, k) => {
      const lift = view.reducedMotion ? 0 : t * 80;
      paintBox(ctx, view, left + (i % GRID) * cell, top + Math.floor(i / GRID) * cell - lift, cell * (1 - t * 0.3), palette[(state.clearing?.colours[k] ?? 1) - 1] ?? theme.star, 1 - t);
    });
  }

  // The tray.
  state.slots.forEach((slot, i) => {
    ctx.fillStyle = theme.light;
    ctx.globalAlpha = i === state.selected ? 0.75 : 0.35;
    roundRect(ctx, slot.x, slot.y, slot.w, slot.h, 20);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (i === state.selected) {
      ctx.strokeStyle = theme.star;
      ctx.lineWidth = 6;
      ctx.stroke();
    }
    if (slot.parcel && state.held?.slot !== i) {
      // As big as its box allows, up to three quarters of a bed square.
      const { w, h } = shapeSize(slot.parcel.shape);
      const scale = Math.min(0.75, (slot.w - 30) / (w * cell), (slot.h - 30) / (h * cell));
      paintParcel(ctx, view, slot.parcel.shape, palette[slot.parcel.colour] ?? theme.primary, slot.x + slot.w / 2, slot.y + slot.h / 2, cell * scale);
    }
  });

  const held = state.held;
  const parcel = held ? state.slots[held.slot]?.parcel : null;
  if (held && parcel) {
    const { col, row } = landing(state, parcel.shape, held.x, held.y);
    if (fitsAt(state.cells, parcel.shape, col, row)) {
      for (const [c, r] of SHAPES[parcel.shape] ?? []) {
        ctx.fillStyle = theme.light;
        ctx.globalAlpha = 0.55;
        roundRect(ctx, left + (col + c) * cell + 4, top + (row + r) * cell + 4, cell - 8, cell - 8, 10);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    paintParcel(ctx, view, parcel.shape, palette[parcel.colour] ?? theme.primary, held.x, held.y, cell, 0.95);
  }

  if (state.leaving >= 0) paintLabel(ctx, view, 'Hết chỗ! Xe mới tới đây', arena.width / 2, top + bed / 2, 40, theme.star);
}
