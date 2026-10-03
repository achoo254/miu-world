// Bịt mắt bắt dê's picture: a village yard (grass, a few trees and the fence) covered in darkness but for a
// soft circle around the blindfolded child; rings of light spreading from each bleat; the goat when it is
// within her sight; a caught goat jumping up in a burst of light.
import { paintLabel } from '../../draw-kit';
import type { DrawView } from '../../types';
import { SIGHT, type BlindGoatState } from './logic';

export function drawBlindGoat(ctx: CanvasRenderingContext2D, state: BlindGoatState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { field } = state;
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = theme.leaf;
  for (let i = 0; i < 40; i += 1) ctx.fillRect(field.x + ((i * 157) % field.w), field.y + ((i * 97) % field.h), 8, 16);
  ctx.globalAlpha = 1;
  for (let i = 0; i < 5; i += 1) sprites.draw(ctx, 'deciduous-tree', field.x + ((i * 233 + 80) % field.w), field.y + ((i * 151 + 60) % field.h), 90);
  const g = state.goat;
  const seen = Math.hypot(g.x - state.me.x, g.y - state.me.y) < SIGHT + 30;
  if (seen) sprites.draw(ctx, 'goat', g.x, g.y, 84, { flipX: Math.cos(state.goatHeading) > 0 });

  // Darkness with a hole around her.
  ctx.save();
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.93;
  ctx.beginPath();
  ctx.rect(0, 0, arena.width, arena.height);
  ctx.arc(state.me.x, state.me.y, SIGHT, 0, Math.PI * 2, true);
  ctx.fill('evenodd');
  ctx.restore();
  const glow = ctx.createRadialGradient(state.me.x, state.me.y, SIGHT * 0.6, state.me.x, state.me.y, SIGHT);
  glow.addColorStop(0, 'rgba(0,0,0,0)');
  glow.addColorStop(1, theme.ink);
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(state.me.x, state.me.y, SIGHT, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  for (const b of state.bleats) {
    for (const lag of [0, 0.25]) {
      const t = (b.age - lag) / 1.4;
      if (t <= 0) continue;
      ctx.globalAlpha = Math.max(0, 0.8 * (1 - t));
      ctx.strokeStyle = theme.star;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 20 + t * 160, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (b.age < 0.5) paintLabel(ctx, view, 'Be he!', b.x, b.y - 40, 26, theme.star);
  }
  ctx.globalAlpha = 1;
  sprites.draw(ctx, view.player, state.me.x, state.me.y, 86);
  // The blindfold.
  ctx.fillStyle = theme.danger;
  ctx.fillRect(state.me.x - 34, state.me.y - 14, 68, 13);
  if (state.caughtAgo >= 0 && state.caughtAgo < 1) {
    const t = state.caughtAgo;
    ctx.globalAlpha = 1 - t;
    sprites.draw(ctx, 'goat', state.caughtAt.x, state.caughtAt.y - t * 60, 100);
    paintLabel(ctx, view, 'Bắt được rồi!', state.caughtAt.x, state.caughtAt.y - 90 - t * 30, 36, theme.star);
    ctx.globalAlpha = 1;
  }
}
