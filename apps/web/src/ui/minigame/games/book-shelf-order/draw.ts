// Book shelf order's picture: a library wall with a window, a long wooden shelf of numbered book spines, the
// cart with the next book, the book under the finger with a caret showing the gap it would go into, a book
// that went in the wrong gap tipping over, and a full shelf sliding down into a box.
import { paintLabel, paintShadow, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { bookX, CAPACITY, type ShelfState } from './logic';

function spineColour(view: DrawView, value: number): string {
  const { theme } = view;
  const colours = [theme.primary, theme.secondary, theme.leaf, theme.danger, theme.water, theme.woodEdge];
  return colours[value % colours.length] ?? theme.primary;
}

function paintBook(ctx: CanvasRenderingContext2D, view: DrawView, value: number, x: number, bottom: number, w: number, h: number, tilt = 0, alpha = 1): void {
  const { theme } = view;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, bottom);
  ctx.rotate(tilt);
  ctx.fillStyle = spineColour(view, value);
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, -w / 2, -h, w, h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.star;
  ctx.fillRect(-w / 2 + 4, -h + 16, w - 8, 6);
  ctx.fillRect(-w / 2 + 4, -22, w - 8, 6);
  ctx.fillStyle = theme.light;
  roundRect(ctx, -w / 2 + 7, -h / 2 - 24, w - 14, 48, 10);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, bottom);
  ctx.rotate(tilt);
  paintLabel(ctx, view, String(value), 0, -h / 2 + 1, Math.min(34, w * 0.5), theme.ink);
  ctx.restore();
}

export function drawBookShelfOrder(ctx: CanvasRenderingContext2D, state: ShelfState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  // Wall, window, floor.
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = theme.woodEdge;
  for (let x = 0; x < arena.width; x += 60) ctx.fillRect(x, 0, 6, arena.height);
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.groundDeep;
  ctx.fillRect(0, state.cart.y + state.bookH * 0.3, arena.width, arena.height);

  const { shelfY, bookW, bookH } = state;
  const n = state.shelf.length;
  const pack = state.phase === 'pack' ? Math.min(1, state.phaseAgo / 0.7) : 0;

  // The shelf plank.
  const plankW = CAPACITY * (bookW + 8) + 40;
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, arena.width / 2 - plankW / 2, shelfY, plankW, 22, 6);
  ctx.fill();
  ctx.fillRect(arena.width / 2 - plankW / 2 + 20, shelfY + 22, 14, 30);
  ctx.fillRect(arena.width / 2 + plankW / 2 - 34, shelfY + 22, 14, 30);

  state.shelf.forEach((value, i) => {
    const x = bookX(state, arena.width, i, n);
    const since = state.time - state.placedAt;
    const drop = i === state.placedIndex && since < 0.25 ? (1 - since / 0.25) * 60 : 0;
    paintBook(ctx, view, value, x, shelfY - drop + pack * (arena.height - shelfY), bookW, bookH, 0, 1 - pack * 0.6);
  });
  if (pack > 0) sprites.draw(ctx, 'package', arena.width / 2, arena.height - 80, 150);

  if (state.phase !== 'shelve') return;
  // Caret over the gap the dragged book would take.
  if (state.dragging && state.hoverGap >= 0) {
    const left = state.hoverGap > 0 ? bookX(state, arena.width, state.hoverGap - 1, n) : bookX(state, arena.width, 0, n) - bookW;
    const right = state.hoverGap < n ? bookX(state, arena.width, state.hoverGap, n) : bookX(state, arena.width, n - 1, n) + bookW;
    const cx = (left + right) / 2;
    ctx.fillStyle = theme.star;
    ctx.beginPath();
    ctx.moveTo(cx - 16, shelfY - bookH - 34);
    ctx.lineTo(cx + 16, shelfY - bookH - 34);
    ctx.lineTo(cx, shelfY - bookH - 8);
    ctx.closePath();
    ctx.fill();
  }
  // The cart.
  const cartW = Math.max(160, bookW * 2.4);
  paintShadow(ctx, view, state.cart.x, state.cart.y + bookH / 2 + 30, cartW);
  ctx.fillStyle = theme.stoneEdge;
  roundRect(ctx, state.cart.x - cartW / 2, state.cart.y + bookH / 2 - 4, cartW, 18, 6);
  ctx.fill();
  for (const dx of [-cartW / 2 + 20, cartW / 2 - 20]) {
    ctx.fillStyle = theme.ink;
    ctx.beginPath();
    ctx.arc(state.cart.x + dx, state.cart.y + bookH / 2 + 22, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  sprites.draw(ctx, 'books', state.cart.x + cartW / 2 + 40, state.cart.y + bookH / 2 - 24, 70);
  // The book: tipping in a wrong gap, under the finger, or waiting on the cart (bobbing a little).
  const tipping = state.tipGap >= 0 && state.time < state.tipUntil;
  const tilt = tipping ? Math.min(0.6, (1 - (state.tipUntil - state.time) / 1.5) * 3) : 0;
  const lift = !state.dragging && !tipping && !view.reducedMotion ? Math.abs(Math.sin(view.time * 3)) * 6 : 0;
  paintBook(ctx, view, state.book, state.bookAt.x, state.bookAt.y + bookH / 2 - lift, bookW, bookH, tilt);
}
