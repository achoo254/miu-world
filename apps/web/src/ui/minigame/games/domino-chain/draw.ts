// Domino chain's picture: a wooden table, the dotted path, piles of books in the way, the bell at the end (it
// swings and sparkles when the chain reaches it), and the dominoes from above: standing ones as thin dark bars
// across the path, falling ones tipping, fallen ones lying flat with their dots, broken ones askew and pale.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { DominoState } from './logic';

export function drawDominoChain(ctx: CanvasRenderingContext2D, state: DominoState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.fillStyle = theme.woodEdge;
  for (let y = 40; y < arena.height; y += 90) ctx.fillRect(0, y, arena.width, 3);
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.55;
  state.path.forEach((p, i) => {
    if (i % 3 !== 0) return;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  for (const b of state.blocks) {
    ctx.fillStyle = theme.secondary;
    roundRect(ctx, b.x, b.y, b.w, b.h, 10);
    ctx.fill();
    sprites.draw(ctx, 'books', b.x + b.w / 2, b.y + b.h / 2, Math.min(b.w, b.h) * 1.2);
  }
  const swing = state.phase === 'rang' && !view.reducedMotion ? Math.sin(state.phaseTime * 18) * 0.4 : 0;
  sprites.draw(ctx, 'bell', state.bell.x, state.bell.y, 80, { rotate: swing });
  if (state.phase === 'rang') {
    sprites.draw(ctx, 'sparkles', state.bell.x + 40, state.bell.y - 50, 50);
    paintLabel(ctx, view, 'Kính coong!', arena.width / 2, 150, 48, theme.star);
  }
  for (const d of state.dominoes) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.angle);
    if (d.state === 'up' || d.state === 'falling') {
      const tip = d.state === 'falling' ? Math.min(1, d.t / 0.16) : 0;
      const len = 12 + tip * 30;
      ctx.fillStyle = theme.ink;
      roundRect(ctx, -6, -20, len, 40, 4);
      ctx.fill();
      ctx.fillStyle = theme.light;
      ctx.fillRect(-1, -14, 3, 28);
    } else {
      ctx.globalAlpha = d.state === 'broken' ? 0.5 : 1;
      if (d.state === 'broken') ctx.rotate(0.9);
      ctx.fillStyle = theme.ink;
      roundRect(ctx, 0, -18, 42, 36, 5);
      ctx.fill();
      ctx.fillStyle = theme.light;
      for (const [px, py] of [
        [10, -8],
        [10, 8],
        [32, 0],
      ] as const) {
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  const first = state.dominoes[0];
  if (first && first.state === 'up' && state.dominoes.length > 3) {
    ctx.strokeStyle = theme.star;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.5 + 0.4 * Math.sin(view.time * 6);
    ctx.beginPath();
    ctx.arc(first.x, first.y, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
