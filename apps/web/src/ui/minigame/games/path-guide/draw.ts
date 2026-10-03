// Path guide's picture: a farmyard lawn, three fenced pens each with a coloured flag and a bow picture,
// ducklings with a coloured ring (and the same picture) under them, the paths drawn as dotted lines in the
// duckling's colour, dizzy stars over ducklings that bumped, and a duckling that got home hopping in.
import { bob, paintSky, roundRect } from '../../draw-kit';
import type { SpriteName } from '../../sprites';
import type { DrawView } from '../../types';
import type { PathGuideState } from './logic';

const PICTURES: readonly SpriteName[] = ['heart', 'droplet', 'star'];
const colourOf = (view: DrawView, colour: number): string => [view.theme.danger, view.theme.secondary, view.theme.star][colour] ?? view.theme.primary;

export function drawPathGuide(ctx: CanvasRenderingContext2D, state: PathGuideState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, 120, 5);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 100, arena.width, arena.height);
  for (const pen of state.pens) {
    const x = pen.x - pen.w / 2;
    const y = pen.y - pen.h / 2;
    ctx.fillStyle = colourOf(view, pen.colour);
    ctx.globalAlpha = 0.3;
    roundRect(ctx, x, y, pen.w, pen.h, 16);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = theme.woodEdge;
    ctx.lineWidth = 7;
    ctx.setLineDash([14, 8]);
    roundRect(ctx, x, y, pen.w, pen.h, 16);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = colourOf(view, pen.colour);
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(pen.x, pen.y, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    sprites.draw(ctx, PICTURES[pen.colour] ?? 'star', pen.x, pen.y, 36);
  }
  for (const d of state.ducks) {
    if (d.path.length === 0) continue;
    ctx.fillStyle = colourOf(view, d.colour);
    d.path.forEach((p, i) => {
      if (i % 2 !== 0) return;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  for (const d of state.ducks) {
    const alpha = d.home >= 0 ? 1 - d.home / 0.5 : 1;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colourOf(view, d.colour);
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(d.x, d.y + 26, 34, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    const waddle = d.dizzy > 0 || view.reducedMotion ? 0 : Math.sin(view.time * 12 + d.id) * 0.12;
    sprites.draw(ctx, 'duck', d.x, d.y - (d.home >= 0 ? d.home * 40 : 0) + bob(view, 10, 2, d.id), 70, { rotate: waddle, flipX: Math.cos(d.heading) > 0 });
    sprites.draw(ctx, PICTURES[d.colour] ?? 'star', d.x + 24, d.y - 26, 26);
    ctx.globalAlpha = 1;
    if (d.dizzy > 0) {
      for (let i = 0; i < 3; i += 1) {
        const a = view.time * 5 + (i * Math.PI * 2) / 3;
        sprites.draw(ctx, 'star', d.x + Math.cos(a) * 30, d.y - 40 + Math.sin(a) * 8, 22);
      }
    }
  }
}
