// Sail with the wind's picture: the sea seen from above with drifting wave marks blown by the wind, a big wind
// arrow with a cloud blowing in its corner, the buoy (a red-and-white ring bobbing), and the boat: a hull, a
// mast and a sail along the boom that bellies out when it draws and flutters when it does not, a wake behind
// it as it goes, and a dashed line to the buoy.
import { bob, paintLabel } from '../../draw-kit';
import type { DrawView } from '../../types';
import { HUD_SAFE_TOP } from '../../types';
import type { SailState } from './logic';

export function drawSailWind(ctx: CanvasRenderingContext2D, state: SailState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.water;
  ctx.fillRect(0, 0, arena.width, arena.height);
  // Wave marks drifting with the wind.
  const wx = Math.cos(state.wind);
  const wy = Math.sin(state.wind);
  ctx.strokeStyle = theme.waterLight;
  ctx.lineWidth = 3;
  for (let i = 0; i < 22; i += 1) {
    const span = arena.width + arena.height;
    const x = ((((i * 197 + wx * view.time * 40) % span) + span) % span) - 50;
    const y = ((((i * 131 + wy * view.time * 40) % arena.height) + arena.height) % arena.height);
    ctx.beginPath();
    ctx.arc(x, y, 16, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }
  // Wind arrow.
  const ax = 90;
  const ay = HUD_SAFE_TOP + 50;
  sprites.draw(ctx, 'cloud', ax - wx * 50, ay - wy * 50, 60);
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(state.wind);
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-40, -10);
  ctx.lineTo(14, -10);
  ctx.lineTo(14, -24);
  ctx.lineTo(44, 0);
  ctx.lineTo(14, 24);
  ctx.lineTo(14, 10);
  ctx.lineTo(-40, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  paintLabel(ctx, view, 'Gió', ax, ay + 50, 24);

  // Buoy and the way to it.
  const { buoy, boat } = state;
  ctx.setLineDash([10, 12]);
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(boat.x, boat.y);
  ctx.lineTo(buoy.x, buoy.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  const by = buoy.y + bob(view, 3, 4);
  ctx.lineWidth = 12;
  for (let k = 0; k < 4; k += 1) {
    ctx.strokeStyle = k % 2 === 0 ? theme.danger : theme.light;
    ctx.beginPath();
    ctx.arc(buoy.x, by, 24, (k * Math.PI) / 2, ((k + 1) * Math.PI) / 2);
    ctx.stroke();
  }

  // Wake.
  ctx.strokeStyle = theme.light;
  ctx.globalAlpha = Math.min(0.7, boat.speed / 150);
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(boat.x - Math.cos(boat.heading) * 40, boat.y - Math.sin(boat.heading) * 40);
  ctx.lineTo(boat.x - Math.cos(boat.heading - 0.3) * 90, boat.y - Math.sin(boat.heading - 0.3) * 90);
  ctx.moveTo(boat.x - Math.cos(boat.heading) * 40, boat.y - Math.sin(boat.heading) * 40);
  ctx.lineTo(boat.x - Math.cos(boat.heading + 0.3) * 90, boat.y - Math.sin(boat.heading + 0.3) * 90);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Hull.
  ctx.save();
  ctx.translate(boat.x, boat.y);
  ctx.rotate(boat.heading);
  ctx.scale(1.3, 1.3);
  ctx.fillStyle = theme.wood;
  ctx.beginPath();
  ctx.moveTo(46, 0);
  ctx.quadraticCurveTo(10, -24, -38, -18);
  ctx.lineTo(-38, 18);
  ctx.quadraticCurveTo(10, 24, 46, 0);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.woodEdge;
  ctx.stroke();
  ctx.restore();
  // Sail along the boom, from the mast.
  const boomDir = boat.heading + Math.PI + state.boom;
  const mx = boat.x + Math.cos(boat.heading) * 10;
  const my = boat.y + Math.sin(boat.heading) * 10;
  const ex = mx + Math.cos(boomDir) * 90;
  const ey = my + Math.sin(boomDir) * 90;
  const belly = 12 + state.drive * 30 + (view.reducedMotion ? 0 : (1 - state.drive) * Math.sin(view.time * 30) * 6);
  // The belly bulges downwind.
  const side = Math.sign(Math.cos(state.wind) * -Math.sin(boomDir) + Math.sin(state.wind) * Math.cos(boomDir)) || 1;
  const cx = (mx + ex) / 2 - Math.sin(boomDir) * belly * side;
  const cy = (my + ey) / 2 + Math.cos(boomDir) * belly * side;
  ctx.fillStyle = state.drive > 0.4 ? theme.light : theme.stone;
  ctx.beginPath();
  ctx.moveTo(mx, my);
  ctx.quadraticCurveTo(cx, cy, ex, ey);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = theme.woodEdge;
  ctx.beginPath();
  ctx.moveTo(mx, my);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.arc(mx, my, 7, 0, Math.PI * 2);
  ctx.fill();

  if (state.drive < 0.15 && state.time > 1) paintLabel(ctx, view, 'Buồm chưa căng gió!', arena.width / 2, arena.height - 40, 30, theme.light);
  if (state.reachedAgo < 0.8) paintLabel(ctx, view, 'Tới phao!', arena.width / 2, HUD_SAFE_TOP + 40, 40, theme.star);
}
