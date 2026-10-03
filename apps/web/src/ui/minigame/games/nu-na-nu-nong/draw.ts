// Nu na nu nống's picture: a mat in the yard, friends sitting in a row with their legs stretched out toward
// the child, the rhyme's lines written large above them (the word being said lit up), a bouncing star over
// the leg the word lands on, a ring on the leg the child guessed, and the pulled-in leg tucked away with a
// sparkle. On a slow replay a word count runs along the legs.
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { HUD_SAFE_TOP } from '../../types';
import { countLegs, type NuNaState } from './logic';

function paintWords(ctx: CanvasRenderingContext2D, view: DrawView, state: NuNaState, top: number): void {
  const { arena, theme } = view;
  const size = Math.min(46, arena.width / 13);
  ctx.font = `800 ${size}px ${theme.font}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  let index = 0;
  state.lines.forEach((_, row) => {
    const words = state.words.slice(index, index + 4);
    const gap = size * 0.45;
    const widths = words.map((w) => ctx.measureText(w).width);
    const total = widths.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
    let x = (arena.width - total) / 2;
    const y = top + row * size * 1.35;
    words.forEach((w, k) => {
      const at = index + k;
      const lit = at === state.word;
      const said = at < state.word;
      if (lit) {
        ctx.fillStyle = theme.star;
        roundRect(ctx, x - 8, y - size * 0.62, (widths[k] ?? 0) + 16, size * 1.24, 12);
        ctx.fill();
      }
      ctx.lineWidth = size / 6;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = theme.ink;
      ctx.strokeText(w, x, y);
      ctx.fillStyle = said ? theme.star : theme.light;
      ctx.fillText(w, x, y);
      x += (widths[k] ?? 0) + gap;
    });
    index += words.length;
  });
}

export function drawNuNa(ctx: CanvasRenderingContext2D, state: NuNaState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, state.legTop - 60, 6);
  // The straw mat.
  ctx.fillStyle = theme.star;
  ctx.fillRect(0, state.legTop - 60, arena.width, arena.height);
  ctx.strokeStyle = theme.woodEdge;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 3;
  for (let y = state.legTop - 50; y < arena.height; y += 18) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(arena.width, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  paintWords(ctx, view, state, Math.max(HUD_SAFE_TOP + 40, state.legTop - 340));

  // Friends: a head over each pair of legs.
  state.friends.forEach((who, k) => {
    const a = state.legs[k * 2];
    const b = state.legs[k * 2 + 1];
    if (!a || !b) return;
    sprites.draw(ctx, who, (a.x + b.x) / 2, state.legTop - 60, Math.min(110, state.legWidth * 1.6));
  });

  const counted = state.phase === 'replay' ? countLegs(state.legs, state.startLeg, Math.max(0, state.word + 1)) : [];
  state.legs.forEach((leg, i) => {
    const w = state.legWidth * 0.6;
    const tuck = leg.pulledAgo < 0 ? 0 : Math.min(1, leg.pulledAgo / 0.35);
    const bottom = state.legBottom - (state.legBottom - state.legTop - 30) * tuck;
    // Trousers and a foot.
    ctx.fillStyle = leg.friend % 2 === 0 ? theme.secondary : theme.primary;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4;
    roundRect(ctx, leg.x - w / 2, state.legTop, w, Math.max(30, bottom - state.legTop - 30), 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = theme.light;
    ctx.beginPath();
    ctx.ellipse(leg.x, bottom - 24, w * 0.55, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (tuck > 0 && leg.pulledAgo < 1.2) sprites.draw(ctx, 'sparkles', leg.x, bottom - 70, 50, { alpha: 1 - leg.pulledAgo / 1.2 });
    if (i === state.guess && leg.pulledAgo < 0) {
      ctx.strokeStyle = theme.danger;
      ctx.lineWidth = 7;
      roundRect(ctx, leg.x - w / 2 - 10, state.legTop - 10, w + 20, state.legBottom - state.legTop + 14, 18);
      ctx.stroke();
    }
    if (state.phase === 'replay') {
      const times = counted.filter((c) => c === i).length;
      if (times > 0) paintLabel(ctx, view, String(counted.lastIndexOf(i) + 1), leg.x, state.legTop + 40, 30, theme.light);
    }
  });

  // The pointer on the leg of the word being said.
  const on = state.legs[state.pointer];
  if (on && state.word >= 0 && state.phase !== 'pull') {
    const hop = view.reducedMotion ? 0 : Math.abs(Math.sin((state.phaseTime / state.pace) * Math.PI)) * 16;
    sprites.draw(ctx, 'glowing-star', on.x, state.legBottom - 70 - hop, 54);
  }
  const label = state.phase === 'replay' ? 'Đếm lại chậm nhé…' : state.phase === 'pull' ? 'Co chân!' : state.guess >= 0 ? 'Xem có đúng không…' : 'Chân nào sẽ co? Chạm trước nhé!';
  paintLabel(ctx, view, label, arena.width / 2, state.legTop - 150, 30, state.phase === 'pull' ? theme.star : theme.light);
}
