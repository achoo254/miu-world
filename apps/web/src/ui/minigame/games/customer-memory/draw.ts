// Customer memory's picture: a market stall with an awning, three stools with customers (a patience ring
// round each), speech bubbles showing the order while they speak, the counter of dishes below, the selected
// customer or dish glowing, a dish flying to the customer, and happy hearts or a sad face as they leave.
import { bob, paintSky, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { CustomerMemoryState } from './logic';

export const DISH_PICTURES: readonly SpriteRef[] = ['glass-of-milk', 'beverage-box', 'cooked-rice', 'doughnut', 'ice-cream', 'moon-cake'];
export const CUSTOMER_FACES: readonly SpriteRef[] = ['rabbit', 'bear', 'fox', 'panda', 'cat-face', 'dog-face', 'monkey-face', 'frog'];

export function drawCustomerMemory(ctx: CanvasRenderingContext2D, state: CustomerMemoryState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, arena.height, 4);
  // Awning stripes.
  for (let x = 0, k = 0; x < arena.width; x += 60, k += 1) {
    ctx.fillStyle = k % 2 === 0 ? theme.danger : theme.light;
    ctx.fillRect(x, HUD_SAFE_TOP - 30, 60, 30);
  }
  const counterTop = Math.min(...state.dishAt.map((d) => d.y)) - 60;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, counterTop, arena.width, arena.height - counterTop);
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(0, counterTop, arena.width, 10);

  state.seats.forEach((c, i) => {
    const at = state.seatAt[i];
    if (!at) return;
    ctx.fillStyle = theme.woodEdge;
    roundRect(ctx, at.x - 40, at.y + 50, 80, 20, 8);
    ctx.fill();
    if (!c) return;
    const leaving = c.leftAgo >= 0;
    const dx = leaving ? c.leftAgo * 300 : 0;
    if (i === state.selectedSeat) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = theme.star;
      ctx.beginPath();
      ctx.arc(at.x, at.y, 72, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Patience ring.
    if (!leaving) {
      const left = Math.max(0, 1 - (state.time - c.satAt) / 16);
      ctx.strokeStyle = left > 0.3 ? theme.leaf : theme.danger;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(at.x, at.y, 64, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left);
      ctx.stroke();
    }
    sprites.draw(ctx, CUSTOMER_FACES[c.face] ?? 'rabbit', at.x + dx, at.y + bob(view, 2, 2, i), 104, { alpha: leaving ? 1 - c.leftAgo / 0.8 : 1 });
    if (leaving) sprites.draw(ctx, c.happy ? 'heart' : 'cloud', at.x + dx, at.y - 80, 44, { alpha: 1 - c.leftAgo / 0.8 });
    if (!leaving && state.time < c.sayUntil) {
      const w = 60 + c.wants.length * 70;
      ctx.fillStyle = theme.light;
      ctx.strokeStyle = theme.ink;
      ctx.lineWidth = 4;
      roundRect(ctx, at.x - w / 2, at.y - 160, w, 84, 20);
      ctx.fill();
      ctx.stroke();
      c.wants.forEach((d, k) => sprites.draw(ctx, DISH_PICTURES[d] ?? 'cookie', at.x + (k - (c.wants.length - 1) / 2) * 70, at.y - 118, 64));
    }
  });
  state.dishAt.forEach((p, i) => {
    if (i === state.selectedDish) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = theme.star;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 56, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = theme.light;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 30, 50, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    sprites.draw(ctx, DISH_PICTURES[i] ?? 'cookie', p.x, p.y, 84);
  });
  const s = state.served;
  if (s && state.time - s.at < 0.35) {
    const t = (state.time - s.at) / 0.35;
    const from = state.dishAt[s.dish] ?? { x: 0, y: 0 };
    const to = state.seatAt[s.seat] ?? from;
    sprites.draw(ctx, DISH_PICTURES[s.dish] ?? 'cookie', from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * 60, 60);
  }
}
