// Bus lines' picture: a town seen from above (grass, a river, little houses), the bus lines as thick coloured
// roads joining stops, each stop a white circle, square or triangle with its waiting people beside it as small
// shapes (the stop blinks red when crowded), a line being drawn following the finger, and the buses (with
// their riders' shapes) running along the lines.
import { paintLabel } from '../../draw-kit';
import type { DrawView } from '../../types';
import { CROWDED, MAX_LINES, type BusState, type Shape } from './logic';

function shapePath(ctx: CanvasRenderingContext2D, shape: Shape, x: number, y: number, r: number): void {
  ctx.beginPath();
  if (shape === 0) ctx.arc(x, y, r, 0, Math.PI * 2);
  else if (shape === 1) ctx.rect(x - r * 0.88, y - r * 0.88, r * 1.76, r * 1.76);
  else {
    ctx.moveTo(x, y - r * 1.1);
    ctx.lineTo(x + r * 1.05, y + r * 0.75);
    ctx.lineTo(x - r * 1.05, y + r * 0.75);
    ctx.closePath();
  }
}

export function drawBusLines(ctx: CanvasRenderingContext2D, state: BusState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const lineColours = [theme.danger, theme.secondary, theme.star];
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.strokeStyle = theme.waterLight;
  ctx.lineWidth = 34;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.moveTo(-20, arena.height * 0.7);
  ctx.bezierCurveTo(arena.width * 0.3, arena.height * 0.5, arena.width * 0.6, arena.height * 0.95, arena.width + 20, arena.height * 0.6);
  ctx.stroke();
  ctx.globalAlpha = 1;
  for (let i = 0; i < 6; i += 1) sprites.draw(ctx, 'house', 40 + ((i * 271) % (arena.width - 80)), 140 + ((i * 193) % (arena.height - 180)), 44, { alpha: 0.6 });

  // Lines.
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  state.lines.forEach((line, i) => {
    ctx.strokeStyle = lineColours[i] ?? theme.primary;
    ctx.lineWidth = 16;
    ctx.beginPath();
    line.stops.forEach((s, k) => {
      const p = state.stops[s];
      if (!p) return;
      if (k === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  });
  if (state.drawing) {
    const from = state.stops[state.drawing.from];
    if (from) {
      ctx.strokeStyle = lineColours[Math.min(state.lines.length, MAX_LINES - 1)] ?? theme.primary;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 14;
      ctx.setLineDash([16, 12]);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(state.drawing.to.x, state.drawing.to.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  }
  ctx.lineCap = 'butt';

  // Stops and their waiting people.
  for (const s of state.stops) {
    const pop = s.age < 0.4 && !view.reducedMotion ? 1 + 0.4 * Math.sin((s.age / 0.4) * Math.PI) : 1;
    const crowded = s.waiting.length > CROWDED && Math.sin(view.time * 10) > 0;
    shapePath(ctx, s.shape, s.x, s.y, 26 * pop);
    ctx.fillStyle = crowded ? theme.danger : theme.light;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = theme.ink;
    ctx.stroke();
    s.waiting.slice(0, 10).forEach((want, k) => {
      const px = s.x + 38 + (k % 5) * 18;
      const py = s.y - 12 + Math.floor(k / 5) * 20;
      shapePath(ctx, want, px, py, 7);
      ctx.fillStyle = theme.ink;
      ctx.fill();
    });
  }
  // Buses.
  state.lines.forEach((line, i) => {
    if (line.stops.length < 2) return;
    const { bus } = line;
    sprites.draw(ctx, 'bus', bus.x, bus.y - 18, 58);
    ctx.fillStyle = lineColours[i] ?? theme.primary;
    ctx.fillRect(bus.x - 24, bus.y + 6, 48, 6);
    bus.riders.forEach((want, k) => {
      shapePath(ctx, want, bus.x - 20 + k * 8, bus.y + 20, 4);
      ctx.fillStyle = theme.light;
      ctx.fill();
    });
  });
  if (state.lines.length === 0) paintLabel(ctx, view, 'Kéo từ trạm này sang trạm khác để mở tuyến xe buýt', arena.width / 2, 135, Math.min(28, arena.width / 26));
}
