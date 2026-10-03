// Knot untangle's picture: a fair sky, the strings between balloons (red where they cross, green once all are
// free), and the balloons in bright colours with a shine; the one held or selected is bigger with a glow.
import { paintLabel, paintSky } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { KnotState } from './logic';
import { crossingEdges } from './logic';

export function drawKnotUntangle(ctx: CanvasRenderingContext2D, state: KnotState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, arena.height, 8);
  const bad = crossingEdges(state);
  const free = bad.size === 0;
  state.edges.forEach(([a, b], i) => {
    const pa = state.nodes[a];
    const pb = state.nodes[b];
    if (!pa || !pb) return;
    ctx.strokeStyle = free ? theme.leaf : bad.has(i) ? theme.danger : theme.ink;
    ctx.lineWidth = bad.has(i) ? 6 : 4;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y + 20);
    ctx.lineTo(pb.x, pb.y + 20);
    ctx.stroke();
  });
  state.nodes.forEach((n, i) => {
    const active = i === state.dragged || i === state.selected;
    if (active) {
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = theme.star;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 52, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    sprites.draw(ctx, 'balloon', n.x, n.y, active ? 96 : 80, { rotate: view.reducedMotion ? 0 : Math.sin(view.time * 2 + i) * 0.08 });
  });
  if (state.nextIn > 0) paintLabel(ctx, view, 'Gỡ xong rồi!', arena.width / 2, HUD_SAFE_TOP + 40, 46, theme.star);
  else paintLabel(ctx, view, `Còn ${bad.size} dây chéo`, arena.width / 2, HUD_SAFE_TOP + 20, 30, theme.light);
}
