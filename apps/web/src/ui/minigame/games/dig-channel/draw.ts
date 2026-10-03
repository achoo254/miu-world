// Dig channel's picture: grass on top with the water pipe pouring, the soil in squares (dug ones dark and
// hollow), rocks, bubbling mud pits, water filling the dug channel with ripples, the duck's bathtub at the
// bottom (the duck splashing happily when the water arrives), and a mud splash when it goes wrong.
import { bob, paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { DigState } from './logic';

export function drawDigChannel(ctx: CanvasRenderingContext2D, state: DigState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { cell, cols, left, top } = state;
  ctx.fillStyle = theme.sky[1];
  ctx.fillRect(0, 0, arena.width, top);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, top - 24, arena.width, 24);
  ctx.fillStyle = theme.groundDeep;
  ctx.fillRect(0, top, arena.width, arena.height - top);

  // Pipe over the source.
  const sx = left + ((state.source % cols) + 0.5) * cell;
  ctx.fillStyle = theme.stoneEdge;
  roundRect(ctx, sx - cell * 0.3, top - 80, cell * 0.6, 60, 10);
  ctx.fill();
  sprites.draw(ctx, 'droplet', sx, top - 12 + bob(view, 8, 4), 30);

  state.cells.forEach((g, i) => {
    const x = left + (i % cols) * cell;
    const y = top + Math.floor(i / cols) * cell;
    const cx = x + cell / 2;
    const cy = y + cell / 2;
    if (g === 'soil') {
      ctx.fillStyle = theme.wood;
      roundRect(ctx, x + 2, y + 2, cell - 4, cell - 4, 8);
      ctx.fill();
      ctx.fillStyle = theme.woodEdge;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(cx - cell * 0.2, cy - cell * 0.15, 4, 0, Math.PI * 2);
      ctx.arc(cx + cell * 0.18, cy + cell * 0.2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (g === 'rock') {
      ctx.fillStyle = theme.wood;
      roundRect(ctx, x + 2, y + 2, cell - 4, cell - 4, 8);
      ctx.fill();
      sprites.draw(ctx, 'rock', cx, cy, cell * 0.9);
    } else if (g === 'mud') {
      ctx.fillStyle = theme.ink;
      ctx.globalAlpha = 0.55;
      roundRect(ctx, x + 4, y + 4, cell - 8, cell - 8, cell * 0.3);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = theme.woodEdge;
      const b = view.reducedMotion ? 0 : (view.time * 2 + i) % 1;
      ctx.beginPath();
      ctx.arc(cx, cy - b * cell * 0.2, 6 * (1 - b) + 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (g === 'tub') {
      ctx.fillStyle = theme.light;
      ctx.strokeStyle = theme.ink;
      ctx.lineWidth = 4;
      roundRect(ctx, x + 4, y + cell * 0.25, cell - 8, cell * 0.65, 14);
      ctx.fill();
      ctx.stroke();
      if (state.water[i]) {
        ctx.fillStyle = theme.water;
        roundRect(ctx, x + 10, y + cell * 0.3, cell - 20, cell * 0.4, 10);
        ctx.fill();
      }
      const happy = state.phase === 'win' && !view.reducedMotion ? Math.abs(Math.sin(view.time * 12)) * 10 : 0;
      sprites.draw(ctx, 'duck', cx, y + cell * 0.2 - happy, cell * 0.75);
    }
    if (state.water[i] && g !== 'tub' && g !== 'mud') {
      ctx.fillStyle = theme.water;
      ctx.fillRect(x, y, cell, cell);
      ctx.strokeStyle = theme.waterLight;
      ctx.lineWidth = 3;
      ctx.beginPath();
      const w = view.reducedMotion ? 0 : Math.sin(view.time * 6 + i) * 4;
      ctx.moveTo(x + 8, cy + w);
      ctx.quadraticCurveTo(cx, cy - 8 + w, x + cell - 8, cy + w);
      ctx.stroke();
    }
  });
  if (state.phase === 'fail' && state.spoilt >= 0) {
    const x = left + ((state.spoilt % cols) + 0.5) * cell;
    const y = top + (Math.floor(state.spoilt / cols) + 0.5) * cell;
    paintLabel(ctx, view, 'Ối, bùn!', x, y - cell * 0.6, 34, theme.light);
  }
}
