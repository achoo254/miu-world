// Fruit merge's picture: a market stall wall, the wooden crate (glass front) the fruit piles up in, a dashed
// line near its top that turns red and blinks while the pile is over it, the fruit to drop hanging from a
// little cloud that follows the finger (with a guide line down), the next fruit in a bubble, the chain of
// fruit from small to big along the side, and a burst where two fruit merge.
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { FRUITS, radiusOf, type FruitMergeState } from './logic';

/** Where the "next" bubble goes on a narrow screen: just under the HUD. */
const HUD_ROW = 150;

export function drawFruitMerge(ctx: CanvasRenderingContext2D, state: FruitMergeState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, arena.height, 5);
  const { left, right, top, bottom } = state;
  // The crate.
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(left, top, right - left, bottom - top);
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.wood;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 4;
  for (const [x, y, w, h] of [[left - 16, top, 16, bottom - top + 16], [right, top, 16, bottom - top + 16], [left - 16, bottom, right - left + 32, 16]] as const) {
    roundRect(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.stroke();
  }
  // The top line.
  const warn = state.overflow > 0;
  ctx.setLineDash([14, 12]);
  ctx.strokeStyle = warn ? theme.danger : theme.stoneEdge;
  ctx.globalAlpha = warn ? 0.6 + 0.4 * Math.sin(view.time * 20) : 0.6;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(left, state.lineY);
  ctx.lineTo(right, state.lineY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  for (const f of state.fruits) {
    const r = radiusOf(state, f.level);
    const pop = view.reducedMotion || f.age > 0.15 ? 1 : 0.7 + (f.age / 0.15) * 0.3;
    sprites.draw(ctx, FRUITS[f.level] ?? 'cherries', f.x, f.y, r * 2.15 * pop);
  }
  for (const m of state.merges) {
    ctx.strokeStyle = theme.star;
    ctx.globalAlpha = 1 - m.t / 0.4;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(m.x, m.y, radiusOf(state, m.level) + m.t * 120, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // The holder: a cloud with the fruit to drop, and a guide line.
  const r = radiusOf(state, state.current);
  const holderY = top - r - 8;
  ctx.strokeStyle = theme.light;
  ctx.globalAlpha = 0.6;
  ctx.setLineDash([8, 10]);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(state.holderX, holderY + r);
  ctx.lineTo(state.holderX, bottom);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  sprites.draw(ctx, 'cloud', state.holderX, holderY - r - 6, 90);
  sprites.draw(ctx, FRUITS[state.current] ?? 'cherries', state.holderX, holderY, r * 2.15, { alpha: state.cooldown > 0 ? 0.4 : 1 });

  // Next fruit and the chain from small to big.
  const nextX = Math.min(arena.width - 50, right + 60);
  const wide = arena.width - right > 110;
  const nextY = wide ? top + 30 : HUD_ROW;
  const nx = wide ? nextX : arena.width - 60;
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(nx, nextY, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  sprites.draw(ctx, FRUITS[state.next] ?? 'cherries', nx, nextY, 54);
  paintLabel(ctx, view, 'Tiếp', nx, nextY + 52, 22);
  if (wide) {
    FRUITS.forEach((fruit, i) => {
      const y = top + 110 + i * Math.min(52, (bottom - top - 110) / FRUITS.length);
      sprites.draw(ctx, fruit, nextX, y, 40, { alpha: i <= state.best ? 1 : 0.35 });
    });
  }
}
