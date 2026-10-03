// Cake decorate's picture: a bakery counter, the customer with its order in a speech bubble (a number and a
// picture per kind), the cake with its toppings (each drops in), the topping bins along the bottom, the topping
// under the finger while dragging, a head shake when there are too many, and a happy bounce when it is served.
import { bob, paintLabel, paintShadow, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { CakeState } from './logic';

export const TOPPINGS: readonly SpriteRef[] = ['strawberry', 'candle', 'candy', 'cherries'];
export const CUSTOMERS: readonly SpriteRef[] = ['rabbit', 'bear', 'panda', 'fox', 'cat', 'monkey-face'];

const toppingRef = (i: number): SpriteRef => TOPPINGS[i] ?? 'strawberry';

function paintOrder(ctx: CanvasRenderingContext2D, view: DrawView, state: CakeState): void {
  const { arena, theme, sprites } = view;
  const frown = state.time - state.frownAt < 0.6;
  const served = state.phase === 'served';
  const lineW = 120;
  const bubbleW = state.order.length * lineW + 30;
  const custSize = 96;
  const totalW = custSize + 20 + bubbleW;
  const left = arena.width / 2 - totalW / 2;
  const y = HUD_SAFE_TOP + 10;
  const shake = frown && !view.reducedMotion ? Math.sin(view.time * 40) * 0.25 : 0;
  sprites.draw(ctx, CUSTOMERS[state.customer % CUSTOMERS.length] ?? 'rabbit', left + custSize / 2, y + 56 + (served ? bob(view, 10, 8) : 0), custSize, { rotate: shake });
  if (served) sprites.draw(ctx, 'heart', left + custSize - 6, y + 10, 40);
  const bx = left + custSize + 20;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = frown ? theme.danger : theme.ink;
  ctx.lineWidth = 5;
  roundRect(ctx, bx, y + 6, bubbleW, 100, 22);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx + 2, y + 50);
  ctx.lineTo(bx - 16, y + 62);
  ctx.lineTo(bx + 2, y + 72);
  ctx.fill();
  state.order.forEach((line, i) => {
    const cx = bx + 15 + lineW * (i + 0.5);
    paintLabel(ctx, view, String(line.count), cx - 26, y + 58, 46, theme.primary);
    sprites.draw(ctx, toppingRef(line.topping), cx + 26, y + 56, 56);
  });
}

export function drawCakeDecorate(ctx: CanvasRenderingContext2D, state: CakeState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  // Bakery wall with stripes, and the counter.
  ctx.fillStyle = theme.light;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.fillStyle = theme.secondary;
  ctx.globalAlpha = 0.18;
  for (let x = 0; x < arena.width; x += 80) ctx.fillRect(x, 0, 40, arena.height);
  ctx.globalAlpha = 1;
  const counterY = state.cake.y + state.rx * 0.5;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, counterY, arena.width, arena.height - counterY);
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(0, counterY, arena.width, 12);

  paintOrder(ctx, view, state);

  // The cake: plate, body, icing top.
  const { cake, rx, ry } = state;
  const served = state.phase === 'served';
  const lift = served && !view.reducedMotion ? Math.sin(Math.min(1, state.phaseAgo / 0.4) * Math.PI) * 18 : 0;
  const bodyH = rx * 0.42;
  paintShadow(ctx, view, cake.x, cake.y + bodyH + 14, rx * 2.5);
  ctx.fillStyle = theme.stone;
  ctx.beginPath();
  ctx.ellipse(cake.x, cake.y + bodyH + 6, rx * 1.18, ry * 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(0, -lift);
  // Sponge body.
  ctx.fillStyle = theme.star;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cake.x - rx, cake.y);
  ctx.lineTo(cake.x - rx, cake.y + bodyH);
  ctx.ellipse(cake.x, cake.y + bodyH, rx, ry, 0, Math.PI, 0, true);
  ctx.lineTo(cake.x + rx, cake.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // A cream layer through the middle.
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.ellipse(cake.x, cake.y + bodyH * 0.5, rx - 3, ry, 0, Math.PI * 0.02, Math.PI * 0.98);
  ctx.stroke();
  // Cream top with pink piping round the edge and drips down the front.
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(cake.x, cake.y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.danger;
  for (let i = 0; i < 24; i += 1) {
    const a = (i / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cake.x + Math.cos(a) * rx * 0.93, cake.y + Math.sin(a) * ry * 0.9, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 7; i += 1) {
    const a = Math.PI * (0.12 + (i / 6) * 0.76);
    ctx.beginPath();
    ctx.ellipse(cake.x + Math.cos(a) * rx * 0.97, cake.y + Math.sin(a) * ry + 12, 7, 12 + (i % 3) * 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Toppings (back to front so nearer ones overlap).
  const size = Math.max(50, rx * 0.32);
  const order = [...state.toppings].sort((a, b) => (state.spots[a.spot]?.y ?? 0) - (state.spots[b.spot]?.y ?? 0));
  for (const t of order) {
    const p = state.spots[t.spot];
    if (!p) continue;
    const drop = Math.max(0, 1 - (state.time - t.at) / 0.18) * 40;
    const over = t.topping >= 0 && state.time - state.frownAt < 0.6 && state.toppings.filter((o) => o.topping === t.topping).length > (state.order.find((o) => o.topping === t.topping)?.count ?? 0);
    sprites.draw(ctx, toppingRef(t.topping), p.x, p.y - size * 0.35 - drop, size, { rotate: over && !view.reducedMotion ? Math.sin(view.time * 30) * 0.2 : 0 });
  }
  ctx.restore();
  if (served) {
    for (let i = 0; i < 5; i += 1) sprites.draw(ctx, 'sparkles', cake.x + (i - 2) * rx * 0.45, cake.y - ry - 30 - state.phaseAgo * 60 - (i % 2) * 20, 40, { alpha: Math.max(0, 1 - state.phaseAgo / 1.1) });
  }

  // Bins.
  state.binPoints.forEach((b, i) => {
    ctx.fillStyle = theme.light;
    ctx.strokeStyle = theme.woodEdge;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(b.x, b.y, state.binRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    const kind = state.bins[i] ?? 0;
    sprites.draw(ctx, toppingRef(kind), b.x - 10, b.y + 6, state.binRadius * 1.0);
    sprites.draw(ctx, toppingRef(kind), b.x + 12, b.y - 4, state.binRadius * 1.1);
  });
  if (state.carrying >= 0 && state.carryAt) sprites.draw(ctx, toppingRef(state.carrying), state.carryAt.x, state.carryAt.y - 30, size * 1.1);
}
