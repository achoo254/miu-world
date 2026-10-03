// Fruit slice's picture: a wooden chopping board, juice stains where fruit was cut, fruit spinning up and
// down, a cactus ringed in red, cut fruit falling apart in two halves, and the white streak of the blade
// behind the finger. The board blushes red for a moment after a cactus is cut.
import { paintLabel } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { FruitKind, FruitSliceState, Thrown } from './logic';

function juiceColour(view: DrawView, kind: FruitKind): string {
  switch (kind) {
    case 'watermelon':
    case 'strawberry':
    case 'red-apple':
      return view.theme.primary;
    case 'grapes':
      return view.theme.secondary;
    case 'coconut':
    case 'cactus':
      return view.theme.light;
    default:
      return view.theme.star;
  }
}

function paintBoard(ctx: CanvasRenderingContext2D, view: DrawView): void {
  const { arena, theme } = view;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.strokeStyle = theme.woodEdge;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 4;
  for (let y = 70; y < arena.height; y += 110) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(arena.width, y);
    ctx.stroke();
  }
  // Grain: a few long soft curves.
  ctx.globalAlpha = 0.12;
  ctx.lineWidth = 3;
  for (let i = 0; i < 9; i += 1) {
    const y = 40 + ((i * 157) % Math.max(1, arena.height - 80));
    ctx.beginPath();
    ctx.moveTo(-20, y);
    ctx.bezierCurveTo(arena.width * 0.3, y - 18, arena.width * 0.6, y + 22, arena.width + 20, y - 6);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function paintHalves(ctx: CanvasRenderingContext2D, view: DrawView, item: Thrown): void {
  const size = item.r * 2;
  const open = item.cut * 90;
  const nx = -Math.sin(item.cutAngle);
  const ny = Math.cos(item.cutAngle);
  ctx.globalAlpha = Math.max(0, 1 - item.cut / 1.2);
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(item.x + nx * open * side, item.y + ny * open * side);
    ctx.rotate(item.cutAngle);
    ctx.beginPath();
    ctx.rect(-size, side > 0 ? 0 : -size, size * 2, size);
    ctx.clip();
    ctx.rotate(-item.cutAngle + item.angle + side * item.cut * 1.6);
    view.sprites.draw(ctx, item.kind, 0, 0, size);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function paintBlade(ctx: CanvasRenderingContext2D, view: DrawView, state: FruitSliceState): void {
  const points = state.blade;
  if (points.length < 2) return;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    const fresh = 1 - b.age / 0.16;
    ctx.globalAlpha = 0.45 * fresh;
    ctx.strokeStyle = view.theme.star;
    ctx.lineWidth = 26 * fresh + 6;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.globalAlpha = fresh;
    ctx.strokeStyle = view.theme.light;
    ctx.lineWidth = 12 * fresh + 3;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function drawFruitSlice(ctx: CanvasRenderingContext2D, state: FruitSliceState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintBoard(ctx, view);
  for (const splat of state.splats) {
    ctx.globalAlpha = 0.4 * (1 - splat.age / 1.5);
    ctx.fillStyle = juiceColour(view, splat.kind);
    for (let i = 0; i < 5; i += 1) {
      const a = i * 1.3 + splat.x;
      ctx.beginPath();
      ctx.arc(splat.x + Math.cos(a) * 30, splat.y + Math.sin(a) * 26, 22 + (i % 3) * 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  for (const item of state.items) {
    if (item.cut >= 0) {
      if (item.cut < 90) paintHalves(ctx, view, item);
      continue;
    }
    if (item.kind === 'cactus') {
      ctx.strokeStyle = theme.danger;
      ctx.lineWidth = 6;
      ctx.setLineDash([12, 10]);
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.r + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    sprites.draw(ctx, item.kind, item.x, item.y, item.r * 2, { rotate: view.reducedMotion ? 0 : item.angle });
  }
  paintBlade(ctx, view, state);
  if (state.ouchAgo < 0.35) {
    ctx.globalAlpha = 0.25 * (1 - state.ouchAgo / 0.35);
    ctx.fillStyle = theme.danger;
    ctx.fillRect(0, 0, arena.width, arena.height);
    ctx.globalAlpha = 1;
  }
  if (state.time < 3.5) {
    ctx.globalAlpha = Math.min(1, 3.5 - state.time);
    paintLabel(ctx, view, 'Vuốt qua quả!', arena.width / 2, HUD_SAFE_TOP + 60, 44, theme.star);
    ctx.globalAlpha = 1;
  }
}
