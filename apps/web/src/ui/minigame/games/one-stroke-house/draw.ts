// One-stroke drawing's picture: a sheet of squared paper on a desk, the picture's lines dashed until drawn
// over in thick ink, its dots (the one the stroke is at lit up, the start dots glowing after a slip), the ink
// stretching from the last dot to the finger, the ink fading after a lift, and the finished picture coming to
// life as its emoji with sparkles.
import { paintLabel, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import type { DrawView } from '../../types';
import { FIGURES, oddDots, type OneStrokeState } from './logic';

/** What each picture becomes when finished (same order as FIGURES). */
export const REWARDS: readonly SpriteRef[] = ['star', 'house', 'gift', 'butterfly', 'envelope', 'kite', 'house', 'fish', 'sailboat', 'glowing-star'];

export function drawOneStrokeHouse(ctx: CanvasRenderingContext2D, state: OneStrokeState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 0, arena.width, arena.height);
  const figure = FIGURES[state.figure];
  if (!figure || state.dots.length === 0) return;
  const xs = state.dots.map((d) => d.x);
  const ys = state.dots.map((d) => d.y);
  const pad = 60;
  const left = Math.min(...xs) - pad;
  const top = Math.min(...ys) - pad;
  const w = Math.max(...xs) - Math.min(...xs) + pad * 2;
  const h = Math.max(...ys) - Math.min(...ys) + pad * 2;
  // Paper with squares.
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.2;
  roundRect(ctx, left + 8, top + 10, w, h, 20);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.light;
  roundRect(ctx, left, top, w, h, 20);
  ctx.fill();
  ctx.strokeStyle = theme.waterLight;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.7;
  for (let x = left + 32; x < left + w; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, top + 6);
    ctx.lineTo(x, top + h - 6);
    ctx.stroke();
  }
  for (let y = top + 32; y < top + h; y += 32) {
    ctx.beginPath();
    ctx.moveTo(left + 6, y);
    ctx.lineTo(left + w - 6, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const fade = state.phase === 'fade' ? 1 - state.phaseAgo / 0.6 : 1;
  figure.lines.forEach(([a, b], i) => {
    const p = state.dots[a];
    const q = state.dots[b];
    if (!p || !q) return;
    const used = state.used[i] ?? false;
    ctx.lineCap = 'round';
    if (used) {
      ctx.globalAlpha = fade;
      ctx.strokeStyle = theme.primary;
      ctx.lineWidth = 14;
      ctx.setLineDash([]);
    } else {
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = theme.stone;
      ctx.lineWidth = 6;
      ctx.setLineDash([12, 12]);
    }
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  });
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  // Ink stretching to the finger.
  const at = state.dots[state.at];
  if (at && state.finger && state.phase === 'draw') {
    ctx.strokeStyle = theme.primary;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(at.x, at.y);
    ctx.lineTo(state.finger.x, state.finger.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.lineCap = 'butt';

  const odd = oddDots(figure);
  const starts = odd.length > 0 ? odd : figure.dots.map((_, i) => i);
  state.dots.forEach((d, i) => {
    const glow = state.hint && state.at < 0 && starts.includes(i);
    if (glow) {
      ctx.fillStyle = theme.star;
      ctx.globalAlpha = 0.45 + (view.reducedMotion ? 0 : 0.3 * Math.sin(view.time * 6));
      ctx.beginPath();
      ctx.arc(d.x, d.y, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = i === state.at ? theme.star : theme.light;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(d.x, d.y, i === state.at ? 24 : 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  if (state.phase === 'done') {
    const t = Math.min(1, state.phaseAgo / 0.4);
    const cx = left + w / 2;
    const cy = top + h / 2;
    sprites.draw(ctx, REWARDS[state.figure] ?? 'star', cx, cy, Math.min(w, h) * 0.55 * t, { alpha: t });
    for (let k = 0; k < 4; k += 1) sprites.draw(ctx, 'sparkles', cx + Math.cos(k * 1.6) * w * 0.4, cy + Math.sin(k * 1.6) * h * 0.4, 46, { alpha: 1 - state.phaseAgo / 1.1 });
    paintLabel(ctx, view, 'Một nét!', cx, top - 26 > 120 ? top - 26 : top + h + 30, 40, theme.star);
  }
}
