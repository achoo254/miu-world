// Melting floes' picture: the cold sea with ripples, ice floes on a grid (shrinking and cracked, shaking when
// about to sink; a ring of bubbles where one sank), fish waiting on some floes, three penguin friends and the
// child's penguin hopping in an arc, or splashing in the water after a fall. Neighbouring floes the penguin can
// hop to have a soft outline.
import { bob, paintLabel } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { MeltingFloesState } from './logic';
import { CRACK } from './logic';

export function drawMeltingFloes(ctx: CanvasRenderingContext2D, state: MeltingFloesState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.water;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.strokeStyle = theme.waterLight;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 16; i += 1) {
    const x = (i * 173 + view.time * 10) % (arena.width + 60) - 30;
    const y = HUD_SAFE_TOP + ((i * 97) % (arena.height - HUD_SAFE_TOP));
    ctx.beginPath();
    ctx.arc(x, y, 14, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const { cols } = state;
  const adjacent = (a: number, b: number): boolean => a !== b && Math.abs((a % cols) - (b % cols)) <= 1 && Math.abs(Math.floor(a / cols) - Math.floor(b / cols)) <= 1;
  state.slots.forEach((s, i) => {
    const f = state.floes[i];
    if (!f) return;
    const size = state.slotSize;
    if (f.life <= 0) {
      ctx.strokeStyle = theme.light;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, size * 0.2 + (f.back % 0.6) * 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }
    const cracking = f.life < CRACK;
    const shrink = cracking ? 0.7 + 0.3 * (f.life / CRACK) : 1;
    const shake = cracking && !view.reducedMotion ? Math.sin(state.time * 40 + i) * 3 : 0;
    const w = size * shrink;
    ctx.fillStyle = theme.light;
    ctx.strokeStyle = adjacent(state.at, i) && state.swimming <= 0 ? theme.star : theme.waterLight;
    ctx.lineWidth = adjacent(state.at, i) ? 6 : 4;
    ctx.beginPath();
    ctx.ellipse(s.x + shake, s.y + bob(view, 1.5, 2, i), w / 2, w * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (cracking) {
      ctx.strokeStyle = theme.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x - w * 0.3, s.y - 4);
      ctx.lineTo(s.x - w * 0.05, s.y + 6);
      ctx.lineTo(s.x + w * 0.1, s.y - 8);
      ctx.lineTo(s.x + w * 0.32, s.y + 4);
      ctx.stroke();
    }
    if (f.fish) sprites.draw(ctx, 'fish', s.x + w * 0.22, s.y - 6, Math.min(56, w * 0.4), { rotate: view.reducedMotion ? 0 : Math.sin(view.time * 6 + i) * 0.3 });
  });
  for (const fr of state.friends) {
    const s = state.slots[fr];
    if (s) sprites.draw(ctx, 'penguin', s.x - state.slotSize * 0.18, s.y - 20, Math.min(70, state.slotSize * 0.5));
  }
  const to = state.slots[state.at] ?? { x: 0, y: 0 };
  const from = state.slots[state.from] ?? to;
  const t = state.hop;
  const x = from.x + (to.x - from.x) * t;
  const y = from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * 50;
  const size = Math.min(90, state.slotSize * 0.62);
  if (state.swimming > 0) {
    sprites.draw(ctx, 'penguin', x, to.y + 10, size, { alpha: 0.7, rotate: Math.sin(state.time * 10) * 0.3 });
    sprites.draw(ctx, 'droplet', x + 30, to.y - 30, 40);
    paintLabel(ctx, view, 'Tõm!', x, to.y - 60, 30, theme.light);
  } else sprites.draw(ctx, 'penguin', x, y - 24, size);
  // The child's own penguin wears her character on a badge.
  sprites.draw(ctx, view.player, x + size * 0.35, (state.swimming > 0 ? to.y : y) - 24 - size * 0.45, size * 0.42);
}
