// Shopping memory's picture: a market street of stalls (striped awnings, wooden counters, three things each)
// rolling past (two shelves each), Mum's list card with the pictures while she shows it (and a bar running out), and the child's
// basket at the bottom with a place per thing (found ones in it, "?" for the rest) and three slip dots.
import { paintGround, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import type { DrawView } from '../../types';
import { itemPoint, MAX_SLIPS, type ShoppingState, type Stall } from './logic';

export const GOODS: readonly SpriteRef[] = [
  'red-apple',
  'banana',
  'watermelon',
  'carrot',
  'egg',
  'tomato',
  'ear-of-corn',
  'cucumber',
  'hot-pepper',
  'lemon',
  'pineapple',
  'grapes',
  'strawberry',
  'leafy-green',
  'fish',
  'baguette-bread',
  'mushroom',
  'coconut',
];

const goodsOf = (g: number): SpriteRef => GOODS[g % GOODS.length] ?? 'red-apple';

function paintStall(ctx: CanvasRenderingContext2D, state: ShoppingState, view: DrawView, stall: Stall): void {
  const { theme, sprites } = view;
  const { stallW, counterY, itemSize } = state;
  const x = stall.x;
  const awningY = counterY - itemSize * 2.9;
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(x + 6, awningY, 10, counterY - awningY);
  ctx.fillRect(x + stallW - 16, awningY, 10, counterY - awningY);
  const stripes = 6;
  for (let i = 0; i < stripes; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? (stall.tone === 0 ? theme.primary : theme.secondary) : theme.light;
    ctx.fillRect(x + (stallW / stripes) * i, awningY - 10, stallW / stripes + 1, 34);
    ctx.beginPath();
    ctx.arc(x + (stallW / stripes) * (i + 0.5), awningY + 24, stallW / stripes / 2, 0, Math.PI);
    ctx.fill();
  }
  // The upper shelf, then the counter.
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, x + 2, counterY - itemSize * 1.05, stallW - 4, 14, 6);
  ctx.fill();
  ctx.fillStyle = theme.wood;
  roundRect(ctx, x - 4, counterY, stallW + 8, itemSize * 0.7, 10);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.woodEdge;
  ctx.stroke();
  stall.goods.forEach((g, i) => {
    if (stall.taken.includes(i)) return;
    const p = itemPoint(state, stall, i);
    const wrong = state.wrong && state.wrong.stall === stall && state.wrong.index === i;
    const shake = wrong && !view.reducedMotion ? Math.sin((state.wrong?.age ?? 0) * 50) * 8 : 0;
    paintShadow(ctx, view, p.x, p.y + itemSize * 0.38, itemSize * 0.7);
    sprites.draw(ctx, goodsOf(g), p.x + shake, p.y, itemSize * 0.85);
  });
}

function paintList(ctx: CanvasRenderingContext2D, state: ShoppingState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const n = state.list.length;
  const size = Math.min(110, (arena.width - 120) / n);
  const w = Math.min(arena.width - 40, n * size + 80);
  const h = size + 130;
  const x = (arena.width - w) / 2;
  const y = Math.max(130, state.counterY - h / 2 - 40);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = theme.ink;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.light;
  roundRect(ctx, x, y, w, h, 24);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = theme.woodEdge;
  ctx.stroke();
  paintLabel(ctx, view, 'Mẹ dặn mua:', arena.width / 2, y + 36, 36, theme.primary);
  state.list.forEach((g, i) => sprites.draw(ctx, goodsOf(g), x + 40 + size * (i + 0.5), y + 60 + size / 2, size * 0.85));
  const left = Math.max(0, 1 - state.phaseTime / state.listTime);
  ctx.fillStyle = theme.star;
  roundRect(ctx, x + 30, y + h - 30, (w - 60) * left + 1, 14, 7);
  ctx.fill();
}

function paintBasket(ctx: CanvasRenderingContext2D, state: ShoppingState, view: DrawView): void {
  const { theme, sprites } = view;
  const { basket } = state;
  const n = state.list.length;
  const slot = 66;
  const w = n * slot + 40;
  ctx.fillStyle = theme.light;
  roundRect(ctx, basket.x - w / 2, basket.y - 44, w, 88, 22);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = theme.woodEdge;
  ctx.stroke();
  sprites.draw(ctx, 'basket', basket.x - w / 2 - 50, basket.y, 100);
  for (let i = 0; i < n; i += 1) {
    const sx = basket.x - w / 2 + 20 + slot * (i + 0.5);
    const g = state.found[i];
    const flyingNow = state.flying && i === state.found.length - 1;
    if (g !== undefined && !flyingNow) sprites.draw(ctx, goodsOf(g), sx, basket.y, slot * 0.85);
    else paintLabel(ctx, view, '?', sx, basket.y, 40, theme.stone);
  }
  for (let i = 0; i < MAX_SLIPS; i += 1) {
    ctx.fillStyle = i < state.slips ? theme.danger : theme.light;
    ctx.beginPath();
    ctx.arc(basket.x + w / 2 + 26, basket.y - 30 + i * 30, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = theme.ink;
    ctx.stroke();
  }
  if (state.flying) {
    const t = Math.min(1, state.flying.age / 0.45);
    const to = { x: basket.x - w / 2 + 20 + slot * (state.found.length - 0.5), y: basket.y };
    const lift = view.reducedMotion ? 0 : Math.sin(t * Math.PI) * 70;
    sprites.draw(ctx, goodsOf(state.flying.goods), state.flying.from.x + (to.x - state.flying.from.x) * t, state.flying.from.y + (to.y - state.flying.from.y) * t - lift, state.itemSize * (0.85 - 0.25 * t));
  }
}

export function drawShoppingMemory(ctx: CanvasRenderingContext2D, state: ShoppingState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const groundY = state.counterY + state.itemSize * 0.5;
  paintSky(ctx, view, groundY, 5);
  paintGround(ctx, view, groundY);
  for (const stall of state.stalls) paintStall(ctx, state, view, stall);
  paintBasket(ctx, state, view);
  if (state.phase === 'list') paintList(ctx, state, view);
  if (state.phase === 'done') {
    paintLabel(ctx, view, 'Đủ rồi!', arena.width / 2, state.counterY - state.itemSize * 1.5, 56, theme.star);
    sprites.draw(ctx, 'sparkles', state.basket.x + 60, state.basket.y - 70 - state.phaseTime * 40, 60);
  }
  if (state.phase === 'failed') paintLabel(ctx, view, 'Mẹ dặn lại nhé!', arena.width / 2, state.counterY - state.itemSize * 1.5, 46, theme.light);
}
