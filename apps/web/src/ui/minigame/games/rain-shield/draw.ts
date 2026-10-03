// Rain shield's picture: grass and sky that turns grey while it rains, a rain cloud across the top, the puppy
// on the grass, and the child's roof stroke as a thick wooden line (with an ink bar showing what is left while
// drawing). Raindrops are short slanted lines; drops on the roof run along it as beads. A dry puppy wags with a
// star; a wet one shakes off droplets.
import { paintGround, paintLabel, paintSky, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { DOG_RADIUS, strokeLength, type RainState } from './logic';

export function drawRainShield(ctx: CanvasRenderingContext2D, state: RainState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, state.groundY, 4);
  if (state.phase === 'rain') {
    ctx.fillStyle = theme.stoneEdge;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(0, 0, arena.width, state.groundY);
    ctx.globalAlpha = 1;
  }
  paintGround(ctx, view, state.groundY);
  for (let x = state.dog.x - 300; x <= state.dog.x + 300; x += 110) sprites.draw(ctx, 'cloud', x - (state.wind / 420) * (state.dog.y - state.cloudY), state.cloudY + 10, 150, { alpha: 0.95 });

  ctx.strokeStyle = theme.waterLight;
  ctx.lineWidth = 3;
  for (const d of state.drops) {
    if (d.on >= 0) {
      ctx.fillStyle = theme.water;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 4, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x - state.wind * 0.04, d.y - 16);
    ctx.stroke();
  }

  if (state.stroke.length > 1) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [colour, width] of [
      [theme.woodEdge, 16],
      [theme.wood, 10],
    ] as const) {
      ctx.strokeStyle = colour;
      ctx.lineWidth = width;
      ctx.beginPath();
      state.stroke.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  const shake = state.phase === 'wet' && !view.reducedMotion ? Math.sin(state.inPhase * 40) * 10 : 0;
  sprites.draw(ctx, 'dog-face', state.dog.x + shake, state.dog.y, DOG_RADIUS * 2.3);
  if (state.phase === 'dry') sprites.draw(ctx, 'star', state.dog.x + 40, state.dog.y - 60 - state.inPhase * 30, 50);
  if (state.phase === 'wet') for (let k = 0; k < 6; k += 1) sprites.draw(ctx, 'droplet', state.dog.x + Math.cos(k) * (40 + state.inPhase * 60), state.dog.y + Math.sin(k) * 30 - state.inPhase * 20, 20);

  if (state.phase === 'draw') {
    const left = 1 - strokeLength(state.stroke) / state.ink;
    const w = Math.min(260, arena.width * 0.5);
    ctx.fillStyle = theme.ink;
    ctx.globalAlpha = 0.25;
    roundRect(ctx, arena.width / 2 - w / 2, HUD_SAFE_TOP + 96, w, 14, 7);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.wood;
    roundRect(ctx, arena.width / 2 - w / 2, HUD_SAFE_TOP + 96, w * left, 14, 7);
    ctx.fill();
    paintLabel(ctx, view, 'Vẽ mái che cho cún!', arena.width / 2, HUD_SAFE_TOP + 132, 30);
  }
  if (state.phase === 'wet') paintLabel(ctx, view, 'Ướt rồi! Vẽ lại nhé', arena.width / 2, HUD_SAFE_TOP + 132, 30);
}
