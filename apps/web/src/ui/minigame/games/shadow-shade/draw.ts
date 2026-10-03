// Shade for the cat's picture: a sky that warms toward evening colours when the sun is low, the sun on its
// dotted arc, a tree and a house standing on the grass with their shadows stretched away from the sun, and
// the cat: hot in the sun (a drop of sweat), sleepy in the shade (z z z), purring with hearts, or padding off
// to its next spot.
import { bob, paintLabel, paintSky } from '../../draw-kit';
import type { DrawView } from '../../types';
import { CAT_HALF, isShaded, shadowSpan, sunPoint, type ShadeState } from './logic';

export function drawShadowShade(ctx: CanvasRenderingContext2D, state: ShadeState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { groundY } = state;
  paintSky(ctx, view, groundY, 6);
  // Evening warmth for a low sun.
  const lift = Math.sin(state.sun);
  ctx.fillStyle = theme.star;
  ctx.globalAlpha = Math.max(0, 0.35 - lift * 0.4);
  ctx.fillRect(0, 0, arena.width, groundY);
  ctx.globalAlpha = 1;

  // The sun's path.
  ctx.strokeStyle = theme.light;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 4;
  ctx.setLineDash([6, 14]);
  ctx.beginPath();
  ctx.arc(state.arc.x, state.arc.y, state.arcRadius, Math.PI, 0);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  const sun = sunPoint(state);
  ctx.fillStyle = theme.star;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(sun.x, sun.y, 62 + (view.reducedMotion ? 0 : Math.sin(view.time * 3) * 6), 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  sprites.draw(ctx, 'sun', sun.x, sun.y, 96, { rotate: view.reducedMotion ? 0 : view.time * 0.3 });

  // Ground and shadows.
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, groundY, arena.width, arena.height - groundY);
  ctx.fillStyle = theme.groundDeep;
  ctx.fillRect(0, groundY + 40, arena.width, arena.height - groundY - 40);
  for (const c of state.casters) {
    const [from, to] = shadowSpan(c, state.sun);
    ctx.fillStyle = theme.ink;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(from, groundY + 2);
    ctx.lineTo(to, groundY + 2);
    ctx.lineTo(to - (to - from) * 0.02, groundY + 26);
    ctx.lineTo(from + (to - from) * 0.02, groundY + 26);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  for (const c of state.casters) {
    if (c.kind === 'tree') sprites.draw(ctx, 'deciduous-tree', c.x, groundY - c.height / 2 + 6, c.height * 1.05);
    else sprites.draw(ctx, 'house', c.x, groundY - c.height / 2 + 8, c.height * 1.1);
  }

  // The cat.
  const shaded = isShaded(state);
  const catY = groundY + 8;
  if (state.phase === 'walk') {
    const step = view.reducedMotion ? 0 : Math.abs(Math.sin(view.time * 12)) * 6;
    sprites.draw(ctx, 'cat', state.catX, catY - 30 - step, 76, { flipX: state.catTo > state.catX });
  } else {
    sprites.draw(ctx, 'cat', state.catX, catY - 24, 72, { squash: [1.12, 0.86] });
    if (state.phase === 'purr') {
      for (let k = 0; k < 3; k += 1) sprites.draw(ctx, 'heart', state.catX - 30 + k * 30, catY - 70 - state.phaseAgo * 50 - k * 8, 30, { alpha: 1 - state.phaseAgo / 0.7 });
    } else if (shaded) {
      const t = view.time * 1.5;
      for (let k = 0; k < 3; k += 1) paintLabel(ctx, view, 'z', state.catX + 20 + k * 14, catY - 60 - k * 16 - ((t + k) % 1) * 8, 20 + k * 6, theme.light);
      // How long until it falls asleep.
      ctx.strokeStyle = theme.leaf;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(state.catX, catY - 24, CAT_HALF + 20, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * state.shaded) / 0.9);
      ctx.stroke();
    } else {
      sprites.draw(ctx, 'droplet', state.catX + 26, catY - 52 + bob(view, 6, 3), 26);
    }
  }
}
