// Tens bundles' picture: a wooden desk with counting sticks in five colours lying in little piles, the
// friend's request on a card ("Lấy 47 que"), the loop being drawn as a dashed string with a bubble counting
// the sticks inside (gold at ten), sticks gathering and flying to the tray when tied, a slipping string
// showing the wrong count, and the tray with its bundles and the sentence that reads the number.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView, Point } from '../../types';
import { countInLoop, type Stick, type TensState } from './logic';

function stickColour(view: DrawView, i: number): string {
  const { theme } = view;
  return [theme.primary, theme.secondary, theme.leaf, theme.star, theme.danger][i % 5] ?? theme.primary;
}

function paintStick(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, angle: number, colour: string, alpha = 1): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  roundRect(ctx, -36, -6, 72, 12, 6);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = view.theme.ink;
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
}

function paintBundle(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, scale: number): void {
  for (let k = 0; k < 10; k += 1) paintStick(ctx, view, x + (k - 4.5) * 5 * scale, y, Math.PI / 2 + (k - 4.5) * 0.03, stickColour(view, k));
  ctx.fillStyle = view.theme.danger;
  ctx.fillRect(x - 30 * scale, y - 5, 60 * scale, 10);
}

function strokeLoop(ctx: CanvasRenderingContext2D, loop: Point[], closed: boolean): void {
  const [first, ...rest] = loop;
  if (!first) return;
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (const p of rest) ctx.lineTo(p.x, p.y);
  if (closed) ctx.closePath();
  ctx.stroke();
}

export function drawTensBundles(ctx: CanvasRenderingContext2D, state: TensState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.strokeStyle = theme.woodEdge;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 3;
  for (let y = 30; y < arena.height; y += 46) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(arena.width * 0.3, y + 10, arena.width * 0.6, y - 10, arena.width, y + 4);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // The request.
  sprites.draw(ctx, view.player, 70, 110 + 40, 74);
  ctx.fillStyle = theme.light;
  roundRect(ctx, 120, 110 + 8, Math.min(380, arena.width - 140), 64, 24);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.ink;
  ctx.stroke();
  paintLabel(ctx, view, `Lấy ${state.target} que`, 120 + Math.min(380, arena.width - 140) / 2, 110 + 42, 36, theme.star);

  // The tray.
  const { tray } = state;
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, tray.x, tray.y, tray.w, tray.h, 20);
  ctx.fill();
  const landscape = tray.h > tray.w;
  for (let b = 0; b < state.bundles; b += 1) {
    const x = landscape ? tray.x + tray.w / 2 + ((b % 2) - 0.5) * 70 : tray.x + 50 + b * 70;
    const y = landscape ? tray.y + 60 + Math.floor(b / 2) * 80 : tray.y + tray.h / 2;
    paintBundle(ctx, view, x, y, 0.9);
  }
  const loose = state.sticks.filter((s) => s.tiedAgo < 0).length;
  if (state.doneAgo >= 0) {
    const text = `${state.bundles} bó và ${loose} que là ${state.target}`;
    paintLabel(ctx, view, text, arena.width / 2, arena.height / 2, Math.min(48, (arena.width / text.length) * 1.6), theme.star);
  } else {
    paintLabel(ctx, view, `${state.bundles} bó`, landscape ? tray.x + tray.w / 2 : tray.x + tray.w - 80, landscape ? tray.y + tray.h - 30 : tray.y + 30, 30);
  }

  // Sticks: loose ones where they lie, tied ones gathering then flying to the tray.
  const trayAt = { x: tray.x + tray.w / 2, y: tray.y + 40 };
  for (const s of state.sticks) paintLooseOrTied(ctx, view, s, trayAt);

  // The loop being drawn, with its count.
  if (state.loop.length > 1) {
    const n = countInLoop(state);
    ctx.setLineDash([14, 10]);
    ctx.lineWidth = 7;
    ctx.strokeStyle = n === 10 ? theme.star : theme.light;
    strokeLoop(ctx, state.loop, false);
    ctx.setLineDash([]);
    const tip = state.loop[state.loop.length - 1] ?? { x: 0, y: 0 };
    ctx.fillStyle = n === 10 ? theme.star : theme.light;
    ctx.beginPath();
    ctx.arc(tip.x + 40, tip.y - 50, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = theme.ink;
    ctx.stroke();
    paintLabel(ctx, view, String(n), tip.x + 40, tip.y - 48, 36, n === 10 ? theme.light : theme.primary);
  }
  if (state.slipped) {
    const { loop, count, ago } = state.slipped;
    ctx.globalAlpha = Math.max(0, 1 - ago);
    ctx.save();
    ctx.translate(0, ago * 40);
    ctx.lineWidth = 6;
    ctx.strokeStyle = theme.danger;
    strokeLoop(ctx, loop, true);
    ctx.restore();
    const c = loop[0] ?? { x: 0, y: 0 };
    paintLabel(ctx, view, `${count} que, chưa đủ 10`, Math.min(arena.width - 160, Math.max(160, c.x)), Math.max(220, c.y - 30), 30, theme.light);
    ctx.globalAlpha = 1;
  }
}

function paintLooseOrTied(ctx: CanvasRenderingContext2D, view: DrawView, s: Stick, trayAt: Point): void {
  const colour = stickColour(view, s.colour);
  if (s.tiedAgo < 0 || !s.to) {
    paintStick(ctx, view, s.x, s.y, s.angle, colour);
    return;
  }
  const t = s.tiedAgo / 0.7;
  if (t < 0.4) {
    const k = t / 0.4;
    paintStick(ctx, view, s.x + (s.to.x - s.x) * k, s.y + (s.to.y - s.y) * k, s.angle * (1 - k) + (Math.PI / 2) * k, colour);
    return;
  }
  const k = (t - 0.4) / 0.6;
  paintStick(ctx, view, s.to.x + (trayAt.x - s.to.x) * k, s.to.y + (trayAt.y - s.to.y) * k, Math.PI / 2, colour, 1 - k * 0.5);
}
