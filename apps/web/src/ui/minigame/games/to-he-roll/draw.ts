// Tò he roll's picture: a market table with a wooden ruler (big numbers every centimetre), the dough log lying
// from 0 with stripes that turn as it rolls, a customer with a bubble asking for "7 cm", and the round knife
// button. A right cut turns the stick into a bright tò he bird on a bamboo stick that goes to the customer;
// a wrong one says "Dài quá" or "Ngắn quá" and the dough balls up.
import { bob, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { HUD_SAFE_TOP } from '../../types';
import { START_CM, type ToHeState } from './logic';

function paintDough(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, length: number, rolled: number, alpha = 1): void {
  const { theme } = view;
  const h = 34;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = theme.danger;
  roundRect(ctx, x, y - h, length, h, h / 2);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = theme.star;
  ctx.lineWidth = 6;
  for (let sx = x - 40 + (rolled % 26); sx < x + length + 40; sx += 26) {
    ctx.beginPath();
    ctx.moveTo(sx, y - h);
    ctx.lineTo(sx + 16, y);
    ctx.stroke();
  }
  ctx.restore();
  ctx.lineWidth = 3;
  ctx.strokeStyle = theme.ink;
  roundRect(ctx, x, y - h, length, h, h / 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function drawToHeRoll(ctx: CanvasRenderingContext2D, state: ToHeState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const tableY = state.rulerY - 140;
  paintSky(ctx, view, tableY, 6);
  // Market awning stripes along the top of the table.
  for (let x = 0; x < arena.width; x += 60) {
    ctx.fillStyle = (x / 60) % 2 === 0 ? theme.danger : theme.light;
    ctx.fillRect(x, tableY - 26, 60, 26);
  }
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, tableY, arena.width, arena.height - tableY);
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(0, tableY, arena.width, 10);

  // The customer and the request.
  const cx = 110;
  const cy = Math.max(HUD_SAFE_TOP + 70, tableY - 70);
  sprites.draw(ctx, state.customer, cx, cy + bob(view, 3, 4), 110);
  const bubbleX = cx + 80;
  ctx.fillStyle = theme.light;
  roundRect(ctx, bubbleX, cy - 60, 220, 84, 28);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.ink;
  ctx.stroke();
  paintLabel(ctx, view, `${state.target} cm`, bubbleX + 110, cy - 16, 52, theme.star);

  // The ruler.
  const { rulerX, rulerY, perCm } = state;
  ctx.fillStyle = theme.light;
  roundRect(ctx, rulerX - 20, rulerY, state.maxCm * perCm + 40, 92, 12);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.woodEdge;
  ctx.stroke();
  for (let cm = 0; cm <= state.maxCm; cm += 1) {
    const x = rulerX + cm * perCm;
    ctx.fillStyle = theme.ink;
    ctx.fillRect(x - 2, rulerY, 4, 30);
    if (cm < state.maxCm) ctx.fillRect(x + perCm / 2 - 1, rulerY, 2, 16);
    paintLabel(ctx, view, String(cm), x, rulerY + 58, perCm > 40 ? 30 : cm >= 10 ? 21 : 26, cm === state.target ? theme.star : theme.light);
  }

  // The dough (or the cut stick, served or balled up).
  const cut = state.cut;
  if (!cut) {
    paintDough(ctx, view, rulerX, rulerY - 4, state.length * perCm, state.rolled);
    // The end of the dough, marked down onto the ruler.
    ctx.fillStyle = theme.ink;
    ctx.fillRect(rulerX + state.length * perCm - 2, rulerY - 4, 4, 12);
  } else if (cut.result === 'right') {
    const t = Math.min(1, cut.ago / 1.1);
    if (t < 0.3) paintDough(ctx, view, rulerX, rulerY - 4, cut.length * perCm, state.rolled);
    else {
      const k = (t - 0.3) / 0.7;
      const bx = rulerX + (cut.length * perCm) / 2 + (cx + 40 - rulerX - (cut.length * perCm) / 2) * k;
      const by = rulerY - 60 + (cy + 10 - rulerY + 60) * k;
      ctx.strokeStyle = theme.wood;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(bx, by + 20);
      ctx.lineTo(bx, by + 90);
      ctx.stroke();
      sprites.draw(ctx, 'bird', bx, by, 80);
    }
    paintLabel(ctx, view, `Đúng ${state.target} cm!`, arena.width / 2, rulerY - 90, 44, theme.star);
  } else {
    const k = Math.min(1, cut.ago / 0.5);
    paintDough(ctx, view, rulerX, rulerY - 4, Math.max(START_CM, cut.length * (1 - k) + START_CM * k) * perCm, state.rolled, 1);
    paintLabel(ctx, view, cut.result === 'long' ? 'Dài quá! Nặn lại nhé' : 'Ngắn quá! Nặn lại nhé', arena.width / 2, rulerY - 90, 36, theme.light);
  }
  if (state.length <= START_CM + 0.05 && !cut && state.time - state.lastMoveAt > 1.5) {
    paintLabel(ctx, view, '↔ Xoa qua lại để lăn bột', arena.width / 2, rulerY - 90, 30, theme.light);
  }

  // The knife button.
  const { knife } = state;
  ctx.fillStyle = theme.light;
  ctx.beginPath();
  ctx.arc(knife.x, knife.y, knife.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = theme.ink;
  ctx.stroke();
  ctx.fillStyle = theme.stone;
  ctx.beginPath();
  ctx.moveTo(knife.x - knife.r * 0.55, knife.y - 2);
  ctx.lineTo(knife.x + knife.r * 0.25, knife.y - knife.r * 0.4);
  ctx.lineTo(knife.x + knife.r * 0.25, knife.y + knife.r * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, knife.x + knife.r * 0.2, knife.y - knife.r * 0.22, knife.r * 0.42, knife.r * 0.2, 6);
  ctx.fill();
  paintLabel(ctx, view, 'Cắt', knife.x, knife.y + knife.r * 0.5, 24);
}
