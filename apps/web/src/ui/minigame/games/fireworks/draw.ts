// Fireworks' picture: a Tết night (dark sky with twinkling stars, rooftops with lit windows along the bottom),
// golden dashed rings drifting with a star in the middle, the rocket climbing with a trail of sparks, bursts
// of coloured rays (a big one when it lights rings), and the rockets left on a little shelf.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { BURST_REACH, RING_RADIUS, type FireworksState } from './logic';

function paintNight(ctx: CanvasRenderingContext2D, view: DrawView, launchY: number): void {
  const { arena, theme } = view;
  ctx.fillStyle = theme.ink;
  ctx.fillRect(0, 0, arena.width, arena.height);
  const glow = ctx.createLinearGradient(0, 0, 0, arena.height);
  glow.addColorStop(0, theme.ink);
  glow.addColorStop(1, theme.secondary);
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.light;
  for (let i = 0; i < 40; i += 1) {
    ctx.globalAlpha = view.reducedMotion ? 0.6 : 0.35 + 0.35 * Math.sin(view.time * 2 + i);
    ctx.fillRect((i * 173) % arena.width, (i * 97) % (launchY - 60), 3, 3);
  }
  ctx.globalAlpha = 1;
  // Rooftops along the bottom, windows lit.
  for (let x = -20, i = 0; x < arena.width; x += 110, i += 1) {
    const h = 60 + ((i * 37) % 50);
    ctx.fillStyle = theme.woodEdge;
    ctx.fillRect(x, launchY + 30 - h + 40, 100, h + 60);
    ctx.beginPath();
    ctx.moveTo(x - 10, launchY + 70 - h);
    ctx.lineTo(x + 50, launchY + 40 - h);
    ctx.lineTo(x + 110, launchY + 70 - h);
    ctx.fill();
    ctx.fillStyle = theme.star;
    ctx.fillRect(x + 22, launchY + 90 - h, 16, 16);
    ctx.fillRect(x + 62, launchY + 90 - h, 16, 16);
  }
}

export function drawFireworks(ctx: CanvasRenderingContext2D, state: FireworksState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const colours = [theme.star, theme.primary, theme.secondary, theme.leaf];
  paintNight(ctx, view, state.launchY);

  for (const ring of state.rings) {
    const colour = colours[ring.colour] ?? theme.star;
    if (ring.lit) {
      const t = Math.min(1, ring.age / 1);
      ctx.globalAlpha = 1 - t;
      sprites.draw(ctx, 'sparkles', ring.x, ring.y, 90 + t * 60);
      ctx.globalAlpha = 1;
      continue;
    }
    const grow = view.reducedMotion ? 1 : Math.min(1, ring.age / 0.4);
    ctx.strokeStyle = colour;
    ctx.lineWidth = 6;
    ctx.setLineDash([12, 9]);
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, RING_RADIUS * grow, view.time * 0.8, view.time * 0.8 + Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    sprites.draw(ctx, 'star', ring.x, ring.y, 34 * grow, { alpha: 0.85 });
  }

  const rocket = state.rocket;
  if (rocket) {
    const colour = colours[rocket.colour] ?? theme.star;
    if (rocket.burst < 0) {
      // Trail of sparks down to where it started.
      for (let k = 1; k <= 6; k += 1) {
        ctx.globalAlpha = 0.8 - k * 0.12;
        ctx.fillStyle = k % 2 === 0 ? theme.star : theme.light;
        ctx.beginPath();
        ctx.arc(rocket.x + (view.reducedMotion ? 0 : Math.sin(view.time * 40 + k) * 4), rocket.y + 30 + k * 16, 5 - k * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      sprites.draw(ctx, 'rocket', rocket.x, rocket.y, 54, { rotate: -Math.PI / 4 });
    } else {
      // Rays out to the burst's reach; bigger and brighter when it lit rings.
      const t = Math.min(1, rocket.burst / 0.9);
      const reach = (rocket.lit > 0 ? BURST_REACH * 1.4 : BURST_REACH * 0.7) * Math.min(1, t * 2.5);
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = colour;
      ctx.lineWidth = rocket.lit > 0 ? 6 : 3;
      ctx.lineCap = 'round';
      for (let i = 0; i < 16; i += 1) {
        const a = (i / 16) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(rocket.x + Math.cos(a) * reach * 0.4, rocket.y + Math.sin(a) * reach * 0.4 + t * 20);
        ctx.lineTo(rocket.x + Math.cos(a) * reach, rocket.y + Math.sin(a) * reach + t * 30);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      ctx.globalAlpha = 1;
    }
  }

  // Rockets left.
  ctx.fillStyle = theme.wood;
  roundRect(ctx, 14, arena.height - 58, 150, 48, 14);
  ctx.fill();
  sprites.draw(ctx, 'rocket', 44, arena.height - 34, 36, { rotate: -Math.PI / 4 });
  paintLabel(ctx, view, `× ${state.rocketsLeft}`, 112, arena.height - 33, 30);
  if (state.rocketsLeft === 16 && !rocket) paintLabel(ctx, view, 'Đặt ngón tay dưới vòng, giữ rồi thả', arena.width / 2, state.launchY - 30, 28);
}
