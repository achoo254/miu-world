// Goldfish scooping's picture: a fair tub of water with ripples, fish turning as they swim (and darting when
// scared), the red paper scoop in the water (its paper greyer and cracked as it soaks), fish flying up into
// the glass bowl, the bowl with the fish caught so far, a bar of paper left, and "Rách rồi!" when it tears.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { FISH, SCOOP_RADIUS, type GoldfishState } from './logic';

export function drawGoldfishScoop(ctx: CanvasRenderingContext2D, state: GoldfishState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = theme.woodEdge;
  for (let x = 0; x < arena.width; x += 80) ctx.fillRect(x, 0, 4, arena.height);
  ctx.globalAlpha = 1;

  const { tub } = state;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.danger;
  ctx.lineWidth = 10;
  roundRect(ctx, tub.x - 12, tub.y - 12, tub.w + 24, tub.h + 24, 40);
  ctx.fill();
  ctx.stroke();
  const water = ctx.createLinearGradient(0, tub.y, 0, tub.y + tub.h);
  water.addColorStop(0, theme.water);
  water.addColorStop(1, theme.secondary);
  ctx.fillStyle = water;
  roundRect(ctx, tub.x, tub.y, tub.w, tub.h, 30);
  ctx.fill();
  ctx.save();
  roundRect(ctx, tub.x, tub.y, tub.w, tub.h, 30);
  ctx.clip();
  ctx.strokeStyle = theme.waterLight;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 3;
  for (let i = 0; i < 7; i += 1) {
    const r = ((view.time * 30 + i * 70) % 260) + 10;
    ctx.beginPath();
    ctx.arc(tub.x + ((i * 173) % tub.w), tub.y + ((i * 131) % tub.h), r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  for (const f of state.fish) {
    if (f.caught >= 0) continue;
    const wiggle = view.reducedMotion ? 0 : Math.sin(view.time * (f.scared > 0 ? 30 : 10) + f.x) * 0.15;
    const right = Math.cos(f.heading) > 0;
    sprites.draw(ctx, FISH[f.kind] ?? 'fish', f.x, f.y, 66, { flipX: right, rotate: wiggle + Math.sin(f.heading) * 0.3 * (right ? 1 : -1) });
  }
  const scoop = state.scoop;
  if (scoop) {
    ctx.globalAlpha = 0.25 + 0.55 * Math.max(0, state.paper);
    ctx.fillStyle = theme.light;
    ctx.beginPath();
    ctx.arc(scoop.x, scoop.y, SCOOP_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (state.paper < 0.5) {
      ctx.strokeStyle = theme.stoneEdge;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = 0; k < 4; k += 1) {
        const a = k * 1.7;
        ctx.moveTo(scoop.x, scoop.y);
        ctx.lineTo(scoop.x + Math.cos(a) * SCOOP_RADIUS * (0.9 - state.paper), scoop.y + Math.sin(a) * SCOOP_RADIUS * (0.9 - state.paper));
      }
      ctx.stroke();
    }
    ctx.strokeStyle = theme.danger;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(scoop.x, scoop.y, SCOOP_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineCap = 'round';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(scoop.x + SCOOP_RADIUS * 0.7, scoop.y + SCOOP_RADIUS * 0.7);
    ctx.lineTo(scoop.x + SCOOP_RADIUS * 1.5, scoop.y + SCOOP_RADIUS * 1.5);
    ctx.stroke();
  }
  ctx.restore();

  // The bowl.
  const b = state.bowl;
  ctx.fillStyle = theme.waterLight;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(b.x, b.y, 72, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 1;
  for (let k = 0; k < Math.min(6, state.score); k += 1) sprites.draw(ctx, FISH[k % 2] ?? 'fish', b.x - 34 + (k % 3) * 34, b.y - 14 + Math.floor(k / 3) * 30, 38, { flipX: k % 2 === 0 });
  for (const f of state.fish) {
    if (f.caught < 0) continue;
    const t = Math.min(1, f.caught / 0.7);
    sprites.draw(ctx, FISH[f.kind] ?? 'fish', f.fromX + (b.x - f.fromX) * t, f.fromY + (b.y - f.fromY) * t - Math.sin(t * Math.PI) * 140, 66 - t * 20, { rotate: t * 6 });
  }
  // Paper left.
  const barW = 130;
  ctx.fillStyle = theme.stone;
  roundRect(ctx, b.x - barW / 2, b.y - 120, barW, 18, 9);
  ctx.fill();
  ctx.fillStyle = state.paper > 0.4 ? theme.light : theme.danger;
  roundRect(ctx, b.x - barW / 2, b.y - 120, barW * Math.max(0, state.torn ? 0 : state.paper), 18, 9);
  ctx.fill();
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  roundRect(ctx, b.x - barW / 2, b.y - 120, barW, 18, 9);
  ctx.stroke();
  if (state.tornAgo < 1.2) paintLabel(ctx, view, state.scoops > 0 ? 'Rách rồi! Lấy vợt mới' : 'Hết vợt rồi', arena.width / 2, tub.y + tub.h / 2, 42, theme.light);
  if (state.liftAgo < 0.8 && state.lifted > 1) paintLabel(ctx, view, `${state.lifted} con!`, arena.width / 2, tub.y + 50, 44, theme.star);
}
