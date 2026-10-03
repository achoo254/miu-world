// Simon says' picture: a farm sky over hills, four big coloured pads each with its animal, a pad lighting
// up (glow, hop, a floating note) when its animal sings or is tapped, and a round hub in the middle: a note
// while the animals sing, the child's own character with "taps so far / song length" when it is her turn,
// a star after a song sung back and a soft "again" after a mistake.
import { bob, paintGround, paintHills, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { ANIMALS, type SimonState } from './logic';

const LIT_SECONDS = 0.38;

export function drawSimonSays(ctx: CanvasRenderingContext2D, state: SimonState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const colours = [theme.primary, theme.secondary, theme.star, theme.leaf];
  paintSky(ctx, view, arena.height * 0.7, 5);
  paintHills(ctx, view, arena.height * 0.75, 0, 90, theme.leaf);
  paintGround(ctx, view, arena.height - 60);

  state.pads.forEach((pad, i) => {
    const lit = Math.max(0, 1 - (state.litAgo[i] ?? 9) / LIT_SECONDS);
    const half = pad.size / 2;
    const waiting = state.phase === 'play';
    if (lit > 0) {
      ctx.globalAlpha = 0.6 * lit;
      ctx.fillStyle = theme.light;
      roundRect(ctx, pad.x - half - 14, pad.y - half - 14, pad.size + 28, pad.size + 28, 40);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = colours[i] ?? theme.primary;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 6;
    ctx.globalAlpha = lit > 0 || waiting ? 1 : 0.72;
    roundRect(ctx, pad.x - half, pad.y - half, pad.size, pad.size, 32);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 0.35 + 0.4 * lit;
    ctx.fillStyle = theme.light;
    roundRect(ctx, pad.x - half + 14, pad.y - half + 12, pad.size - 28, pad.size * 0.22, 18);
    ctx.fill();
    ctx.globalAlpha = 1;
    const hop = view.reducedMotion ? 0 : Math.sin(lit * Math.PI) * pad.size * 0.12;
    const grow = 1 + 0.15 * lit;
    sprites.draw(ctx, ANIMALS[i] ?? 'cow', pad.x, pad.y - hop + bob(view, 2, 3, i), pad.size * 0.62 * grow);
    if (lit > 0) {
      ctx.globalAlpha = lit;
      sprites.draw(ctx, 'musical-note', pad.x + half * 0.55, pad.y - half * 0.6 - (1 - lit) * 40, pad.size * 0.28);
      ctx.globalAlpha = 1;
    }
  });

  // The hub between the pads.
  const first = state.pads[0];
  const last = state.pads[3];
  if (!first || !last) return;
  const cx = (first.x + last.x) / 2;
  const cy = (first.y + last.y) / 2;
  const r = Math.min(64, first.size * 0.3);
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  switch (state.phase) {
    case 'listen':
      sprites.draw(ctx, 'musical-note', cx, cy + bob(view, 6, 4), r * 1.2);
      break;
    case 'play':
      sprites.draw(ctx, view.player, cx, cy - r * 0.18, r * 1.05);
      paintLabel(ctx, view, `${state.played}/${state.song.length}`, cx, cy + r * 0.62, r * 0.5, theme.star);
      break;
    case 'right':
      sprites.draw(ctx, 'glowing-star', cx, cy, r * 1.4 * (1 + 0.2 * Math.sin(Math.min(1, state.phaseAgo * 4) * Math.PI)));
      break;
    case 'wrong':
      paintLabel(ctx, view, 'Lại nào', cx, cy, r * 0.42, theme.light);
      break;
  }
}
