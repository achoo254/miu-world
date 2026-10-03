// Bobber fishing's picture: a pond with lily pads and gentle ripples, dark fish shadows gliding under the
// surface, the child on a wooden jetty with a bent rod, the line out to a red-and-white float that trembles
// on a nibble and goes right under on a bite ("!" and a splash ring), and a landed fish flying up to her.
import { bob, paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { Fish, FishingState } from './logic';

function paintPond(ctx: CanvasRenderingContext2D, view: DrawView, state: FishingState): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, arena.width, arena.height);
  const { water } = state;
  const gradient = ctx.createLinearGradient(0, water.top, 0, water.bottom);
  gradient.addColorStop(0, theme.waterLight);
  gradient.addColorStop(1, theme.water);
  ctx.fillStyle = gradient;
  roundRect(ctx, water.left - 20, water.top - 30, water.right - water.left + 40, water.bottom - water.top + 70, 60);
  ctx.fill();
  // Ripple lines drifting across.
  ctx.strokeStyle = theme.light;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 3;
  for (let i = 0; i < 9; i += 1) {
    const y = water.top + 30 + ((i * 97) % (water.bottom - water.top - 40));
    const x = water.left + (((i * 173 + view.time * 18) % (water.right - water.left - 80)) + 40);
    ctx.beginPath();
    ctx.moveTo(x - 26, y);
    ctx.quadraticCurveTo(x, y - 8, x + 26, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  sprites.draw(ctx, 'lotus', water.left + 40, water.top + 20, 70);
  sprites.draw(ctx, 'lotus', water.right - 50, water.bottom - 10, 64);
}

function paintShadowFish(ctx: CanvasRenderingContext2D, view: DrawView, fish: Fish, heading: number): void {
  ctx.save();
  ctx.translate(fish.x, fish.y);
  ctx.rotate(heading);
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = view.theme.ink;
  ctx.beginPath();
  ctx.ellipse(0, 0, 38, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  const wag = view.reducedMotion ? 0 : Math.sin(view.time * 10 + fish.id) * 6;
  ctx.beginPath();
  ctx.moveTo(-30, 0);
  ctx.lineTo(-56, -14 + wag);
  ctx.lineTo(-56, 14 + wag);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

function floatPosition(state: FishingState): { x: number; y: number; lift: number } {
  const f = state.float;
  if (f.phase === 'ready') return { x: state.rodX, y: state.rodY, lift: 0 };
  if (f.phase === 'flying' || f.phase === 'reeling') {
    const p = Math.min(1, f.t / (f.phase === 'flying' ? 0.45 : 0.5));
    const fromX = f.phase === 'flying' ? f.fromX : f.fromX;
    const toX = f.phase === 'flying' ? f.x : state.rodX;
    const fromY = f.phase === 'flying' ? f.fromY : f.fromY;
    const toY = f.phase === 'flying' ? f.y : state.rodY;
    return { x: fromX + (toX - fromX) * p, y: fromY + (toY - fromY) * p, lift: Math.sin(p * Math.PI) * 120 };
  }
  return { x: f.x, y: f.y, lift: 0 };
}

export function drawBobberFishing(ctx: CanvasRenderingContext2D, state: FishingState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintPond(ctx, view, state);
  for (const fish of state.fish) paintShadowFish(ctx, view, fish, Math.atan2(fish.ty - fish.y, fish.tx - fish.x));

  // The jetty and the child with her rod.
  const jettyTop = arena.height - 150;
  ctx.fillStyle = theme.wood;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 4;
  roundRect(ctx, arena.width / 2 - 170, jettyTop, 340, 170, 10);
  ctx.fill();
  ctx.stroke();
  for (let x = arena.width / 2 - 170 + 56; x < arena.width / 2 + 170; x += 56) {
    ctx.beginPath();
    ctx.moveTo(x, jettyTop);
    ctx.lineTo(x, arena.height);
    ctx.stroke();
  }
  const childX = arena.width / 2 - 20;
  const childY = arena.height - 80;
  sprites.draw(ctx, view.player, childX, childY + bob(view, 2, 2), 120);
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(childX + 30, childY - 5);
  ctx.quadraticCurveTo(state.rodX - 10, state.rodY + 30, state.rodX, state.rodY);
  ctx.stroke();

  const f = state.float;
  const at = floatPosition(state);
  const fy = at.y - at.lift;
  // The line, sagging a little.
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(state.rodX, state.rodY);
  ctx.quadraticCurveTo((state.rodX + at.x) / 2, Math.max(state.rodY, fy) + 30, at.x, fy);
  ctx.stroke();
  ctx.lineCap = 'butt';

  const under = f.phase === 'bite';
  const tremble = f.phase === 'nibble' && !view.reducedMotion ? Math.sin(view.time * 60) * 4 : 0;
  if (f.phase === 'floating' || f.phase === 'nibble' || under) {
    ctx.strokeStyle = theme.light;
    ctx.globalAlpha = under ? 0.9 : 0.4;
    ctx.lineWidth = under ? 5 : 3;
    const ring = under ? 26 + (f.t * 70) % 40 : 24;
    ctx.beginPath();
    ctx.ellipse(at.x, at.y + 6, ring, ring * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (!under) {
    // A red-and-white float.
    ctx.fillStyle = theme.danger;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(at.x, fy - 6 + tremble, 15, Math.PI, 0);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = theme.light;
    ctx.beginPath();
    ctx.arc(at.x, fy - 6 + tremble, 15, 0, Math.PI);
    ctx.fill();
    ctx.stroke();
  } else {
    paintLabel(ctx, view, '!', at.x, at.y - 50 + bob(view, 18, 5), 64, theme.star);
  }
  if (f.phase === 'ready' && state.score === 0) paintLabel(ctx, view, 'Chạm mặt nước để quăng câu', arena.width / 2, state.water.top + 40, 30);

  if (state.landed) {
    const p = Math.min(1, state.landed.t / 0.8);
    const x = state.landed.x + (childX - state.landed.x) * p;
    const y = state.landed.y + (childY - 60 - state.landed.y) * p - Math.sin(p * Math.PI) * 160;
    sprites.draw(ctx, state.landed.kind, x, y, 84, { rotate: view.reducedMotion ? 0 : p * 6 });
  }
}
