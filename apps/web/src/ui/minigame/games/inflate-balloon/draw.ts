// Inflate balloon's picture: a fair with bunting, the green ring the customer asked for (it glows while the
// balloon is the right size), the balloon itself growing on the pump's tube, the pump whose handle pumps
// while the finger holds, and the customer beside it who hops off with a sold balloon. A popped balloon
// bursts into a bang and rubber scraps.
import { bob, paintGround, paintLabel, paintSky, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { InflateBalloonState } from './logic';

export function balloonColours(view: DrawView): readonly string[] {
  return [view.theme.primary, view.theme.secondary, view.theme.star, view.theme.leaf];
}

function paintBunting(ctx: CanvasRenderingContext2D, view: DrawView): void {
  const { arena } = view;
  const colours = balloonColours(view);
  const y = HUD_SAFE_TOP + 4;
  ctx.strokeStyle = view.theme.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.quadraticCurveTo(arena.width / 2, y + 30, arena.width, y);
  ctx.stroke();
  for (let x = 20, i = 0; x < arena.width; x += 56, i += 1) {
    const t = x / arena.width;
    const top = y + 4 * 30 * t * (1 - t) * 0.5 * 2;
    ctx.fillStyle = colours[i % colours.length] ?? view.theme.star;
    ctx.beginPath();
    ctx.moveTo(x - 18, top);
    ctx.lineTo(x + 18, top);
    ctx.lineTo(x, top + 34);
    ctx.closePath();
    ctx.fill();
  }
}

/** A balloon (slightly tall), its shine and knot; `colour` is a theme colour. */
export function paintBalloon(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, r: number, colour: string): void {
  ctx.fillStyle = colour;
  ctx.strokeStyle = view.theme.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 1.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.14, y + r * 1.22);
  ctx.lineTo(x + r * 0.14, y + r * 1.22);
  ctx.lineTo(x, y + r * 1.08);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = view.theme.light;
  ctx.beginPath();
  ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.18, r * 0.3, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function paintRing(ctx: CanvasRenderingContext2D, view: DrawView, state: InflateBalloonState): void {
  const { theme } = view;
  const inner = state.target - state.tolerance;
  const outer = state.target + state.tolerance;
  const inside = state.phase === 'pump' && state.radius >= inner;
  ctx.fillStyle = inside ? theme.star : theme.leaf;
  ctx.globalAlpha = inside ? 0.45 : 0.25;
  ctx.beginPath();
  ctx.ellipse(state.cx, state.cy, outer, outer * 1.12, 0, 0, Math.PI * 2);
  ctx.ellipse(state.cx, state.cy, inner, inner * 1.12, 0, 0, Math.PI * 2, true);
  ctx.fill('evenodd');
  ctx.globalAlpha = 1;
  ctx.strokeStyle = inside ? theme.star : theme.leaf;
  ctx.lineWidth = 5;
  ctx.setLineDash([14, 10]);
  for (const r of [inner, outer]) {
    ctx.beginPath();
    ctx.ellipse(state.cx, state.cy, r, r * 1.12, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function paintPump(ctx: CanvasRenderingContext2D, view: DrawView, state: InflateBalloonState): void {
  const { theme } = view;
  const x = state.cx;
  const y = state.pumpY;
  const stroke = state.holding && !view.reducedMotion ? 8 + Math.sin(view.time * 22) * 8 : 0;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  // Handle and rod.
  ctx.fillStyle = theme.stoneEdge;
  ctx.fillRect(x - 5, y - 6 + stroke, 10, 40);
  ctx.fillStyle = theme.danger;
  roundRect(ctx, x - 50, y - 18 + stroke, 100, 18, 9);
  ctx.fill();
  ctx.stroke();
  // Body.
  ctx.fillStyle = theme.secondary;
  roundRect(ctx, x - 30, y + 28, 60, 90, 14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(x - 18, y + 38, 8, 70);
  ctx.globalAlpha = 1;
}

export function drawInflateBalloon(ctx: CanvasRenderingContext2D, state: InflateBalloonState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const groundY = state.pumpY + 100;
  paintSky(ctx, view, groundY, 6);
  paintGround(ctx, view, groundY);
  paintBunting(ctx, view);
  const colour = balloonColours(view)[state.colour] ?? theme.primary;
  const customerX = Math.max(80, state.cx - Math.min(300, arena.width * 0.33));
  const hop = state.phase === 'sold' && !view.reducedMotion ? Math.abs(Math.sin(state.phaseAgo * 9)) * 26 : 0;
  sprites.draw(ctx, state.customer, customerX, groundY - 50 - hop + bob(view, 2, 3), 120);

  if (state.phase === 'pump') {
    paintRing(ctx, view, state);
    // The pump's tube up to the knot.
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(state.cx, state.cy + state.radius * 1.2);
    ctx.lineTo(state.cx, state.pumpY - 10);
    ctx.stroke();
    paintBalloon(ctx, view, state.cx, state.cy, state.radius, colour);
  } else if (state.phase === 'sold') {
    // Off to the customer, then up on its string.
    const t = Math.min(1, state.phaseAgo / 0.5);
    const x = state.cx + (customerX + 30 - state.cx) * t;
    const r = state.radius * (1 - 0.45 * t);
    const y = state.cy + (groundY - 190 - r - state.cy) * t - hop;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + r * 1.2);
    ctx.lineTo(customerX + 20, groundY - 70 - hop);
    ctx.stroke();
    paintBalloon(ctx, view, x, y, r, colour);
    paintLabel(ctx, view, 'Cảm ơn!', customerX, groundY - 140 - hop - r * 2, 34, theme.star);
  } else {
    const t = state.phaseAgo / 0.9;
    if (t < 0.45) sprites.draw(ctx, 'collision', state.cx, state.cy, 220 * (0.7 + t));
    ctx.fillStyle = colour;
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const d = 40 + t * 220;
      ctx.globalAlpha = 1 - t;
      ctx.fillRect(state.cx + Math.cos(a) * d - 8, state.cy + Math.sin(a) * d + t * t * 120, 16, 10);
    }
    ctx.globalAlpha = 1;
  }
  paintPump(ctx, view, state);
  if (state.smallAgo < 1.2) paintLabel(ctx, view, 'Thêm chút nữa!', state.cx, state.cy - state.radius - 50, 38, theme.star);
  if (state.time < 4 && !state.holding) paintLabel(ctx, view, 'Giữ để bơm', state.cx, state.pumpY + 70 + bob(view, 4, 4), 34, theme.light);
}
