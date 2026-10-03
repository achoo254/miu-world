// Scissor trace's picture: a craft table, a sheet of coloured paper with the shape drawn in dots (and a
// picture of what it is in the middle), the cut part as a bold line, the scissors at the cut (blades snipping
// as they go, turned along the line), a pulsing start ring, and the cut shape lifting off when done.
import { bob, paintLabel, roundRect } from '../../draw-kit';
import type { SpriteName } from '../../sprites';
import type { DrawView, Point } from '../../types';
import type { ScissorState, ShapeKind } from './logic';

const PICTURES: Record<ShapeKind, SpriteName> = { circle: 'sun', heart: 'heart', star: 'star', house: 'house', fish: 'fish', triangle: 'evergreen-tree' };
export const SCISSOR_SPRITES: readonly SpriteName[] = Object.values(PICTURES);

function tracePath(ctx: CanvasRenderingContext2D, path: readonly Point[], from: number, to: number): void {
  ctx.beginPath();
  for (let i = from; i <= to; i += 1) {
    const p = path[i];
    if (!p) continue;
    if (i === from) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
}

function paintScissors(ctx: CanvasRenderingContext2D, view: DrawView, at: Point, angle: number, open: number): void {
  const { theme } = view;
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(angle);
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.ink;
  // Two blades pointing forward along the line, two handle rings behind.
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.rotate(side * open);
    ctx.fillStyle = theme.light;
    ctx.beginPath();
    ctx.ellipse(18, 0, 30, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = theme.primary;
    ctx.beginPath();
    ctx.ellipse(-26, side * 14, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = theme.light;
    ctx.beginPath();
    ctx.ellipse(-26, side * 14, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = theme.stoneEdge;
  ctx.beginPath();
  ctx.arc(-4, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawScissorTrace(ctx: CanvasRenderingContext2D, state: ScissorState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { centre, radius, path } = state;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = theme.woodEdge;
  for (let y = 0; y < arena.height; y += 54) ctx.fillRect(0, y, arena.width, 5);
  ctx.globalAlpha = 1;

  // The sheet of paper.
  const sheet = radius * 1.25;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 4;
  roundRect(ctx, centre.x - sheet, centre.y - sheet, sheet * 2, sheet * 2, 12);
  ctx.fill();
  ctx.stroke();

  const done = state.doneAgo >= 0;
  const lift = done ? Math.min(1, state.doneAgo / 0.8) : 0;
  ctx.save();
  if (done && !view.reducedMotion) {
    ctx.translate(centre.x, centre.y - lift * 60);
    ctx.scale(1 + lift * 0.1, 1 + lift * 0.1);
    ctx.rotate(lift * 0.15);
    ctx.translate(-centre.x, -centre.y);
  }
  // The shape's face, tinted, with its picture.
  tracePath(ctx, path, 0, path.length - 1);
  ctx.closePath();
  ctx.fillStyle = done ? theme.star : theme.sky[1];
  ctx.globalAlpha = done ? 1 : 0.6;
  ctx.fill();
  ctx.globalAlpha = 1;
  if (done) {
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  sprites.draw(ctx, PICTURES[state.shape], centre.x, centre.y + (state.shape === 'heart' ? -10 : 0), radius * 0.7, { alpha: done ? 1 : 0.55 });
  ctx.restore();

  if (!done) {
    // Dots for the line still to cut, a bold line for what is cut.
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 5;
    ctx.setLineDash([3, 13]);
    ctx.lineCap = 'round';
    tracePath(ctx, path, state.progress, path.length - 1);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = theme.secondary;
    ctx.lineWidth = 7;
    tracePath(ctx, path, 0, state.progress);
    ctx.stroke();
    ctx.lineCap = 'butt';

    const at = path[state.progress];
    const ahead = path[Math.min(path.length - 1, state.progress + 3)];
    if (at && ahead) {
      if (!state.cutting) {
        // Where to put the finger: a pulsing ring round the scissors.
        const pulse = view.reducedMotion ? 0 : (Math.sin(view.time * 6) + 1) * 8;
        ctx.strokeStyle = state.lost ? theme.primary : theme.star;
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(at.x, at.y, 52 + pulse, 0, Math.PI * 2);
        ctx.stroke();
      }
      const angle = Math.atan2(ahead.y - at.y, ahead.x - at.x);
      const snip = view.reducedMotion ? 0.2 : 0.12 + Math.abs(Math.sin(state.progress * 0.5)) * 0.25;
      paintScissors(ctx, view, at, angle, snip);
    }
    const labelY = Math.min(arena.height - 40, centre.y + sheet + 40);
    if (state.lost) paintLabel(ctx, view, 'Đặt ngón tay lại vào kéo nhé', centre.x, labelY, 32);
    else if (state.progress === 0 && !state.cutting) paintLabel(ctx, view, 'Chạm kéo, đi theo đường chấm', centre.x, labelY + bob(view, 3, 3), 30);
  } else paintLabel(ctx, view, state.neat ? 'Cắt đẹp quá!' : 'Cắt xong rồi!', centre.x, centre.y - radius - 20, 46, theme.star);
}
