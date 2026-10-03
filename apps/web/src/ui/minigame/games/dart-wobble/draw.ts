// Dart wobble's picture: a wooden wall at a fair, the dartboard with bright rings and their points, darts
// stuck where they landed, the dart in flight shrinking toward the board, the wobbling aim (two circles and
// a cross), the darts left in a row at the bottom, and the child ready to throw.
import { paintLabel, paintShadow, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { DARTS, FLIGHT, RINGS, type DartState } from './logic';

function paintDart(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, size: number, angle: number): void {
  const { theme } = view;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(size / 60, size / 60);
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  ctx.fillStyle = theme.stoneEdge;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(10, -3);
  ctx.lineTo(10, 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = theme.secondary;
  roundRect(ctx, 10, -5, 30, 10, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.primary;
  ctx.beginPath();
  ctx.moveTo(38, 0);
  ctx.lineTo(60, -14);
  ctx.lineTo(54, 0);
  ctx.lineTo(60, 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawDartWobble(ctx: CanvasRenderingContext2D, state: DartState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  // A fairground wall of planks.
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 4;
  for (let x = 0; x < arena.width; x += 70) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, arena.height);
    ctx.stroke();
  }
  // Bunting along the top.
  const flags = [theme.primary, theme.star, theme.secondary, theme.leaf];
  for (let i = 0, x = 10; x < arena.width; i += 1, x += 60) {
    ctx.fillStyle = flags[i % flags.length] ?? theme.star;
    ctx.beginPath();
    ctx.moveTo(x, 96);
    ctx.lineTo(x + 50, 96);
    ctx.lineTo(x + 25, 130);
    ctx.closePath();
    ctx.fill();
  }

  // The board.
  const { boardX: bx, boardY: by, radius: r } = state;
  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.arc(bx, by + 8, r + 14, 0, Math.PI * 2);
  ctx.fill();
  // Bullseye outward: red, yellow, blue, white, green rim.
  const colours = [theme.danger, theme.star, theme.secondary, theme.light, theme.leaf];
  for (let i = RINGS.length - 1; i >= 0; i -= 1) {
    const ring = RINGS[i];
    if (!ring) continue;
    ctx.fillStyle = colours[i] ?? theme.light;
    ctx.beginPath();
    ctx.arc(bx, by, ring[0] * r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  // Points written on the right of each ring.
  RINGS.forEach(([edge, points], i) => {
    const inner = i === 0 ? 0 : (RINGS[i - 1]?.[0] ?? 0);
    if (i === 0) return;
    paintLabel(ctx, view, String(points), bx + ((edge + inner) / 2) * r, by, 22);
  });

  // Stuck darts and the one in flight.
  for (const d of state.darts) {
    if (d.t >= FLIGHT) paintDart(ctx, view, bx + d.dx, by + d.dy, 46, -0.6);
    else {
      const u = d.t / FLIGHT;
      const sx = arena.width / 2 + (bx + d.dx - arena.width / 2) * u;
      const sy = arena.height - 140 + (by + d.dy - (arena.height - 140)) * u - Math.sin(u * Math.PI) * 60;
      paintDart(ctx, view, sx, sy, 90 - 44 * u, -0.6 - (1 - u) * 0.8);
    }
  }

  // The aim.
  if (state.left > 0) {
    const ax = bx + state.aimX;
    const ay = by + state.aimY;
    const ready = state.cooldown <= 0;
    ctx.globalAlpha = ready ? 1 : 0.4;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(ax, ay, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.beginPath();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      ctx.moveTo(ax + dx * 14, ay + dy * 14);
      ctx.lineTo(ax + dx * 44, ay + dy * 44);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // The child and the darts still in hand.
  const footY = arena.height - 30;
  paintShadow(ctx, view, arena.width / 2, footY, 90);
  sprites.draw(ctx, view.player, arena.width / 2, footY - 56, 110);
  for (let i = 0; i < DARTS; i += 1) {
    const x = arena.width / 2 + 90 + i * 30;
    if (x > arena.width - 20) break;
    ctx.globalAlpha = i < state.left ? 1 : 0.2;
    paintDart(ctx, view, x, footY - 70, 60, -Math.PI / 2);
  }
  ctx.globalAlpha = 1;
}
