// Gravity flip's picture: an icy cave scrolling past, a stone roof and floor with dark holes, grey rocks
// standing on the floor and icicles hanging from the roof, crystals glinting in the walls, and the child
// running along the floor or upside down along the roof (tumbling when she stumbles). Metres show below.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { RUNNER_HALF, UNITS_PER_METRE, type GravityState, type Obstacle } from './logic';

function paintObstacle(ctx: CanvasRenderingContext2D, view: DrawView, state: GravityState, o: Obstacle): void {
  const { theme, sprites } = view;
  const x = state.runnerX + (o.at - state.distance) * UNITS_PER_METRE;
  const w = o.length * UNITS_PER_METRE;
  if (x > view.arena.width + 40 || x + w < -40) return;
  if (o.kind === 'hole') {
    ctx.fillStyle = theme.ink;
    if (o.side === 'floor') ctx.fillRect(x, state.floorY, w, view.arena.height - state.floorY);
    else ctx.fillRect(x, 0, w, state.roofY);
    return;
  }
  if (o.kind === 'rock') {
    sprites.draw(ctx, 'rock', x + w / 2, state.floorY - o.reach / 2, Math.max(w, o.reach) * 1.15, { alpha: o.hit ? 0.6 : 1 });
    return;
  }
  // An icicle: a long pale triangle with a shine.
  ctx.globalAlpha = o.hit ? 0.6 : 1;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.waterLight;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 6, state.roofY);
  ctx.lineTo(x + w + 6, state.roofY);
  ctx.lineTo(x + w / 2, state.roofY + o.reach);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function drawGravityFlip(ctx: CanvasRenderingContext2D, state: GravityState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const scroll = state.distance * UNITS_PER_METRE;
  // Cave air.
  const air = ctx.createLinearGradient(0, state.roofY, 0, state.floorY);
  air.addColorStop(0, theme.water);
  air.addColorStop(0.5, theme.waterLight);
  air.addColorStop(1, theme.water);
  ctx.fillStyle = air;
  ctx.fillRect(0, 0, arena.width, arena.height);
  // Far crystals drifting slower.
  for (let i = 0; i < 8; i += 1) {
    const span = arena.width + 120;
    const x = ((((i * 211 - scroll * 0.3) % span) + span) % span) - 60;
    const y = state.roofY + 50 + ((i * 97) % Math.max(1, state.floorY - state.roofY - 100));
    sprites.draw(ctx, 'gem', x, y, 30, { alpha: 0.35 + 0.25 * Math.sin(view.time * 3 + i) });
  }
  // Roof and floor of stone, with seams scrolling.
  ctx.fillStyle = theme.stone;
  ctx.fillRect(0, 0, arena.width, state.roofY);
  ctx.fillRect(0, state.floorY, arena.width, arena.height - state.floorY);
  ctx.fillStyle = theme.stoneEdge;
  for (let x = -((scroll % 90) + 90) % 90; x < arena.width; x += 90) {
    ctx.fillRect(x, state.roofY - 14, 50, 8);
    ctx.fillRect(x + 40, state.floorY + 8, 50, 8);
  }
  ctx.fillStyle = theme.light;
  ctx.fillRect(0, state.roofY - 6, arena.width, 6);
  ctx.fillRect(0, state.floorY, arena.width, 6);

  for (const o of state.obstacles) paintObstacle(ctx, view, state, o);

  // The runner, upside down on the roof; tumbling right after a stumble.
  const tumble = state.stumbleAgo < 0.6 && !view.reducedMotion ? state.stumbleAgo * 10 : 0;
  const run = state.grounded && !view.reducedMotion ? Math.abs(Math.sin(state.time * 14)) * 4 : 0;
  ctx.save();
  ctx.translate(state.runnerX, state.y + (state.down === 'floor' ? -run : run));
  if (state.down === 'roof') ctx.scale(1, -1);
  ctx.rotate(tumble);
  sprites.draw(ctx, view.player, 0, -6, RUNNER_HALF * 2.6);
  ctx.restore();
  if (state.stumbleAgo < 0.8) sprites.draw(ctx, 'sparkles', state.runnerX + 24, state.y - 36, 36, { alpha: 1 - state.stumbleAgo / 0.8 });

  // Metres.
  const boxY = Math.min(arena.height - 50, state.floorY + 22);
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.35;
  roundRect(ctx, arena.width / 2 - 90, boxY - 4, 180, 44, 18);
  ctx.fill();
  ctx.globalAlpha = 1;
  paintLabel(ctx, view, `${state.score} m`, arena.width / 2, boxY + 18, 30, theme.star);
}
