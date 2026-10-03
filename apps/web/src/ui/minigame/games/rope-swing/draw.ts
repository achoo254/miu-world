// Rope swing's picture: a jungle sky with hills scrolling slower than the play, a leafy canopy along the top
// with wooden hooks hanging from it, the river with its ripples, tree stumps with a palm and a bunch of
// bananas (eaten once passed), the vine from the hook to the monkey, and a pulsing ring on the hook a press
// would catch.
import { bob, paintHills, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { REACH, type RopeSwingState } from './logic';

function paintCanopy(ctx: CanvasRenderingContext2D, view: DrawView, offset: number, y: number): void {
  const { arena, theme } = view;
  ctx.fillStyle = theme.leaf;
  const step = 70;
  for (let x = -((offset % step) + step) % step - step; x < arena.width + step; x += step) {
    const k = Math.round((x + offset) / step);
    ctx.beginPath();
    ctx.arc(x, y - 40 + (k % 2 === 0 ? 12 : 0), 56, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawRopeSwing(ctx: CanvasRenderingContext2D, state: RopeSwingState, view: DrawView): void {
  const { arena, sprites, theme } = view;
  const cam = state.cameraX;
  paintSky(ctx, view, state.riverY, 6);
  paintHills(ctx, view, state.riverY - 40, cam * 0.3, 150, theme.leaf);
  // The river below the play, with drifting ripples.
  ctx.fillStyle = theme.water;
  ctx.fillRect(0, state.riverY, arena.width, arena.height - state.riverY);
  ctx.fillStyle = theme.waterLight;
  ctx.globalAlpha = 0.7;
  for (let i = 0; i < 12; i += 1) {
    const x = (((i * 173 - cam * 0.9 + view.time * 30) % (arena.width + 100)) + arena.width + 100) % (arena.width + 100) - 50;
    roundRect(ctx, x, state.riverY + 18 + (i % 3) * 24, 60, 7, 4);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  paintCanopy(ctx, view, cam, state.hooks[0] ? Math.min(...state.hooks.map((h) => h.y)) - 30 : 150);

  // Stumps with palms and bananas.
  for (const s of state.stumps) {
    const x = s.x - cam;
    if (x < -200 || x > arena.width + 200) continue;
    sprites.draw(ctx, 'palm-tree', x + s.half * 0.6, s.y - 70, 150);
    ctx.fillStyle = theme.wood;
    ctx.strokeStyle = theme.woodEdge;
    ctx.lineWidth = 5;
    roundRect(ctx, x - s.half, s.y, s.half * 2, state.riverY - s.y + 30, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = theme.woodEdge;
    ctx.beginPath();
    ctx.ellipse(x, s.y + 4, s.half - 6, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!s.reached) sprites.draw(ctx, 'banana', x - 20, s.y - 30 + bob(view, 3, 4, s.x), 60);
  }

  // Hooks hanging from the canopy; the one a press would catch pulses.
  let reachable = -1;
  if (state.hooked < 0 && state.splashed <= 0) {
    let best = Infinity;
    state.hooks.forEach((h, i) => {
      const d = Math.hypot(h.x - state.x, h.y - state.y);
      if (d <= REACH && h.x > state.x - 40 && h.y < state.y - 30 && d < best) {
        best = d;
        reachable = i;
      }
    });
  }
  state.hooks.forEach((h, i) => {
    const x = h.x - cam;
    if (x < -60 || x > arena.width + 60) return;
    ctx.strokeStyle = theme.woodEdge;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x, h.y - 60);
    ctx.lineTo(x, h.y - 12);
    ctx.stroke();
    if (i === reachable) {
      const pulse = view.reducedMotion ? 0.5 : (view.time * 2) % 1;
      ctx.globalAlpha = 0.8 * (1 - pulse);
      ctx.strokeStyle = theme.star;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(x, h.y, 26 + pulse * 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = i === reachable ? theme.star : theme.wood;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, h.y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  const mx = state.x - cam;
  const hook = state.hooks[state.hooked];
  if (hook) {
    ctx.strokeStyle = theme.leaf;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hook.x - cam, hook.y);
    ctx.lineTo(mx, state.y - 30);
    ctx.stroke();
    ctx.strokeStyle = theme.woodEdge;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  if (state.splashed > 0) {
    // A splash ring where it fell in.
    const t = 1 - state.splashed / 0.9;
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(mx, state.riverY + 10, 30 + t * 70, 10 + t * 18, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }
  const angle = hook ? Math.atan2(state.x - hook.x, hook.y - state.y) * 0.6 : view.reducedMotion ? 0 : state.vx / 4000;
  sprites.draw(ctx, 'monkey', mx, state.y - 6, 92, { rotate: -angle, flipX: true });
}
