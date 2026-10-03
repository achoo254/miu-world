// Traffic cop's picture: a crossroads seen from above (grass corners with trees, the grey roads, lane dashes,
// zebra crossings, stop lines), the child on a little stand at one corner as the traffic warden, cars and
// buses as rounded shapes with windows and lights, a "Bíp!" bubble on a car that has waited too long, and a
// burst where two cars bump.
import { bob, paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { CAR_LENGTH, CAR_WIDTH, carPose, HONK, type Car, type TrafficState } from './logic';

function paintRoads(ctx: CanvasRenderingContext2D, view: DrawView, state: TrafficState): void {
  const { arena, theme, sprites } = view;
  const { centre, road } = state;
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, arena.width, arena.height);
  for (const [x, y] of [
    [0.12, 0.25],
    [0.88, 0.3],
    [0.1, 0.85],
    [0.9, 0.82],
  ] as const) {
    sprites.draw(ctx, 'deciduous-tree', arena.width * x, arena.height * y, 90);
  }
  ctx.fillStyle = theme.stoneEdge;
  ctx.fillRect(centre.x - road / 2, 0, road, arena.height);
  ctx.fillRect(0, centre.y - road / 2, arena.width, road);
  // Lane dashes outside the crossing.
  ctx.strokeStyle = theme.star;
  ctx.lineWidth = 5;
  ctx.setLineDash([26, 22]);
  ctx.beginPath();
  ctx.moveTo(centre.x, 0);
  ctx.lineTo(centre.x, centre.y - road / 2 - 40);
  ctx.moveTo(centre.x, centre.y + road / 2 + 40);
  ctx.lineTo(centre.x, arena.height);
  ctx.moveTo(0, centre.y);
  ctx.lineTo(centre.x - road / 2 - 40, centre.y);
  ctx.moveTo(centre.x + road / 2 + 40, centre.y);
  ctx.lineTo(arena.width, centre.y);
  ctx.stroke();
  ctx.setLineDash([]);
  // Zebra crossings and stop lines on each side of the middle.
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.85;
  const stripes = 6;
  for (let i = 0; i < stripes; i += 1) {
    const o = -road / 2 + (i + 0.25) * (road / stripes);
    const w = road / stripes / 2;
    ctx.fillRect(centre.x + o, centre.y - road / 2 - 36, w, 30);
    ctx.fillRect(centre.x + o, centre.y + road / 2 + 6, w, 30);
    ctx.fillRect(centre.x - road / 2 - 36, centre.y + o, 30, w);
    ctx.fillRect(centre.x + road / 2 + 6, centre.y + o, 30, w);
  }
  ctx.globalAlpha = 1;
}

function paintCar(ctx: CanvasRenderingContext2D, view: DrawView, state: TrafficState, car: Car): void {
  const { theme } = view;
  const pose = carPose(state, car);
  const length = CAR_LENGTH[car.kind];
  const colours = [theme.primary, theme.secondary, theme.leaf, theme.danger];
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.rotate(pose.angle);
  if (car.phase === 'crashed') ctx.globalAlpha = Math.max(0, 1 - car.crashedAgo / 1.2);
  // Shadow, body, roof windows, headlights; the front is at x = 0, the back at x = -length.
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha *= 0.25;
  roundRect(ctx, -length + 4, -CAR_WIDTH / 2 + 6, length, CAR_WIDTH, 14);
  ctx.fill();
  ctx.globalAlpha /= 0.25;
  ctx.fillStyle = car.kind === 'bus' ? theme.star : (colours[car.colour] ?? theme.primary);
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, -length, -CAR_WIDTH / 2, length, CAR_WIDTH, 14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.waterLight;
  if (car.kind === 'bus') {
    for (let x = -length + 14; x < -24; x += 22) {
      roundRect(ctx, x, -CAR_WIDTH / 2 + 6, 16, CAR_WIDTH - 12, 4);
      ctx.fill();
    }
  } else {
    roundRect(ctx, -30, -CAR_WIDTH / 2 + 7, 16, CAR_WIDTH - 14, 5);
    ctx.fill();
    roundRect(ctx, -length + 10, -CAR_WIDTH / 2 + 8, 12, CAR_WIDTH - 16, 5);
    ctx.fill();
  }
  ctx.fillStyle = theme.star;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(-5, side * (CAR_WIDTH / 2 - 8), 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  if (car.phase === 'waiting' && car.waited >= HONK) {
    const shake = view.reducedMotion ? 0 : Math.sin(car.waited * 40) * 3;
    paintLabel(ctx, view, 'Bíp!', pose.x + shake, pose.y - 44, 28, theme.light);
  }
  if (car.phase === 'crashed' && car.crashedAgo < 0.9) view.sprites.draw(ctx, 'collision', pose.x, pose.y, 70);
}

export function drawTrafficCop(ctx: CanvasRenderingContext2D, state: TrafficState, view: DrawView): void {
  const { theme, sprites } = view;
  const { centre, road } = state;
  paintRoads(ctx, view, state);
  // The warden's stand on the top-left corner of the crossing.
  const sx = centre.x - road / 2 - 70;
  const sy = centre.y - road / 2 - 70;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(sx, sy + 32, 44, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  sprites.draw(ctx, view.player, sx, sy + bob(view, 3, 3), 78);
  for (const car of state.cars) paintCar(ctx, view, state, car);
}
