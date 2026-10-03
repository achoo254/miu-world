// Net cast's picture: the river from above with ripples, shoals of fish, the canoe with the child at the bottom,
// the net flying in an arc and opening out (its shadow on the water shows where it will land), then hauled
// back with the fish in it.
import { paintLabel } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { NetCastState } from './logic';
import { FLY_SECONDS } from './logic';

function paintNet(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, r: number, alpha: number): void {
  const { theme } = view;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i += 1) {
    const a = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.stroke();
  }
  for (const k of [0.35, 0.7]) {
    ctx.beginPath();
    ctx.arc(x, y, r * k, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawNetCast(ctx: CanvasRenderingContext2D, state: NetCastState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.water;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.strokeStyle = theme.waterLight;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 14; i += 1) {
    const x = (i * 197 + view.time * 12) % (arena.width + 80) - 40;
    const y = HUD_SAFE_TOP + ((i * 131) % (arena.height - HUD_SAFE_TOP));
    ctx.beginPath();
    ctx.arc(x, y, 16, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Banks.
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, 18, arena.height);
  ctx.fillRect(arena.width - 18, 0, 18, arena.height);

  for (const f of state.fish) {
    if (f.caughtAt >= 0) continue;
    sprites.draw(ctx, f.tropical ? 'tropical-fish' : 'fish', f.x, f.y, 52, { flipX: f.vx > 0, alpha: 0.95 });
  }
  const { boat, target, radius } = state;
  if (state.phase === 'flying') {
    const t = Math.min(1, state.phaseAgo / FLY_SECONDS);
    // Shadow where it lands, then the net in the air growing as it opens.
    ctx.globalAlpha = 0.25 + 0.2 * t;
    ctx.fillStyle = theme.ink;
    ctx.beginPath();
    ctx.arc(target.x, target.y, radius * (0.4 + 0.6 * t), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    const x = boat.x + (target.x - boat.x) * t;
    const y = boat.y - 60 + (target.y - boat.y + 60) * t - Math.sin(t * Math.PI) * 120;
    paintNet(ctx, view, x, y, radius * (0.3 + 0.7 * t), 1);
  } else if (state.phase === 'hauling') {
    const t = Math.min(1, state.phaseAgo / 0.7);
    const x = target.x + (boat.x - target.x) * t;
    const y = target.y + (boat.y - 60 - target.y) * t;
    paintNet(ctx, view, x, y, radius * (1 - 0.6 * t), 1);
    const caught = state.fish.filter((f) => f.caughtAt >= 0);
    for (const [i, f] of caught.entries()) sprites.draw(ctx, f.tropical ? 'tropical-fish' : 'fish', x + Math.cos(i * 1.7) * radius * 0.4 * (1 - t), y + Math.sin(i * 1.7) * radius * 0.3 * (1 - t), 44);
    if (t < 0.6) paintLabel(ctx, view, state.lastCatch > 0 ? `+${state.lastCatch}` : 'Trượt rồi', target.x, target.y - radius - 20, 36, state.lastCatch > 0 ? theme.star : theme.light);
  }
  sprites.draw(ctx, 'canoe', boat.x, boat.y + 10, 190);
  sprites.draw(ctx, view.player, boat.x, boat.y - 30, 80);
  if (state.phase === 'ready' && state.time < 6) paintLabel(ctx, view, 'Vuốt về phía đàn cá', arena.width / 2, boat.y - 110, 30, theme.light);
}
