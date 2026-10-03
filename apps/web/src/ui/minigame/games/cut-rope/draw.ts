// Cut the rope's picture: a cardboard box under the sky (leafy corners), wooden pegs, the ropes (sagging
// when slack, two ends curling away when cut), the candy spinning a little as it swings, and the frog on a
// lily pad: it opens wide as the candy comes near and grins after eating it.
import { bob, paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { MOUTH, type CutRopeState } from './logic';

function paintRope(ctx: CanvasRenderingContext2D, view: DrawView, ax: number, ay: number, bx: number, by: number, slack: number): void {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2 + slack;
  ctx.lineCap = 'round';
  for (const [w, colour] of [[9, view.theme.woodEdge], [5, view.theme.wood]] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(mx, my, bx, by);
    ctx.stroke();
  }
}

export function drawCutRope(ctx: CanvasRenderingContext2D, state: CutRopeState, view: DrawView): void {
  const { arena, sprites, theme } = view;
  const { box } = state;
  const gradient = ctx.createLinearGradient(0, 0, 0, arena.height);
  gradient.addColorStop(0, theme.sky[0]);
  gradient.addColorStop(1, theme.sky[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, arena.width, arena.height);
  // The box.
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 8;
  roundRect(ctx, box.left, box.top, box.width, box.height, 24);
  ctx.globalAlpha = 0.7;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.stroke();
  sprites.draw(ctx, 'leaf', box.left + 20, box.top + 18, 60, { rotate: -0.6 });
  sprites.draw(ctx, 'leaf', box.left + box.width - 20, box.top + 18, 60, { rotate: 0.6, flipX: true });

  // Frog on its lily pad.
  const { frog } = state.level;
  ctx.fillStyle = theme.leaf;
  ctx.beginPath();
  ctx.ellipse(frog.x, frog.y + 46, 80, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  const near = Math.hypot(state.candy.x - frog.x, state.candy.y - frog.y);
  const open = state.eaten < 0 ? Math.max(0, Math.min(1, 1 - (near - MOUTH) / 220)) : 0;
  const munch = state.eaten >= 0 && !view.reducedMotion ? 1 + 0.15 * Math.sin(state.eaten * 25) * Math.max(0, 1 - state.eaten) : 1;
  sprites.draw(ctx, 'frog', frog.x, frog.y + bob(view, 3, 3), 110 * (1 + open * 0.2) * munch, { squash: [1 + open * 0.1, 1 - open * 0.08] });
  if (state.eaten >= 0) paintLabel(ctx, view, 'Ngon quá!', frog.x, frog.y - 90 - state.eaten * 20, 44, theme.star);

  // Ropes, snapped ends, pegs.
  for (const rope of state.level.ropes) {
    ctx.fillStyle = theme.woodEdge;
    ctx.beginPath();
    ctx.arc(rope.anchor.x, rope.anchor.y, 14, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const rope of state.ropes) {
    const d = Math.hypot(state.candy.x - rope.anchor.x, state.candy.y - rope.anchor.y);
    paintRope(ctx, view, rope.anchor.x, rope.anchor.y, state.candy.x, state.candy.y, Math.max(0, rope.length - d) * 0.6);
  }
  for (const s of state.snapped) {
    ctx.globalAlpha = 1 - s.t / 0.5;
    const mx = (s.from.x + s.to.x) / 2;
    const my = (s.from.y + s.to.y) / 2;
    paintRope(ctx, view, s.from.x, s.from.y, mx, my + s.t * 120, 10);
    paintRope(ctx, view, s.to.x, s.to.y + s.t * 200, mx, my + s.t * 240, 10);
    ctx.globalAlpha = 1;
  }
  for (const rope of state.level.ropes) {
    ctx.fillStyle = theme.wood;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(rope.anchor.x, rope.anchor.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  if (state.eaten < 0) {
    const alpha = state.lost >= 0 ? 1 - state.lost / 0.8 : 1;
    sprites.draw(ctx, 'candy', state.candy.x, state.candy.y, 70, { rotate: view.reducedMotion ? 0 : state.candy.vx / 900, alpha: Math.max(0, alpha) });
  }
}
