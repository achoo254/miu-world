// Water pistol's picture: a fair booth (striped awning, back wall, three wooden shelves), tin ducks and
// bullseyes gliding on the shelves (a soaked one tips backwards and drops), the water pistol at the bottom
// turning toward the aim, a wobbly jet of droplets to the aim ring, and the tank gauge beside the pistol.
import { bob, paintGround, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { SOAK_SECONDS, type WaterPistolState } from './logic';

function paintBooth(ctx: CanvasRenderingContext2D, view: DrawView, state: WaterPistolState): void {
  const { arena, theme } = view;
  const first = state.rows[0];
  const last = state.rows[state.rows.length - 1];
  if (!first || !last) return;
  const top = first.y - 90;
  const bottom = last.y + 70;
  // Back wall.
  ctx.fillStyle = theme.secondary;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(0, top, arena.width, bottom - top);
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = theme.light;
  for (let x = 0; x < arena.width; x += 60) ctx.fillRect(x, top, 30, bottom - top);
  ctx.globalAlpha = 1;
  // Awning: stripes with a scalloped edge.
  const awning = top - 20;
  for (let x = 0, i = 0; x < arena.width; x += 70, i += 1) {
    ctx.fillStyle = i % 2 === 0 ? theme.danger : theme.light;
    ctx.fillRect(x, 0, 70, awning + 30);
    ctx.beginPath();
    ctx.arc(x + 35, awning + 30, 35, 0, Math.PI);
    ctx.fill();
  }
  // Shelves.
  for (const row of state.rows) {
    ctx.fillStyle = theme.wood;
    roundRect(ctx, -10, row.y + 36, arena.width + 20, 18, 6);
    ctx.fill();
    ctx.fillStyle = theme.woodEdge;
    ctx.fillRect(-10, row.y + 50, arena.width + 20, 6);
  }
  // Counter in front.
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(0, bottom, arena.width, 22);
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, bottom, arena.width, 14);
}

export function drawWaterPistol(ctx: CanvasRenderingContext2D, state: WaterPistolState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const last = state.rows[state.rows.length - 1];
  const floor = (last?.y ?? arena.height / 2) + 92;
  paintSky(ctx, view, floor, 6);
  paintGround(ctx, view, floor);
  paintBooth(ctx, view, state);

  for (const t of state.targets) {
    const row = state.rows[t.row];
    if (!row) continue;
    const size = t.kind === 'bullseye' ? 78 : 86;
    if (t.down >= 0) {
      // Tips back and drops behind the shelf.
      const k = Math.min(1, t.down / 0.6);
      sprites.draw(ctx, t.kind, t.x, row.y + k * 50, size, { squash: [1, Math.max(0.05, 1 - k)], alpha: 1 - k * 0.6 });
      continue;
    }
    const soak = t.wet / SOAK_SECONDS;
    const shiver = soak > 0 && !view.reducedMotion ? Math.sin(view.time * 50) * 0.08 * soak : 0;
    sprites.draw(ctx, t.kind, t.x, row.y - 6 + bob(view, 6, 2, t.x * 0.05), size, { flipX: row.vx > 0 && t.kind === 'duck', rotate: shiver });
    if (soak > 0) sprites.draw(ctx, 'droplet', t.x + 30, row.y - 34, 26, { alpha: Math.min(1, soak) });
  }

  // The jet: droplets along a curve from the nozzle to the aim, a little wobbly.
  const nozzle = { x: state.gun.x + (state.aim.x - state.gun.x) * 0.12, y: state.gun.y - 50 };
  if (state.spraying) {
    const n = 14;
    for (let i = 0; i < n; i += 1) {
      const p = ((i + (view.reducedMotion ? 0 : (view.time * 6) % 1)) / n) % 1;
      const x = nozzle.x + (state.aim.x - nozzle.x) * p;
      const y = nozzle.y + (state.aim.y - nozzle.y) * p - Math.sin(p * Math.PI) * 40;
      ctx.fillStyle = theme.water;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(x, y, 9 + 5 * p, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = theme.waterLight;
      ctx.beginPath();
      ctx.arc(x - 2, y - 3, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    sprites.draw(ctx, 'droplet', state.aim.x + Math.sin(view.time * 20) * 6, state.aim.y + 10, 30);
  }
  // The aim ring.
  ctx.lineWidth = 6;
  ctx.strokeStyle = theme.ink;
  ctx.beginPath();
  ctx.arc(state.aim.x, state.aim.y, 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = state.spraying ? theme.star : theme.light;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(state.aim.x - 14, state.aim.y);
  ctx.lineTo(state.aim.x + 14, state.aim.y);
  ctx.moveTo(state.aim.x, state.aim.y - 14);
  ctx.lineTo(state.aim.x, state.aim.y + 14);
  ctx.stroke();

  // The pistol turns toward the aim (the picture points left; mirrored when aiming right).
  const angle = Math.atan2(state.aim.y - state.gun.y, state.aim.x - state.gun.x);
  const right = state.aim.x >= state.gun.x;
  const kick = state.spraying && !view.reducedMotion ? Math.sin(view.time * 40) * 2 : 0;
  sprites.draw(ctx, 'water-pistol', state.gun.x, state.gun.y + kick, 130, { flipX: right, rotate: right ? angle : angle + Math.PI });

  // Tank gauge.
  const gx = Math.min(arena.width - 40, state.gun.x + 120);
  const gh = 120;
  const gy = state.gun.y + 40 - gh;
  ctx.fillStyle = theme.ink;
  roundRect(ctx, gx - 20, gy - 6, 40, gh + 12, 16);
  ctx.fill();
  ctx.fillStyle = theme.light;
  roundRect(ctx, gx - 13, gy, 26, gh, 11);
  ctx.fill();
  ctx.fillStyle = state.dry ? theme.danger : theme.water;
  roundRect(ctx, gx - 13, gy + gh * (1 - state.water), 26, gh * state.water, 11);
  ctx.fill();
  sprites.draw(ctx, 'droplet', gx, gy - 26, 34);
  if (state.dry) paintLabel(ctx, view, 'Thả tay để lấy nước', arena.width / 2, state.gun.y - 120, 30);
  else if (state.score === 0 && state.time < 4) paintLabel(ctx, view, 'Giữ ngón tay để phun nước', arena.width / 2, state.gun.y - 120, 30);
}
