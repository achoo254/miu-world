// Five-fruit tray's picture: a Tết altar table with red paper, the lacquered flower-shaped tray with a dimple
// for each place, fruit sitting on the tray (Grandma's with a little red tag), the five fruit baskets at the
// side or bottom, the fruit following the finger, a fruit rolling off when it lands by its twin, and a hint
// of which fruit is still missing when the tray is full but short of one.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { HUD_SAFE_TOP } from '../../types';
import { SLOT_RADIUS, type TrayState } from './logic';

export function drawFiveFruitTray(ctx: CanvasRenderingContext2D, state: TrayState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  // The altar: warm wall, red runner and the wooden table.
  ctx.fillStyle = theme.sky[2];
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, HUD_SAFE_TOP - 20, arena.width, arena.height);
  ctx.fillStyle = theme.danger;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(0, HUD_SAFE_TOP - 20, arena.width, 26);
  ctx.globalAlpha = 1;

  // The flower tray.
  const { centre, ringRadius } = state;
  const petals = state.slots.length - 1;
  const outer = ringRadius + SLOT_RADIUS + 18;
  const shine = state.doneAgo >= 0 ? Math.max(0, 1 - state.doneAgo / DONE_GLOW) : 0;
  ctx.fillStyle = theme.danger;
  ctx.strokeStyle = theme.star;
  ctx.lineWidth = 6;
  ctx.beginPath();
  for (let k = 0; k < petals; k += 1) {
    const a = -Math.PI / 2 + (k / petals) * Math.PI * 2;
    ctx.moveTo(centre.x + Math.cos(a) * ringRadius + outer - ringRadius, centre.y + Math.sin(a) * ringRadius);
    ctx.arc(centre.x + Math.cos(a) * ringRadius, centre.y + Math.sin(a) * ringRadius, outer - ringRadius, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.beginPath();
  ctx.arc(centre.x, centre.y, ringRadius, 0, Math.PI * 2);
  ctx.fill();
  // A gold ring inside the places, like a lacquered tray's inlay.
  ctx.beginPath();
  ctx.arc(centre.x, centre.y, Math.max(20, ringRadius - SLOT_RADIUS - 14), 0, Math.PI * 2);
  ctx.stroke();
  if (shine > 0) {
    ctx.globalAlpha = shine * 0.6;
    ctx.fillStyle = theme.star;
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, outer, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  state.slots.forEach((s) => {
    ctx.fillStyle = theme.woodEdge;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.arc(s.x, s.y, SLOT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (!s.fruit) return;
    const pop = view.reducedMotion ? 0 : Math.max(0, 1 - s.placedAgo / 0.25) * 0.2;
    sprites.draw(ctx, s.fruit, s.x, s.y, SLOT_RADIUS * 2, { squash: [1 + pop, 1 - pop] });
    if (s.fixed) {
      ctx.fillStyle = theme.danger;
      ctx.strokeStyle = theme.star;
      ctx.lineWidth = 3;
      roundRect(ctx, s.x + SLOT_RADIUS * 0.4, s.y - SLOT_RADIUS * 0.95, 22, 30, 4);
      ctx.fill();
      ctx.stroke();
    }
  });

  // Baskets of fruit.
  for (const p of state.piles) {
    sprites.draw(ctx, 'basket', p.x, p.y + 14, 96);
    sprites.draw(ctx, p.fruit, p.x, p.y - 8, 70);
  }

  if (state.rolled) {
    const t = state.rolled.ago / 0.8;
    sprites.draw(ctx, state.rolled.fruit, state.rolled.at.x + t * 120, state.rolled.at.y + t * t * 160, SLOT_RADIUS * 1.6, { rotate: t * 8, alpha: 1 - t });
    paintLabel(ctx, view, 'Trùng bên cạnh!', state.rolled.at.x, state.rolled.at.y - SLOT_RADIUS - 20, 26, theme.light);
  }

  const full = state.slots.every((s) => s.fruit !== null);
  if (state.doneAgo >= 0) {
    paintLabel(ctx, view, 'Mâm đẹp quá!', centre.x, centre.y, 40, theme.star);
  } else if (full) {
    const missing = state.piles.filter((p) => !state.slots.some((s) => s.fruit === p.fruit));
    const y = Math.min(arena.height - 40, centre.y + ringRadius + SLOT_RADIUS + 50);
    paintLabel(ctx, view, 'Còn thiếu:', centre.x - 40, y, 28, theme.light);
    missing.forEach((p, i) => sprites.draw(ctx, p.fruit, centre.x + 70 + i * 50, y, 46));
  }

  if (state.carrying && state.carryAt) sprites.draw(ctx, state.carrying, state.carryAt.x, state.carryAt.y - 20, SLOT_RADIUS * 2.1);
}

const DONE_GLOW = 1.4;
