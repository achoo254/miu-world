// Bumper cars' picture: a fair at night-ish (striped tent edge, bulbs round the rim), the round floor with a
// metal grid, the cars (the child's racing car with her face, the others in their colours), sparks on a bump
// and a car tumbling off the edge before it rolls back on.
import { paintLabel, paintSky } from '../../draw-kit';
import type { DrawView } from '../../types';
import { CAR_R, type BumperState } from './logic';

export function drawBumperCars(ctx: CanvasRenderingContext2D, state: BumperState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, arena.height, 3);
  const { centre, radius } = state;
  ctx.fillStyle = theme.danger;
  ctx.beginPath();
  ctx.arc(centre.x, centre.y, radius + 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.stone;
  ctx.beginPath();
  ctx.arc(centre.x, centre.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = theme.stoneEdge;
  ctx.lineWidth = 2;
  for (let k = -radius; k <= radius; k += 50) {
    const h = Math.sqrt(Math.max(0, radius * radius - k * k));
    ctx.beginPath();
    ctx.moveTo(centre.x + k, centre.y - h);
    ctx.lineTo(centre.x + k, centre.y + h);
    ctx.moveTo(centre.x - h, centre.y + k);
    ctx.lineTo(centre.x + h, centre.y + k);
    ctx.stroke();
  }
  for (let i = 0; i < 24; i += 1) {
    const a = (i / 24) * Math.PI * 2;
    ctx.fillStyle = (i + Math.floor(view.time * 4)) % 2 === 0 ? theme.star : theme.light;
    ctx.beginPath();
    ctx.arc(centre.x + Math.cos(a) * (radius + 11), centre.y + Math.sin(a) * (radius + 11), 6, 0, Math.PI * 2);
    ctx.fill();
  }
  const colours = [theme.primary, theme.secondary, theme.leaf, theme.water];
  for (const car of state.cars) {
    let alpha = 1;
    let scale = 1;
    if (car.out >= 0) {
      if (car.out > 0.6) continue;
      alpha = 1 - car.out / 0.6;
      scale = 1 - car.out * 0.6;
    }
    const heading = Math.atan2(car.vy, car.vx);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colours[car.colour] ?? theme.primary;
    ctx.beginPath();
    ctx.arc(car.x, car.y, CAR_R * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = theme.ink;
    ctx.stroke();
    sprites.draw(ctx, car.mine ? 'racing-car' : 'automobile', car.x, car.y, CAR_R * 1.6 * scale, { flipX: Math.cos(heading) < 0 });
    if (car.mine) sprites.draw(ctx, view.player, car.x, car.y - CAR_R * 0.9, CAR_R * 1.1 * scale);
    ctx.globalAlpha = 1;
    if (!car.mine && state.time - car.bumpedAt < 0.3) sprites.draw(ctx, 'collision', car.x, car.y - CAR_R, 40);
  }
  const me = state.cars.find((c) => c.mine);
  if (me && me.out >= 0) paintLabel(ctx, view, 'Vào lại nào!', centre.x, centre.y, 40);
}
