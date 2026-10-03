// Rice plant's picture: the flooded paddy seen from above, its banks on both sides, rows planted earlier sliding
// by on either side, faint marks in the mud of the child's own row, the ring at her hand, her straight seedlings
// (and the odd crooked one) sliding away below, and her bundle of seedlings with how many are left.
import { paintLabel, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { MARK_GAP, screenY, TOLERANCE, type RicePlantState } from './logic';

export function drawRicePlant(ctx: CanvasRenderingContext2D, state: RicePlantState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { columnX, handY } = state;
  // Water over mud.
  ctx.fillStyle = theme.groundDeep;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = theme.water;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.globalAlpha = 1;
  // Banks.
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, 34, arena.height);
  ctx.fillRect(arena.width - 34, 0, 34, arena.height);
  // Ripples drifting with the field.
  ctx.strokeStyle = theme.waterLight;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 3;
  for (let k = 0; k < 12; k += 1) {
    const y = ((k * 97 + state.travel) % (arena.height + 60)) - 30;
    const x = 60 + ((k * 211) % (arena.width - 120));
    ctx.beginPath();
    ctx.ellipse(x, y, 30, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Rows planted earlier, on both sides of hers, straight and evenly spaced.
  const shift = state.travel % MARK_GAP;
  for (let col = columnX - 330; col < arena.width - 40; col += 110) {
    if (Math.abs(col - columnX) < 20 || col < 60) continue;
    const startRow = Math.abs(col - columnX) < 130 ? handY : -MARK_GAP;
    for (let y = shift - MARK_GAP; y < arena.height + MARK_GAP; y += MARK_GAP) {
      if (y < startRow) continue;
      sprites.draw(ctx, 'seedling', col, y, 58, { alpha: 0.9 });
    }
  }

  // Her row: marks ahead, seedlings behind.
  for (const m of state.marks) {
    const y = screenY(state, m);
    if (y < HUD_SAFE_TOP - 40) continue;
    ctx.strokeStyle = theme.light;
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(columnX - 14, y - 14);
    ctx.lineTo(columnX + 14, y + 14);
    ctx.moveTo(columnX + 14, y - 14);
    ctx.lineTo(columnX - 14, y + 14);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const p of state.plants) {
    const y = screenY(state, p.y);
    sprites.draw(ctx, 'seedling', columnX, y - 8, 64, { rotate: p.straight ? 0 : 0.6, alpha: p.straight ? 1 : 0.7 });
  }

  // The hand ring: glows when a mark sits in it.
  const handField = handY - state.travel;
  const ready = state.marks.some((m) => Math.abs(m - handField) <= TOLERANCE);
  ctx.strokeStyle = ready ? theme.star : theme.light;
  ctx.lineWidth = ready ? 8 : 5;
  ctx.globalAlpha = ready ? 1 : 0.7;
  ctx.beginPath();
  ctx.arc(columnX, handY, 38, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // The child (above her hand, stepping back) and her bundle.
  const dip = state.time - state.lastPlantAt < 0.25 && !view.reducedMotion ? 16 * Math.sin(((state.time - state.lastPlantAt) / 0.25) * Math.PI) : 0;
  sprites.draw(ctx, view.player, columnX - 70, handY - 70 + dip, 120);
  sprites.draw(ctx, 'sheaf-of-rice', columnX - 140, handY - 40, 70);
  ctx.fillStyle = theme.light;
  roundRect(ctx, columnX - 182, handY - 6, 84, 40, 14);
  ctx.fill();
  ctx.font = `800 28px ${theme.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = state.bundle <= 10 ? theme.danger : theme.ink;
  ctx.fillText(String(state.bundle), columnX - 140, handY + 15);

  if (state.time - state.lastPlantAt < 0.6 && state.lastPlant === 'straight') {
    paintLabel(ctx, view, 'Thẳng!', columnX + 90, handY - 20 - (state.time - state.lastPlantAt) * 40, 34, theme.star);
  }
}
