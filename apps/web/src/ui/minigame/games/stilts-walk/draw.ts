// Stilts walk's picture: a village road that scrolls as the child walks, lumps of earth on it, the child high
// on two bamboo stilts tipping with her lean, a balance meter above (green in the middle, red at the ends) and
// two big shoe pads at the bottom for the left and the right stilt; the pad on the side she leans to glows.
// A fall drops her down beside her stilts with a puff until she climbs back up.
import { paintHills, paintLabel, paintSky, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { StiltsState } from './logic';
import { FALL_LEAN } from './logic';

/** Arena units per metre on the road. */
const UNIT = 46;
const STILT = 170;

function paintPad(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, side: -1 | 1, glow: boolean, pressed: boolean): void {
  const { theme, sprites } = view;
  const w = Math.min(200, view.arena.width * 0.36);
  const h = 110;
  const s = pressed && !view.reducedMotion ? 0.92 : 1;
  ctx.fillStyle = glow ? theme.star : theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 6;
  roundRect(ctx, x - (w / 2) * s, y - (h / 2) * s, w * s, h * s, 30);
  ctx.fill();
  ctx.stroke();
  sprites.draw(ctx, 'running-shoe', x, y, 80 * s, { flipX: side < 0 });
}

export function drawStiltsWalk(ctx: CanvasRenderingContext2D, state: StiltsState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { groundY, x } = state;
  const scroll = state.metres * UNIT;
  paintSky(ctx, view, groundY, 6);
  paintHills(ctx, view, groundY, scroll * 0.3, 110, theme.leaf);
  ctx.fillStyle = theme.groundDeep;
  ctx.fillRect(0, groundY, arena.width, arena.height - groundY);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, groundY, arena.width, 18);
  // Road marks scrolling past.
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.15;
  for (let mx = -((scroll % 120) + 120) % 120; mx < arena.width; mx += 120) ctx.fillRect(mx, groundY + 30, 60, 6);
  ctx.globalAlpha = 1;
  // Lumps of earth.
  for (const lump of state.lumps) {
    const lx = x + (lump - state.metres) * UNIT;
    if (lx < -60 || lx > arena.width + 60) continue;
    ctx.fillStyle = theme.groundDeep;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(lx, groundY + 2, 34, 18, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  if (state.fallen >= 0) {
    // Down beside the stilts.
    const side = state.fallSide;
    ctx.strokeStyle = theme.wood;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    for (const k of [0, 1]) {
      ctx.beginPath();
      ctx.moveTo(x - 20 + k * 14, groundY - 6 - k * 8);
      ctx.lineTo(x + side * STILT + k * 14, groundY - 12 - k * 8);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    sprites.draw(ctx, view.player, x + side * (STILT + 50), groundY - 40, 90, { rotate: side * 1.2 });
    sprites.draw(ctx, 'collision', x + side * (STILT + 30), groundY - 50, 70, { alpha: Math.max(0, 1 - state.fallen / 0.6) });
    paintLabel(ctx, view, 'Ối! Leo lên lại nào', arena.width / 2, HUD_SAFE_TOP + 110, 32, theme.light);
  } else {
    // Stilts pivot at the ground; the child on top tips with the lean, the stepping stilt lifts a moment.
    const since = state.time - state.stepAt;
    const lift = since < 0.18 && !view.reducedMotion ? Math.sin((since / 0.18) * Math.PI) * 16 : 0;
    ctx.save();
    ctx.translate(x, groundY);
    ctx.rotate(state.lean);
    ctx.strokeStyle = theme.wood;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    for (const side of [-1, 1] as const) {
      const up = side === state.stepSide ? lift : 0;
      ctx.beginPath();
      ctx.moveTo(side * 18, -up);
      ctx.lineTo(side * 22, -STILT - up);
      ctx.stroke();
      // Foot rests.
      ctx.fillStyle = theme.woodEdge;
      ctx.fillRect(side * 22 - 12, -STILT * 0.62 - up, 24, 8);
    }
    ctx.lineCap = 'butt';
    sprites.draw(ctx, view.player, 0, -STILT - 50, 110);
    ctx.restore();
  }

  // Balance meter.
  const cx = arena.width / 2;
  const cy = HUD_SAFE_TOP + 40;
  const r = 90;
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';
  for (const [from, to, colour] of [
    [-1, -0.5, theme.danger],
    [-0.5, 0.5, theme.leaf],
    [0.5, 1, theme.danger],
  ] as const) {
    ctx.strokeStyle = colour;
    ctx.beginPath();
    ctx.arc(cx, cy + r, r, -Math.PI / 2 + from * 0.9, -Math.PI / 2 + to * 0.9);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  const needle = -Math.PI / 2 + Math.max(-1, Math.min(1, state.lean / FALL_LEAN)) * 0.9;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(cx, cy + r);
  ctx.lineTo(cx + Math.cos(needle) * (r + 10), cy + r + Math.sin(needle) * (r + 10));
  ctx.stroke();
  paintLabel(ctx, view, `${state.score} m`, cx, cy + r - 34, 30, theme.light);

  // The two pads.
  const padY = arena.height - 75;
  const leaning = state.fallen < 0 && Math.abs(state.lean) > 0.08 ? (state.lean > 0 ? 1 : -1) : 0;
  const pressedLeft = state.time - state.stepAt < 0.15 && state.stepSide < 0;
  const pressedRight = state.time - state.stepAt < 0.15 && state.stepSide > 0;
  paintPad(ctx, view, arena.width * 0.22, padY, -1, leaning < 0, pressedLeft);
  paintPad(ctx, view, arena.width * 0.78, padY, 1, leaning > 0, pressedRight);
}
