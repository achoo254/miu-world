// Pair link's picture: a library table (wood) with a paper board, raised tiles each showing a picture, the
// picked tile lifted and outlined, a pair that glows as a hint, the line that joined the last pair (with its
// bends) fading out, and "Xáo lại!" after a reshuffle.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { PICTURES, type PairLinkState } from './logic';

export function drawPairLink(ctx: CanvasRenderingContext2D, state: PairLinkState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = theme.woodEdge;
  for (let y = 0; y < arena.height; y += 64) ctx.fillRect(0, y, arena.width, 4);
  ctx.globalAlpha = 1;
  const pad = 14;
  const w = state.cell * state.cols;
  const h = state.cell * state.rows;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 6;
  roundRect(ctx, state.left - pad, state.top - pad, w + pad * 2, h + pad * 2, 24);
  ctx.fill();
  ctx.stroke();

  const glow = 0.5 + 0.5 * Math.sin(view.time * 6);
  state.tiles.forEach((picture, i) => {
    if (picture < 0) return;
    const col = i % state.cols;
    const row = Math.floor(i / state.cols);
    const picked = state.selected === i;
    const hinted = state.hint !== null && (state.hint[0] === i || state.hint[1] === i);
    const lift = picked && !view.reducedMotion ? 6 : 0;
    const x = state.left + col * state.cell + 4;
    const y = state.top + row * state.cell + 4 - lift;
    const s = state.cell - 8;
    ctx.fillStyle = theme.stoneEdge;
    roundRect(ctx, x, y + 6 + lift, s, s, 16);
    ctx.fill();
    ctx.fillStyle = picked ? theme.star : theme.light;
    ctx.strokeStyle = picked ? theme.primary : hinted ? theme.star : theme.stone;
    ctx.lineWidth = picked ? 6 : hinted ? 4 + 4 * glow : 3;
    roundRect(ctx, x, y, s, s, 16);
    ctx.fill();
    ctx.stroke();
    if (picked && state.wrongAgo < 0.4) {
      ctx.globalAlpha = 0.3 * (1 - state.wrongAgo / 0.4);
      ctx.fillStyle = theme.danger;
      roundRect(ctx, x, y, s, s, 16);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    sprites.draw(ctx, PICTURES[picture] ?? 'cat-face', x + s / 2, y + s / 2, s * 0.74);
  });

  const link = state.link;
  if (link) {
    const fade = 1 - link.ago / 0.5;
    ctx.globalAlpha = fade;
    ctx.strokeStyle = theme.star;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    link.path.forEach((c, k) => {
      const px = state.left + (c.col + 0.5) * state.cell;
      const py = state.top + (c.row + 0.5) * state.cell;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    for (const end of [link.from, link.to]) {
      const px = state.left + ((end % state.cols) + 0.5) * state.cell;
      const py = state.top + (Math.floor(end / state.cols) + 0.5) * state.cell;
      sprites.draw(ctx, PICTURES[link.picture] ?? 'cat-face', px, py - link.ago * 60, state.cell * 0.74 * (1 + link.ago));
    }
    ctx.globalAlpha = 1;
  }
  if (state.shuffledAgo < 1.2) paintLabel(ctx, view, 'Xáo lại!', arena.width / 2, state.top + h / 2, 56, theme.star);
}
