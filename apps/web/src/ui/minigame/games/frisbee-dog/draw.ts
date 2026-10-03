// Frisbee dog's picture: a park lawn with trees along the top, the child at the bottom with the disc ready, the
// puppy running across (it leaps when it catches), the disc swooping through the air high above its shadow,
// a ring where it will come down, and the discs left in the round along the bottom.
import { bob, paintShadow, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { DISCS, type FrisbeeState } from './logic';

export function drawFrisbeeDog(ctx: CanvasRenderingContext2D, state: FrisbeeState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.fillStyle = theme.leaf;
  ctx.globalAlpha = 0.16;
  for (let y = 0; y < arena.height; y += 110) ctx.fillRect(0, y, arena.width, 55);
  ctx.globalAlpha = 1;
  for (let x = 30; x < arena.width; x += 120) sprites.draw(ctx, 'deciduous-tree', x, HUD_SAFE_TOP + 4 + ((x / 120) % 2) * 14, 100);
  for (let x = 80; x < arena.width; x += 240) sprites.draw(ctx, 'tulip', x, arena.height - 30, 40);

  const disc = state.disc;
  // Where it will land.
  if (disc && disc.result === 'flying') {
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.ellipse(disc.to.x, disc.to.y, 70, 26, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // The puppy.
  const caught = disc?.result === 'caught';
  const since = disc ? state.time - disc.endedAt : 9;
  const leap = caught && since < 0.5 && !view.reducedMotion ? Math.sin((since / 0.5) * Math.PI) * 50 : 0;
  const run = view.reducedMotion ? 0 : Math.abs(Math.sin(view.time * 14)) * 6;
  paintShadow(ctx, view, state.dog.x, state.dog.y + 34, 90, leap / 80);
  sprites.draw(ctx, 'dog', state.dog.x, state.dog.y - run - leap, 100, { flipX: state.dogDir > 0 });
  if (caught) {
    sprites.draw(ctx, 'flying-disc', state.dog.x + state.dogDir * -34, state.dog.y - 30 - leap, 48);
    sprites.draw(ctx, 'sparkles', state.dog.x + 40, state.dog.y - 70 - leap, 44, { alpha: Math.max(0, 1 - since / 0.6) });
  }

  // The disc in the air (or on the grass after a miss).
  if (disc && disc.result !== 'caught') {
    const k = disc.t / disc.flight;
    const dx = disc.to.x - disc.from.x;
    const dy = disc.to.y - disc.from.y;
    const len = Math.hypot(dx, dy);
    // Swoop sideways, then come back to the landing spot.
    const side = Math.sin(k * Math.PI) * disc.curve * len;
    const gx = disc.from.x + dx * k + (-dy / Math.max(1, len)) * side;
    const gy = disc.from.y + dy * k + (dx / Math.max(1, len)) * side;
    const height = Math.sin(k * Math.PI) * Math.min(120, len * 0.3);
    paintShadow(ctx, view, gx, gy + 8, 50, height / 100);
    sprites.draw(ctx, 'flying-disc', gx, gy - height, 56, { rotate: view.reducedMotion ? 0 : view.time * 12 });
  }

  // The child, holding the next disc.
  const { thrower } = state;
  paintShadow(ctx, view, thrower.x, thrower.y + 40, 90);
  sprites.draw(ctx, view.player, thrower.x, thrower.y, 100);
  const ready = !disc && state.thrown < DISCS;
  if (ready) sprites.draw(ctx, 'flying-disc', thrower.x + 40, thrower.y - 20 + bob(view, 4, 3), 50);

  // Discs left.
  const left = DISCS - state.thrown - (ready ? 1 : 0);
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.25;
  roundRect(ctx, 10, arena.height - 52, 26 * DISCS + 12, 40, 20);
  ctx.fill();
  ctx.globalAlpha = 1;
  for (let i = 0; i < DISCS; i += 1) sprites.draw(ctx, 'flying-disc', 28 + i * 26, arena.height - 32, 26, { alpha: i < left ? 1 : 0.25 });
}
