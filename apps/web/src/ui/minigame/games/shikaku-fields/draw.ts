// Shikaku fields' picture: a farm seen from above, the grid of paddy plots (water green), numbers on plots with
// a sheaf of rice, marked fields as coloured rectangles with a fence line and seedlings, the rectangle being
// dragged (green if it would fit, else plain), a red flash for a rejected one, and a glowing hint after a while.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { fitsField, HINT_AFTER, nextField, rectOf, type Rect, type ShikakuState } from './logic';

function rectBox(state: ShikakuState, r: Rect): [number, number, number, number] {
  const { x, y, cell } = state.grid;
  return [x + r.c0 * cell, y + r.r0 * cell, (r.c1 - r.c0 + 1) * cell, (r.r1 - r.r0 + 1) * cell];
}

export function drawShikaku(ctx: CanvasRenderingContext2D, state: ShikakuState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, arena.width, arena.height);
  const { x, y, cell } = state.grid;
  const side = cell * state.n;
  ctx.fillStyle = theme.groundDeep;
  roundRect(ctx, x - 12, y - 12, side + 24, side + 24, 16);
  ctx.fill();
  for (let r = 0; r < state.n; r += 1) {
    for (let c = 0; c < state.n; c += 1) {
      ctx.fillStyle = theme.waterLight;
      roundRect(ctx, x + c * cell + 3, y + r * cell + 3, cell - 6, cell - 6, 8);
      ctx.fill();
    }
  }
  const colours = [theme.leaf, theme.star, theme.secondary, theme.primary];
  state.placed.forEach((p, i) => {
    const [bx, by, bw, bh] = rectBox(state, p);
    ctx.fillStyle = colours[i % colours.length] ?? theme.leaf;
    ctx.globalAlpha = 0.8;
    roundRect(ctx, bx + 4, by + 4, bw - 8, bh - 8, 12);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 6;
    ctx.strokeStyle = theme.woodEdge;
    ctx.stroke();
    for (let r = p.r0; r <= p.r1; r += 1) for (let c = p.c0; c <= p.c1; c += 1) sprites.draw(ctx, 'seedling', x + (c + 0.75) * cell, y + (r + 0.75) * cell, cell * 0.3, { alpha: 0.8 });
  });
  if (state.idle >= HINT_AFTER && state.phase === 'play') {
    const hint = nextField(state);
    if (hint) {
      const [bx, by, bw, bh] = rectBox(state, hint);
      ctx.globalAlpha = 0.5 + 0.4 * Math.sin(view.time * 6);
      ctx.setLineDash([12, 8]);
      ctx.lineWidth = 6;
      ctx.strokeStyle = theme.star;
      roundRect(ctx, bx + 6, by + 6, bw - 12, bh - 12, 12);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  }
  if (state.drag) {
    const rect = rectOf(state.drag.start, state.drag.current);
    const [bx, by, bw, bh] = rectBox(state, rect);
    ctx.lineWidth = 7;
    ctx.strokeStyle = fitsField(state, rect) ? theme.leaf : theme.light;
    roundRect(ctx, bx + 3, by + 3, bw - 6, bh - 6, 12);
    ctx.stroke();
  }
  if (state.wrong && state.wrongAgo < 0.5) {
    const [bx, by, bw, bh] = rectBox(state, state.wrong);
    ctx.globalAlpha = 1 - state.wrongAgo / 0.5;
    ctx.fillStyle = theme.danger;
    roundRect(ctx, bx + 4, by + 4, bw - 8, bh - 8, 12);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  for (const k of state.clues) {
    const cx = x + (k.c + 0.5) * cell;
    const cy = y + (k.r + 0.5) * cell;
    sprites.draw(ctx, 'sheaf-of-rice', cx - cell * 0.22, cy - cell * 0.18, cell * 0.36, { alpha: 0.85 });
    paintLabel(ctx, view, String(k.n), cx + cell * 0.08, cy + cell * 0.05, Math.round(cell * 0.45));
  }
  if (state.phase === 'done') paintLabel(ctx, view, 'Chia xong!', arena.width / 2, y + side / 2, 60, theme.star);
}
