// Cắp cua's picture: sea at the top, a sandy beach with shells and footprints, crabs scuttling sideways with
// their claws up (a held one waves its legs), and the woven basket at the bottom with its lid: shut, or
// swung open with a timer ring that turns red when crabs are about to climb out. The count sits on the basket.
import { paintLabel } from '../../draw-kit';
import type { DrawView } from '../../types';
import { HUD_SAFE_TOP } from '../../types';
import { OPEN_GRACE, type CapCuaState } from './logic';

export function drawCapCua(ctx: CanvasRenderingContext2D, state: CapCuaState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  // Sea and beach.
  const seaBottom = HUD_SAFE_TOP + 60;
  ctx.fillStyle = theme.water;
  ctx.fillRect(0, 0, arena.width, seaBottom);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, seaBottom, arena.width, arena.height - seaBottom);
  ctx.fillStyle = theme.waterLight;
  ctx.beginPath();
  ctx.moveTo(0, seaBottom);
  for (let x = 0; x <= arena.width + 30; x += 30) ctx.lineTo(x, seaBottom + Math.sin(x / 40 + view.time * 2) * 10 + 8);
  ctx.lineTo(arena.width, seaBottom - 20);
  ctx.lineTo(0, seaBottom - 20);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 8; i += 1) {
    const x = (i * 233) % arena.width;
    const y = seaBottom + 60 + ((i * 167) % Math.max(1, arena.height - seaBottom - 260));
    sprites.draw(ctx, 'spiral-shell', x, y, 34, { alpha: 0.8, rotate: i });
  }

  for (const c of state.crabs) {
    if (c.held) continue;
    const step = view.reducedMotion ? 0 : Math.sin(view.time * 18 + c.id) * 0.12;
    sprites.draw(ctx, 'crab', c.x, c.y, c.escaped ? 70 : 78, { rotate: step, flipX: c.vx < 0 });
  }

  // The basket and its lid.
  const { basket } = state;
  const wobble = !view.reducedMotion && state.fedAgo < 0.3 ? Math.sin(state.fedAgo * 40) * 0.06 : 0;
  ctx.save();
  ctx.translate(basket.x, basket.y);
  ctx.rotate(wobble);
  sprites.draw(ctx, 'basket', 0, 0, basket.r * 2.1);
  // The lid: a woven disc on top, or swung up on its hinge.
  ctx.fillStyle = theme.wood;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 5;
  ctx.beginPath();
  if (state.lidOpen) ctx.ellipse(-basket.r * 0.85, -basket.r * 0.95, basket.r * 0.2, basket.r * 0.62, -0.35, 0, Math.PI * 2);
  else ctx.ellipse(0, -basket.r * 0.42, basket.r * 0.82, basket.r * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  paintLabel(ctx, view, String(state.inside), basket.x, basket.y + basket.r * 0.25, 40, theme.light);
  if (state.lidOpen) {
    const left = Math.max(0, 1 - state.openFor / OPEN_GRACE);
    ctx.lineWidth = 8;
    ctx.strokeStyle = left > 0 ? theme.star : theme.danger;
    ctx.beginPath();
    ctx.arc(basket.x, basket.y, basket.r + 14, -Math.PI / 2, -Math.PI / 2 + (left > 0 ? left : 1) * Math.PI * 2);
    ctx.stroke();
    paintLabel(ctx, view, 'Chạm để đậy nắp!', basket.x, basket.y - basket.r - 40, 30, left > 0 ? theme.light : theme.danger);
  }

  const carried = state.crabs.find((c) => c.held);
  if (carried) {
    const wave = view.reducedMotion ? 0 : Math.sin(view.time * 30) * 0.2;
    sprites.draw(ctx, 'crab', carried.x, carried.y, 92, { rotate: wave });
  }
}
