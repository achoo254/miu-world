// Doodle climb's picture: a sky that darkens toward space as the frog climbs, height marks every 10 m up the
// side, leaf pads and fluffy clouds (a mushroom on the springy ones), the frog stretching as it rises and
// squashing as it lands.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { UNITS_PER_METRE, type DoodleState, type Pad } from './logic';

function paintPad(ctx: CanvasRenderingContext2D, view: DrawView, pad: Pad, y: number): void {
  const { sprites, theme } = view;
  const dip = view.reducedMotion ? 0 : Math.max(0, 1 - pad.bounced / 0.25) * 10;
  if (pad.kind === 'cloud') {
    sprites.draw(ctx, 'cloud', pad.x, y + 14 + dip, pad.half * 2.3);
  } else {
    ctx.fillStyle = theme.leaf;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(pad.x, y + 12 + dip, pad.half, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = theme.ground;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pad.x - pad.half * 0.7, y + 12 + dip);
    ctx.lineTo(pad.x + pad.half * 0.7, y + 12 + dip);
    ctx.stroke();
  }
  if (pad.spring) sprites.draw(ctx, 'mushroom', pad.x, y - 16 + dip, 50);
}

export function drawDoodleClimb(ctx: CanvasRenderingContext2D, state: DoodleState, view: DrawView): void {
  const { arena, sprites, theme } = view;
  const climbed = Math.max(0, state.baseY - state.cameraY - arena.height);
  // Sky: the theme's sky, deepening with height (blend toward the secondary colour).
  const gradient = ctx.createLinearGradient(0, 0, 0, arena.height);
  gradient.addColorStop(0, theme.sky[0]);
  gradient.addColorStop(1, theme.sky[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.globalAlpha = Math.min(0.45, climbed / 9000);
  ctx.fillStyle = theme.secondary;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.globalAlpha = 1;
  // Far clouds drifting slower than the pads (parallax).
  for (let i = 0; i < 6; i += 1) {
    const y = ((i * 260 - state.cameraY * 0.3) % (arena.height + 200)) - 100;
    const x = ((i * 397) % arena.width) + Math.sin(view.time * 0.3 + i) * 20;
    sprites.draw(ctx, 'cloud', x, y, 110, { alpha: 0.35 });
  }
  // The start meadow, while in view.
  const groundTop = state.baseY + 40 - state.cameraY;
  if (groundTop < arena.height) {
    ctx.fillStyle = theme.ground;
    ctx.fillRect(0, groundTop, arena.width, arena.height - groundTop);
  }
  // Height marks along the left edge every 10 m.
  const step = UNITS_PER_METRE * 10;
  const first = Math.ceil((state.cameraY - state.baseY) / step);
  for (let k = first; (state.baseY + k * step) - state.cameraY < arena.height; k += 1) {
    const y = state.baseY + k * step - state.cameraY;
    if (k >= 0 || y < 120) continue;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = theme.light;
    roundRect(ctx, 4, y - 4, 26, 8, 4);
    ctx.fill();
    ctx.globalAlpha = 1;
    paintLabel(ctx, view, `${-k * 10}m`, 58, y, 22);
  }

  for (const pad of state.pads) paintPad(ctx, view, pad, pad.y - state.cameraY);

  const y = state.frogY - state.cameraY;
  const rising = state.vy < 0;
  const squash: [number, number] = view.reducedMotion ? [1, 1] : rising ? [0.9, 1.12] : [1.06, 0.95];
  const blink = state.respawned < 1 && Math.floor(state.respawned * 10) % 2 === 0;
  const spin = !view.reducedMotion && state.sprung < 0.6 ? (state.sprung / 0.6) * Math.PI * 2 : 0;
  sprites.draw(ctx, 'frog', state.frogX, y - 36, 82, { squash, rotate: spin + (view.reducedMotion ? 0 : state.vx / 3000), alpha: blink ? 0.4 : 1, flipX: state.vx > 20 });
}
