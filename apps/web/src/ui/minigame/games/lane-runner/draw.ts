// Lane runner's picture: sky and hills at the horizon, a three-lane dirt path narrowing into the distance
// with dashed lane lines and cross stripes rolling toward the child, trees along both sides, stars, logs,
// crates and rocks growing as they come near, and the child running at the bottom (hopping on a jump,
// blinking after a bump).
import { bob, paintHills, paintShadow, paintSky } from '../../draw-kit';
import type { SpriteName } from '../../sprites';
import type { DrawView } from '../../types';
import { JUMP_SECONDS, laneOffset, LANES, scaleAt, screenY, type ItemKind, type LaneRunnerState } from './logic';

const PICTURE: Record<ItemKind, SpriteName> = { star: 'star', log: 'wood', crate: 'package', rock: 'rock' };
const SIZE: Record<ItemKind, number> = { star: 84, log: 150, crate: 130, rock: 130 };

function paintPath(ctx: CanvasRenderingContext2D, view: DrawView, state: LaneRunnerState): void {
  const { arena, theme } = view;
  const far = scaleAt(1);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, state.horizonY, arena.width, arena.height - state.horizonY);
  // The path: a trapezoid from the horizon to below the feet.
  const bottom = arena.height;
  const bottomScale = 1 + ((bottom - state.feetY) / (state.feetY - state.horizonY)) * (1 - far);
  ctx.fillStyle = theme.groundDeep;
  ctx.beginPath();
  ctx.moveTo(state.centreX - state.halfWidth * far, state.horizonY);
  ctx.lineTo(state.centreX + state.halfWidth * far, state.horizonY);
  ctx.lineTo(state.centreX + state.halfWidth * bottomScale, bottom);
  ctx.lineTo(state.centreX - state.halfWidth * bottomScale, bottom);
  ctx.closePath();
  ctx.fill();
  // Cross stripes rolling toward the child.
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.1;
  const gap = 0.12;
  for (let z = 1 - (state.travelled % gap); z > -0.05; z -= gap) {
    const y1 = screenY(state, z);
    const y2 = screenY(state, z - gap / 2);
    const w1 = state.halfWidth * scaleAt(z);
    const w2 = state.halfWidth * scaleAt(z - gap / 2);
    ctx.beginPath();
    ctx.moveTo(state.centreX - w1, y1);
    ctx.lineTo(state.centreX + w1, y1);
    ctx.lineTo(state.centreX + w2, y2);
    ctx.lineTo(state.centreX - w2, y2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Lane lines.
  ctx.strokeStyle = theme.light;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 5;
  ctx.setLineDash([26, 22]);
  ctx.lineDashOffset = view.reducedMotion ? 0 : -state.travelled * 900;
  for (let l = 1; l < LANES; l += 1) {
    const off = (l - LANES / 2) * ((state.halfWidth * 2) / LANES);
    ctx.beginPath();
    ctx.moveTo(state.centreX + off * far, state.horizonY);
    ctx.lineTo(state.centreX + off * bottomScale, bottom);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

export function drawLaneRunner(ctx: CanvasRenderingContext2D, state: LaneRunnerState, view: DrawView): void {
  const { theme, sprites } = view;
  paintSky(ctx, view, state.horizonY, 6);
  paintHills(ctx, view, state.horizonY + 4, state.travelled * 40, 60, theme.leaf);
  paintPath(ctx, view, state);

  // Trees along both sides, rolling by (far ones first).
  const gap = 0.22;
  for (let z = 1 - (state.travelled % gap); z > -0.1; z -= gap) {
    const s = scaleAt(z);
    const y = screenY(state, z);
    for (const side of [-1, 1]) sprites.draw(ctx, 'evergreen-tree', state.centreX + side * (state.halfWidth + 110) * s, y - 70 * s, 170 * s);
  }

  // Items, far to near.
  const items = [...state.items].sort((a, b) => b.z - a.z);
  for (const item of items) {
    if (item.z > 1.02) continue;
    const s = scaleAt(Math.max(0, item.z));
    const x = state.centreX + laneOffset(state, item.lane) * s;
    const y = screenY(state, item.z);
    const size = SIZE[item.kind] * s;
    if (item.hit >= 0) {
      if (item.kind === 'star') sprites.draw(ctx, 'star', x, y - 60 - item.hit * 200, size, { alpha: 1 - item.hit / 0.4 });
      else sprites.draw(ctx, PICTURE[item.kind], x, y - size * 0.4, size, { alpha: 1 - item.hit / 0.4 });
      continue;
    }
    paintShadow(ctx, view, x, y, size * 0.9);
    const lift = item.kind === 'star' ? 50 * s + bob(view, 5, 6 * s, item.lane) : size * 0.4;
    sprites.draw(ctx, PICTURE[item.kind], x, y - lift, size, item.kind === 'log' ? { squash: [1.1, 0.7] } : undefined);
  }

  // The child.
  const x = state.centreX + ((state.laneX - 1) * state.halfWidth * 2) / LANES;
  const hop = state.jump >= 0 ? Math.sin((state.jump / JUMP_SECONDS) * Math.PI) * 110 : 0;
  const run = view.reducedMotion || state.jump >= 0 ? 0 : Math.abs(Math.sin(view.time * 12)) * 8;
  const blink = state.invulnerable > 0 && Math.floor(state.invulnerable * 10) % 2 === 0;
  paintShadow(ctx, view, x, state.feetY + 6, 100, hop / 160);
  sprites.draw(ctx, view.player, x, state.feetY - 55 - hop - run, 120, { alpha: blink ? 0.4 : 1 });
}
