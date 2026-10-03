// Reel tension's picture: a river bank (sky, far hills, water with ripples), the child on a wooden pier with
// her rod bending and the line running into the water, and on the right the tall gauge: water inside a wooden
// frame, the green box, the fish wriggling, and the catch meter beside it. A caught fish leaps out.
import { bob, paintHills, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { fishInZone, type ReelState } from './logic';

export function drawReelTension(ctx: CanvasRenderingContext2D, state: ReelState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const waterY = arena.height * 0.55;
  paintSky(ctx, view, waterY, 8);
  paintHills(ctx, view, waterY, 0, 90, theme.leaf);
  ctx.fillStyle = theme.water;
  ctx.fillRect(0, waterY, arena.width, arena.height - waterY);
  ctx.strokeStyle = theme.waterLight;
  ctx.lineWidth = 4;
  for (let i = 0; i < 6; i += 1) {
    const y = waterY + 30 + i * 46;
    const shift = view.reducedMotion ? 0 : (view.time * 20 + i * 40) % 140;
    ctx.beginPath();
    for (let x = -140 + shift; x < arena.width; x += 140) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + 50, y);
    }
    ctx.stroke();
  }

  // The pier and the child with her rod.
  const pierX = 30;
  const pierW = Math.min(arena.width * 0.3, 220);
  ctx.fillStyle = theme.wood;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 4;
  roundRect(ctx, pierX - 40, waterY - 20, pierW, 28, 6);
  ctx.fill();
  ctx.stroke();
  for (const x of [pierX + 10, pierX + pierW - 70]) ctx.fillRect(x, waterY + 8, 14, 90);
  const childX = pierX + pierW * 0.45;
  const childY = waterY - 64;
  sprites.draw(ctx, view.player, childX, childY + bob(view, 2, 2), 90);
  const tug = !state.result && fishInZone(state) ? 0 : Math.sin(view.time * 12) * 6;
  const tipX = childX + Math.min(arena.width * 0.3, 210);
  const tipY = childY - 90 + tug;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(childX + 20, childY + 10);
  ctx.quadraticCurveTo(childX + 90, childY - 90, tipX, tipY);
  ctx.stroke();
  const bobberX = Math.min(state.barX - 90, tipX + 90);
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(bobberX, waterY + 40);
  ctx.stroke();
  ctx.fillStyle = theme.danger;
  ctx.beginPath();
  ctx.arc(bobberX, waterY + 40 + tug * 0.5, 10, 0, Math.PI * 2);
  ctx.fill();

  // The gauge.
  const { barX, barTop, barBottom } = state;
  const half = 44;
  ctx.fillStyle = theme.wood;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  roundRect(ctx, barX - half - 12, barTop - 12, half * 2 + 24, barBottom - barTop + 24, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.secondary;
  ctx.fillRect(barX - half, barTop, half * 2, barBottom - barTop);
  const inside = fishInZone(state);
  ctx.fillStyle = theme.leaf;
  ctx.globalAlpha = inside ? 0.85 : 0.6;
  roundRect(ctx, barX - half + 3, barBottom - state.zone - state.zoneHeight, half * 2 - 6, state.zoneHeight, 12);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = inside ? theme.star : theme.light;
  ctx.lineWidth = 4;
  ctx.stroke();
  const fishY = barBottom - state.fish;
  const wriggle = view.reducedMotion ? 0 : Math.sin(view.time * 14) * 0.25;
  if (state.result !== 'caught') sprites.draw(ctx, state.kind, barX, fishY, 64, { rotate: wriggle, alpha: state.result === 'escaped' ? 1 - state.resultAgo : 1 });

  // The catch meter.
  const meterX = barX - half - 44;
  ctx.fillStyle = theme.ink;
  roundRect(ctx, meterX - 12, barTop, 24, barBottom - barTop, 12);
  ctx.fill();
  ctx.fillStyle = state.meter > 0.66 ? theme.leaf : state.meter > 0.33 ? theme.star : theme.danger;
  const fill = (barBottom - barTop - 8) * state.meter;
  roundRect(ctx, meterX - 8, barBottom - 4 - fill, 16, fill, 8);
  ctx.fill();

  if (state.result === 'caught') {
    // The fish leaps up out of the water toward the child.
    const t = Math.min(1, state.resultAgo / 0.9);
    const x = bobberX + (childX + 60 - bobberX) * t;
    const y = waterY + 40 - Math.sin(t * Math.PI) * 200 - t * 60;
    sprites.draw(ctx, state.kind, x, y, 90, { rotate: t * 6 });
    paintLabel(ctx, view, 'Câu được rồi!', arena.width * 0.35, arena.height * 0.25, 46, theme.star);
  } else if (state.result === 'escaped') paintLabel(ctx, view, 'Cá chạy mất!', arena.width * 0.35, arena.height * 0.25, 40);
  else if (state.caught === 0 && state.time < 3) paintLabel(ctx, view, 'Giữ tay: hộp xanh lên', arena.width * 0.35, arena.height * 0.25, 30);
}
