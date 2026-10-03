// Odd one out's picture: a meadow stage with a round spot for each picture; the pictures dance (bob and
// sway, each on its own beat). The odd one found jumps up big and sparkles while the others bow out; a wrong
// pick shakes its head, and the whole set dims while it sulks.
import { bob, paintGround, paintHills, paintLabel, paintShadow, paintSky } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { OddState } from './logic';

export function drawOddOneOut(ctx: CanvasRenderingContext2D, state: OddState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const horizon = HUD_SAFE_TOP + 40;
  paintSky(ctx, view, horizon, 8);
  paintHills(ctx, view, horizon + 10, 40, 60, theme.leaf);
  paintGround(ctx, view, horizon + 10);
  paintLabel(ctx, view, 'Hình nào khác nhóm?', arena.width / 2, HUD_SAFE_TOP + 16, 30);

  const leaving = state.solved >= 0 ? Math.min(1, state.solved / 0.5) : 0;
  state.items.forEach((item, i) => {
    const s = state.size;
    // Each picture's own little dance.
    const hop = Math.abs(bob(view, 5 + (i % 3), 10, i * 1.7));
    const sway = view.reducedMotion ? 0 : Math.sin(view.time * 3 + i) * 0.12;
    const shake = item.shook < 0.5 && !view.reducedMotion ? Math.sin(item.shook * 45) * 12 * (1 - item.shook / 0.5) : 0;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = theme.light;
    ctx.beginPath();
    ctx.ellipse(item.x, item.y + s * 0.42, s * 0.55, s * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    paintShadow(ctx, view, item.x, item.y + s * 0.42, s * 0.7, hop / 40);
    let size = s;
    let alpha = state.sulk > 0 ? 0.6 : 1;
    let y = item.y - hop;
    if (leaving > 0) {
      if (item.odd) {
        size = s * (1 + 0.35 * Math.sin(Math.min(1, leaving) * Math.PI * 0.5));
        y -= leaving * 30;
      } else {
        alpha = 1 - leaving;
        size = s * (1 - 0.3 * leaving);
      }
    }
    sprites.draw(ctx, item.sprite, item.x + shake, y, size, { rotate: sway, alpha });
    if (item.odd && leaving > 0) sprites.draw(ctx, 'sparkles', item.x + s * 0.45, y - s * 0.45, s * 0.45, { alpha: 1 - leaving * 0.5 });
  });
}
