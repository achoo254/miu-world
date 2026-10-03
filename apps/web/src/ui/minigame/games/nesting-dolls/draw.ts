// Nesting dolls' picture: a wooden shelf wall, and painted dolls drawn from shapes (a round body, a head with a
// face and a coloured headscarf), each the height of its rank; a doll holding others shows small dots for them.
// A dragged doll follows the finger, a selected one glows, a refused pair wobbles, the finished set sparkles.
import { paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { Doll, NestingDollsState } from './logic';

function paintDoll(ctx: CanvasRenderingContext2D, view: DrawView, doll: Doll, x: number, y: number, h: number, glow: boolean, time: number): void {
  const { theme } = view;
  const colours = [theme.danger, theme.secondary, theme.leaf, theme.primary, theme.star, theme.wood];
  const colour = colours[doll.rank % colours.length] ?? theme.danger;
  const wobble = time - doll.bounceAt < 0.4 && !view.reducedMotion ? Math.sin((time - doll.bounceAt) * 40) * 0.12 : 0;
  const pop = time - doll.joinedAt < 0.3 && !view.reducedMotion ? 1 + 0.12 * Math.sin(((time - doll.joinedAt) / 0.3) * Math.PI) : 1;
  ctx.save();
  ctx.translate(x, y + h / 2);
  ctx.rotate(wobble);
  ctx.scale(pop, pop);
  const w = h * 0.62;
  if (glow) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = theme.star;
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.45, w * 0.75, h * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.3, w / 2, h * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -h * 0.7, w * 0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.light;
  ctx.beginPath();
  ctx.arc(0, -h * 0.68, w * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.arc(-w * 0.09, -h * 0.7, 2.5, 0, Math.PI * 2);
  ctx.arc(w * 0.09, -h * 0.7, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.danger;
  ctx.beginPath();
  ctx.arc(0, -h * 0.63, 3, 0, Math.PI * 2);
  ctx.fill();
  // An apron with a flower.
  ctx.fillStyle = theme.light;
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.26, w * 0.26, h * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.star;
  ctx.beginPath();
  ctx.arc(0, -h * 0.28, w * 0.09, 0, Math.PI * 2);
  ctx.fill();
  for (let k = 0; k < doll.holds; k += 1) {
    ctx.fillStyle = theme.ink;
    ctx.beginPath();
    ctx.arc((k - (doll.holds - 1) / 2) * 9, -h * 0.08, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawNestingDolls(ctx: CanvasRenderingContext2D, state: NestingDollsState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, arena.height, 3);
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, HUD_SAFE_TOP, arena.width, arena.height - HUD_SAFE_TOP);
  ctx.globalAlpha = 1;
  // Shelf boards under each row of dolls.
  const rows = [...new Set(state.dolls.map((d) => d.home.y))];
  for (const y of rows) {
    const h = Math.max(...state.sizes);
    ctx.fillStyle = theme.woodEdge;
    roundRect(ctx, 10, y + h / 2, arena.width - 20, 14, 6);
    ctx.fill();
  }
  const order = state.dolls.map((d, i) => ({ d, i })).sort((a, b) => (a.i === state.dragged ? 1 : b.i === state.dragged ? -1 : 0));
  for (const { d, i } of order) {
    const h = state.sizes[d.rank] ?? 100;
    if (i !== state.dragged) paintShadow(ctx, view, d.home.x, d.home.y + h / 2, h * 0.6);
    paintDoll(ctx, view, d, d.at.x, d.at.y, h, i === state.selected, state.time);
  }
  if (state.nextIn > 0) {
    const last = state.dolls[0];
    if (last) sprites.draw(ctx, 'sparkles', last.home.x + 50, last.home.y - 60, 70);
    paintLabel(ctx, view, 'Xong một bộ!', arena.width / 2, HUD_SAFE_TOP + 40, 44, theme.star);
  }
}
