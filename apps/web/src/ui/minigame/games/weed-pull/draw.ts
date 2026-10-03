// Weed pull's picture: soil beds in rows across a garden, each plot a little mound with its plant (carrots
// show their orange tops, weeds are wild green tufts); the plant being pulled stretches up out of the soil
// with its roots showing, a tough weed shows "shake" arrows until it loosens, pulled plants fly off.
import { bob, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { WIGGLES_NEEDED, type PlantKind, type Plot, type WeedState } from './logic';

const PICTURE: Record<PlantKind, 'herb' | 'clover' | 'carrot' | 'sunflower' | 'tulip'> = { weed: 'herb', tough: 'clover', carrot: 'carrot', sunflower: 'sunflower', tulip: 'tulip' };

function paintBeds(ctx: CanvasRenderingContext2D, view: DrawView, state: WeedState): void {
  const { arena, theme } = view;
  paintSky(ctx, view, 160, 6);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 130, arena.width, arena.height - 130);
  const rows = [...new Set(state.plots.map((p) => p.y))];
  for (const y of rows) {
    ctx.fillStyle = theme.groundDeep;
    roundRect(ctx, 14, y - 26, arena.width - 28, 52, 26);
    ctx.fill();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = theme.ink;
    roundRect(ctx, 14, y + 6, arena.width - 28, 20, 10);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function paintPlant(ctx: CanvasRenderingContext2D, view: DrawView, state: WeedState, plot: Plot, index: number): void {
  const { sprites, theme } = view;
  const size = state.plantSize;
  if (plot.pulled) {
    const t = plot.pulled.t / 0.7;
    sprites.draw(ctx, PICTURE[plot.pulled.kind], plot.x + t * 60, plot.y - size * 0.5 - t * 160, size, { alpha: 1 - t, rotate: t * 2 });
  }
  if (!plot.plant) return;
  const grabbed = state.grab?.plot === index ? state.grab : null;
  const progress = grabbed?.progress ?? 0;
  const pop = view.reducedMotion ? 1 : Math.min(1, plot.age / 0.25);
  const shake = grabbed && plot.plant === 'tough' && grabbed.wiggles < WIGGLES_NEEDED && !view.reducedMotion ? Math.sin(view.time * 30) * 4 : 0;
  const rise = progress * 60;
  if (progress > 0) {
    // Roots coming out of the soil.
    ctx.strokeStyle = theme.wood;
    ctx.lineWidth = 3;
    for (const dx of [-10, 0, 10]) {
      ctx.beginPath();
      ctx.moveTo(plot.x + dx * 0.5, plot.y - rise);
      ctx.lineTo(plot.x + dx, plot.y - rise + 18 + rise * 0.4);
      ctx.stroke();
    }
  }
  const y = plot.y - size * 0.42 - rise + (grabbed ? 0 : bob(view, 2, 2, plot.x));
  if (plot.plant === 'carrot') {
    // Mostly buried: only the top shows above the soil.
    ctx.save();
    ctx.beginPath();
    ctx.rect(plot.x - size, y - size, size * 2, plot.y - (y - size) + 2);
    ctx.clip();
    sprites.draw(ctx, 'carrot', plot.x + shake, y + size * 0.25, size * 1.1 * pop, { rotate: -2.3 });
    ctx.restore();
  } else {
    sprites.draw(ctx, PICTURE[plot.plant], plot.x + shake, y, size * pop, { squash: [1 - progress * 0.12, 1 + progress * 0.2] });
  }
  if (grabbed && plot.plant === 'tough' && grabbed.wiggles < WIGGLES_NEEDED) paintLabel(ctx, view, '◀ lắc ▶', plot.x, plot.y - size - 20, 30, theme.star);
  else if (grabbed) paintLabel(ctx, view, '▲', plot.x, plot.y - size - 30 - rise, 34, theme.star);
}

export function drawWeedPull(ctx: CanvasRenderingContext2D, state: WeedState, view: DrawView): void {
  paintBeds(ctx, view, state);
  state.plots.forEach((plot, i) => paintPlant(ctx, view, state, plot, i));
}
