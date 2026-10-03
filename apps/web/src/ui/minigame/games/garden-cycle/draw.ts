// Garden cycle's picture: a farmyard, six soil beds with wooden edges (dark while watered, pale when dry),
// what grows in each (seed, sprout, young plant, the ripe vegetable glowing), a water-drop bubble over a dry
// bed, a hand-drawn "+" over an empty one, birds pecking (and flying off when shooed).
import { bob, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { RIPE, type GardenState } from './logic';

export function drawGardenCycle(ctx: CanvasRenderingContext2D, state: GardenState, view: DrawView): void {
  const { arena, sprites, theme } = view;
  paintSky(ctx, view, 200, 5);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 160, arena.width, arena.height - 160);
  const h = state.bedHalf;

  for (const bed of state.beds) {
    const { x, y } = bed.at;
    const bounce = view.reducedMotion ? 1 : 1 + 0.08 * Math.max(0, 1 - bed.touched / 0.2);
    ctx.fillStyle = theme.woodEdge;
    roundRect(ctx, x - h - 8, y - h * 0.7 - 8, (h + 8) * 2, h * 1.4 + 16, 18);
    ctx.fill();
    ctx.fillStyle = bed.growth >= 0 && bed.water > 0 ? theme.groundDeep : theme.wood;
    roundRect(ctx, x - h, y - h * 0.7, h * 2, h * 1.4, 14);
    ctx.fill();
    // Furrows.
    ctx.strokeStyle = theme.woodEdge;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 4;
    for (let k = -1; k <= 1; k += 1) {
      ctx.beginPath();
      ctx.moveTo(x - h + 14, y + k * h * 0.4);
      ctx.lineTo(x + h - 14, y + k * h * 0.4);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    if (bed.growth < 0) {
      paintLabel(ctx, view, '+', x, y, 54, theme.light);
    } else if (bed.growth >= RIPE) {
      ctx.globalAlpha = 0.45 + 0.2 * Math.sin(view.time * 5);
      ctx.fillStyle = theme.star;
      ctx.beginPath();
      ctx.arc(x, y - 10, h * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      sprites.draw(ctx, bed.crop, x, y - 10 + bob(view, 4, 3, x), h * 1.1 * bounce);
    } else if (bed.growth < 0.15) {
      ctx.fillStyle = theme.woodEdge;
      for (let k = -1; k <= 1; k += 1) {
        ctx.beginPath();
        ctx.arc(x + k * 22, y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      const size = h * (0.5 + bed.growth * 0.7) * bounce;
      const droop = bed.water <= 0 && !view.reducedMotion ? 0.35 : 0;
      sprites.draw(ctx, bed.growth < 0.55 ? 'seedling' : 'herb', x, y - size * 0.3, size, { rotate: droop });
      // Growth bar.
      ctx.fillStyle = theme.light;
      roundRect(ctx, x - h * 0.6, y + h * 0.5, h * 1.2, 10, 5);
      ctx.fill();
      ctx.fillStyle = theme.leaf;
      roundRect(ctx, x - h * 0.6, y + h * 0.5, h * 1.2 * bed.growth, 10, 5);
      ctx.fill();
    }
    if (bed.growth >= 0 && bed.growth < RIPE && bed.water < 0.35) {
      ctx.fillStyle = theme.light;
      ctx.strokeStyle = theme.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + h * 0.6, y - h * 0.6, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      sprites.draw(ctx, 'droplet', x + h * 0.6, y - h * 0.6 + bob(view, 6, 3), 40);
    }
    if (bed.bird >= 0) {
      const peck = view.reducedMotion ? 0 : Math.abs(Math.sin(bed.bird * 10)) * 10;
      sprites.draw(ctx, 'bird', x - h * 0.3, y - 30 + peck, 74, { rotate: 0.3 });
    }
  }
  for (const f of state.flying) sprites.draw(ctx, 'bird', f.x + f.t * 260, f.y - f.t * 300, 70, { alpha: 1 - f.t, flipX: true });
}
