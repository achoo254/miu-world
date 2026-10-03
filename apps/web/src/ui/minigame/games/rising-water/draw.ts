// Rising water's picture: a river valley; eight green hills, each with its house (a soaked house sits dark
// with a little family waving on top), the hill being raised puffing dust, ripples and a dashed line where a
// wave will reach, the water swelling up around the hill with Thủy Tinh's dragon riding it, and Sơn Tinh's
// mountain on the horizon.
import { paintLabel, paintSky } from '../../draw-kit';
import type { DrawView } from '../../types';
import { waterAt, type RisingState } from './logic';

export function drawRisingWater(ctx: CanvasRenderingContext2D, state: RisingState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { groundY, colW } = state;
  paintSky(ctx, view, groundY, 10);
  ctx.fillStyle = theme.stone;
  ctx.beginPath();
  ctx.moveTo(arena.width * 0.55, groundY);
  ctx.lineTo(arena.width * 0.75, groundY - state.maxHeight * 0.9);
  ctx.lineTo(arena.width * 0.95, groundY);
  ctx.fill();
  ctx.fillStyle = theme.water;
  ctx.fillRect(0, groundY, arena.width, arena.height - groundY);

  state.hills.forEach((hill, i) => {
    const cx = (i + 0.5) * colW;
    const top = groundY - hill.height;
    // Warning: where the coming wave will reach.
    for (const w of state.waves) {
      if (w.hill !== i || w.peakIn <= 0) continue;
      ctx.strokeStyle = w.level > hill.height ? theme.danger : theme.light;
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(cx - colW / 2 + 4, groundY - w.level);
      ctx.lineTo(cx + colW / 2 - 4, groundY - w.level);
      ctx.stroke();
      ctx.setLineDash([]);
      const r = 10 + ((view.time * 30) % 30);
      ctx.strokeStyle = theme.waterLight;
      ctx.beginPath();
      ctx.ellipse(cx, groundY + 20, r * 1.5, r * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The hill.
    ctx.fillStyle = hill.wet ? theme.stoneEdge : theme.leaf;
    ctx.beginPath();
    ctx.moveTo(cx - colW / 2 - 6, groundY + 10);
    ctx.quadraticCurveTo(cx - colW * 0.35, top, cx, top);
    ctx.quadraticCurveTo(cx + colW * 0.35, top, cx + colW / 2 + 6, groundY + 10);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = theme.ink;
    ctx.stroke();
    sprites.draw(ctx, 'house', cx, top - 22, Math.min(54, colW * 0.7), { alpha: hill.wet ? 0.5 : 1 });
    if (state.raising === i) {
      ctx.fillStyle = theme.light;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(cx - 20, groundY - 6, 12 + Math.sin(view.time * 20) * 4, 0, Math.PI * 2);
      ctx.arc(cx + 20, groundY - 6, 12 + Math.cos(view.time * 20) * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // The water swelling round it.
    const level = waterAt(state, i);
    if (level > 0) {
      ctx.fillStyle = theme.water;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(cx - colW / 2, groundY - level, colW, level);
      ctx.globalAlpha = 1;
      ctx.fillStyle = theme.waterLight;
      ctx.fillRect(cx - colW / 2, groundY - level - 6, colW, 8);
      sprites.draw(ctx, 'dragon-face', cx, groundY - level - 20, Math.min(50, colW * 0.6));
    }
  });
  const dry = state.hills.filter((h) => !h.wet).length;
  paintLabel(ctx, view, `Nhà khô: ${dry}/${state.hills.length}`, arena.width / 2, 140, 30);
  if (state.time < 3) paintLabel(ctx, view, 'Giữ ngón tay trên đồi để nâng đồi lên', arena.width / 2, 185, Math.min(30, arena.width / 24));
}
