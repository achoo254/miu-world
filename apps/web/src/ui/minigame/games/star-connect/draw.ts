// Star connect's picture: a night sky (the theme's ink, a glow low down, twinkling specks, a crescent moon,
// dark hills), the numbered stars, and gold lines between the ones already joined. The next star pulses with
// a ring and a faint dotted hint from the last one; a wrong star wobbles. A finished outline fills with a
// soft glow and its picture pops up in the middle.
import { paintHills, paintLabel } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { StarState } from './logic';

function paintNight(ctx: CanvasRenderingContext2D, view: DrawView): void {
  const { arena, theme } = view;
  ctx.fillStyle = theme.ink;
  ctx.fillRect(0, 0, arena.width, arena.height);
  const glow = ctx.createLinearGradient(0, arena.height * 0.4, 0, arena.height);
  glow.addColorStop(0, theme.ink);
  glow.addColorStop(1, theme.secondary);
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = glow;
  ctx.fillRect(0, arena.height * 0.4, arena.width, arena.height * 0.6);
  // Specks, placed by a fixed scramble so they stay put.
  ctx.fillStyle = theme.light;
  for (let i = 0; i < 70; i += 1) {
    const x = (i * 137.5) % arena.width;
    const y = (i * 89.3 + (i % 7) * 31) % arena.height;
    ctx.globalAlpha = 0.25 + (view.reducedMotion ? 0.3 : 0.3 * (1 + Math.sin(view.time * 2 + i)));
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  // A crescent moon in the top right, under the HUD's pause button.
  ctx.globalAlpha = 0.95;
  const mx = arena.width - 70;
  const my = 150;
  // The crescent: the full disc, clipped away by a second disc offset to the upper left.
  ctx.save();
  ctx.beginPath();
  ctx.rect(mx - 40, my - 40, 80, 80);
  ctx.arc(mx - 14, my - 8, 30, 0, Math.PI * 2);
  ctx.clip('evenodd');
  ctx.fillStyle = theme.star;
  ctx.beginPath();
  ctx.arc(mx, my, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 0.5;
  paintHills(ctx, view, arena.height - 10, 0, 50, theme.ink);
  ctx.globalAlpha = 1;
}

export function drawStarConnect(ctx: CanvasRenderingContext2D, state: StarState, view: DrawView): void {
  const { theme, sprites } = view;
  paintNight(ctx, view);
  const { dots, joined, box } = state;
  const finished = state.done >= 0;

  if (finished) {
    // The outline fills with light.
    ctx.globalAlpha = Math.min(0.35, state.done * 0.6);
    ctx.fillStyle = theme.star;
    ctx.beginPath();
    dots.forEach((d, i) => (i === 0 ? ctx.moveTo(d.x, d.y) : ctx.lineTo(d.x, d.y)));
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Lines between joined stars (and back to the first once all are joined), with a soft glow.
  const segments = finished ? dots.length : Math.max(0, joined - 1);
  for (const [width, alpha] of [
    [16, 0.25],
    [6, 1],
  ] as const) {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = theme.star;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < segments; i += 1) {
      const a = dots[i];
      const b = dots[(i + 1) % dots.length];
      if (!a || !b) continue;
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const next = finished ? undefined : dots[joined];
  const last = dots[joined - 1];
  if (next && last) {
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 12]);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  dots.forEach((d, i) => {
    const isJoined = i < joined;
    const isNext = d === next;
    const wobble = d.wrong < 0.4 && !view.reducedMotion ? Math.sin(d.wrong * 45) * 7 * (1 - d.wrong / 0.4) : 0;
    const pulse = isNext && !view.reducedMotion ? 1 + 0.12 * Math.sin(view.time * 7) : 1;
    if (isNext) {
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = theme.light;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 46 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    sprites.draw(ctx, isJoined || finished ? 'glowing-star' : 'star', d.x + wobble, d.y, (isJoined ? 70 : 62) * pulse, { alpha: isJoined || isNext || finished ? 1 : 0.8 });
    if (!finished) paintLabel(ctx, view, String(i + 1), d.x + wobble, d.y + 4, 28);
  });

  if (finished) {
    const t = Math.min(1, state.done / 0.4);
    const pop = view.reducedMotion ? 1 : 1 + 0.2 * Math.sin(t * Math.PI);
    const size = Math.min(box.w, box.h) * 0.5 * t * pop;
    sprites.draw(ctx, state.figure.picture, box.x + box.w / 2, box.y + box.h * 0.55, size);
    sprites.draw(ctx, 'sparkles', box.x + box.w * 0.75, box.y + box.h * 0.3 - state.done * 20, 60, { alpha: Math.max(0, 1 - state.done / 1.5) });
  }
}
