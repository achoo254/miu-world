// Color mix's picture: an art-class table. The customer at the top holds up a speech bubble with the thing
// whose colour it wants and a swatch of that colour; the bowl in the middle fills with the chosen paints, which
// swirl into the mix; the paint pots stand along the bottom, each with a thing of its colour on its label.
// Paint colours are the theme's tokens; the mixes are those tokens blended (green is the leaf token: blue and
// yellow light blended make grey, not the green paints make).
import { bob, paintLabel, paintShadow, roundRect } from '../../draw-kit';
import type { Theme } from '../../theme';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { MIX_ICONS, PAINT_ICONS, RECIPES, SWIRL_SECONDS, mixOf, type ColorMixState, type Mix, type Paint } from './logic';

function parseHex(colour: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(colour.trim());
  if (!m?.[1]) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Two token colours blended half and half (the first one if either is not a plain hex colour). */
export function blend(a: string, b: string): string {
  const x = parseHex(a);
  const y = parseHex(b);
  if (!x || !y) return a;
  const c = x.map((v, i) => Math.round((v + (y[i] ?? v)) / 2));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

export function paintColour(theme: Theme, paint: Paint): string {
  return { red: theme.danger, yellow: theme.star, blue: theme.secondary, white: theme.light }[paint];
}

export function mixColour(theme: Theme, mix: Mix): string {
  if (mix === 'green') return theme.leaf;
  const [a, b] = RECIPES[mix];
  return blend(paintColour(theme, a), paintColour(theme, b));
}

export function drawColorMix(ctx: CanvasRenderingContext2D, state: ColorMixState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  // A wall and a table.
  ctx.fillStyle = theme.sky[1];
  ctx.fillRect(0, 0, arena.width, arena.height);
  const tableY = state.bowl.y - 20;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, tableY, arena.width, arena.height - tableY);
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(0, tableY, arena.width, 10);

  // The customer and its bubble.
  const c = state.customer;
  const hop = state.phase === 'serve' && !view.reducedMotion ? Math.sin(Math.min(1, state.inPhase / 0.3) * Math.PI) * 26 : bob(view, 2, 4);
  const size = Math.min(120, (tableY - HUD_SAFE_TOP) * 0.7);
  sprites.draw(ctx, state.who, c.x - size * 0.75, c.y + 10 - hop, size);
  const bw = size * 1.25;
  const bx = c.x + size * 0.15;
  ctx.fillStyle = theme.light;
  roundRect(ctx, bx, c.y - size * 0.45, bw, size * 0.9, 24);
  ctx.fill();
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx + 4, c.y);
  ctx.lineTo(bx - 18, c.y + 12);
  ctx.lineTo(bx + 4, c.y + 18);
  ctx.fill();
  ctx.fillStyle = mixColour(theme, state.want);
  ctx.beginPath();
  ctx.arc(bx + bw * 0.3, c.y, size * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  sprites.draw(ctx, MIX_ICONS[state.want], bx + bw * 0.72, c.y, size * 0.5);

  // The bowl and what is in it.
  const b = state.bowl;
  const r = Math.min(110, arena.width * 0.18);
  paintShadow(ctx, view, b.x, b.y + r * 0.55, r * 2.1);
  const [first, second] = state.picked;
  let fill: string | null = null;
  if (first && !second) fill = paintColour(theme, first);
  if (first && second) {
    const mix = mixOf(first, second);
    const done = state.phase !== 'swirl' || state.inPhase >= SWIRL_SECONDS;
    fill = mix && done ? mixColour(theme, mix) : null;
  }
  const tip = state.phase === 'dump' && !view.reducedMotion ? Math.min(1, state.inPhase / 0.3) * 0.5 : 0;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(tip);
  // The bowl's body under its rim, then the rim with the paint inside.
  ctx.fillStyle = theme.secondary;
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.quadraticCurveTo(-r * 0.95, r * 0.85, 0, r * 0.85);
  ctx.quadraticCurveTo(r * 0.95, r * 0.85, r, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = theme.light;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (first) {
    ctx.fillStyle = fill ?? paintColour(theme, first);
    ctx.beginPath();
    ctx.ellipse(0, 3, r * 0.84, r * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    if (second && state.phase === 'swirl') {
      // Two paints swirling into each other.
      ctx.strokeStyle = paintColour(theme, second);
      ctx.lineWidth = 12;
      const turn = view.reducedMotion ? 0 : state.inPhase * 10;
      ctx.beginPath();
      ctx.ellipse(0, 3, r * 0.5, r * 0.13, 0, turn, turn + Math.PI * 1.3);
      ctx.stroke();
    }
  }
  ctx.restore();
  if (state.phase === 'serve') sprites.draw(ctx, 'sparkles', b.x + r * 0.8, b.y - r * 0.5 - state.inPhase * 40, 56);

  // The pots.
  for (const pot of state.pots) {
    const chosen = state.picked.includes(pot.paint);
    const lift = chosen ? 18 : 0;
    const pr = state.potRadius;
    paintShadow(ctx, view, pot.x, pot.y + pr * 0.9, pr * 1.8);
    ctx.fillStyle = theme.light;
    roundRect(ctx, pot.x - pr * 0.85, pot.y - pr * 0.7 - lift, pr * 1.7, pr * 1.6, 18);
    ctx.fill();
    ctx.strokeStyle = chosen ? theme.star : theme.ink;
    ctx.lineWidth = chosen ? 8 : 4;
    ctx.stroke();
    ctx.fillStyle = paintColour(theme, pot.paint);
    ctx.beginPath();
    ctx.ellipse(pot.x, pot.y - pr * 0.7 - lift, pr * 0.85, pr * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4;
    ctx.stroke();
    sprites.draw(ctx, PAINT_ICONS[pot.paint], pot.x, pot.y + pr * 0.25 - lift, pr * 0.95);
  }
  paintLabel(ctx, view, 'Chạm hai lọ để pha màu', arena.width / 2, arena.height - 26, 26);
}
