// Shape sorter's picture: a playroom wall, a wooden chute down the middle, the toy box with its round lid of
// four holes, and round arrow buttons on both sides. Blocks are painted shapes in their own colours; one that
// fits sinks into the hole with a sparkle, one that does not bounces off and tumbles away.
import { paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { Shape, ShapeSorterState } from './logic';
import { SHAPES } from './logic';

export function shapeColour(view: DrawView, shape: Shape): string {
  const { theme } = view;
  switch (shape) {
    case 'circle':
      return theme.danger;
    case 'square':
      return theme.secondary;
    case 'triangle':
      return theme.leaf;
    default:
      return theme.star;
  }
}

/** The outline of a shape `size` across, centred on the current origin. */
export function traceShape(ctx: CanvasRenderingContext2D, shape: Shape, size: number): void {
  const r = size / 2;
  ctx.beginPath();
  if (shape === 'circle') ctx.arc(0, 0, r, 0, Math.PI * 2);
  else if (shape === 'square') roundRect(ctx, -r * 0.88, -r * 0.88, r * 1.76, r * 1.76, r * 0.18);
  else if (shape === 'triangle') {
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.98, r * 0.78);
    ctx.lineTo(-r * 0.98, r * 0.78);
    ctx.closePath();
  } else {
    for (let i = 0; i < 10; i += 1) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? r : r * 0.48;
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
  }
}

function paintBlock(ctx: CanvasRenderingContext2D, view: DrawView, shape: Shape, x: number, y: number, size: number, rotate = 0, alpha = 1): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rotate);
  traceShape(ctx, shape, size);
  ctx.fillStyle = shapeColour(view, shape);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = view.theme.ink;
  ctx.stroke();
  // A shine on the top left.
  ctx.globalAlpha = alpha * 0.35;
  ctx.fillStyle = view.theme.light;
  ctx.beginPath();
  ctx.ellipse(-size * 0.15, -size * 0.18, size * 0.14, size * 0.08, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function paintArrow(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, side: -1 | 1, flash: number): void {
  const { theme } = view;
  const r = 46 * (1 + 0.12 * flash);
  ctx.fillStyle = flash > 0 ? theme.star : theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // A curved arrow: clockwise on the right, anticlockwise on the left.
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.strokeStyle = theme.primary;
  ctx.beginPath();
  const start = side > 0 ? -Math.PI * 0.85 : -Math.PI * 0.15;
  const end = side > 0 ? -Math.PI * 0.05 : -Math.PI * 0.95;
  ctx.arc(x, y + 6, r * 0.5, start, end, side < 0);
  ctx.stroke();
  const tipA = end;
  const tx = x + Math.cos(tipA) * r * 0.5;
  const ty = y + 6 + Math.sin(tipA) * r * 0.5;
  ctx.fillStyle = theme.primary;
  ctx.beginPath();
  ctx.moveTo(tx + side * 14, ty - 4);
  ctx.lineTo(tx - side * 4, ty - 16);
  ctx.lineTo(tx - side * 6, ty + 10);
  ctx.closePath();
  ctx.fill();
}

export function drawShapeSorter(ctx: CanvasRenderingContext2D, state: ShapeSorterState, view: DrawView): void {
  const { arena, theme } = view;
  const { lid, lidRadius } = state;
  paintSky(ctx, view, arena.height, 4);
  // The playroom floor.
  const floorY = lid.y + lidRadius * 0.55;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, floorY, arena.width, arena.height - floorY);
  ctx.fillStyle = theme.woodEdge;
  for (let x = 0; x < arena.width; x += 120) ctx.fillRect(x, floorY, 4, arena.height - floorY);

  // The chute.
  const chuteW = lidRadius * 0.62;
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = theme.light;
  roundRect(ctx, lid.x - chuteW / 2, state.chuteTop - 10, chuteW, state.holeY - state.chuteTop, 18);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(lid.x - chuteW / 2 - 12, state.chuteTop - 10, 12, state.holeY - state.chuteTop);
  ctx.fillRect(lid.x + chuteW / 2, state.chuteTop - 10, 12, state.holeY - state.chuteTop);

  // The box under the lid.
  paintShadow(ctx, view, lid.x, floorY + lidRadius * 0.55, lidRadius * 2.6);
  ctx.fillStyle = theme.secondary;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 6;
  roundRect(ctx, lid.x - lidRadius * 1.15, lid.y - lidRadius * 0.2, lidRadius * 2.3, lidRadius * 1.25, 22);
  ctx.fill();
  ctx.stroke();
  // The lid: a wooden disc, turned by `shown` quarter turns, with the four holes.
  ctx.fillStyle = theme.wood;
  ctx.beginPath();
  ctx.arc(lid.x, lid.y, lidRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.woodEdge;
  ctx.beginPath();
  ctx.arc(lid.x, lid.y, lidRadius * 0.16, 0, Math.PI * 2);
  ctx.fill();
  for (const [i, shape] of SHAPES.entries()) {
    const a = -Math.PI / 2 + ((i + state.shown) * Math.PI) / 2;
    const hx = lid.x + Math.cos(a) * lidRadius * 0.58;
    const hy = lid.y + Math.sin(a) * lidRadius * 0.58;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(((i + state.shown) * Math.PI) / 2);
    traceShape(ctx, shape, lidRadius * 0.6);
    ctx.fillStyle = theme.ink;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = shapeColour(view, shape);
    ctx.stroke();
    ctx.restore();
  }
  // The top hole glows: that is where the block will go.
  ctx.globalAlpha = 0.35 + 0.15 * Math.sin(view.time * 6);
  ctx.strokeStyle = theme.star;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(lid.x, state.holeY, lidRadius * 0.42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const blockSize = lidRadius * 0.52;
  for (const block of state.blocks) {
    if (block.result === 'in') {
      const t = Math.min(1, block.since / 0.35);
      paintBlock(ctx, view, block.shape, lid.x, block.y + t * 20, blockSize * (1 - 0.6 * t), 0, 1 - t);
      if (block.since < 0.6) view.sprites.draw(ctx, 'sparkles', lid.x + lidRadius * 0.4, state.holeY - 30 - block.since * 40, 50, { alpha: 1 - block.since / 0.6 });
    } else if (block.result === 'out') {
      const t = block.since;
      const x = lid.x + block.bounce * t * 320;
      const y = block.y - 260 * t + 900 * t * t;
      paintBlock(ctx, view, block.shape, x, y, blockSize, view.reducedMotion ? 0 : block.bounce * t * 9, 1 - t / 0.8);
    } else {
      paintBlock(ctx, view, block.shape, lid.x, block.y - blockSize * 0.4, blockSize);
    }
  }

  const flash = (side: -1 | 1): number => (state.tappedSide === side ? Math.max(0, 1 - (state.time - state.tappedAt) / 0.25) : 0);
  const arrowX = Math.min(lidRadius * 1.25 + 60, arena.width / 2 - 56);
  paintArrow(ctx, view, lid.x - arrowX, lid.y - lidRadius * 0.15, -1, flash(-1));
  paintArrow(ctx, view, lid.x + arrowX, lid.y - lidRadius * 0.15, 1, flash(1));
}
