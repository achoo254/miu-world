// Pay exact's picture: a market stall with a striped awning, the seller and the thing for sale with its price tag,
// the seller's tray adding up the notes ("Đã đưa 7 nghìn"), and the child's wallet of notes along the bottom.
// Notes are drawn: each value its own colour and its number, so they read without colour too. Notes fly into the
// tray and back out; a bought thing hops into the child's basket.
import { bob, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { FLY_SECONDS, GOODS_COUNT, paid, type Note, type PayExactState } from './logic';

export const GOODS: readonly SpriteRef[] = ['red-apple', 'banana', 'watermelon', 'carrot', 'egg', 'cookie', 'doughnut', 'ice-cream', 'lollipop', 'teddy-bear', 'balloon', 'kite'];

function noteColour(view: DrawView, value: Note): string {
  const { theme } = view;
  return value === 1 ? theme.leaf : value === 2 ? theme.secondary : value === 5 ? theme.primary : theme.water;
}

export function paintNote(ctx: CanvasRenderingContext2D, view: DrawView, value: Note, x: number, y: number, w: number, h: number, alpha = 1): void {
  const { theme } = view;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = noteColour(view, value);
  roundRect(ctx, x - w / 2, y - h / 2, w, h, h * 0.16);
  ctx.fill();
  ctx.lineWidth = Math.max(3, h * 0.05);
  ctx.strokeStyle = theme.ink;
  ctx.stroke();
  ctx.globalAlpha = alpha * 0.35;
  ctx.strokeStyle = theme.light;
  roundRect(ctx, x - w / 2 + h * 0.1, y - h / 2 + h * 0.1, w - h * 0.2, h * 0.8, h * 0.1);
  ctx.stroke();
  ctx.fillStyle = theme.light;
  ctx.beginPath();
  ctx.arc(x - w * 0.28, y, h * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.font = `800 ${Math.round(h * 0.5)}px ${theme.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = h * 0.08;
  ctx.strokeStyle = theme.ink;
  ctx.strokeText(String(value), x + w * 0.12, y - h * 0.08);
  ctx.fillStyle = theme.light;
  ctx.fillText(String(value), x + w * 0.12, y - h * 0.08);
  ctx.font = `700 ${Math.round(h * 0.2)}px ${theme.font}`;
  ctx.fillStyle = theme.ink;
  ctx.fillText('nghìn', x + w * 0.12, y + h * 0.3);
  ctx.globalAlpha = 1;
}

function paintStall(ctx: CanvasRenderingContext2D, state: PayExactState, view: DrawView): void {
  const { theme, sprites, arena } = view;
  const { x, y } = state.stall;
  const w = Math.min(arena.width * 0.5, 400);
  // Awning stripes.
  const awningY = y - 140;
  for (let i = 0; i < 8; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? theme.primary : theme.light;
    ctx.fillRect(x - w / 2 + (w / 8) * i, awningY, w / 8 + 1, 40);
  }
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(x - w / 2 - 6, awningY, 12, 210);
  ctx.fillRect(x + w / 2 - 6, awningY, 12, 210);
  // The seller behind the counter.
  sprites.draw(ctx, 'farmer', x + w * 0.28, y - 20 + bob(view, 2, 3), 110);
  // The counter.
  ctx.fillStyle = theme.wood;
  roundRect(ctx, x - w / 2 - 10, y + 20, w + 20, 60, 12);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = theme.woodEdge;
  ctx.stroke();
  // The thing for sale and its tag.
  const goods = GOODS[state.goods % GOODS_COUNT] ?? 'red-apple';
  const hop = state.phase === 'bought' ? Math.min(1, state.phaseTime / 0.6) : 0;
  sprites.draw(ctx, goods, x - w * 0.12 - hop * 40, y - 22 - (view.reducedMotion ? 0 : Math.sin(hop * Math.PI) * 60), 104, { alpha: 1 - hop * 0.6 });
  const tagX = x - w * 0.12 - 96;
  const tagY = y - 72;
  ctx.fillStyle = theme.light;
  roundRect(ctx, tagX - 66, tagY - 30, 132, 60, 14);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.ink;
  ctx.stroke();
  ctx.font = `800 30px ${theme.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = theme.danger;
  ctx.fillText(`${state.price} nghìn`, tagX, tagY + 2);
}

function paintTray(ctx: CanvasRenderingContext2D, state: PayExactState, view: DrawView): void {
  const { theme, sprites } = view;
  const { x, y } = state.trayAt;
  paintShadow(ctx, view, x, y + 40, 230);
  ctx.fillStyle = theme.stone;
  ctx.beginPath();
  ctx.ellipse(x, y + 10, 120, 46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = theme.stoneEdge;
  ctx.stroke();
  const landing = state.flying.filter((f) => f.to === state.trayAt).length;
  const resting = state.tray.slice(0, state.tray.length - landing);
  resting.forEach((value, i) => paintNote(ctx, view, value, x - 50 + (i % 5) * 26, y + 4 - Math.floor(i / 5) * 12 - (i % 5) * 4, 100, 54));
  const total = paid(state);
  const over = state.phase === 'over';
  paintLabel(ctx, view, `Đã đưa ${total} nghìn`, x, y + 76, 30, over ? theme.danger : total === state.price ? theme.leaf : theme.light);
  if (state.phase === 'bought') sprites.draw(ctx, 'sparkles', x + 90, y - 50 - state.phaseTime * 40, 52);
}

export function drawPayExact(ctx: CanvasRenderingContext2D, state: PayExactState, view: DrawView): void {
  const { arena, theme } = view;
  const wallet = state.buttons[0];
  const walletTop = wallet ? wallet.y - wallet.h / 2 - 22 : arena.height - 120;
  paintSky(ctx, view, walletTop, 6);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, Math.max(HUD_SAFE_TOP, state.stall.y + 60), arena.width, arena.height);
  paintStall(ctx, state, view);
  paintTray(ctx, state, view);
  // The wallet.
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, 6, walletTop, arena.width - 12, arena.height - walletTop - 6, 26);
  ctx.fill();
  for (const b of state.buttons) paintNote(ctx, view, b.value, b.x, b.y, b.w, b.h, state.phase === 'pay' ? 1 : 0.6);
  for (const f of state.flying) {
    const t = Math.min(1, f.age / FLY_SECONDS);
    const lift = view.reducedMotion ? 0 : Math.sin(t * Math.PI) * 50;
    paintNote(ctx, view, f.value, f.from.x + (f.to.x - f.from.x) * t, f.from.y + (f.to.y - f.from.y) * t - lift, 100, 54);
  }
}
