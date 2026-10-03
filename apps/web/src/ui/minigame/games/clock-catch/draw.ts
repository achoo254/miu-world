// Clock catch's picture: a big alarm clock (two bells on top, numbers 1–12, minute ticks, a short thick hour hand
// and a long red minute hand) beside a card where the rooster asks for the time in words and as "7:30".
// A right stop glows green and the rooster crows; a wrong one shakes the clock and rings its bells.
import { bob, paintGround, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { digital, spoken, type ClockCatchState } from './logic';

function paintHand(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, length: number, width: number, colour: string, edge: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.lineCap = 'round';
  ctx.strokeStyle = edge;
  ctx.lineWidth = width + 6;
  ctx.beginPath();
  ctx.moveTo(0, length * 0.15);
  ctx.lineTo(0, -length);
  ctx.stroke();
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
  ctx.lineCap = 'butt';
}

function paintClock(ctx: CanvasRenderingContext2D, state: ClockCatchState, view: DrawView): void {
  const { theme, sprites } = view;
  const { r } = state.clock;
  const ringing = state.phase === 'wrong' || (state.phase === 'right' && state.phaseTime < 0.6);
  const shake = ringing && !view.reducedMotion ? Math.sin(state.phaseTime * 70) * 6 : 0;
  const x = state.clock.x + shake;
  const y = state.clock.y;
  // Bells and legs.
  for (const side of [-1, 1]) {
    sprites.draw(ctx, 'bell', x + side * r * 0.62, y - r * 0.92, r * 0.5, { rotate: side * 0.5 + (ringing && !view.reducedMotion ? Math.sin(view.time * 50) * 0.2 : 0) });
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(x + side * r * 0.55, y + r * 0.8);
    ctx.lineTo(x + side * r * 0.75, y + r * 1.05);
    ctx.stroke();
  }
  ctx.fillStyle = state.phase === 'right' ? theme.leaf : theme.primary;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = theme.ink;
  ctx.stroke();
  ctx.fillStyle = theme.light;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.86, 0, Math.PI * 2);
  ctx.fill();
  // Minute ticks; longer every five.
  ctx.strokeStyle = theme.ink;
  for (let i = 0; i < 60; i += 1) {
    const a = (i / 60) * Math.PI * 2;
    const long = i % 5 === 0;
    ctx.lineWidth = long ? 5 : 2;
    const inner = r * (long ? 0.74 : 0.79);
    ctx.beginPath();
    ctx.moveTo(x + Math.sin(a) * inner, y - Math.cos(a) * inner);
    ctx.lineTo(x + Math.sin(a) * r * 0.84, y - Math.cos(a) * r * 0.84);
    ctx.stroke();
  }
  ctx.font = `800 ${Math.round(r * 0.19)}px ${theme.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = theme.ink;
  for (let h = 1; h <= 12; h += 1) {
    const a = (h / 12) * Math.PI * 2;
    ctx.fillText(String(h), x + Math.sin(a) * r * 0.6, y - Math.cos(a) * r * 0.6 + r * 0.01);
  }
  const m = state.minutes;
  paintHand(ctx, x, y, (m / 720) * Math.PI * 2, r * 0.42, r * 0.07, theme.ink, theme.light);
  paintHand(ctx, x, y, ((m % 60) / 60) * Math.PI * 2, r * 0.7, r * 0.045, theme.danger, theme.light);
  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.06, 0, Math.PI * 2);
  ctx.fill();
}

function paintCard(ctx: CanvasRenderingContext2D, state: ClockCatchState, view: DrawView): void {
  const { theme, sprites } = view;
  const { x, y, w, h } = state.card;
  ctx.fillStyle = theme.light;
  roundRect(ctx, x, y, w, h, 24);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = theme.woodEdge;
  ctx.stroke();
  const tall = h > w * 0.7;
  const crow = state.phase === 'right' && !view.reducedMotion ? Math.abs(Math.sin(state.phaseTime * 12)) * 14 : 0;
  const rooster = tall ? { x: x + w / 2, y: y + h * 0.2 } : { x: x + 70, y: y + h / 2 };
  sprites.draw(ctx, 'chicken', rooster.x, rooster.y - crow + bob(view, 3, 3), Math.min(120, h * (tall ? 0.3 : 0.6)));
  const textX = tall ? x + w / 2 : x + 140 + (w - 140) / 2;
  const words = spoken(state.target);
  let size = Math.min(54, (tall ? w : w - 160) / (words.length * 0.55));
  size = Math.max(30, size);
  paintLabel(ctx, view, words, textX, tall ? y + h * 0.5 : y + h * 0.36, size, theme.star);
  // A small screen with the digits.
  const dw = Math.min(200, (tall ? w : w - 160) * 0.7);
  const dh = 64;
  const dx = textX - dw / 2;
  const dy = tall ? y + h * 0.66 : y + h * 0.58;
  ctx.fillStyle = theme.ink;
  roundRect(ctx, dx, dy, dw, dh, 14);
  ctx.fill();
  ctx.font = `800 46px ${theme.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = theme.leaf;
  ctx.fillText(digital(state.target), textX, dy + dh / 2 + 2);
}

export function drawClockCatch(ctx: CanvasRenderingContext2D, state: ClockCatchState, view: DrawView): void {
  const { arena } = view;
  const horizon = arena.height * 0.55;
  paintSky(ctx, view, horizon, 6);
  paintGround(ctx, view, horizon);
  paintCard(ctx, state, view);
  paintClock(ctx, state, view);
  if (state.phase === 'right') {
    view.sprites.draw(ctx, 'sparkles', state.clock.x + state.clock.r * 0.7, state.clock.y - state.clock.r * 0.7 - state.phaseTime * 40, 60, { alpha: Math.max(0, 1 - state.phaseTime) });
  }
}
