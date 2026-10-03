// Whack-a-mole's picture: a garden lawn with rows of holes; critters rise out of them (only the part above
// the hole's rim shows), a bonked mole sees stars as it sinks, a wooden mallet swings where the child taps.
import { bob, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { lift, type Hole, type WhackState } from './logic';

const PICTURE = { mole: 'mouse-face', golden: 'mouse-face', rabbit: 'rabbit' } as const;

function paintLawn(ctx: CanvasRenderingContext2D, view: DrawView): void {
  const { arena, theme } = view;
  paintSky(ctx, view, 150, 6);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 120, arena.width, arena.height - 120);
  // Mowing stripes.
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = theme.light;
  for (let y = 140; y < arena.height; y += 110) ctx.fillRect(0, y, arena.width, 55);
  ctx.globalAlpha = 1;
}

function paintHole(ctx: CanvasRenderingContext2D, view: DrawView, hole: Hole, size: number): void {
  const { theme, sprites } = view;
  const w = size * 0.62;
  // A mound of earth with the dark mouth in it.
  ctx.fillStyle = theme.groundDeep;
  ctx.beginPath();
  ctx.ellipse(hole.x, hole.y + 6, w + 22, w * 0.5 + 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.ellipse(hole.x, hole.y, w, w * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const up = lift(hole);
  if (hole.critter && up > 0) {
    // Only what is out of the hole shows: everything above its middle, and the mouth itself.
    ctx.save();
    ctx.beginPath();
    ctx.rect(hole.x - size, hole.y - size * 2, size * 2, size * 2);
    ctx.ellipse(hole.x, hole.y, w, w * 0.4, 0, 0, Math.PI * 2);
    ctx.clip();
    const y = hole.y + size * 0.55 - up * size * 1.0;
    const squash: readonly [number, number] = hole.bonked >= 0 && !view.reducedMotion ? [1.15, 0.85] : [1, 1];
    sprites.draw(ctx, PICTURE[hole.critter], hole.x, y + bob(view, 7, 2, hole.x), size, { squash });
    if (hole.critter === 'golden') sprites.draw(ctx, 'crown', hole.x, y - size * 0.55, size * 0.5);
    ctx.restore();
    if (hole.bonked >= 0) {
      // Dizzy stars circling the bonked head.
      for (let i = 0; i < 3; i += 1) {
        const a = view.time * 6 + (i * Math.PI * 2) / 3;
        sprites.draw(ctx, 'star', hole.x + Math.cos(a) * size * 0.45, y - size * 0.55 + Math.sin(a) * 10, 26);
      }
    }
  }
}

function paintMallet(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, age: number): void {
  const { theme } = view;
  // Swings down from upright to flat in the first tenth of a second.
  const angle = view.reducedMotion ? -0.6 : -1.2 + Math.min(1, age / 0.1) * 1.0;
  ctx.save();
  ctx.translate(x + 40, y + 10);
  ctx.rotate(angle);
  ctx.globalAlpha = Math.max(0, 1 - age / 0.3);
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, -6, -10, 12, 90, 6);
  ctx.fill();
  ctx.fillStyle = theme.danger;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, -44, -46, 88, 44, 14);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
}

export function drawWhackMole(ctx: CanvasRenderingContext2D, state: WhackState, view: DrawView): void {
  paintLawn(ctx, view);
  for (const hole of state.holes) paintHole(ctx, view, hole, state.size);
  for (const swing of state.swings) paintMallet(ctx, view, swing.x, swing.y, swing.age);
}
