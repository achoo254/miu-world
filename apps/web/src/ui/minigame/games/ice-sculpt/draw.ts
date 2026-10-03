// Ice sculpt's picture: a snowy yard, the ice block as pale blue cubes with the statue's shape shown in a
// slightly deeper blue, chips flying off as cubes are tapped away (a crack mark where the statue itself got
// chipped), a hammer at the last tap, and the beauty meter. A finished statue shines with sparkles.
import { paintGround, paintLabel, paintSky, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { IceSculptState } from './logic';
import { beauty, GRID } from './logic';

export function drawIceSculpt(ctx: CanvasRenderingContext2D, state: IceSculptState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { origin, cell } = state;
  const base = origin.y + cell * GRID;
  paintSky(ctx, view, base, 5);
  paintGround(ctx, view, base);
  // Plinth.
  ctx.fillStyle = theme.stone;
  roundRect(ctx, origin.x - 14, base, cell * GRID + 28, 22, 8);
  ctx.fill();

  let lastChip = -1;
  let lastAt = -9;
  for (let i = 0; i < GRID * GRID; i += 1) {
    const x = origin.x + (i % GRID) * cell;
    const y = origin.y + Math.floor(i / GRID) * cell;
    const at = state.chippedAt[i] ?? -1;
    if (at > lastAt) {
      lastAt = at;
      lastChip = i;
    }
    if (state.ice[i]) {
      ctx.fillStyle = state.inside[i] ? theme.water : theme.waterLight;
      ctx.strokeStyle = theme.light;
      ctx.lineWidth = 3;
      roundRect(ctx, x + 2, y + 2, cell - 4, cell - 4, 8);
      ctx.fill();
      ctx.stroke();
      if (state.nextIn > 0 && !view.reducedMotion) {
        ctx.globalAlpha = 0.4 + 0.3 * Math.sin(view.time * 8 + i);
        ctx.fillStyle = theme.light;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    } else if (state.inside[i]) {
      // A chip out of the statue: a dark crack.
      ctx.strokeStyle = theme.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + cell * 0.2, y + cell * 0.3);
      ctx.lineTo(x + cell * 0.5, y + cell * 0.55);
      ctx.lineTo(x + cell * 0.8, y + cell * 0.4);
      ctx.stroke();
    }
    if (at >= 0 && state.time - at < 0.4) {
      const t = (state.time - at) / 0.4;
      ctx.fillStyle = theme.light;
      ctx.globalAlpha = 1 - t;
      for (let k = 0; k < 4; k += 1) {
        ctx.fillRect(x + cell / 2 + Math.cos(k * 1.6) * t * cell, y + cell / 2 + Math.sin(k * 1.6) * t * cell + t * t * 40, 9, 9);
      }
      ctx.globalAlpha = 1;
    }
  }
  if (lastChip >= 0 && state.time - lastAt < 0.25) {
    sprites.draw(ctx, 'hammer', origin.x + ((lastChip % GRID) + 0.9) * cell, origin.y + (Math.floor(lastChip / GRID) + 0.1) * cell, 60, { rotate: -0.6 + (state.time - lastAt) * 4 });
  }
  const b = beauty(state);
  paintLabel(ctx, view, `Đẹp ${b}%`, arena.width / 2, HUD_SAFE_TOP + 22, 32, b >= 90 ? theme.star : theme.danger);
  if (state.nextIn > 0) {
    sprites.draw(ctx, state.lastGood ? 'sparkles' : 'snowflake', origin.x + cell * GRID, origin.y, 70);
    paintLabel(ctx, view, state.lastGood ? 'Tượng đẹp quá!' : 'Tượng bị mẻ rồi', arena.width / 2, base + 50, 36, theme.light);
  }
}
