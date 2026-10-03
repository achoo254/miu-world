// Chicken feed's picture: a fenced yard with the coop in a corner, grain flying from the child's sack and
// lying in little golden heaps, hens and chicks walking and pecking (chicks show five dots that fill as they
// eat), a full chick napping by the coop with a "z", and a new one hatching from an egg.
import { bob, paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { FULL, type ChickenFeedState } from './logic';

export function drawChickenFeed(ctx: CanvasRenderingContext2D, state: ChickenFeedState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { yard } = state;
  ctx.fillStyle = theme.groundDeep;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.fillStyle = theme.ground;
  roundRect(ctx, yard.x, yard.y, yard.w, yard.h, 26);
  ctx.fill();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = theme.leaf;
  for (let i = 0; i < 30; i += 1) ctx.fillRect(yard.x + ((i * 157) % yard.w), yard.y + ((i * 89) % yard.h), 6, 14);
  ctx.globalAlpha = 1;
  // Fence along the edge.
  ctx.strokeStyle = theme.wood;
  ctx.lineWidth = 8;
  roundRect(ctx, yard.x, yard.y, yard.w, yard.h, 26);
  ctx.stroke();
  ctx.fillStyle = theme.woodEdge;
  for (let x = yard.x + 20; x < yard.x + yard.w; x += 70) {
    ctx.fillRect(x, yard.y - 10, 10, 20);
    ctx.fillRect(x, yard.y + yard.h - 10, 10, 20);
  }
  // The coop.
  const c = state.coop;
  ctx.fillStyle = theme.wood;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, c.x - 55, c.y - 30, 110, 70, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.danger;
  ctx.beginPath();
  ctx.moveTo(c.x - 70, c.y - 28);
  ctx.lineTo(c.x, c.y - 80);
  ctx.lineTo(c.x + 70, c.y - 28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.arc(c.x, c.y + 10, 18, Math.PI, 0);
  ctx.fillRect(c.x - 18, c.y + 10, 36, 30);
  ctx.fill();

  for (const g of state.grains) {
    const t = 1 - g.landIn / 0.25;
    const x = g.landIn > 0 ? g.fromX + (g.x - g.fromX) * t : g.x;
    const y = g.landIn > 0 ? g.fromY + (g.y - g.fromY) * t - Math.sin(t * Math.PI) * 120 : g.y;
    ctx.fillStyle = theme.star;
    ctx.strokeStyle = theme.woodEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, 7, 5, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  for (const b of [...state.birds].sort((p, q) => p.y - q.y)) {
    const peck = b.peck > 0 && !view.reducedMotion ? Math.abs(Math.sin(b.peck * 16)) * 8 : 0;
    if (b.hen) {
      sprites.draw(ctx, 'chicken', b.x, b.y - 30 + peck, 96, { flipX: b.facing > 0 });
      continue;
    }
    if (b.age < 0.6) {
      sprites.draw(ctx, 'hatching-chick', b.x, b.y - 22, 60);
      continue;
    }
    sprites.draw(ctx, 'baby-chick', b.x, b.y - 22 + peck + (b.fullAgo < 0 ? bob(view, 8, 1.5, b.x) : 0), 66, { flipX: b.facing > 0 });
    if (b.fullAgo >= 0) {
      paintLabel(ctx, view, 'z', b.x + 26, b.y - 60 - (b.fullAgo % 1) * 20, 28, theme.light);
      continue;
    }
    for (let k = 0; k < FULL; k += 1) {
      ctx.fillStyle = k < b.ate ? theme.star : theme.light;
      ctx.strokeStyle = theme.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x - 28 + k * 14, b.y - 66, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  sprites.draw(ctx, 'sheaf-of-rice', arena.width - 70, arena.height - 70, 90, { alpha: state.reload > 0 ? 0.5 : 1 });
}
