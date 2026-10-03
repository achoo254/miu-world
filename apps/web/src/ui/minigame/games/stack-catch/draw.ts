// Stack catch's picture: sky and hills behind a wooden counter, the plate the child slides, the pancake stack
// (golden layers with a darker rim, leaning with its sway, a dollop of cream and a strawberry on top), the
// pancake falling with a guide shadow, a line marking the best height so far, and toppled layers tumbling.
import { paintHills, paintLabel, paintShadow, paintSky } from '../../draw-kit';
import type { DrawView } from '../../types';
import { HALF_WIDTH, LAYER, comOffset, COM_LIMIT, SWAY_LIMIT, type StackState } from './logic';

function paintPancake(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, angle = 0, alpha = 1): void {
  const { theme } = view;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = theme.woodEdge;
  ctx.beginPath();
  ctx.ellipse(0, 4, HALF_WIDTH, LAYER * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.star;
  ctx.beginPath();
  ctx.ellipse(0, -2, HALF_WIDTH - 2, LAYER * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha *= 0.35;
  ctx.fillStyle = theme.light;
  ctx.beginPath();
  ctx.ellipse(-16, -6, HALF_WIDTH * 0.45, LAYER * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawStackCatch(ctx: CanvasRenderingContext2D, state: StackState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { plateY, camera } = state;
  // The background scrolls a little with the camera (parallax).
  const counterY = plateY + 26 + camera;
  paintSky(ctx, view, Math.min(arena.height, counterY), 6);
  paintHills(ctx, view, counterY - 20 + camera * 0.2, 60, 90, theme.leaf);
  if (counterY < arena.height) {
    ctx.fillStyle = theme.wood;
    ctx.fillRect(0, counterY, arena.width, arena.height - counterY);
    ctx.fillStyle = theme.woodEdge;
    ctx.fillRect(0, counterY, arena.width, 10);
  }

  // Best height so far.
  if (state.best > 0) {
    const y = plateY - state.best * LAYER + camera;
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 4;
    ctx.setLineDash([16, 12]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(arena.width, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    sprites.draw(ctx, 'crown', 34, y - 22, 40);
  }

  // The plate.
  const plateScreenY = plateY + camera;
  paintShadow(ctx, view, state.plateX, plateScreenY + 20, 190);
  ctx.fillStyle = theme.stoneEdge;
  ctx.beginPath();
  ctx.ellipse(state.plateX, plateScreenY + 8, 92, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.light;
  ctx.beginPath();
  ctx.ellipse(state.plateX, plateScreenY + 2, 88, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  // The stack, leaning with its sway (more toward the top), squashed for a moment after a catch.
  const n = state.layers.length;
  const squash = view.reducedMotion ? 0 : Math.max(0, 1 - state.caughtAgo / 0.15) * 4;
  state.layers.forEach((layer, i) => {
    const lean = n ? ((i + 1) / n) ** 1.4 : 0;
    const x = state.plateX + layer.dx + state.sway * lean;
    const y = plateScreenY - (i + 0.5) * LAYER + (i === n - 1 ? squash : 0);
    paintPancake(ctx, view, x, y, state.sway * lean * 0.004);
    if (layer.topping && i < n - 1) sprites.draw(ctx, layer.topping === 1 ? 'strawberry' : 'cherries', x + 30, y - 12, 30);
  });
  if (n > 0) {
    const tx = state.plateX + (state.layers.at(-1)?.dx ?? 0) + state.sway;
    const ty = plateScreenY - n * LAYER;
    ctx.fillStyle = theme.light;
    ctx.beginPath();
    ctx.ellipse(tx, ty - 4, 26, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    sprites.draw(ctx, 'strawberry', tx, ty - 22, 40);
    // Danger glow when the stack is about to topple.
    const danger = Math.max(Math.abs(state.sway) / SWAY_LIMIT, Math.abs(comOffset(state)) / COM_LIMIT);
    if (danger > 0.6) paintLabel(ctx, view, '!', tx + HALF_WIDTH + 24, ty - 10, 50, theme.danger);
    paintLabel(ctx, view, `${n}`, tx - HALF_WIDTH - 34, ty + 10, 40);
  }

  const f = state.falling;
  if (f) {
    const y = plateY - f.h + camera;
    if (f.missed < 0) {
      // Where it will come down: a faint column.
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = theme.light;
      ctx.fillRect(f.x - 3, y + 16, 6, Math.max(0, plateScreenY - n * LAYER - y - 16));
      ctx.globalAlpha = 1;
      const flip = view.reducedMotion ? 0 : Math.sin(view.time * 6) * 0.25;
      paintPancake(ctx, view, f.x, y, flip);
    } else paintPancake(ctx, view, f.x, f.missedY, 0, 1 - f.missed / 0.6);
  }

  for (const d of state.debris) paintPancake(ctx, view, d.x, d.y, d.angle, Math.min(1, d.life / 0.5));
  if (state.toppledAgo < 1.2) {
    const grow = view.reducedMotion ? 1 : Math.min(1, state.toppledAgo / 0.15);
    paintLabel(ctx, view, 'Ối, đổ rồi!', arena.width / 2, plateScreenY - 220, 56 * grow);
  }
}
