// Ice fishing's picture: a pale blue frozen lake with cracks, fish shadows gliding under the ice, five dark
// holes with rings of snow, the penguin standing at the hole with its line (the bobber dips while it sinks),
// a fish leaping out when caught and dropping into the bucket in the corner, and a splash for an empty line.
import { paintLabel } from '../../draw-kit';
import type { DrawView } from '../../types';
import { HUD_SAFE_TOP } from '../../types';
import { LINE_SECONDS, type IceFishingState } from './logic';

export function drawIceFishing(ctx: CanvasRenderingContext2D, state: IceFishingState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  // Sky band and the lake.
  ctx.fillStyle = theme.sky[1];
  ctx.fillRect(0, 0, arena.width, HUD_SAFE_TOP);
  const ice = ctx.createLinearGradient(0, HUD_SAFE_TOP, 0, arena.height);
  ice.addColorStop(0, theme.light);
  ice.addColorStop(1, theme.waterLight);
  ctx.fillStyle = ice;
  ctx.fillRect(0, HUD_SAFE_TOP - 10, arena.width, arena.height);
  ctx.strokeStyle = theme.water;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 3;
  for (let i = 0; i < 9; i += 1) {
    const x = (i * 263) % arena.width;
    const y = HUD_SAFE_TOP + ((i * 151) % (arena.height - HUD_SAFE_TOP));
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 40, y + 18);
    ctx.lineTo(x + 70, y + 8);
    ctx.lineTo(x + 110, y + 30);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Fish shadows under the ice.
  for (const f of state.fish) {
    const angle = Math.atan2(f.vy, f.vx);
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = theme.ink;
    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    const wag = view.reducedMotion ? 0 : Math.sin(view.time * 10 + f.id) * 5;
    ctx.beginPath();
    ctx.moveTo(-28, 0);
    ctx.lineTo(-48, -12 + wag);
    ctx.lineTo(-48, 12 + wag);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // Holes.
  state.holes.forEach((h, i) => {
    ctx.fillStyle = theme.light;
    ctx.beginPath();
    ctx.ellipse(h.x, h.y + 6, state.holeRadius + 14, (state.holeRadius + 14) * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    const water = ctx.createRadialGradient(h.x, h.y, 4, h.x, h.y, state.holeRadius);
    water.addColorStop(0, theme.water);
    water.addColorStop(1, theme.ink);
    ctx.fillStyle = water;
    ctx.beginPath();
    ctx.ellipse(h.x, h.y, state.holeRadius, state.holeRadius * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = theme.waterLight;
    ctx.stroke();
    if (state.empty?.hole === i) {
      ctx.globalAlpha = 1 - state.empty.ago / 0.6;
      ctx.strokeStyle = theme.light;
      ctx.beginPath();
      ctx.ellipse(h.x, h.y, 20 + state.empty.ago * 60, (20 + state.empty.ago * 60) * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  });

  // The penguin and its line.
  const hole = state.line?.hole ?? state.catching?.hole ?? null;
  const at = hole === null ? null : state.holes[hole];
  if (at) {
    const px = at.x - state.holeRadius - 20;
    sprites.draw(ctx, 'penguin', px, at.y - 30, 84, { flipX: true });
    ctx.strokeStyle = theme.woodEdge;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(px + 20, at.y - 40);
    ctx.lineTo(at.x - 4, at.y - 80);
    ctx.stroke();
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(at.x - 4, at.y - 80);
    ctx.lineTo(at.x, at.y);
    ctx.stroke();
    if (state.line) {
      const dip = view.reducedMotion ? 0 : Math.sin(view.time * 8) * 3;
      ctx.fillStyle = theme.danger;
      ctx.beginPath();
      ctx.arc(at.x, at.y - 2 + dip, 9, 0, Math.PI * 2);
      ctx.fill();
      // How long the line still waits.
      const left = 1 - state.line.ago / LINE_SECONDS;
      ctx.strokeStyle = theme.star;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(at.x, at.y, state.holeRadius + 22, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2);
      ctx.stroke();
    }
  } else {
    sprites.draw(ctx, 'penguin', 70, arena.height - 70, 90);
  }
  if (state.catching && at) {
    const t = state.catching.ago / 0.8;
    const x = at.x + (state.bucket.x - at.x) * t;
    const y = at.y - Math.sin(t * Math.PI) * 160 + (state.bucket.y - at.y) * t;
    sprites.draw(ctx, 'fish', x, y, 64, { rotate: t * Math.PI * 2 });
  }
  sprites.draw(ctx, 'bucket', state.bucket.x, state.bucket.y, 90);
  paintLabel(ctx, view, String(state.score), state.bucket.x, state.bucket.y + 6, 30);
  if (state.time < 3 && !state.line) paintLabel(ctx, view, 'Chạm lỗ băng nơi cá sắp bơi tới', arena.width / 2, HUD_SAFE_TOP + 16, 28, theme.primary);
}
