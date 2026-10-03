// Milk the cow's picture: a barn with a hay floor, the big cow (her head turned and a "Moo!" when she huffs),
// her pink udder with two teats that swell and blush as they fill (a ring when ready), milk streams into the
// bucket, the bucket's milk level, full buckets shown as glasses of milk, and three hearts of patience.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { FULL, PATIENCE, PER_BUCKET, type MilkState } from './logic';

export function drawMilkCow(ctx: CanvasRenderingContext2D, state: MilkState, view: DrawView): void {
  const { arena, sprites, theme } = view;
  // Barn wall and hay.
  ctx.fillStyle = theme.danger;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 4;
  for (let x = 0; x < arena.width; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, arena.height);
    ctx.stroke();
  }
  const hay = state.bucketY + 30;
  ctx.fillStyle = theme.star;
  ctx.fillRect(0, hay, arena.width, arena.height - hay);

  const shake = state.huff > 0 && !view.reducedMotion ? Math.sin(state.huff * 30) * 6 : 0;
  sprites.draw(ctx, 'cow', state.cowX + shake, state.cowY, 360, { flipX: state.huff > 0 });
  // The udder.
  const [l] = state.teats;
  ctx.fillStyle = theme.primary;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(state.cowX + shake, l.at.y - 44, 105, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  for (const t of state.teats) {
    const ready = t.fill >= FULL;
    const swell = 0.75 + 0.35 * t.fill;
    const x = t.at.x + shake;
    if (ready) {
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(view.time * 6);
      ctx.strokeStyle = theme.light;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(x, t.at.y, 52, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = ready ? theme.primary : theme.light;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4;
    roundRect(ctx, x - 18 * swell, t.at.y - 40, 36 * swell, 70 * swell, 18 * swell);
    ctx.fill();
    ctx.stroke();
    if (t.squirted < 0.35) {
      ctx.strokeStyle = theme.light;
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, t.at.y + 34);
      ctx.lineTo(x * 0.6 + state.cowX * 0.4, state.bucketY - 40);
      ctx.stroke();
    }
    if (t.dribbled < 0.4) {
      ctx.fillStyle = theme.light;
      ctx.beginPath();
      ctx.arc(x, t.at.y + 44 + t.dribbled * 80, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // The bucket and its milk.
  sprites.draw(ctx, 'bucket', state.cowX, state.bucketY, 150);
  const level = state.inBucket / PER_BUCKET;
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.ellipse(state.cowX, state.bucketY - 30 + (1 - level) * 30, 46, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  for (let i = 0; i < state.buckets; i += 1) sprites.draw(ctx, 'glass-of-milk', 40 + i * 44, arena.height - 40, 48);
  for (let i = 0; i < PATIENCE; i += 1) sprites.draw(ctx, 'heart', arena.width - 40 - i * 42, arena.height - 40, 36, { alpha: i < state.patience ? 1 : 0.2 });
  if (state.huff > 0) paintLabel(ctx, view, 'Ụm bò!', state.cowX + 120, state.cowY - 150, 50, theme.light);
  else if (state.score === 0) paintLabel(ctx, view, '↓', l.at.x, l.at.y + 70 + Math.sin(view.time * 5) * 8, 56, theme.light);
}
