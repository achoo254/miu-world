// Stack slide's picture: a sky that turns to night (with stars) as the tower climbs, the ground with the
// base, every floor a coloured block with a light top face, the slider gliding above, chips cut off falling
// and turning, a flash and "Chuẩn!" on an exact drop, and the slider tumbling when it misses the tower.
import { paintGround, paintLabel, paintSky, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { FLOOR_HEIGHT, type StackSlideState } from './logic';

function paintFloor(ctx: CanvasRenderingContext2D, view: DrawView, x: number, w: number, top: number, level: number, angle = 0): void {
  const { theme } = view;
  const colours = [theme.primary, theme.star, theme.leaf, theme.secondary, theme.water];
  ctx.save();
  ctx.translate(x, top + FLOOR_HEIGHT / 2);
  ctx.rotate(angle);
  ctx.fillStyle = colours[level % colours.length] ?? theme.primary;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, -w / 2, -FLOOR_HEIGHT / 2, w, FLOOR_HEIGHT, 8);
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = theme.light;
  roundRect(ctx, -w / 2 + 6, -FLOOR_HEIGHT / 2 + 5, Math.max(0, w - 12), 10, 5);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function drawStackSlide(ctx: CanvasRenderingContext2D, state: StackSlideState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, arena.height, 6);
  // Higher up, the sky darkens and stars come out.
  const night = Math.min(0.75, state.camera / 1800);
  if (night > 0) {
    ctx.globalAlpha = night;
    ctx.fillStyle = theme.ink;
    ctx.fillRect(0, 0, arena.width, arena.height);
    for (let i = 0; i < 12; i += 1) sprites.draw(ctx, 'star', (i * 173) % arena.width, ((i * 97 + state.camera * 0.2) % (arena.height - HUD_SAFE_TOP)) + HUD_SAFE_TOP, 22 + (i % 3) * 8);
    ctx.globalAlpha = 1;
  }
  paintGround(ctx, view, state.groundY + state.camera);
  const floorTop = (n: number): number => state.groundY - (n + 1) * FLOOR_HEIGHT + state.camera;
  state.floors.forEach((f, n) => {
    const top = floorTop(n);
    if (top > arena.height || top < -FLOOR_HEIGHT) return;
    paintFloor(ctx, view, f.x, f.w, top, n);
  });
  for (const c of state.chips) paintFloor(ctx, view, c.x, c.w, floorTop(c.level) + c.fall, c.level, view.reducedMotion ? 0 : c.spin);
  const level = state.floors.length;
  if (state.fallen < 0) paintFloor(ctx, view, state.slider.x, state.slider.w, floorTop(level), level);
  else paintFloor(ctx, view, state.slider.x + state.fallen * 80, state.slider.w, floorTop(level) + state.fallen * state.fallen * 900, level, state.fallen * 2);
  if (state.perfectAgo < 0.6) {
    const top = state.floors[state.floors.length - 1];
    if (top) {
      ctx.globalAlpha = 1 - state.perfectAgo / 0.6;
      ctx.strokeStyle = theme.light;
      ctx.lineWidth = 6;
      roundRect(ctx, top.x - top.w / 2 - 10 - state.perfectAgo * 40, floorTop(level - 1) - 10, top.w + 20 + state.perfectAgo * 80, FLOOR_HEIGHT + 20, 12);
      ctx.stroke();
      paintLabel(ctx, view, state.streak >= 3 ? 'Chuẩn! To ra!' : 'Chuẩn!', top.x, floorTop(level) - 50, 38, theme.star);
      ctx.globalAlpha = 1;
    }
  }
  if (state.score === 0 && state.fallen < 0) paintLabel(ctx, view, 'Chạm để thả!', arena.width / 2, HUD_SAFE_TOP + 50, 40, theme.star);
}
