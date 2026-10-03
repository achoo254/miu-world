// Lantern light's picture: dusk over the old town's yellow shop houses and tiled roofs, two strings of red
// lanterns with a warm glow that shrinks as they burn down (an out lantern is grey), a lamp counter showing how
// many are lit against the eight needed, and visitors strolling (or waiting, with a "…" bubble) on the street.
import { bob, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { LanternLightState } from './logic';
import { LANTERNS, LIT, litCount, NEEDED } from './logic';

export const VISITOR_FACES: readonly SpriteRef[] = ['rabbit', 'bear', 'fox', 'panda', 'cat-face', 'dog-face'];

function paintHouses(ctx: CanvasRenderingContext2D, view: DrawView, streetY: number): void {
  const { arena, theme } = view;
  const w = 170;
  for (let i = 0, x = -20; x < arena.width; i += 1, x += w) {
    const top = streetY - 230 - (i % 2) * 40;
    ctx.fillStyle = theme.star;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(x, top, w - 6, streetY - top);
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.danger;
    ctx.beginPath();
    ctx.moveTo(x - 14, top + 6);
    ctx.lineTo(x + w / 2, top - 44);
    ctx.lineTo(x + w + 8, top + 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = theme.woodEdge;
    roundRect(ctx, x + w / 2 - 30, streetY - 100, 60, 100, 10);
    ctx.fill();
    ctx.fillStyle = theme.leaf;
    ctx.fillRect(x + 18, top + 40, 36, 44);
    ctx.fillRect(x + w - 60, top + 40, 36, 44);
  }
}

export function drawLanternLight(ctx: CanvasRenderingContext2D, state: LanternLightState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, arena.height, 3);
  paintHouses(ctx, view, state.streetY);
  // Evening: everything a little darker, less where it is lit.
  const lit = litCount(state);
  ctx.globalAlpha = 0.5 - 0.25 * (lit / LANTERNS);
  ctx.fillStyle = theme.ink;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.globalAlpha = 1;
  // The street.
  ctx.fillStyle = theme.stone;
  ctx.fillRect(0, state.streetY, arena.width, arena.height - state.streetY);
  ctx.fillStyle = theme.stoneEdge;
  for (let x = 0; x < arena.width; x += 60) ctx.fillRect(x, state.streetY + 30, 30, 6);

  // Strings across, then the lanterns.
  const r = state.lanternRadius;
  const sway = view.reducedMotion ? 0 : Math.max(0, 1 - (state.time - state.breezeAt) / 1.5) * 0.25;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  for (const row of [0, 1]) {
    const first = state.lanterns[row * 5];
    if (!first) continue;
    ctx.beginPath();
    ctx.moveTo(0, first.y - r * 0.9);
    for (let i = 0; i < 5; i += 1) {
      const l = state.lanterns[row * 5 + i];
      if (l) ctx.lineTo(l.x, l.y - r * 0.9);
    }
    ctx.lineTo(arena.width, first.y - r * 0.9);
    ctx.stroke();
  }
  for (const [i, l] of state.lanterns.entries()) {
    const on = l.glow > LIT;
    if (on) {
      const halo = ctx.createRadialGradient(l.x, l.y, r * 0.2, l.x, l.y, r * (1 + l.glow));
      halo.addColorStop(0, theme.star);
      halo.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.25 + 0.55 * l.glow;
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(l.x, l.y, r * (1 + l.glow), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    const since = state.time - l.litAt;
    const pop = since < 0.25 && !view.reducedMotion ? 1 + 0.2 * Math.sin((since / 0.25) * Math.PI) : 1;
    sprites.draw(ctx, 'red-paper-lantern', l.x, l.y, r * 1.8 * pop, { alpha: on ? 0.6 + 0.4 * l.glow : 0.35, rotate: Math.sin(view.time * 3 + i) * sway });
    if (!on) {
      // A dark lantern: a soft grey veil and a tiny flame to tap.
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = theme.ink;
      ctx.beginPath();
      ctx.arc(l.x, l.y + 4, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // Lit count against what visitors need.
  const ok = lit >= NEEDED;
  ctx.fillStyle = ok ? theme.star : theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, arena.width / 2 - 70, HUD_SAFE_TOP - 6, 140, 44, 18);
  ctx.fill();
  ctx.stroke();
  sprites.draw(ctx, 'red-paper-lantern', arena.width / 2 - 44, HUD_SAFE_TOP + 16, 32);
  paintLabel(ctx, view, `${lit}/${NEEDED}`, arena.width / 2 + 16, HUD_SAFE_TOP + 17, 28, ok ? theme.ink : theme.danger);

  for (const visitor of state.visitors) {
    const n = visitor.faces.length;
    for (const [k, f] of visitor.faces.entries()) {
      const step = visitor.walking && !view.reducedMotion ? Math.abs(Math.sin(view.time * 9 + k)) * 8 : 0;
      sprites.draw(ctx, VISITOR_FACES[f % VISITOR_FACES.length] ?? 'rabbit', visitor.x - k * 46, state.streetY + 10 - step + bob(view, 2, 1, k), 58);
    }
    if (!visitor.walking) paintLabel(ctx, view, '…', visitor.x - ((n - 1) * 46) / 2, state.streetY - 50, 40, theme.light);
  }
}
