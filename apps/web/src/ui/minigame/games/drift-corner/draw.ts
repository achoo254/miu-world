// Drift corner's picture: grass seen from above, the grey road of stretches and corners following the car (the
// camera keeps it low in the middle), a striped tyre post inside each corner, a rope from the car to the post
// while the finger holds, skid marks, and a puff when the car runs off.
import { paintLabel } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { DriftCornerState } from './logic';
import { postOf, ROAD } from './logic';

export function drawDriftCorner(ctx: CanvasRenderingContext2D, state: DriftCornerState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.save();
  ctx.translate(arena.width / 2 - state.car.x, arena.height * 0.68 - state.car.y);
  const from = Math.max(0, state.seg - 2);
  const to = Math.min(state.points.length - 1, state.seg + 6);
  // Road: a wide grey line through the corner points, squared at the corners.
  ctx.strokeStyle = theme.stoneEdge;
  ctx.lineWidth = ROAD * 2 + 10;
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  for (let i = from; i <= to; i += 1) {
    const p = state.points[i];
    if (!p) continue;
    if (i === from) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.strokeStyle = theme.stone;
  ctx.lineWidth = ROAD * 2;
  ctx.stroke();
  ctx.setLineDash([24, 24]);
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.setLineDash([]);
  for (let i = from + 1; i < to; i += 1) {
    const post = postOf(state, i);
    if (!post) continue;
    const next = i === state.seg + 1;
    ctx.fillStyle = next ? theme.danger : theme.ink;
    ctx.beginPath();
    ctx.arc(post.x, post.y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.light;
    ctx.beginPath();
    ctx.arc(post.x, post.y, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  if (state.orbit) {
    ctx.strokeStyle = theme.star;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(state.orbit.x, state.orbit.y);
    ctx.lineTo(state.car.x, state.car.y);
    ctx.stroke();
  }
  // The car points along its heading (the picture faces left).
  sprites.draw(ctx, 'racing-car', state.car.x, state.car.y, 86, { rotate: state.heading + Math.PI, flipX: false });
  ctx.restore();
  if (state.time - state.crashAt < 0.8) {
    sprites.draw(ctx, 'collision', arena.width / 2, arena.height * 0.68, 90, { alpha: 1 - (state.time - state.crashAt) / 0.8 });
    paintLabel(ctx, view, 'Ra khỏi đường!', arena.width / 2, HUD_SAFE_TOP + 50, 36, theme.light);
  }
  paintLabel(ctx, view, state.holding ? 'Đang ôm cua…' : 'Giữ ngón tay để ôm cua', arena.width / 2, arena.height - 40, 30, theme.light);
}
