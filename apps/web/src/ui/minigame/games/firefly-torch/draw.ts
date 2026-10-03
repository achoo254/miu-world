// Firefly torch's picture: a night forest (trees and grass in the theme's colours under a dark veil), the
// torch's round beam cut out of the dark with a soft edge and a cone of light from the child's torch,
// fireflies glowing yellow-green when lit or blinking, a few stars, and the jar filling up.
import { paintLabel, paintShadow } from '../../draw-kit';
import type { DrawView } from '../../types';
import { isBlinking, isLit, type FireflyState } from './logic';

export function drawFireflyTorch(ctx: CanvasRenderingContext2D, state: FireflyState, view: DrawView): void {
  const { arena, sprites, theme } = view;
  // The forest as it would look by day; the dark goes over it.
  ctx.fillStyle = theme.secondary;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, state.bottom + 40, arena.width, arena.height - state.bottom - 40);
  for (let i = 0; i < 9; i += 1) {
    const x = ((i * 211) % (arena.width + 60)) - 30;
    const y = state.top + 40 + ((i * 137) % Math.max(60, state.bottom - state.top));
    sprites.draw(ctx, i % 3 === 0 ? 'deciduous-tree' : 'evergreen-tree', x, y, 150 + (i % 3) * 30);
  }
  sprites.draw(ctx, 'mushroom', arena.width * 0.3, state.bottom + 70, 50);

  // The dark, with the beam cut out and a soft rim.
  const { beamX: bx, beamY: by, beamRadius: r } = state;
  ctx.save();
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.86;
  ctx.beginPath();
  ctx.rect(0, 0, arena.width, arena.height);
  ctx.arc(bx, by, r, 0, Math.PI * 2, true);
  ctx.fill('evenodd');
  const rim = ctx.createRadialGradient(bx, by, r * 0.6, bx, by, r);
  rim.addColorStop(0, 'rgba(0,0,0,0)');
  rim.addColorStop(1, theme.ink);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(bx, by, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Night-sky stars.
  ctx.fillStyle = theme.light;
  for (let i = 0; i < 14; i += 1) {
    ctx.globalAlpha = 0.4 + 0.4 * Math.abs(Math.sin(view.time * 1.5 + i));
    ctx.fillRect((i * 97) % arena.width, 120 + ((i * 53) % 60), 4, 4);
  }
  ctx.globalAlpha = 1;

  // The child with her torch, and its cone of light toward the beam.
  const px = arena.width / 2;
  const py = arena.height - 70;
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = theme.star;
  const angle = Math.atan2(by - (py - 50), bx - px);
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);
  ctx.beginPath();
  ctx.moveTo(px + 30 * Math.cos(angle), py - 50 + 30 * Math.sin(angle));
  ctx.lineTo(bx + nx * r, by + ny * r);
  ctx.lineTo(bx - nx * r, by - ny * r);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  paintShadow(ctx, view, px, py + 40, 80);
  sprites.draw(ctx, view.player, px, py, 96);
  sprites.draw(ctx, 'flashlight', px + 30 * Math.cos(angle), py - 40 + 30 * Math.sin(angle), 52, { rotate: angle + Math.PI / 4 });

  // Fireflies.
  for (const f of state.flies) {
    if (f.caught >= 0) {
      const u = Math.min(1, f.caught / 0.7);
      const x = f.x + (state.jarX - f.x) * u;
      const y = f.y + (state.jarY - f.y) * u - Math.sin(u * Math.PI) * 80;
      ctx.fillStyle = theme.star;
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    const lit = isLit(state, f);
    const glow = lit ? 1 : isBlinking(f) ? Math.sin((f.blink / 0.6) * Math.PI) : 0;
    if (glow <= 0.02) {
      ctx.fillStyle = theme.stoneEdge;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      continue;
    }
    const pulse = view.reducedMotion ? 1 : 0.8 + 0.2 * Math.sin(view.time * 10 + f.x);
    ctx.globalAlpha = 0.35 * glow;
    ctx.fillStyle = theme.star;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 34 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = glow;
    ctx.fillStyle = theme.leaf;
    ctx.beginPath();
    ctx.ellipse(f.x, f.y, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.star;
    ctx.beginPath();
    ctx.arc(f.x + 6, f.y + 2, 8, 0, Math.PI * 2);
    ctx.fill();
    // Wings.
    ctx.fillStyle = theme.light;
    ctx.globalAlpha = 0.7 * glow;
    const flap = view.reducedMotion ? 0.5 : Math.abs(Math.sin(view.time * 30 + f.y));
    ctx.beginPath();
    ctx.ellipse(f.x - 4, f.y - 10, 9, 5 + 4 * flap, -0.5, 0, Math.PI * 2);
    ctx.ellipse(f.x + 4, f.y - 10, 9, 5 + 4 * flap, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // The jar with its glow and count.
  ctx.globalAlpha = Math.min(0.6, state.score * 0.05);
  ctx.fillStyle = theme.star;
  ctx.beginPath();
  ctx.arc(state.jarX, state.jarY, 56, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  sprites.draw(ctx, 'jar', state.jarX, state.jarY, 100);
  paintLabel(ctx, view, String(state.score), state.jarX, state.jarY + 8, 34, theme.star);
}
