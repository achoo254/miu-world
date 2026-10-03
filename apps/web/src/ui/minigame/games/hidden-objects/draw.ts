// Hidden objects' picture: a big toy chest of a scene (patterned cloth, everything strewn about at angles),
// the tray of six wanted pictures below with a tick on each one found, a found thing flying into its box, a
// small cross on a wrong tap, and a twinkle on a wanted thing when the child has looked for a long time.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { HINT_AFTER, type HiddenState } from './logic';

export function drawHiddenObjects(ctx: CanvasRenderingContext2D, state: HiddenState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { scene } = state;
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(0, 0, arena.width, arena.height);
  // The cloth: soft diamonds.
  ctx.save();
  roundRect(ctx, scene.x, scene.y, scene.w, scene.h, 20);
  ctx.clip();
  ctx.fillStyle = theme.sky[2];
  ctx.fillRect(scene.x, scene.y, scene.w, scene.h);
  ctx.fillStyle = theme.sky[1];
  for (let y = scene.y; y < scene.y + scene.h + 60; y += 60) {
    for (let x = scene.x + ((y / 60) % 2) * 30; x < scene.x + scene.w + 60; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, y - 18);
      ctx.lineTo(x + 18, y);
      ctx.lineTo(x, y + 18);
      ctx.lineTo(x - 18, y);
      ctx.fill();
    }
  }
  const hinted = state.sinceFind > HINT_AFTER ? state.items.find((it) => it.slot >= 0 && !it.found) : undefined;
  for (const item of state.items) {
    if (item.found) continue;
    sprites.draw(ctx, item.sprite, item.x, item.y, item.size, { rotate: item.rotate });
  }
  if (hinted) {
    const t = view.reducedMotion ? 0.5 : (Math.sin(view.time * 5) + 1) / 2;
    sprites.draw(ctx, 'sparkles', hinted.x + 26, hinted.y - 26, 30 + t * 16, { alpha: 0.6 + t * 0.4 });
  }
  ctx.restore();
  ctx.strokeStyle = theme.wood;
  ctx.lineWidth = 8;
  roundRect(ctx, scene.x, scene.y, scene.w, scene.h, 20);
  ctx.stroke();

  // The tray.
  for (const [slot, box] of state.tray.entries()) {
    const item = state.items.find((it) => it.slot === slot);
    if (!item) continue;
    const done = item.found && item.foundAgo >= 0.5;
    ctx.fillStyle = theme.light;
    ctx.strokeStyle = done ? theme.star : theme.wood;
    ctx.lineWidth = done ? 7 : 5;
    roundRect(ctx, box.x - box.size / 2, box.y - box.size / 2, box.size, box.size, 16);
    ctx.fill();
    ctx.stroke();
    sprites.draw(ctx, item.sprite, box.x, box.y, box.size * 0.72, { alpha: done ? 1 : 0.9 });
    if (done) paintLabel(ctx, view, '✓', box.x + box.size * 0.32, box.y - box.size * 0.32, 30, theme.leaf);
  }
  // Found things flying to their box.
  for (const item of state.items) {
    if (!item.found || item.foundAgo >= 0.5) continue;
    const box = state.tray[item.slot];
    if (!box) continue;
    const t = item.foundAgo / 0.5;
    const ease = t * t * (3 - 2 * t);
    sprites.draw(ctx, item.sprite, item.x + (box.x - item.x) * ease, item.y + (box.y - item.y) * ease - Math.sin(t * Math.PI) * 80, item.size * (1 + 0.4 * Math.sin(t * Math.PI)));
  }
  if (state.missAt && state.missAgo < 0.4) {
    ctx.globalAlpha = 1 - state.missAgo / 0.4;
    paintLabel(ctx, view, '✕', state.missAt.x, state.missAt.y, 40, theme.danger);
    ctx.globalAlpha = 1;
  }
  if (state.doneAgo >= 0) paintLabel(ctx, view, 'Tìm đủ cả sáu!', arena.width / 2, scene.y + scene.h / 2, 52, theme.star);
}
