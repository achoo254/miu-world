// Ông đồ's picture: a Tết street stall, a sheet of red paper with a gold edge, the word's strokes in faint
// gold, finished strokes in thick black ink, the stroke being written showing its ink dark or pale where the
// brush went, a pulsing dot where the next stroke starts, the brush at the finger, a word on how the last
// stroke went, and the finished word with its marks added and the scholar's sparkle.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { HUD_SAFE_TOP } from '../../types';
import { WORDS, type CalligraphyState, type Mark } from './logic';

const VERDICT = { good: 'Nét đẹp!', pale: 'Nét nhạt quá, viết chậm lại nhé', off: 'Theo nét mẫu nhé' } as const;

function paintMark(ctx: CanvasRenderingContext2D, state: CalligraphyState, mark: Mark): void {
  const box = state.boxes[mark.letter];
  if (!box) return;
  const cx = box.x + box.w / 2;
  const em = state.em;
  const y = state.top + em * 0.3;
  ctx.beginPath();
  if (mark.kind === 'hat') {
    ctx.moveTo(cx - em * 0.18, y + em * 0.06);
    ctx.lineTo(cx, y - em * 0.08);
    ctx.lineTo(cx + em * 0.18, y + em * 0.06);
  } else if (mark.kind === 'acute') {
    ctx.moveTo(cx - em * 0.04, y + em * 0.06);
    ctx.lineTo(cx + em * 0.12, y - em * 0.12);
  } else if (mark.kind === 'grave') {
    ctx.moveTo(cx + em * 0.04, y + em * 0.06);
    ctx.lineTo(cx - em * 0.12, y - em * 0.12);
  }
  ctx.stroke();
  if (mark.kind === 'dot-below' || mark.kind === 'dot') {
    ctx.beginPath();
    ctx.arc(cx, mark.kind === 'dot' ? state.top + em * 0.28 : state.top + em * 1.16, em * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawCalligraphy(ctx: CanvasRenderingContext2D, state: CalligraphyState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.sky[2];
  ctx.fillRect(0, 0, arena.width, arena.height);
  for (let x = 40; x < arena.width; x += 160) sprites.draw(ctx, 'red-paper-lantern', x, HUD_SAFE_TOP - 10, 54);
  // The red paper.
  const pad = 40;
  const left = Math.min(...state.boxes.map((b) => b.x)) - pad;
  const right = Math.max(...state.boxes.map((b) => b.x + b.w)) + pad;
  const top = state.top - pad - state.em * 0.1;
  const bottom = state.top + state.em * 1.2 + pad;
  ctx.fillStyle = theme.danger;
  ctx.strokeStyle = theme.star;
  ctx.lineWidth = 8;
  roundRect(ctx, left, top, right - left, bottom - top, 10);
  ctx.fill();
  ctx.stroke();

  const width = Math.max(18, state.em * 0.12);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  state.strokes.forEach((stroke, i) => {
    const pts = stroke.samples;
    const first = pts[0];
    if (!first) return;
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    if (stroke.done) {
      ctx.strokeStyle = theme.ink;
      ctx.lineWidth = width;
      ctx.globalAlpha = 1;
    } else {
      ctx.strokeStyle = theme.star;
      ctx.lineWidth = width * 1.2;
      ctx.globalAlpha = i === state.current ? 0.55 : 0.25;
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (i === state.current && !stroke.done) {
      // Ink laid so far on this stroke.
      ctx.fillStyle = theme.ink;
      pts.forEach((p, k) => {
        const ink = stroke.ink[k] ?? 0;
        if (ink <= 0) return;
        ctx.globalAlpha = ink;
        ctx.beginPath();
        ctx.arc(p.x, p.y, width / 2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      if (!state.pen) {
        const pulse = view.reducedMotion ? 1 : 1 + 0.2 * Math.sin(view.time * 6);
        ctx.fillStyle = theme.light;
        ctx.strokeStyle = theme.ink;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(first.x, first.y, 16 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  });
  // Off-stroke brush marks: blots along a stray trail.
  if (state.pen && state.strayed > 0) {
    ctx.fillStyle = theme.ink;
    ctx.globalAlpha = 0.3;
    for (const p of state.trail.slice(-12)) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, width * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.lineCap = 'butt';

  const entry = WORDS[state.word];
  if (state.doneAgo >= 0 && entry) {
    ctx.strokeStyle = theme.ink;
    ctx.fillStyle = theme.ink;
    ctx.lineWidth = width * 0.7;
    ctx.lineCap = 'round';
    for (const mark of entry.marks) paintMark(ctx, state, mark);
    ctx.lineCap = 'butt';
    sprites.draw(ctx, 'sparkles', right - 20, top + 10, 70);
    paintLabel(ctx, view, `Chữ "${entry.word}" đẹp quá!`, arena.width / 2, Math.min(arena.height - 30, bottom + 40), 34, theme.star);
  } else if (state.verdict && state.verdictAgo < 1.2) {
    paintLabel(ctx, view, VERDICT[state.verdict], arena.width / 2, Math.min(arena.height - 30, bottom + 40), 28, state.verdict === 'good' ? theme.star : theme.primary);
  } else if (entry) {
    paintLabel(ctx, view, `Viết chữ "${entry.word}"`, arena.width / 2, Math.min(arena.height - 30, bottom + 40), 30, theme.primary);
  }
  if (state.pen) sprites.draw(ctx, 'paintbrush', state.pen.x + 30, state.pen.y - 30, 80, { rotate: -0.3 });
}
