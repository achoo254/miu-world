// Pháo đất's picture: a village yard, a flat stone, the clay bowl seen from the side whose walls get thinner
// with every circle (a dashed ring shows where to draw circles), a thickness gauge with its green band, and the
// slam: a big burst and "ĐÙNG!" for a bang, a puff for "bụp", a torn bowl for a tear.
import { paintGround, paintHills, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { GREEN_HIGH, GREEN_LOW, type PhaoState } from './logic';

export function drawPhaoDat(ctx: CanvasRenderingContext2D, state: PhaoState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { centre } = state;
  const groundY = centre.y + 120;
  paintSky(ctx, view, groundY, 8);
  paintHills(ctx, view, groundY - 10, 30, 60, theme.leaf);
  paintGround(ctx, view, groundY);
  // The stone slab.
  ctx.fillStyle = theme.stone;
  ctx.strokeStyle = theme.stoneEdge;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(centre.x, groundY + 10, 200, 36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Where to draw circles.
  if (!state.slam) {
    ctx.strokeStyle = theme.light;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, (state.inner + state.outer) / 2, view.reducedMotion ? 0 : view.time, Math.PI * 2 + (view.reducedMotion ? 0 : view.time));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  // The clay bowl: wider and thinner as it is worked.
  const t = state.thickness;
  const squish = view.reducedMotion ? 0 : Math.max(0, 1 - state.loopAgo / 0.2) * 0.08;
  const w = 90 + (1 - t) * 60;
  const h = 70 + (1 - t) * 20;
  const by = groundY - h;
  if (!state.slam || state.slamAgo < 0.15) {
    ctx.fillStyle = theme.groundDeep;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(centre.x - w * (1 + squish), by);
    ctx.quadraticCurveTo(centre.x - w * 0.9, groundY + 6, centre.x, groundY + 6);
    ctx.quadraticCurveTo(centre.x + w * 0.9, groundY + 6, centre.x + w * (1 + squish), by);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // The hollow inside: its rim shows how thick the wall is.
    const wall = 6 + t * 34;
    ctx.fillStyle = theme.ink;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.ellipse(centre.x, by + 2, Math.max(8, w - wall), Math.max(4, 16 - t * 6), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else {
    const k = Math.min(1, state.slamAgo / 0.3);
    if (state.slam === 'bang') {
      sprites.draw(ctx, 'collision', centre.x, groundY - 40, 120 + k * 120, { alpha: 1 - Math.max(0, state.slamAgo - 0.6) });
      paintLabel(ctx, view, 'ĐÙNG!', centre.x, groundY - 190, 64, theme.star);
    } else if (state.slam === 'pop') {
      sprites.draw(ctx, 'cloud', centre.x, groundY - 30, 90 * k);
      paintLabel(ctx, view, 'Bụp… thành dày quá', centre.x, groundY - 150, 34, theme.light);
    } else {
      ctx.fillStyle = theme.groundDeep;
      ctx.beginPath();
      ctx.ellipse(centre.x - 50, groundY, 50, 16, -0.2, 0, Math.PI * 2);
      ctx.ellipse(centre.x + 55, groundY + 4, 40, 12, 0.3, 0, Math.PI * 2);
      ctx.fill();
      paintLabel(ctx, view, 'Thủng rồi! Mỏng quá', centre.x, groundY - 150, 34, theme.light);
    }
  }

  // Thickness gauge on the right.
  const gx = arena.width - 40;
  const gTop = Math.max(150, centre.y - 180);
  const gH = 300;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, gx - 18, gTop, 36, gH, 14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.leaf;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(gx - 15, gTop + gH * (1 - GREEN_HIGH), 30, gH * (GREEN_HIGH - GREEN_LOW));
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.groundDeep;
  roundRect(ctx, gx - 11, gTop + gH * (1 - t), 22, gH * t, 8);
  ctx.fill();
  paintLabel(ctx, view, 'Dày', gx - 4, gTop - 22, 22, theme.light);
  if (!state.slam) {
    const ready = t <= GREEN_HIGH && t >= GREEN_LOW;
    paintLabel(ctx, view, ready ? 'Vuốt mạnh xuống để úp!' : 'Vẽ vòng tròn quanh bát', centre.x, Math.max(150, centre.y - (state.inner + state.outer) / 2 - 40), 32, ready ? theme.star : theme.light);
  }
}
