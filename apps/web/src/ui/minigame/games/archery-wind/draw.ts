// Archery's picture: sky and hills, a straw target on a wooden stand (rings in the theme's colours with their
// points), the wind shown as a big arrow with leaves blowing across, the bow at the bottom drawn back while the
// finger is down, the aim ring, the arrow in flight curving with the wind, the arrows already stuck, the points
// of the last shot and the arrows left.
import { bob, paintGround, paintHills, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { DrawView, Point } from '../../types';
import { ARROWS, FLIGHT_SECONDS, RING_POINTS, type ArcheryState } from './logic';

function paintTarget(ctx: CanvasRenderingContext2D, view: DrawView, state: ArcheryState): void {
  const { theme } = view;
  const { target, radius } = state;
  // Stand legs.
  ctx.fillStyle = theme.woodEdge;
  ctx.save();
  ctx.translate(target.x, target.y);
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.rotate(side * 0.25);
    ctx.fillRect(-9, 0, 18, radius * 1.45);
    ctx.restore();
  }
  ctx.restore();
  paintShadow(ctx, view, target.x, target.y + radius * 1.38, radius * 1.4);
  const colours = [theme.star, theme.danger, theme.secondary, theme.ink, theme.light];
  ctx.fillStyle = theme.wood;
  ctx.beginPath();
  ctx.arc(target.x, target.y, radius + 12, 0, Math.PI * 2);
  ctx.fill();
  for (let i = RING_POINTS.length - 1; i >= 0; i -= 1) {
    ctx.fillStyle = colours[i] ?? theme.light;
    ctx.beginPath();
    ctx.arc(target.x, target.y, (radius * (i + 1)) / 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // Ring points written on the right side of each ring.
  RING_POINTS.forEach((points, i) => {
    if (i === 0) return;
    const r = (radius * (i + 0.5)) / 5;
    paintLabel(ctx, view, String(points), target.x + r, target.y, Math.max(16, radius / 9));
  });
  paintLabel(ctx, view, '10', target.x, target.y, Math.max(18, radius / 8), theme.light);
}

function paintWind(ctx: CanvasRenderingContext2D, view: DrawView, state: ArcheryState): void {
  const { arena, theme, sprites } = view;
  const side = arena.width > arena.height;
  const cx = side ? Math.min(arena.width - 100, state.target.x + state.radius + 150) : arena.width / 2;
  const cy = side ? state.target.y - 20 : state.target.y - state.radius - 55;
  const length = 30 + Math.abs(state.wind) * 90;
  const dir = Math.sign(state.wind) || 1;
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.25;
  roundRect(ctx, cx - 100, cy - 38, 200, 76, 30);
  ctx.fill();
  ctx.globalAlpha = 1;
  // The arrow: a thick shaft and a head, pointing where the wind blows.
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(dir, 1);
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-length / 2, -9);
  ctx.lineTo(length / 2 - 18, -9);
  ctx.lineTo(length / 2 - 18, -24);
  ctx.lineTo(length / 2 + 14, 0);
  ctx.lineTo(length / 2 - 18, 24);
  ctx.lineTo(length / 2 - 18, 9);
  ctx.lineTo(-length / 2, 9);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  ctx.restore();
  sprites.draw(ctx, 'leaf', cx - dir * (length / 2 + 26), cy + bob(view, 8, 4), 36, { rotate: view.time * 2 * dir });
  paintLabel(ctx, view, 'Gió', cx, cy - 52, 26);
  // Leaves blowing across the field at the wind's speed.
  const speed = state.wind * 260;
  const span = arena.width + 120;
  for (let i = 0; i < 5; i += 1) {
    const x = ((((i * 211 + view.time * speed) % span) + span) % span) - 60;
    const y = state.target.y + state.radius * (0.2 + i * 0.35) + Math.sin(view.time * 3 + i) * 20;
    sprites.draw(ctx, i % 2 === 0 ? 'leaf' : 'fallen-leaf', x, y, 30, { rotate: view.reducedMotion ? 0 : view.time * 3 + i, alpha: 0.85 });
  }
}

/** An arrow seen from behind, stuck in (or flying to) a point: a short shaft and the feathers. */
function paintArrowTail(ctx: CanvasRenderingContext2D, view: DrawView, at: Point, lean: number, scale: number): void {
  const { theme } = view;
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(lean);
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(-3 * scale, 0, 6 * scale, 40 * scale);
  ctx.fillStyle = theme.danger;
  ctx.beginPath();
  ctx.moveTo(0, 26 * scale);
  ctx.lineTo(-12 * scale, 44 * scale);
  ctx.lineTo(0, 40 * scale);
  ctx.lineTo(12 * scale, 44 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawArchery(ctx: CanvasRenderingContext2D, state: ArcheryState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const horizon = state.target.y + state.radius * 0.6;
  paintSky(ctx, view, horizon, 8);
  paintHills(ctx, view, horizon, 40, 80, theme.leaf);
  paintGround(ctx, view, horizon);
  paintTarget(ctx, view, state);
  paintWind(ctx, view, state);

  for (const a of state.stuck) paintArrowTail(ctx, view, a.to, (a.to.x - a.from.x) / 1400, 1);

  // Aim ring while drawing.
  if (state.drawFrom) {
    ctx.lineWidth = 7;
    ctx.strokeStyle = theme.ink;
    ctx.beginPath();
    ctx.arc(state.aim.x, state.aim.y, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = theme.light;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(state.aim.x - 32, state.aim.y);
    ctx.lineTo(state.aim.x + 32, state.aim.y);
    ctx.moveTo(state.aim.x, state.aim.y - 32);
    ctx.lineTo(state.aim.x, state.aim.y + 32);
    ctx.stroke();
  }

  // The arrow in flight: shrinking with distance, carried sideways more and more by the wind.
  const arrow = state.arrow;
  if (arrow) {
    const p = Math.min(1, arrow.t / FLIGHT_SECONDS);
    const x = arrow.from.x + (arrow.aim.x - arrow.from.x) * p + (arrow.to.x - arrow.aim.x) * p * p;
    const y = arrow.from.y + (arrow.to.y - arrow.from.y) * p - Math.sin(p * Math.PI) * 60;
    paintArrowTail(ctx, view, { x, y }, (arrow.to.x - arrow.from.x) / 1400, 1.8 - 0.8 * p);
  }

  // The bow at the bottom, pulled back while the finger is down.
  const pull = state.drawFrom ? Math.min(1, state.drawTime / 0.3) : 0;
  const bowAngle = Math.atan2(state.aim.y - state.bow.y, state.aim.x - state.bow.x) + Math.PI / 4;
  paintShadow(ctx, view, state.bow.x, state.bow.y + 70, 120);
  sprites.draw(ctx, view.player, state.bow.x - 90, state.bow.y + 20, 100);
  sprites.draw(ctx, 'bow-and-arrow', state.bow.x, state.bow.y + pull * 18, 130, { rotate: bowAngle, squash: [1 - 0.08 * pull, 1 + 0.08 * pull] });

  // Arrows left, bottom right; the points of the last arrow over the target.
  for (let i = 0; i < state.arrowsLeft; i += 1) paintArrowTail(ctx, view, { x: arena.width - 40 - i * 22, y: arena.height - 80 }, 0, 0.9);
  paintLabel(ctx, view, `${state.arrowsLeft}/${ARROWS}`, arena.width - 60, arena.height - 100, 26);
  if (state.lastPoints !== null && state.restAgo < 1.1) {
    const grow = view.reducedMotion ? 1 : Math.min(1, state.restAgo / 0.15);
    paintLabel(ctx, view, state.lastPoints > 0 ? `${state.lastPoints}!` : 'Gió thổi bay rồi!', state.target.x, state.target.y - state.radius * 0.55, 54 * grow, theme.star);
  }
  if (state.time < 4 && !state.drawFrom && state.arrowsLeft === ARROWS) paintLabel(ctx, view, 'Đặt ngón tay, kéo vòng ngắm, thả ra', arena.width / 2, state.bow.y - 120, 28);
}
