// Simple circuit's picture: a wooden science board, the battery with + and − clips, bulbs that glow when lit,
// a switch drawn as a lever (up when open, down when closed), a leaf, shiny round clips, and the wires as
// sagging coloured cables (one follows the finger while dragged). A lit board sparkles.
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { CircuitState, Part } from './logic';

function paintPart(ctx: CanvasRenderingContext2D, view: DrawView, part: Part, lit: boolean): void {
  const { theme, sprites } = view;
  const { x, y } = part.centre;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 6;
  // Short leads from the clips to the part.
  ctx.beginPath();
  ctx.moveTo(part.clips[0].x, part.clips[0].y);
  ctx.lineTo(part.clips[1].x, part.clips[1].y);
  ctx.stroke();
  if (part.kind === 'battery') {
    sprites.draw(ctx, 'battery', x, y, 120, { rotate: Math.PI / 2 });
    paintLabel(ctx, view, '+', part.clips[0].x, y - 40, 34, theme.danger);
    paintLabel(ctx, view, '−', part.clips[1].x, y - 40, 34, theme.ink);
  } else if (part.kind === 'bulb') {
    if (lit) {
      ctx.globalAlpha = 0.5 + 0.2 * Math.sin(view.time * 8);
      ctx.fillStyle = theme.star;
      ctx.beginPath();
      ctx.arc(x, y - 20, 70, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    sprites.draw(ctx, 'light-bulb', x, y - 20, 90, { alpha: lit ? 1 : 0.45 });
  } else if (part.kind === 'leaf') {
    sprites.draw(ctx, 'leaf', x, y - 10, 80);
  } else {
    ctx.fillStyle = theme.stone;
    roundRect(ctx, x - 50, y - 6, 100, 22, 8);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.translate(x - 40, y);
    ctx.rotate(part.closed ? 0 : -0.6);
    ctx.fillStyle = theme.danger;
    roundRect(ctx, 0, -10, 84, 14, 7);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    paintLabel(ctx, view, part.closed ? 'đóng' : 'mở', x, y + 40, 24, theme.light);
  }
  for (const c of part.clips) {
    ctx.fillStyle = theme.stoneEdge;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function paintWire(ctx: CanvasRenderingContext2D, a: { x: number; y: number }, b: { x: number; y: number }, colour: string): void {
  ctx.strokeStyle = colour;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  const sag = Math.min(80, Math.hypot(b.x - a.x, b.y - a.y) * 0.2);
  ctx.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + sag, b.x, b.y);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

export function drawSimpleCircuit(ctx: CanvasRenderingContext2D, state: CircuitState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, arena.height, 3);
  ctx.fillStyle = theme.wood;
  roundRect(ctx, 10, HUD_SAFE_TOP - 10, arena.width - 20, arena.height - HUD_SAFE_TOP, 24);
  ctx.fill();
  for (const [i, part] of state.parts.entries()) paintPart(ctx, view, part, state.lit.includes(i));
  const point = (c: readonly [number, 0 | 1]) => state.parts[c[0]]?.clips[c[1]] ?? { x: 0, y: 0 };
  const lit = state.lit.length > 0;
  for (const [a, b] of state.wires) paintWire(ctx, point(a), point(b), lit ? theme.star : theme.danger);
  if (state.from && state.finger) paintWire(ctx, point(state.from), state.finger, theme.secondary);
  if (state.nextIn > 0) {
    sprites.draw(ctx, 'sparkles', arena.width / 2 + 80, HUD_SAFE_TOP + 30, 70);
    paintLabel(ctx, view, 'Đèn sáng rồi!', arena.width / 2, HUD_SAFE_TOP + 30, 44, theme.star);
  }
}
