// Sun and rain's picture: a farm field, the round sun with rays, the grey rain cloud the child drags (rain
// streaks fall from it onto the tree when it covers the sun), the apple tree whose crown grows a little with
// every apple, apples that ripen and drop into the basket, and two bars at the side, sun and water, each with
// its green band.
import { paintGround, paintHills, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { GOOD_HIGH, GOOD_LOW, inGreen, type SunRainState } from './logic';

function paintBar(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, h: number, value: number, icon: 'sun' | 'droplet'): void {
  const { theme, sprites } = view;
  const w = 34;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, x - w / 2, y, w, h, 14);
  ctx.fill();
  ctx.stroke();
  // Green band.
  ctx.fillStyle = theme.leaf;
  ctx.globalAlpha = 0.4;
  ctx.fillRect(x - w / 2 + 3, y + h * (1 - GOOD_HIGH), w - 6, h * (GOOD_HIGH - GOOD_LOW));
  ctx.globalAlpha = 1;
  ctx.fillStyle = inGreen(value) ? theme.leaf : icon === 'sun' ? theme.star : theme.water;
  roundRect(ctx, x - w / 2 + 6, y + h * (1 - value), w - 12, h * value, 8);
  ctx.fill();
  sprites.draw(ctx, icon, x, y - 26, 40);
}

export function drawSunRain(ctx: CanvasRenderingContext2D, state: SunRainState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, state.groundY, 0);
  if (state.raining) {
    ctx.fillStyle = theme.ink;
    ctx.globalAlpha = 0.12;
    ctx.fillRect(0, 0, arena.width, arena.height);
    ctx.globalAlpha = 1;
  }
  paintHills(ctx, view, state.groundY - 10, 40, 60, theme.leaf);
  paintGround(ctx, view, state.groundY);

  // Sun with turning rays.
  const { sun, cloud, tree } = state;
  ctx.strokeStyle = theme.star;
  ctx.lineWidth = 6;
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2 + (view.reducedMotion ? 0 : view.time * 0.5);
    ctx.beginPath();
    ctx.moveTo(sun.x + Math.cos(a) * 54, sun.y + Math.sin(a) * 54);
    ctx.lineTo(sun.x + Math.cos(a) * 72, sun.y + Math.sin(a) * 72);
    ctx.stroke();
  }
  sprites.draw(ctx, 'sun', sun.x, sun.y, 100);

  // The tree: its crown grows with the apples.
  const crown = state.crown * (0.85 + Math.min(0.2, state.score * 0.025) + state.growth * 0.03);
  const happy = inGreen(state.light) && inGreen(state.water);
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, tree.x - 18, tree.y - crown * 1.3, 36, crown * 1.3, 10);
  ctx.fill();
  ctx.fillStyle = theme.leaf;
  ctx.globalAlpha = happy ? 1 : 0.75;
  for (const [dx, dy, r] of [
    [0, -1.55, 0.75],
    [-0.55, -1.25, 0.6],
    [0.55, -1.25, 0.6],
    [0, -1.1, 0.65],
  ] as const) {
    ctx.beginPath();
    ctx.arc(tree.x + dx * crown, tree.y + dy * crown, r * crown, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Growth ring under the tree: how close the next apple is.
  ctx.strokeStyle = theme.star;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(tree.x, tree.y - crown * 1.3, 26, -Math.PI / 2, -Math.PI / 2 + state.growth * Math.PI * 2);
  ctx.stroke();
  // Apples: ripen, then drop into the basket.
  const basket = { x: tree.x + crown * 1.2, y: tree.y - 20 };
  sprites.draw(ctx, 'basket', basket.x, basket.y, 90);
  for (const a of state.apples) {
    const fall = Math.max(0, Math.min(1, (a.ago - 1.4) / 0.6));
    const x = a.x + (basket.x - a.x) * fall;
    const y = a.y + (basket.y - 20 - a.y) * fall - Math.sin(fall * Math.PI) * 40;
    sprites.draw(ctx, 'red-apple', x, y, 50 * Math.min(1, 0.4 + a.ago * 1.5), { alpha: fall >= 1 ? 0 : 1 });
  }
  if (!happy) {
    const why = state.water < GOOD_LOW ? 'Cây khát nước' : state.water > GOOD_HIGH ? 'Nhiều nước quá' : state.light < GOOD_LOW ? 'Cây cần nắng' : 'Nắng quá';
    paintLabel(ctx, view, why, tree.x, tree.y + 32, 28, theme.light);
  } else {
    paintLabel(ctx, view, 'Cây đang lớn!', tree.x, tree.y + 32, 28, theme.star);
  }

  // Rain under the cloud.
  if (state.raining) {
    ctx.strokeStyle = theme.water;
    ctx.lineWidth = 4;
    for (let i = 0; i < 14; i += 1) {
      const rx = cloud.x - 60 + ((i * 37) % 120);
      const ry = cloud.y + 30 + ((view.time * 500 + i * 61) % Math.max(60, state.groundY - cloud.y - 60));
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 6, ry + 22);
      ctx.stroke();
    }
  }
  sprites.draw(ctx, 'cloud', cloud.x, cloud.y, 150);
  if (state.raining) sprites.draw(ctx, 'droplet', cloud.x, cloud.y + 26, 34);

  // Bars along the left edge.
  const barTop = state.sun.y + 110;
  const barH = Math.min(380, Math.max(120, state.groundY - barTop - 80));
  paintBar(ctx, view, 40, barTop, barH, state.light, 'sun');
  paintBar(ctx, view, 92, barTop, barH, state.water, 'droplet');
}
