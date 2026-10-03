// Tea slide's picture: a pavement stall, three long low tables with little stools, customers walking in from
// the right (a heart when served, a frown-walk away when they waited too long), glasses of iced tea sliding
// right, empties sliding back (a pulsing ring: tap me), and the child at the counter with the tray of glasses.
import { bob, paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { ROW_HALF, TRAY, type TeaState } from './logic';

/** The counter starts just under the HUD band. */
const HUD_TOP = 100;

function paintGlass(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, full: boolean, alpha = 1): void {
  const { theme } = view;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 16, y - 44);
  ctx.lineTo(x + 16, y - 44);
  ctx.lineTo(x + 12, y);
  ctx.lineTo(x - 12, y);
  ctx.closePath();
  ctx.globalAlpha = alpha * 0.6;
  ctx.fill();
  ctx.globalAlpha = alpha;
  if (full) {
    ctx.fillStyle = theme.wood;
    ctx.beginPath();
    ctx.moveTo(x - 14, y - 34);
    ctx.lineTo(x + 14, y - 34);
    ctx.lineTo(x + 11, y - 2);
    ctx.lineTo(x - 11, y - 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = theme.light;
    ctx.fillRect(x - 9, y - 32, 9, 9);
    ctx.fillRect(x + 1, y - 26, 8, 8);
  }
  ctx.beginPath();
  ctx.moveTo(x - 16, y - 44);
  ctx.lineTo(x + 16, y - 44);
  ctx.lineTo(x + 12, y);
  ctx.lineTo(x - 12, y);
  ctx.closePath();
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function drawTeaSlide(ctx: CanvasRenderingContext2D, state: TeaState, view: DrawView): void {
  const { arena, sprites, theme } = view;
  ctx.fillStyle = theme.stone;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.strokeStyle = theme.stoneEdge;
  ctx.lineWidth = 2;
  for (let x = 0; x < arena.width; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, arena.height);
    ctx.stroke();
  }
  // A tree's shade at the top.
  sprites.draw(ctx, 'deciduous-tree', arena.width - 90, 120, 170, { alpha: 0.9 });

  state.rows.forEach((y, i) => {
    // The long table and its stools.
    ctx.fillStyle = theme.woodEdge;
    roundRect(ctx, state.counterX - 10, y - 6, state.doorX - state.counterX + 10, 30, 10);
    ctx.fill();
    ctx.fillStyle = theme.wood;
    roundRect(ctx, state.counterX - 10, y - 12, state.doorX - state.counterX + 10, 24, 10);
    ctx.fill();
    for (let x = state.counterX + 60; x < state.doorX; x += 110) {
      ctx.fillStyle = i % 2 === 0 ? theme.danger : theme.secondary;
      roundRect(ctx, x - 18, y + 36, 36, 18, 6);
      ctx.fill();
    }
    // Faint hint arrow along the table.
    ctx.globalAlpha = 0.25;
    paintLabel(ctx, view, '→', state.counterX + 100, y + ROW_HALF - 30, 34);
    ctx.globalAlpha = 1;
  });

  for (const c of state.customers) {
    const y = (state.rows[c.row] ?? 0) - 40;
    const walking = c.served < 0 || c.served > 1.1;
    const step = walking && !view.reducedMotion ? Math.abs(Math.sin(view.time * 8 + c.x * 0.05)) * 6 : 0;
    sprites.draw(ctx, c.sprite, c.x, y - step, 84, { flipX: c.served < 0, alpha: c.sulking ? 0.6 : 1 });
    if (c.served >= 0 && !c.sulking && c.served < 1.4) sprites.draw(ctx, 'heart', c.x + 30, y - 56 - c.served * 20, 36);
  }

  for (const g of state.glasses) {
    const y = (state.rows[g.row] ?? 0) - 10;
    if (g.ended >= 0) {
      if (!g.caught) paintGlass(ctx, view, g.x, y + g.ended * 120, false, 1 - g.ended / 0.4);
      continue;
    }
    if (!g.full && g.wait <= 0) {
      const pulse = view.reducedMotion ? 0.5 : (view.time * 2) % 1;
      ctx.globalAlpha = 0.8 * (1 - pulse);
      ctx.strokeStyle = theme.star;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(g.x, y - 22, 34 + pulse * 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    paintGlass(ctx, view, g.x, y, g.full);
  }

  // The counter, the child and the tray.
  ctx.fillStyle = theme.primary;
  roundRect(ctx, 0, HUD_TOP, state.counterX - 10, arena.height - HUD_TOP, 0);
  ctx.fill();
  const midY = state.rows[1] ?? arena.height / 2;
  sprites.draw(ctx, view.player, 46, midY - 40 + bob(view, 3, 3), 90);
  for (let i = 0; i < TRAY; i += 1) paintGlass(ctx, view, 22 + i * 30, midY + 70, true, i < state.tray ? 1 : 0.2);
}

