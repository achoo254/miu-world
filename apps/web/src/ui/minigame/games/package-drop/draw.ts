// Package drop's picture: sky, the sea with rolling wave lines, the target (a house on a sandy island or a
// bobbing sailboat) inside a pulsing ring with an arrow above it, the plane crossing the top, the gift under
// its striped parachute, a splash ring when it misses, and the gifts left in a row at the bottom.
import { bob, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { CATCH_HALF, giftPosition, type PackageDropState } from './logic';

function paintSea(ctx: CanvasRenderingContext2D, view: DrawView, seaY: number): void {
  const { arena, theme } = view;
  ctx.fillStyle = theme.water;
  ctx.fillRect(0, seaY - 20, arena.width, arena.height - seaY + 20);
  ctx.strokeStyle = theme.waterLight;
  ctx.lineWidth = 5;
  ctx.globalAlpha = 0.7;
  for (let row = 0; row < 3; row += 1) {
    const y = seaY + row * 34;
    const shift = view.reducedMotion ? 0 : (view.time * (30 + row * 12)) % 80;
    ctx.beginPath();
    for (let x = -80 + shift; x < arena.width + 80; x += 80) {
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 20, y - 10, x + 40, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function paintParachute(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, open: number, sway: number): void {
  const { theme } = view;
  const w = 70 * open;
  const top = y - 78;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sway);
  ctx.translate(-x, -y);
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - w, top);
  ctx.lineTo(x - 14, y - 20);
  ctx.moveTo(x + w, top);
  ctx.lineTo(x + 14, y - 20);
  ctx.moveTo(x, top - 4);
  ctx.lineTo(x, y - 22);
  ctx.stroke();
  // The canopy: a half dome in two colours, outlined.
  const stripes = 4;
  for (let i = 0; i < stripes; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? theme.primary : theme.light;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.ellipse(x, top, w, 46 * open, 0, Math.PI + (i * Math.PI) / stripes, Math.PI + ((i + 1) * Math.PI) / stripes);
    ctx.closePath();
    ctx.fill();
  }
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, top, w, 46 * open, 0, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

export function drawPackageDrop(ctx: CanvasRenderingContext2D, state: PackageDropState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { seaY, target } = state;
  paintSky(ctx, view, seaY, 10);
  paintSea(ctx, view, seaY);

  // The target, inside a ring that pulses, with an arrow bouncing above it.
  const hop = target.gotAgo < 0.4 && !view.reducedMotion ? Math.sin((target.gotAgo / 0.4) * Math.PI) * 26 : 0;
  const grow = view.reducedMotion ? 1 : Math.min(1, target.bornAgo / 0.3);
  if (target.kind === 'house') {
    ctx.fillStyle = theme.ground;
    ctx.beginPath();
    ctx.ellipse(target.x, seaY + 6, 96 * grow, 26 * grow, 0, 0, Math.PI * 2);
    ctx.fill();
    sprites.draw(ctx, 'house', target.x, seaY - 46 - hop, 112 * grow);
  } else {
    sprites.draw(ctx, 'sailboat', target.x, seaY - 44 - hop + bob(view, 2.5, 5), 116 * grow, { flipX: target.vx < 0, rotate: view.reducedMotion ? 0 : Math.sin(view.time * 2) * 0.06 });
  }
  const pulse = view.reducedMotion ? 0 : Math.sin(view.time * 5) * 6;
  ctx.strokeStyle = theme.star;
  ctx.lineWidth = 6;
  ctx.setLineDash([16, 12]);
  ctx.beginPath();
  ctx.ellipse(target.x, seaY + 8, CATCH_HALF + pulse, 22 + pulse * 0.3, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  const ay = seaY - 150 + bob(view, 5, 8);
  ctx.fillStyle = theme.star;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(target.x, ay + 30);
  ctx.lineTo(target.x - 24, ay);
  ctx.lineTo(target.x - 9, ay);
  ctx.lineTo(target.x - 9, ay - 24);
  ctx.lineTo(target.x + 9, ay - 24);
  ctx.lineTo(target.x + 9, ay);
  ctx.lineTo(target.x + 24, ay);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();

  // The plane, nose to the right (the picture points up-right).
  sprites.draw(ctx, 'airplane', state.planeX, state.planeY + bob(view, 3, 5), 104, { rotate: Math.PI / 4 });

  const gift = state.gift;
  if (gift) {
    const { x, y } = giftPosition(gift, seaY);
    if (gift.result === null) {
      const open = Math.min(1, Math.max(0, (gift.age - 0.15) / 0.25));
      const sway = view.reducedMotion ? 0 : Math.sin(gift.age * 5) * 0.12;
      if (open > 0) paintParachute(ctx, view, x, y, open, sway);
      sprites.draw(ctx, 'gift', x, y, 54, { rotate: sway });
    } else if (gift.result === 'hit') {
      sprites.draw(ctx, 'gift', target.x + 30, seaY - 30, 50, { alpha: 1 - gift.after / 0.7 });
      sprites.draw(ctx, 'sparkles', target.x - 40, seaY - 110, 54, { alpha: 1 - gift.after / 0.7 });
    } else {
      // A splash: two rings spreading on the water.
      const t = gift.after / 0.7;
      ctx.strokeStyle = theme.light;
      ctx.lineWidth = 5;
      ctx.globalAlpha = 1 - t;
      for (const k of [1, 0.6]) {
        ctx.beginPath();
        ctx.ellipse(x, seaY + 4, 20 + 70 * t * k, 6 + 18 * t * k, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  // Gifts left: a little plank with a gift and its count, bottom left.
  const by = arena.height - 42;
  ctx.fillStyle = theme.wood;
  roundRect(ctx, 14, by - 30, 150, 60, 18);
  ctx.fill();
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 4;
  ctx.stroke();
  sprites.draw(ctx, 'gift', 50, by, 46);
  paintLabel(ctx, view, `× ${state.giftsLeft}`, 112, by + 2, 34);
}
