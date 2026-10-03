// Skipping stones' picture: sky and far hills, a lake from the left bank to the edge, stars floating on it, the
// child's character on the bank. The stone arcs from skip to skip, each touch leaving a widening ring on the
// water; the number of skips shows big after the throw, and pebbles left to throw sit on the bank.
import { paintHills, paintLabel, paintSky } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { stoneAt, type StonesState } from './logic';

export function drawSkippingStones(ctx: CanvasRenderingContext2D, state: StonesState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const w = state.waterY;
  paintSky(ctx, view, w, 8);
  paintHills(ctx, view, w, 40, 70, theme.leaf);
  ctx.fillStyle = theme.water;
  ctx.fillRect(0, w, arena.width, arena.height - w);
  ctx.fillStyle = theme.waterLight;
  ctx.globalAlpha = 0.4;
  for (let y = w + 30; y < arena.height; y += 50) ctx.fillRect(((y * 37 + view.time * 20) % arena.width) - 60, y, 120, 4);
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.ground;
  ctx.beginPath();
  ctx.moveTo(0, w - 20);
  ctx.lineTo(state.bankX + 20, w - 20);
  ctx.lineTo(state.bankX + 50, arena.height);
  ctx.lineTo(0, arena.height);
  ctx.fill();
  for (const star of state.stars) if (!star.taken) sprites.draw(ctx, 'star', star.x, w - 10 + Math.sin(view.time * 3 + star.x) * 4, 48);
  const c = state.current;
  if (c) {
    c.skips.forEach((x, i) => {
      const since = c.age - (c.flight * (i + 1)) / c.skips.length;
      if (since < 0 || since > 1.2) return;
      ctx.strokeStyle = theme.light;
      ctx.globalAlpha = 1 - since / 1.2;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(x, w + 4, 10 + since * 50, 4 + since * 14, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    const p = stoneAt(state);
    if (p && c.age < c.flight) sprites.draw(ctx, 'rock', p.x, p.y, 34, { rotate: view.reducedMotion ? 0 : c.age * 14 });
  }
  sprites.draw(ctx, view.player, state.bankX - 30, w - 70, 100);
  const left = state.stones - state.thrown;
  for (let i = 0; i < left; i += 1) sprites.draw(ctx, 'rock', 20 + i * 22, w + 20, 24);
  if (c && c.age > c.flight * 0.5) paintLabel(ctx, view, `${state.lastSkips} lần nảy!`, arena.width / 2, HUD_SAFE_TOP + 40, 44, theme.star);
  else if (state.thrown === 0) paintLabel(ctx, view, 'Vuốt nhanh sang phải →', arena.width / 2, HUD_SAFE_TOP + 40, 34);
}
