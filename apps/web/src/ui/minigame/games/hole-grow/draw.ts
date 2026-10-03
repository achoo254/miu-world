// Hole grow's picture: a grassy yard with a paved path, everything lying around (leaves, balls, boxes, bikes)
// with soft shadows, the hole (a dark pit with a rim) that grows, things tipping in (shrinking and spinning
// toward its middle), things too big wobbling, and how much of this yard is cleared as a bar along the bottom.
import { paintShadow, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { HoleState } from './logic';

/** Pictures per size tier (three looks each). */
export const LOOKS: readonly (readonly [SpriteRef, SpriteRef, SpriteRef])[] = [
  ['fallen-leaf', 'maple-leaf', 'leaf'],
  ['soccer-ball', 'red-apple', 'tennis'],
  ['package', 'teddy-bear', 'wastebasket'],
  ['bicycle', 'automobile', 'kite'],
];

export function drawHoleGrow(ctx: CanvasRenderingContext2D, state: HoleState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, arena.width, arena.height);
  // Mown stripes and a paved path across the yard.
  ctx.fillStyle = theme.leaf;
  ctx.globalAlpha = 0.15;
  for (let x = 0; x < arena.width; x += 120) ctx.fillRect(x, 0, 60, arena.height);
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.stone;
  ctx.globalAlpha = 0.55;
  roundRect(ctx, -20, HUD_SAFE_TOP + (arena.height - HUD_SAFE_TOP) * 0.55, arena.width + 40, 70, 30);
  ctx.fill();
  ctx.globalAlpha = 1;

  // The hole first, so things tipping in draw over its dark middle.
  const { hole, radius } = state;
  ctx.fillStyle = theme.groundDeep;
  ctx.beginPath();
  ctx.ellipse(hole.x, hole.y, radius + 8, (radius + 8) * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();
  const pit = ctx.createRadialGradient(hole.x, hole.y - radius * 0.2, radius * 0.1, hole.x, hole.y, radius);
  pit.addColorStop(0, theme.ink);
  pit.addColorStop(1, theme.groundDeep);
  ctx.fillStyle = pit;
  ctx.beginPath();
  ctx.ellipse(hole.x, hole.y, radius, radius * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();

  for (const t of state.things) {
    const ref = LOOKS[t.tier]?.[t.look] ?? 'leaf';
    if (t.swallowed >= 0) {
      if (t.swallowed > 0.4) continue;
      const k = t.swallowed / 0.4;
      const x = t.x + (hole.x - t.x) * k;
      const y = t.y + (hole.y - t.y) * k;
      sprites.draw(ctx, ref, x, y, t.r * 2.2 * (1 - k), { rotate: k * 4, alpha: 1 - k * 0.5 });
      continue;
    }
    const since = state.time - t.bumpedAt;
    const wobble = since < 0.5 && !view.reducedMotion ? Math.sin(since * 30) * 0.2 * (1 - since / 0.5) : 0;
    // A new yard's things drop in from above.
    const drop = Math.max(0, 1 - state.yardAgo / 0.4) * 80;
    paintShadow(ctx, view, t.x, t.y + t.r * 0.8, t.r * 1.8);
    sprites.draw(ctx, ref, t.x, t.y - drop, t.r * 2.2, { rotate: wobble });
  }
  // The rim over everything, so the hole reads as a hole.
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(hole.x, hole.y, radius + 4, (radius + 4) * 0.92, 0, 0, Math.PI * 2);
  ctx.stroke();

  // How much of the yard is cleared.
  const barW = Math.min(arena.width - 60, 420);
  const x = (arena.width - barW) / 2;
  const y = arena.height - 34;
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.35;
  roundRect(ctx, x, y, barW, 18, 9);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.star;
  roundRect(ctx, x, y, (barW * state.eaten) / Math.max(1, state.total), 18, 9);
  ctx.fill();
}
