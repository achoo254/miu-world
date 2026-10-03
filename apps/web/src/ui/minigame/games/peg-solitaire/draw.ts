// Peg solitaire's picture: a wooden triangle with round holes, a gem in every filled hole. A chosen gem lifts
// with a gold ring and the holes it can hop to pulse; a hop draws the gem along a little arc and the gem it
// jumped bursts into sparkles. "Còn N viên" counts the gems left; when stuck the "Lùi" button pulses with a
// hint. A board finished with two gems or fewer shines before the next.
import { paintLabel, paintSky } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { gems, HOLES, HOP_SECONDS, hops, type PegState } from './logic';

export function drawPegSolitaire(ctx: CanvasRenderingContext2D, state: PegState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, arena.height, 5);
  const r = state.reach * 0.78;
  const [a, b, c] = [state.holes[0], state.holes[10], state.holes[14]];
  if (a && b && c) {
    // The triangle board, a little larger than its holes.
    const grow = r * 1.6;
    ctx.fillStyle = theme.wood;
    ctx.strokeStyle = theme.woodEdge;
    ctx.lineWidth = 10;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y - grow * 1.2);
    ctx.lineTo(b.x - grow * 1.05, b.y + grow * 0.65);
    ctx.lineTo(c.x + grow * 1.05, c.y + grow * 0.65);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  const targets = state.selected >= 0 ? hops(state.board).filter(([from]) => from === state.selected).map(([, , to]) => to) : [];
  const hopping = state.lastHop && state.hopAgo < HOP_SECONDS ? state.lastHop : null;
  for (let i = 0; i < HOLES; i += 1) {
    const h = state.holes[i];
    if (!h) continue;
    ctx.fillStyle = theme.woodEdge;
    ctx.beginPath();
    ctx.arc(h.x, h.y, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
    if (targets.includes(i)) {
      ctx.strokeStyle = theme.star;
      ctx.lineWidth = 6;
      ctx.globalAlpha = 0.6 + (view.reducedMotion ? 0 : 0.4 * Math.sin(view.time * 8));
      ctx.beginPath();
      ctx.arc(h.x, h.y, r * 0.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const filled = (state.board & (1 << i)) !== 0;
    if (!filled || (hopping && hopping[2] === i)) continue;
    const chosen = state.selected === i;
    if (chosen) {
      ctx.fillStyle = theme.star;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(h.x, h.y - 10, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    const glow = state.cleared >= 0 && !view.reducedMotion ? 1 + 0.12 * Math.sin(state.cleared * 12) : 1;
    sprites.draw(ctx, 'gem', h.x, h.y - (chosen ? 12 : 4), r * 1.5 * glow);
  }
  if (hopping) {
    const [from, over, to] = hopping;
    const p = state.hopAgo / HOP_SECONDS;
    const f = state.holes[from];
    const t = state.holes[to];
    const o = state.holes[over];
    if (f && t) sprites.draw(ctx, 'gem', f.x + (t.x - f.x) * p, f.y + (t.y - f.y) * p - Math.sin(p * Math.PI) * 50, r * 1.5);
    if (o) sprites.draw(ctx, 'sparkles', o.x, o.y - p * 30, r * 1.3, { alpha: 1 - p });
  }

  const left = gems(state.board);
  paintLabel(ctx, view, state.cleared >= 0 ? `Giỏi quá! Còn ${left} viên` : state.stuck ? 'Kẹt rồi! Chạm Lùi nhé' : `Còn ${left} viên`, arena.width / 2, HUD_SAFE_TOP + 20, 32, state.cleared >= 0 ? theme.star : theme.light);

  const u = state.undo;
  const pulse = state.stuck && !view.reducedMotion ? 1 + 0.1 * Math.sin(view.time * 8) : 1;
  ctx.fillStyle = state.stuck ? theme.star : theme.light;
  ctx.beginPath();
  ctx.arc(u.x, u.y, state.undoRadius * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  ctx.stroke();
  paintLabel(ctx, view, '↶', u.x, u.y - 8, 40, theme.secondary);
  paintLabel(ctx, view, 'Lùi', u.x, u.y + 22, 20);
}
