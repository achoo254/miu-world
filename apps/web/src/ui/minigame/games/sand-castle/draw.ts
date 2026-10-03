// Sand castle's picture: a beach (sand below the sky, sea at the far side), the castle's sand platform with four
// round spots for towers, and the child's bucket at the bottom showing how full it is against its green band.
// A built tower rises with a little flag on top; one with too little sand crumbles into a heap, one with too
// much slumps sideways. Shells lie around; a finished castle waves all its flags.
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { SandState, Spot } from './logic';

function paintTower(ctx: CanvasRenderingContext2D, view: DrawView, spot: Spot, r: number): void {
  const { theme } = view;
  const grow = Math.min(1, spot.builtAgo / 0.3);
  const h = r * 1.9 * grow;
  const x = spot.at.x;
  const base = spot.at.y + r * 0.5;
  ctx.fillStyle = theme.groundDeep;
  roundRect(ctx, x - r * 0.8, base - h, r * 1.6, h, 8);
  ctx.fill();
  ctx.fillStyle = theme.ground;
  for (let k = 0; k < 3; k += 1) ctx.fillRect(x - r * 0.8 + k * r * 0.6, base - h - r * 0.25, r * 0.4, r * 0.3);
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, base - h - r * 0.25);
  ctx.lineTo(x, base - h - r * 0.9);
  ctx.stroke();
  ctx.fillStyle = theme.primary;
  const wave = view.reducedMotion ? 0 : Math.sin(view.time * 6 + x) * 4;
  ctx.beginPath();
  ctx.moveTo(x, base - h - r * 0.9);
  ctx.lineTo(x + r * 0.5, base - h - r * 0.75 + wave);
  ctx.lineTo(x, base - h - r * 0.6);
  ctx.fill();
}

export function drawSandCastle(ctx: CanvasRenderingContext2D, state: SandState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const horizon = HUD_SAFE_TOP + 40;
  paintSky(ctx, view, horizon, 8);
  ctx.fillStyle = theme.water;
  ctx.fillRect(0, horizon, arena.width, 40);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, horizon + 40, arena.width, arena.height);
  sprites.draw(ctx, 'spiral-shell', 40, arena.height - 40, 44);
  sprites.draw(ctx, 'spiral-shell', arena.width - 50, horizon + 120, 36);
  const r = state.spotRadius;
  const first = state.spots[0];
  const last = state.spots[state.spots.length - 1];
  if (first && last) {
    ctx.fillStyle = theme.groundDeep;
    ctx.globalAlpha = 0.5;
    roundRect(ctx, first.at.x - r * 1.2, first.at.y + r * 0.2, last.at.x - first.at.x + r * 2.4, r * 0.7, 14);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  for (const spot of state.spots) {
    if (spot.built) {
      paintTower(ctx, view, spot, r);
      continue;
    }
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(spot.at.x, spot.at.y + r * 0.3, r, r * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (spot.failedAgo < 1) {
      const t = spot.failedAgo;
      ctx.fillStyle = theme.groundDeep;
      ctx.globalAlpha = 1 - t;
      ctx.beginPath();
      if (spot.failed === 'crumble') ctx.ellipse(spot.at.x, spot.at.y + r * 0.3, r * (0.6 + t * 0.4), r * 0.3, 0, Math.PI, 0);
      else ctx.ellipse(spot.at.x + t * 20, spot.at.y + r * 0.1, r * 1.1, r * 0.45, 0.3, Math.PI, 0);
      ctx.fill();
      ctx.globalAlpha = 1;
      paintLabel(ctx, view, spot.failed === 'crumble' ? 'Vỡ rồi!' : 'Sụt rồi!', spot.at.x, spot.at.y - r, 24);
    }
  }

  // The bucket with its sand and band.
  const b = state.bucket;
  const bw = 120;
  const bh = 130;
  const top = b.y - bh / 2;
  ctx.fillStyle = theme.secondary;
  roundRect(ctx, b.x - bw / 2, top, bw, bh, 14);
  ctx.fill();
  const inside = bh - 16;
  const sand = Math.min(1.2, state.fill) / 1.2;
  ctx.fillStyle = theme.groundDeep;
  ctx.fillRect(b.x - bw / 2 + 8, top + 8 + inside * (1 - sand), bw - 16, inside * sand);
  const yOf = (f: number): number => top + 8 + inside * (1 - f / 1.2);
  ctx.fillStyle = theme.leaf;
  ctx.globalAlpha = 0.55;
  ctx.fillRect(b.x - bw / 2 - 10, yOf(state.band.hi), bw + 20, yOf(state.band.lo) - yOf(state.band.hi));
  ctx.globalAlpha = 1;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  roundRect(ctx, b.x - bw / 2, top, bw, bh, 14);
  ctx.stroke();
  if (state.filling && !view.reducedMotion) {
    for (let i = 0; i < 4; i += 1) {
      ctx.fillStyle = theme.groundDeep;
      ctx.beginPath();
      ctx.arc(b.x - 20 + ((i * 17 + view.time * 200) % 40), top - 30 + ((view.time * 300 + i * 13) % 30), 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const hint = state.fill <= 0.02 ? 'Giữ ngón tay để xúc cát' : 'Chạm chỗ trống để úp tháp';
  paintLabel(ctx, view, hint, arena.width / 2, top - 46, 26);
}
