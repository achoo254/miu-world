// Đá cầu's picture: a schoolyard with a tree, the child under the cầu (a little hop on every kick), the cầu
// itself (a red base and a fan of feathers, base first as it falls), a soft ring showing where to tap, and
// the streak in big numbers.
import { bob, paintGround, paintHills, paintLabel, paintShadow, paintSky } from '../../draw-kit';
import type { DrawView } from '../../types';
import { kickable, KICK_RADIUS, type DaCauState, type Shuttle } from './logic';

function paintShuttle(ctx: CanvasRenderingContext2D, view: DrawView, s: Shuttle): void {
  const { theme, sprites } = view;
  // Feathers trail behind the base: up while it falls, down while it flies up.
  const tilt = Math.atan2(s.vx, Math.max(40, Math.abs(s.vy))) * (s.vy > 0 ? -1 : 1) + (s.vy > 0 ? 0 : Math.PI);
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(view.reducedMotion ? 0 : tilt);
  for (const a of [-0.4, 0, 0.4]) sprites.draw(ctx, 'feather', Math.sin(a) * 40, -50, 74, { rotate: a });
  ctx.fillStyle = theme.danger;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 30, 19, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawDaCau(ctx: CanvasRenderingContext2D, state: DaCauState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, state.groundY, 8);
  paintHills(ctx, view, state.groundY - 20, 40, 90, theme.leaf);
  sprites.draw(ctx, 'deciduous-tree', arena.width - 90, state.groundY - 120, 230);
  paintGround(ctx, view, state.groundY);

  // Where each falling cầu will be tapped: a pulsing ring, and its shadow on the ground.
  for (const s of state.shuttles) {
    if (s.waiting > 0) continue;
    const near = Math.max(0, 1 - (state.groundY - s.y) / 500);
    paintShadow(ctx, view, s.x, state.groundY + 8, 60 * (0.5 + near), 1 - near);
    if (kickable(s)) {
      ctx.globalAlpha = 0.35 + 0.2 * Math.sin(view.time * 8);
      ctx.strokeStyle = theme.light;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(s.x, s.y, KICK_RADIUS * 0.75, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // The child: hops on a kick.
  const hop = !view.reducedMotion && state.kickAgo < 0.25 ? Math.sin((state.kickAgo / 0.25) * Math.PI) * 30 : 0;
  paintShadow(ctx, view, state.kickerX, state.groundY + 10, 110, hop / 60);
  sprites.draw(ctx, view.player, state.kickerX, state.groundY - 50 - hop + bob(view, 5, 2), 120);

  for (const s of state.shuttles) {
    if (s.waiting > 0) {
      // Landed: lies on the ground, fading, until it is tossed back in.
      ctx.globalAlpha = Math.min(1, s.waiting);
      paintShuttle(ctx, view, { ...s, vy: 1, vx: 300 });
      ctx.globalAlpha = 1;
    } else paintShuttle(ctx, view, s);
    if (s.kicked < 0.3) sprites.draw(ctx, 'collision', s.x, s.y + 24, 70 * (1 - s.kicked / 0.3) + 20, { alpha: 1 - s.kicked / 0.3 });
  }

  if (state.streak >= 2) paintLabel(ctx, view, `${state.streak} liên tiếp!`, arena.width / 2, Math.min(state.apexY - 10, 175) + 10, 40, theme.star);
}
