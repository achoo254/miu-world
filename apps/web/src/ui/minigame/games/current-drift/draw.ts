// Current drift's picture: a blue stream with arrows drifting along the flow (they bend around rocks), sandy
// banks, the rocks the child dropped (with a faint ring where the water swirls), the island with its palm at the
// far end, and the bottle with its letter bobbing at the start, then drifting.
import { bob, paintLabel } from '../../draw-kit';
import type { DrawView } from '../../types';
import { flowAt, ROCK_R, type DriftState } from './logic';

export function drawCurrentDrift(ctx: CanvasRenderingContext2D, state: DriftState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, arena.width, arena.height);
  const { area } = state;
  ctx.fillStyle = theme.water;
  ctx.fillRect(area.x, area.y, area.w, area.h);
  // Flow arrows on a grid, sliding with the water.
  ctx.strokeStyle = theme.waterLight;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.6;
  const shift = view.reducedMotion ? 0 : (view.time * 30) % 70;
  for (let y = area.y + 35; y < area.y + area.h; y += 70) {
    for (let x = area.x + 35; x < area.x + area.w; x += 70) {
      const p = state.alongX ? { x: x + shift, y } : { x, y: y + shift };
      if (p.x > area.x + area.w || p.y > area.y + area.h) continue;
      const v = flowAt(state, state.rocks, p);
      const s = Math.hypot(v.x, v.y) || 1;
      const ux = v.x / s;
      const uy = v.y / s;
      ctx.beginPath();
      ctx.moveTo(p.x - ux * 14, p.y - uy * 14);
      ctx.lineTo(p.x + ux * 14, p.y + uy * 14);
      ctx.lineTo(p.x + ux * 4 - uy * 7, p.y + uy * 4 + ux * 7);
      ctx.moveTo(p.x + ux * 14, p.y + uy * 14);
      ctx.lineTo(p.x + ux * 4 + uy * 7, p.y + uy * 4 - ux * 7);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  const { island } = state;
  ctx.fillStyle = theme.ground;
  ctx.beginPath();
  ctx.arc(island.x, island.y, island.r, 0, Math.PI * 2);
  ctx.fill();
  sprites.draw(ctx, 'desert-island', island.x, island.y - 10, island.r * 1.8);
  for (const r of state.rocks) {
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(r.x, r.y, ROCK_R * 2.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    sprites.draw(ctx, 'rock', r.x, r.y, ROCK_R * 2.4);
  }
  const lost = state.phase === 'lost';
  sprites.draw(ctx, 'envelope', state.bottle.x, state.bottle.y + (state.phase === 'set' ? bob(view, 3, 4) : 0), 64, { rotate: state.driftTime * 2, alpha: lost ? 0.5 : 1 });
  if (state.phase === 'set') {
    ctx.strokeStyle = theme.star;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.5 + 0.4 * Math.sin(view.time * 5);
    ctx.beginPath();
    ctx.arc(state.bottle.x, state.bottle.y, 46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (state.phase === 'arrived') paintLabel(ctx, view, 'Tới đảo rồi!', arena.width / 2, area.y + 40, 48, theme.star);
  if (lost) paintLabel(ctx, view, 'Trôi lạc mất rồi!', arena.width / 2, area.y + 40, 40);
}
