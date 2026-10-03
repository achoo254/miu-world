// Basketball's picture: a school yard court (sky over a wall, the painted court), the backboard and hoop with
// its net (sliding once it moves), the ball flying in an arc and shrinking into the distance, a dotted arc
// while the child drags, and a word after each throw telling how to do better.
import { bob, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { aimOf, FLIGHT, POWER_HIGH, POWER_LOW, RIM_HALF, type BasketballState, type ShotResult } from './logic';

const WORDS: Record<ShotResult, string> = { in: 'Vào rổ!', short: 'Ném mạnh hơn!', long: 'Nhẹ tay hơn!', rim: 'Lệch một chút!' };

function paintHoop(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, part: 'back' | 'front'): void {
  const { theme } = view;
  if (part === 'back') {
    ctx.fillStyle = theme.stoneEdge;
    ctx.fillRect(x - 8, y - 40, 16, 50);
    ctx.fillStyle = theme.light;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 5;
    roundRect(ctx, x - 110, y - 120, 220, 130, 10);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = theme.danger;
    ctx.lineWidth = 6;
    ctx.strokeRect(x - 40, y - 64, 80, 56);
    ctx.strokeStyle = theme.danger;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.ellipse(x, y, RIM_HALF, 14, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    return;
  }
  // The net and the front of the rim.
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= 6; i += 1) {
    const top = x - RIM_HALF + (i * RIM_HALF * 2) / 6;
    const bottom = x - RIM_HALF * 0.6 + (i * RIM_HALF * 1.2) / 6;
    ctx.moveTo(top, y + 4);
    ctx.lineTo(bottom, y + 64);
  }
  for (const k of [0.35, 0.7]) {
    ctx.moveTo(x - RIM_HALF * (1 - 0.4 * k), y + 64 * k);
    ctx.lineTo(x + RIM_HALF * (1 - 0.4 * k), y + 64 * k);
  }
  ctx.stroke();
  ctx.strokeStyle = theme.danger;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.ellipse(x, y, RIM_HALF, 14, 0, 0, Math.PI);
  ctx.stroke();
}

/** A point on the throw's arc: from `from` up to (toX, top) with a hump, p from 0 to 1. */
function arcPoint(from: { x: number; y: number }, toX: number, toY: number, p: number): { x: number; y: number } {
  const hump = Math.sin(p * Math.PI) * 160;
  return { x: from.x + (toX - from.x) * p, y: from.y + (toY - from.y) * p - hump };
}

export function drawBasketball(ctx: CanvasRenderingContext2D, state: BasketballState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const wallY = state.hoopY + 70;
  paintSky(ctx, view, wallY, 6);
  ctx.fillStyle = theme.groundDeep;
  ctx.fillRect(0, wallY, arena.width, arena.height - wallY);
  // Court lines.
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 5;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.ellipse(arena.width / 2, wallY, Math.min(arena.width * 0.42, 300), (arena.height - wallY) * 0.55, 0, 0, Math.PI);
  ctx.stroke();
  ctx.strokeRect(arena.width / 2 - 90, wallY, 180, (arena.height - wallY) * 0.35);
  ctx.globalAlpha = 1;

  paintHoop(ctx, view, state.hoopX, state.hoopY, 'back');
  const shot = state.shot;
  let ballDrawn = false;
  const ballAt = (x: number, y: number, size: number, spin: number): void => {
    sprites.draw(ctx, 'basketball', x, y, size, { rotate: view.reducedMotion ? 0 : spin });
    ballDrawn = true;
  };
  if (shot) {
    const p = Math.min(1, shot.t / FLIGHT);
    const after = Math.max(0, shot.t - FLIGHT);
    const endY = shot.result === 'short' ? state.hoopY + 70 : shot.result === 'long' ? state.hoopY - 80 : state.hoopY - 10;
    const end = arcPoint(shot.from, shot.toX, endY, p);
    const size = 70 - 26 * p;
    if (after === 0) ballAt(end.x, end.y, size, shot.t * 10);
    else if (shot.result === 'in') ballAt(state.hoopX, state.hoopY + after * 220, 44, after * 6);
    else {
      // Bounces off: down and away from where it hit.
      const away = shot.result === 'rim' ? Math.sign(shot.toX - state.hoopX) || 1 : shot.result === 'long' ? (Math.sign(shot.toX - state.hoopX) || 1) * 0.5 : 0;
      ballAt(shot.toX + away * after * 360, endY - 120 * after + 900 * after * after, 44, after * 8);
    }
  }
  paintHoop(ctx, view, state.hoopX, state.hoopY, 'front');

  if (!shot) {
    paintShadow(ctx, view, state.ball.x, state.ball.y + 40, 70);
    if (!ballDrawn) ballAt(state.ball.x, state.ball.y + bob(view, 3, 3), 74, 0);
    // While dragging: the arc the ball would fly, golden when the strength is right.
    const drag = state.drag;
    if (drag && drag.to.y < drag.from.y - 10) {
      const aim = aimOf(state, drag.to.x - drag.from.x, drag.to.y - drag.from.y);
      const good = aim.power >= POWER_LOW && aim.power <= POWER_HIGH;
      const reach = Math.min(1.4, aim.power);
      ctx.fillStyle = good ? theme.star : theme.light;
      for (let i = 1; i <= 10; i += 1) {
        const p = (i / 10) * Math.min(1, reach);
        const pt = arcPoint(state.ball, aim.toX, state.hoopY + (1 - reach) * 200, p);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (state.shots === 0) paintLabel(ctx, view, 'Vuốt bóng lên phía rổ', arena.width / 2, state.ball.y - 90, 34);
  }

  if (state.lastResult && state.lastAgo < 1) paintLabel(ctx, view, WORDS[state.lastResult], arena.width / 2, wallY + 40, state.lastResult === 'in' ? 50 : 38, state.lastResult === 'in' ? theme.star : theme.light);
}
