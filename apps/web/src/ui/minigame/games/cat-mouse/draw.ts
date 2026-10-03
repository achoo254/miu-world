// Cat and mouse's picture: a schoolyard, the ring of friends (animal faces) with their joined arms: an arch
// over gaps whose arms are up, a low bar over gaps whose arms are down (gaps about to close blink), the mouse
// the child drags and the cat chasing it, dizzy stars over a blocked cat.
import { bob, paintGround, paintLabel, paintSky } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { CatMouseState } from './logic';
import { gapAngle, isOpen, KIDS, untilChange } from './logic';

export const RING_FACES: readonly SpriteRef[] = ['rabbit', 'bear', 'fox', 'panda', 'dog-face', 'monkey-face', 'frog', 'penguin'];

export function drawCatMouse(ctx: CanvasRenderingContext2D, state: CatMouseState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { centre, radius } = state;
  paintSky(ctx, view, HUD_SAFE_TOP + 20, 4);
  paintGround(ctx, view, HUD_SAFE_TOP + 20);
  ctx.fillStyle = theme.ground;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(centre.x, centre.y, radius - 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  const blink = untilChange(state.time) < 0.45 && Math.sin(view.time * 30) > 0;
  for (let k = 0; k < KIDS; k += 1) {
    const a1 = gapAngle(k) - Math.PI / KIDS;
    const a2 = gapAngle(k) + Math.PI / KIDS;
    const open = isOpen(k, state.time);
    ctx.strokeStyle = open ? (blink ? theme.danger : theme.leaf) : theme.danger;
    ctx.lineWidth = open ? 6 : 12;
    ctx.beginPath();
    if (open) ctx.arc(centre.x, centre.y, radius, a1 + 0.12, a2 - 0.12);
    else {
      ctx.moveTo(centre.x + Math.cos(a1) * radius, centre.y + Math.sin(a1) * radius);
      ctx.lineTo(centre.x + Math.cos(a2) * radius, centre.y + Math.sin(a2) * radius);
    }
    ctx.stroke();
    if (open) {
      // Arms up: hands over the gap.
      const g = gapAngle(k);
      sprites.draw(ctx, 'sparkles', centre.x + Math.cos(g) * (radius + 6), centre.y + Math.sin(g) * (radius + 6) - 10, 26, { alpha: 0.6 });
    }
  }
  for (let k = 0; k < KIDS; k += 1) {
    const a = gapAngle(k) - Math.PI / KIDS;
    sprites.draw(ctx, RING_FACES[k] ?? 'rabbit', centre.x + Math.cos(a) * radius, centre.y + Math.sin(a) * radius + bob(view, 3, 2, k), 64);
  }
  sprites.draw(ctx, 'mouse-face', state.mouse.x, state.mouse.y, 62);
  sprites.draw(ctx, 'cat-face', state.cat.x, state.cat.y, 76, { rotate: state.dizzy > 0 && !view.reducedMotion ? Math.sin(state.time * 20) * 0.3 : 0 });
  if (state.dizzy > 0) {
    for (let i = 0; i < 3; i += 1) {
      const a = state.time * 6 + (i * Math.PI * 2) / 3;
      sprites.draw(ctx, 'star', state.cat.x + Math.cos(a) * 34, state.cat.y - 44 + Math.sin(a) * 10, 22);
    }
  }
  if (state.time - state.caughtAt < 0.8) paintLabel(ctx, view, 'Mèo bắt được rồi!', arena.width / 2, HUD_SAFE_TOP + 30, 32, theme.light);
}
