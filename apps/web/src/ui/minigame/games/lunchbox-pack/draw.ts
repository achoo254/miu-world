// Lunchbox pack's picture: a school kitchen, the open lunchbox with four compartments (filled as foods go in),
// the four food groups under it lighting up as each is packed (two of a group show red), the conveyor belt
// with its rollers turning and foods riding along, the food under the finger, the lid closing with a heart on
// a good box, and a spilled box shaking.
import { paintLabel, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import type { DrawView } from '../../types';
import { GROUP_COUNT, groupOf, type LunchboxState } from './logic';

/** Pictures by food index (the same order as FOOD_GROUPS in logic.ts). */
export const FOODS: readonly SpriteRef[] = [
  'cooked-rice',
  'baguette-bread',
  'ear-of-corn',
  'leafy-green',
  'carrot',
  'cucumber',
  'fish',
  'cut-of-meat',
  'egg',
  'banana',
  'red-apple',
  'watermelon',
  'grapes',
  'strawberry',
];
export const GROUP_ICONS: readonly SpriteRef[] = ['cooked-rice', 'leafy-green', 'fish', 'red-apple'];
const GROUP_NAMES = ['Cơm', 'Rau', 'Thịt cá', 'Quả'];

export function drawLunchboxPack(ctx: CanvasRenderingContext2D, state: LunchboxState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.light;
  ctx.fillRect(0, 0, arena.width, arena.height);
  // Wall tiles.
  ctx.strokeStyle = theme.waterLight;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.6;
  for (let x = 0; x < arena.width; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, state.beltY - 60);
    ctx.stroke();
  }
  for (let y = 0; y < state.beltY - 60; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(arena.width, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // The box.
  const { box, boxW, boxH } = state;
  const spill = state.phase === 'spilled';
  const closed = state.phase === 'closed';
  const shake = spill && !view.reducedMotion ? Math.sin(state.phaseAgo * 45) * 10 * Math.max(0, 1 - state.phaseAgo) : 0;
  ctx.save();
  ctx.translate(shake, 0);
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.2;
  roundRect(ctx, box.x - boxW / 2 + 6, box.y - boxH / 2 + 10, boxW, boxH, 24);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.primary;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  roundRect(ctx, box.x - boxW / 2, box.y - boxH / 2, boxW, boxH, 24);
  ctx.fill();
  ctx.stroke();
  const pad = 12;
  const cw = (boxW - pad * 3) / 2;
  const ch = (boxH - pad * 3) / 2;
  for (let i = 0; i < GROUP_COUNT; i += 1) {
    const cx = box.x - boxW / 2 + pad + (i % 2) * (cw + pad);
    const cy = box.y - boxH / 2 + pad + Math.floor(i / 2) * (ch + pad);
    ctx.fillStyle = theme.light;
    roundRect(ctx, cx, cy, cw, ch, 14);
    ctx.fill();
    const food = state.packed[i];
    if (food !== undefined) {
      const fall = spill ? state.phaseAgo * state.phaseAgo * 600 : 0;
      sprites.draw(ctx, FOODS[food] ?? 'cooked-rice', cx + cw / 2, cy + ch / 2 + fall, Math.min(cw, ch) * 0.8, { alpha: spill ? Math.max(0, 1 - state.phaseAgo) : 1 });
    }
  }
  if (closed) {
    const t = Math.min(1, state.phaseAgo / 0.3);
    ctx.fillStyle = theme.secondary;
    roundRect(ctx, box.x - boxW / 2 - 6, box.y - boxH / 2 - 6, boxW + 12, (boxH + 12) * t, 24);
    ctx.fill();
    ctx.stroke();
    if (t >= 1) sprites.draw(ctx, 'heart', box.x, box.y, Math.min(boxH * 0.6, 100));
  }
  ctx.restore();

  // The four groups, lit as they are packed.
  const counts = Array.from({ length: GROUP_COUNT }, (_, g) => state.packed.filter((f) => groupOf(f) === g).length);
  const iconY = box.y + boxH / 2 + 50;
  const gap = Math.min(110, (arena.width - 40) / GROUP_COUNT);
  for (let g = 0; g < GROUP_COUNT; g += 1) {
    const x = arena.width / 2 + (g - 1.5) * gap;
    const n = counts[g] ?? 0;
    ctx.fillStyle = n > 1 ? theme.danger : n === 1 ? theme.star : theme.stone;
    ctx.globalAlpha = n > 0 ? 1 : 0.5;
    ctx.beginPath();
    ctx.arc(x, iconY, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = n > 0 ? 1 : 0.55;
    sprites.draw(ctx, GROUP_ICONS[g] ?? 'cooked-rice', x, iconY - 2, 46);
    ctx.globalAlpha = 1;
    paintLabel(ctx, view, GROUP_NAMES[g] ?? '', x, iconY + 46, 20);
  }

  // The belt.
  const beltH = state.foodSize * 0.5;
  ctx.fillStyle = theme.stoneEdge;
  ctx.fillRect(0, state.beltY + state.foodSize * 0.3, arena.width, beltH);
  ctx.fillStyle = theme.stone;
  const roll = (view.time * state.speed) % 60;
  for (let x = -roll; x < arena.width + 60; x += 60) {
    ctx.beginPath();
    ctx.arc(x + 60, state.beltY + state.foodSize * 0.3 + beltH / 2, beltH * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const f of state.foods) {
    if (f.held) continue;
    sprites.draw(ctx, FOODS[f.food] ?? 'cooked-rice', f.x, f.y, state.foodSize);
  }
  const held = state.foods.find((f) => f.held);
  if (held) sprites.draw(ctx, FOODS[held.food] ?? 'cooked-rice', held.x, held.y, state.foodSize * 1.15);
}
