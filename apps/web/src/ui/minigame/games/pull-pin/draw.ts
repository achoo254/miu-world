// Pull the pin's picture: a glass board with chambers, each with its contents (coloured balls, brown mud, or
// muddy balls), chutes showing where every opening leads, the cup at the bottom and the bin at the side. Pins
// are grey bars with a gold knob; a pulled pin slides out and fades. Falling contents drop to where they go.
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView, Point } from '../../types';
import { centreOf, CUP, pinSegment, targetRect, toArena, type Content, type PinState, type Rect } from './logic';

function paintContent(ctx: CanvasRenderingContext2D, view: DrawView, content: Content, r: Rect, alpha = 1): void {
  if (!content) return;
  const { theme } = view;
  ctx.globalAlpha = alpha;
  if (content !== 'balls') {
    ctx.fillStyle = theme.groundDeep;
    roundRect(ctx, r.x + 4, r.y + r.h * 0.35, r.w - 8, r.h * 0.62, 12);
    ctx.fill();
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.arc(r.x + (r.w * (i + 0.5)) / 4, r.y + r.h * 0.38, r.w / 9, Math.PI, 0);
      ctx.fill();
    }
  }
  if (content !== 'mud') {
    const colours = [theme.primary, theme.secondary, theme.star, theme.leaf];
    const rad = Math.max(7, Math.min(r.w, r.h) / 7);
    let k = 0;
    for (let y = r.y + r.h - rad - 4; y > r.y + r.h * (content === 'mixed' ? 0.45 : 0.25); y -= rad * 1.8) {
      for (let x = r.x + rad + 4; x < r.x + r.w - rad; x += rad * 2.1) {
        ctx.fillStyle = colours[k % 4] ?? theme.primary;
        ctx.globalAlpha = alpha * (content === 'mixed' ? 0.6 : 1);
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fill();
        k += 1;
      }
    }
  }
  ctx.globalAlpha = 1;
}

export function drawPullPin(ctx: CanvasRenderingContext2D, state: PinState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, arena.height, 5);
  const box = state.box;
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.5;
  roundRect(ctx, box.x - 10, box.y - 10, box.w + 20, box.h + 20, 24);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Chutes from every opening to where it leads.
  for (const pin of state.pins) {
    const { a, b } = pinSegment(state, pin);
    const to = toArena(state, targetRect(state, pin.to));
    const from: Point = pin.edge === 'bottom' ? { x: (a.x + b.x) / 2, y: a.y } : { x: a.x, y: b.y - 10 };
    ctx.strokeStyle = theme.waterLight;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 26;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x + to.w / 2, to.y + 6);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineCap = 'butt';
  }

  // Cup and bin.
  const cup = toArena(state, CUP);
  ctx.fillStyle = theme.light;
  roundRect(ctx, cup.x, cup.y, cup.w, cup.h, 16);
  ctx.fill();
  paintContent(ctx, view, state.inCup, cup);
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  roundRect(ctx, cup.x, cup.y, cup.w, cup.h, 16);
  ctx.stroke();
  const bin = toArena(state, targetRect(state, 'bin'));
  sprites.draw(ctx, 'wastebasket', bin.x + bin.w / 2, bin.y + bin.h / 2, Math.min(bin.w, bin.h) * 1.1);

  for (const c of state.chambers) {
    const r = toArena(state, c.rect);
    ctx.fillStyle = theme.light;
    ctx.globalAlpha = 0.65;
    roundRect(ctx, r.x, r.y, r.w, r.h, 12);
    ctx.fill();
    ctx.globalAlpha = 1;
    paintContent(ctx, view, c.content, r);
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4;
    roundRect(ctx, r.x, r.y, r.w, r.h, 12);
    ctx.stroke();
  }

  for (const pin of state.pins) {
    if (pin.pulled && pin.pulledAgo > 0.4) continue;
    const { a, b, handle } = pinSegment(state, pin);
    const out = pin.pulled ? pin.pulledAgo * 300 : 0;
    const dx = pin.edge === 'left' ? -out : out;
    const dy = pin.edge === 'bottom' ? 0 : -out;
    ctx.globalAlpha = pin.pulled ? 1 - pin.pulledAgo / 0.4 : 1;
    ctx.strokeStyle = theme.stoneEdge;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x + dx, a.y + dy);
    ctx.lineTo(b.x + dx, b.y + dy);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = theme.star;
    ctx.beginPath();
    ctx.arc(handle.x + dx, handle.y + dy, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  for (const f of state.falls) {
    const t = Math.min(1, f.age / 0.45);
    const p = { x: f.from.x + (f.to.x - f.from.x) * t, y: f.from.y + (f.to.y - f.from.y) * t * t };
    paintContent(ctx, view, f.content, { x: p.x - 30, y: p.y - 24, w: 60, h: 48 });
  }
  if (state.result === 'solved') paintLabel(ctx, view, 'Giỏi quá!', arena.width / 2, centreOf(state, CUP).y - 90, 44, theme.star);
  if (state.result === 'spoiled') paintLabel(ctx, view, 'Ôi, làm lại nhé', arena.width / 2, centreOf(state, CUP).y - 90, 40, theme.light);
}
