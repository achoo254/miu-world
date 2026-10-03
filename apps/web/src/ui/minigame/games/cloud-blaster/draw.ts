// Cloud blaster's picture: a hot sky, dry grey-ish clouds (with a little bar of how soaked they are), rain
// clouds pouring onto the field as they float up, the rice field turning green where rain fell, the drops in
// flight, and the child with the hose at the bottom (a spray fan while spraying).
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { CLOUD_R, cloudX, HITS, type CloudState } from './logic';

export function drawCloudBlaster(ctx: CanvasRenderingContext2D, state: CloudState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, state.fieldY, 0);
  sprites.draw(ctx, 'sun', arena.width - 60, 150, 80);
  // The field.
  ctx.fillStyle = theme.groundDeep;
  ctx.fillRect(0, state.fieldY, arena.width, arena.height - state.fieldY);
  const green = Math.min(1, state.score / 30);
  for (let x = 30; x < arena.width; x += 70) sprites.draw(ctx, 'sheaf-of-rice', x, state.fieldY + 26, 50, { alpha: 0.4 + 0.6 * green });
  for (const c of state.clouds) {
    const x = cloudX(state, c);
    if (c.raining >= 0) {
      if (c.raining > 10) continue;
      sprites.draw(ctx, 'cloud-with-rain', x, c.y, CLOUD_R * 2.2, { alpha: Math.max(0, 1 - c.raining / 1.4) });
      ctx.strokeStyle = theme.waterLight;
      ctx.lineWidth = 3;
      ctx.globalAlpha = Math.max(0, 0.8 - c.raining / 1.4);
      for (let k = -2; k <= 2; k += 1) {
        ctx.beginPath();
        ctx.moveTo(x + k * 16, c.y + CLOUD_R);
        ctx.lineTo(x + k * 16 - 6, state.fieldY);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      continue;
    }
    sprites.draw(ctx, 'cloud', x, c.y, CLOUD_R * 2.2, { alpha: 0.75 });
    ctx.fillStyle = theme.light;
    roundRect(ctx, x - 30, c.y + CLOUD_R * 0.55, 60, 10, 5);
    ctx.fill();
    ctx.fillStyle = theme.water;
    roundRect(ctx, x - 30, c.y + CLOUD_R * 0.55, (60 * c.wet) / HITS, 10, 5);
    ctx.fill();
  }
  ctx.fillStyle = theme.water;
  for (const d of state.drops) {
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, 6, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // The hose.
  if (state.spraying) {
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = theme.waterLight;
    ctx.beginPath();
    ctx.moveTo(state.hoseX, state.hoseY - 40);
    ctx.lineTo(state.hoseX - 18, state.hoseY - 110);
    ctx.lineTo(state.hoseX + 18, state.hoseY - 110);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = theme.primary;
  roundRect(ctx, state.hoseX - 12, state.hoseY - 50, 24, 50, 8);
  ctx.fill();
  sprites.draw(ctx, view.player, state.hoseX + 50, state.hoseY, 80);
  if (state.hitAgo < 0.6) paintLabel(ctx, view, 'Ôi, mây khô!', arena.width / 2, state.fieldY - 30, 36, theme.danger);
}
