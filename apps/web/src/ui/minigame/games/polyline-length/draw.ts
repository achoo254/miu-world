// Polyline length's picture: a forest floor with dirt paths between round stepping stones, a little sign on
// every path with its length in centimetres, the snail on its stone and the lettuce on the far one. The way
// being traced glows gold over the paths, and a board at the top sums it up ("3 + 2 + 4 = 9 cm") beside the
// asked length. A right way: the snail crawls along it; a wrong one fades.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView, Point } from '../../types';
import { pathLength, type PolylineState } from './logic';

function strokeWay(ctx: CanvasRenderingContext2D, points: Point[]): void {
  const [first, ...rest] = points;
  if (!first) return;
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (const p of rest) ctx.lineTo(p.x, p.y);
  ctx.stroke();
}

/** A point `t` (0–1) of the way along a polyline, by length. */
function along(points: Point[], t: number): Point {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - (points[i]?.x ?? 0), p.y - (points[i]?.y ?? 0)));
  let left = lengths.reduce((a, b) => a + b, 0) * Math.min(1, Math.max(0, t));
  for (let i = 0; i < lengths.length; i += 1) {
    const l = lengths[i] ?? 0;
    const a = points[i];
    const b = points[i + 1];
    if (!a || !b) break;
    if (left <= l) return { x: a.x + ((b.x - a.x) * left) / Math.max(1, l), y: a.y + ((b.y - a.y) * left) / Math.max(1, l) };
    left -= l;
  }
  return points[points.length - 1] ?? { x: 0, y: 0 };
}

export function drawPolylineLength(ctx: CanvasRenderingContext2D, state: PolylineState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.leaf;
  ctx.fillRect(0, 0, arena.width, arena.height);
  // Grass tufts.
  ctx.fillStyle = theme.ground;
  for (let i = 0; i < 40; i += 1) {
    const x = (i * 157) % arena.width;
    const y = 120 + ((i * 263) % Math.max(1, arena.height - 120));
    ctx.beginPath();
    ctx.ellipse(x, y, 26, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const at = (n: number): Point => state.nodes[n] ?? { x: 0, y: 0 };
  // Paths.
  ctx.lineCap = 'round';
  for (const e of state.edges) {
    ctx.strokeStyle = theme.groundDeep;
    ctx.lineWidth = 22;
    strokeWay(ctx, [at(e.a), at(e.b)]);
  }
  // The way being traced (or the finished one, crawling or fading).
  const result = state.result;
  const way = result ? result.path : state.path;
  if (way.length > 1) {
    ctx.globalAlpha = result && !result.right ? Math.max(0, 1 - result.ago / 0.8) : 1;
    ctx.strokeStyle = result && !result.right ? theme.danger : theme.star;
    ctx.lineWidth = 14;
    strokeWay(ctx, way.map(at));
    ctx.globalAlpha = 1;
  }
  ctx.lineCap = 'butt';
  // Length signs.
  for (const e of state.edges) {
    const a = at(e.a);
    const b = at(e.b);
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    ctx.fillStyle = theme.light;
    roundRect(ctx, mx - 40, my - 20, 80, 40, 14);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = theme.woodEdge;
    ctx.stroke();
    paintLabel(ctx, view, `${e.cm} cm`, mx, my + 2, 24, theme.light);
  }
  // Stones.
  state.nodes.forEach((n, i) => {
    const onWay = way.includes(i);
    ctx.fillStyle = onWay ? theme.star : theme.stone;
    ctx.beginPath();
    ctx.ellipse(n.x, n.y, 34, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = theme.stoneEdge;
    ctx.stroke();
  });
  const end = at(state.end);
  sprites.draw(ctx, 'leafy-green', end.x, end.y - 10, 70);
  // The snail: on its stone, or crawling along the right way.
  let snail = at(state.start);
  let flip = false;
  if (result?.right) {
    const pts = result.path.map(at);
    snail = along(pts, result.ago / 1.2);
    const ahead = along(pts, result.ago / 1.2 + 0.02);
    flip = ahead.x > snail.x;
  }
  sprites.draw(ctx, 'snail', snail.x, snail.y - 12, 70, { flipX: flip });

  // The board: asked length, and the sum so far.
  const sum = pathLength(state.edges, way);
  const parts = way.slice(1).map((n, i) => pathLength(state.edges, [way[i] ?? n, n]));
  const sumText = parts.length > 0 ? `${parts.join(' + ')} = ${sum} cm` : 'Kéo từ ốc sên';
  const boardY = 110 + 50;
  ctx.fillStyle = theme.wood;
  roundRect(ctx, 20, boardY - 40, arena.width - 40, 80, 20);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = theme.woodEdge;
  ctx.stroke();
  const narrow = arena.width < 700;
  paintLabel(ctx, view, `Cần ${state.target} cm`, narrow ? 120 : 150, boardY + 2, narrow ? 30 : 36, theme.star);
  const over = sum > state.target;
  paintLabel(ctx, view, sumText, (narrow ? 240 : 300) + (arena.width - (narrow ? 240 : 300) - 30) / 2, boardY + 2, Math.min(32, ((arena.width - 300) / Math.max(8, sumText.length)) * 1.8), over ? theme.danger : theme.light);
  if (result?.right) sprites.draw(ctx, 'sparkles', end.x + 30, end.y - 50, 70, { alpha: Math.max(0, 1 - result.ago / 1.4) });
}
