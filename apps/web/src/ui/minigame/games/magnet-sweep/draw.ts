// Magnet sweep's picture: a sandy yard inside a low fence, things lying about (iron and not), the toolbox with a
// dashed ring to bring the magnet into, and the magnet with pulsing field rings, the iron stuck around it and
// dots for how full it is. Things that are not iron wobble when the magnet passes over them, so the child sees
// the magnet try and fail.
import { paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import type { DrawView } from '../../types';
import { BOX_RADIUS, CAPACITY, isIron, PICK_RADIUS, type MagnetState } from './logic';

export const THINGS: readonly SpriteRef[] = ['key', 'old-key', 'paperclip', 'nut-and-bolt', 'wood', 'fallen-leaf', 'feather', 'spiral-shell', 'rock'];

export function drawMagnetSweep(ctx: CanvasRenderingContext2D, state: MagnetState, view: DrawView): void {
  const { theme, sprites } = view;
  const { field, magnet, box } = state;
  paintSky(ctx, view, field.y, 5);
  ctx.fillStyle = theme.ground;
  roundRect(ctx, field.x - 30, field.y - 20, field.w + 60, field.h + 50, 30);
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = theme.wood;
  ctx.stroke();
  // Sand speckles.
  ctx.fillStyle = theme.groundDeep;
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 70; i += 1) {
    const x = field.x + ((i * 131) % field.w);
    const y = field.y + ((i * 197) % field.h);
    ctx.beginPath();
    ctx.arc(x, y, 3 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // The toolbox and its ring.
  ctx.setLineDash([14, 10]);
  ctx.lineWidth = 5;
  ctx.strokeStyle = state.load > 0 ? theme.star : theme.light;
  ctx.globalAlpha = state.load > 0 ? 0.9 : 0.5;
  ctx.beginPath();
  ctx.arc(box.x, box.y, BOX_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  const bounce = state.droppedAgo < 0.3 && !view.reducedMotion ? Math.sin((state.droppedAgo / 0.3) * Math.PI) * 14 : 0;
  paintShadow(ctx, view, box.x, box.y + 50, 130);
  sprites.draw(ctx, 'toolbox', box.x, box.y - bounce, 130);
  if (state.droppedAgo < 0.8) sprites.draw(ctx, 'sparkles', box.x + 50, box.y - 70 - state.droppedAgo * 50, 50);

  // Things on the sand.
  for (const t of state.things) {
    if (t.stuck) continue;
    const pop = t.age < 0.3 ? t.age / 0.3 : 1;
    const near = Math.hypot(t.x - magnet.x, t.y - magnet.y) < PICK_RADIUS;
    const wobble = near && !isIron(t) && !view.reducedMotion ? Math.sin(view.time * 30) * 0.2 : 0;
    paintShadow(ctx, view, t.x, t.y + 22, 50);
    sprites.draw(ctx, THINGS[t.kind] ?? 'rock', t.x, t.y, 62 * pop, { rotate: t.tilt + wobble });
  }

  // The magnet's field.
  if (!view.reducedMotion) {
    for (let i = 0; i < 2; i += 1) {
      const phase = (view.time * 1.2 + i * 0.5) % 1;
      ctx.globalAlpha = (1 - phase) * 0.5;
      ctx.strokeStyle = state.load >= CAPACITY ? theme.danger : theme.secondary;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(magnet.x, magnet.y, 40 + phase * (PICK_RADIUS - 30), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  paintShadow(ctx, view, magnet.x, magnet.y + 56, 100);
  sprites.draw(ctx, 'magnet', magnet.x, magnet.y, 104, { rotate: -0.4 });
  for (const t of state.things) {
    if (!t.stuck) continue;
    const ring = { x: magnet.x + Math.cos(t.stuck.angle) * 46, y: magnet.y + Math.sin(t.stuck.angle) * 40 };
    const f = t.stuck.fly;
    sprites.draw(ctx, THINGS[t.kind] ?? 'key', t.x + (ring.x - t.x) * f, t.y + (ring.y - t.y) * f, 50, { rotate: t.stuck.angle });
  }
  // How full: a dot per place.
  for (let i = 0; i < CAPACITY; i += 1) {
    ctx.fillStyle = i < state.load ? (state.load >= CAPACITY ? theme.danger : theme.star) : theme.light;
    ctx.beginPath();
    ctx.arc(magnet.x - (CAPACITY - 1) * 7 + i * 14, magnet.y + 74, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  if (state.load >= CAPACITY) paintLabel(ctx, view, 'Đầy rồi!', magnet.x, magnet.y - 74, 28, theme.light);
}
