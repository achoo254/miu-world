// Water puppets' picture: the water pavilion (red curved roof, pillars, a bamboo curtain) behind the pond,
// lotus at the edges, the dance shown as the puppet's shadow with dots where it is going, the child's puppet
// with ripples under it, and on each beat a ring: gold right on the shadow, light when close, none when off.
import { bob, paintSky } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import type { DrawView } from '../../types';
import { guideAt, tempoAt, type PuppetState } from './logic';

export const PUPPETS: readonly SpriteRef[] = ['water-buffalo', 'duck', 'fish', 'frog'];

function paintPavilion(ctx: CanvasRenderingContext2D, view: DrawView, state: PuppetState): void {
  const { arena, theme } = view;
  const baseY = state.pond.top - 40;
  const w = Math.min(arena.width * 0.7, 520);
  const x = arena.width / 2 - w / 2;
  const h = Math.max(70, (baseY - 120) * 0.55);
  // Pillars and curtain.
  ctx.fillStyle = theme.wood;
  ctx.fillRect(x + 10, baseY - h, w - 20, h);
  ctx.fillStyle = theme.star;
  for (let k = 0; k < 14; k += 1) ctx.fillRect(x + 26 + k * ((w - 52) / 14), baseY - h + 10, (w - 52) / 28, h - 14);
  ctx.fillStyle = theme.danger;
  for (const px of [x + 4, x + w / 2 - 8, x + w - 20]) ctx.fillRect(px, baseY - h, 16, h);
  // Curved roof.
  ctx.fillStyle = theme.danger;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 40, baseY - h - 6);
  ctx.quadraticCurveTo(x + w / 2, baseY - h - 70, x + w + 40, baseY - h - 6);
  ctx.quadraticCurveTo(x + w + 50, baseY - h - 30, x + w + 60, baseY - h - 40);
  ctx.lineTo(x + w / 2, baseY - h - 90);
  ctx.lineTo(x - 60, baseY - h - 40);
  ctx.quadraticCurveTo(x - 50, baseY - h - 30, x - 40, baseY - h - 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

export function drawWaterPuppet(ctx: CanvasRenderingContext2D, state: PuppetState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const waterTop = state.pond.top - 40;
  paintSky(ctx, view, waterTop, 6);
  paintPavilion(ctx, view, state);
  ctx.fillStyle = theme.water;
  ctx.fillRect(0, waterTop, arena.width, arena.height - waterTop);
  ctx.strokeStyle = theme.waterLight;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.45;
  for (let y = waterTop + 30; y < arena.height; y += 46) {
    const shift = (view.time * 20 + y) % 140;
    for (let x = -140 + shift; x < arena.width; x += 140) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 15, y - 6, x + 30, y);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  for (const [lx, ly] of [
    [40, waterTop + 40],
    [arena.width - 44, waterTop + 70],
    [60, arena.height - 40],
    [arena.width - 60, arena.height - 50],
  ] as const) {
    sprites.draw(ctx, 'lotus', lx, ly + bob(view, 1.5, 3, lx), 60);
  }

  const puppet = PUPPETS[state.puppetIndex % PUPPETS.length] ?? 'duck';
  // Where the dance goes next: dots.
  ctx.fillStyle = theme.light;
  for (let k = 1; k <= 6; k += 1) {
    const p = guideAt(state, state.dance + k * 0.22 * tempoAt(state.time));
    ctx.globalAlpha = 0.5 - k * 0.06;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 9 - k, 0, Math.PI * 2);
    ctx.fill();
  }
  // The shadow to follow.
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.ellipse(state.guide.x, state.guide.y + 26, 54, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  sprites.draw(ctx, puppet, state.guide.x, state.guide.y, 110, { alpha: 0.35 });

  // The child's puppet, with ripples and the beat's ring.
  const { puppet: at } = state;
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 3;
  for (let k = 0; k < 2; k += 1) {
    const r = 30 + ((view.time * 40 + k * 25) % 50);
    ctx.globalAlpha = 0.6 * (1 - (r - 30) / 50);
    ctx.beginPath();
    ctx.ellipse(at.x, at.y + 28, r * 1.4, r * 0.4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const sinceBeat = state.time - state.lastBeatAt;
  if (sinceBeat < 0.3 && state.lastBeat !== 'off' && state.lastBeat !== null) {
    ctx.strokeStyle = state.lastBeat === 'on' ? theme.star : theme.light;
    ctx.lineWidth = 8;
    ctx.globalAlpha = 1 - sinceBeat / 0.3;
    ctx.beginPath();
    ctx.arc(at.x, at.y, 60 + sinceBeat * 80, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // A pole from the stage, as in real water puppetry.
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 5;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(at.x, at.y + 30);
  ctx.lineTo(arena.width / 2 + (at.x - arena.width / 2) * 0.4, waterTop);
  ctx.stroke();
  ctx.globalAlpha = 1;
  const splash = state.time - state.changedAt < 0.4 && state.time > 0.5;
  const dip = splash && !view.reducedMotion ? Math.sin(((state.time - state.changedAt) / 0.4) * Math.PI) * 20 : 0;
  const sway = view.reducedMotion ? 0 : Math.sin(view.time * 6) * 0.08;
  sprites.draw(ctx, puppet, at.x, at.y + dip, 110, { rotate: sway });
}
