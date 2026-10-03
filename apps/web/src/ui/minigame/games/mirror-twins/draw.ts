// Mirror twins' picture: two small gardens of grass squares on either side of a tall mirror, grey rocks, a
// golden star in each garden, the child on the left and her twin (the same picture, flipped) on the right, a
// little shake when one walks into a rock, the "Lùi" button below, and both cheering on their stars.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { SIZE, type TwinsState } from './logic';

export function drawMirrorTwins(ctx: CanvasRenderingContext2D, state: TwinsState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.sky[1];
  ctx.fillRect(0, 0, arena.width, arena.height);
  const { cell, top } = state;
  const side = cell * SIZE;
  [state.leftX, state.rightX].forEach((x0, g) => {
    const garden = state.gardens[g as 0 | 1];
    ctx.fillStyle = theme.woodEdge;
    roundRect(ctx, x0 - 8, top - 8, side + 16, side + 16, 12);
    ctx.fill();
    for (let i = 0; i < SIZE * SIZE; i += 1) {
      const x = x0 + (i % SIZE) * cell;
      const y = top + Math.floor(i / SIZE) * cell;
      ctx.fillStyle = (i + Math.floor(i / SIZE)) % 2 === 0 ? theme.ground : theme.leaf;
      ctx.fillRect(x, y, cell, cell);
      if (garden.rocks.has(i)) sprites.draw(ctx, 'rock', x + cell / 2, y + cell / 2, cell * 0.85);
      if (garden.star === i) sprites.draw(ctx, 'star', x + cell / 2, y + cell / 2, cell * 0.7, { rotate: view.reducedMotion ? 0 : Math.sin(view.time * 2) * 0.15 });
    }
    const t = Math.min(1, state.movedAgo / 0.18);
    const a = state.from[g] ?? 0;
    const b = state.at[g] ?? 0;
    const shake = state.bumpAgo[g as 0 | 1] < 0.3 && !view.reducedMotion ? Math.sin(state.bumpAgo[g as 0 | 1] * 60) * 5 : 0;
    const px = x0 + ((a % SIZE) + ((b % SIZE) - (a % SIZE)) * t + 0.5) * cell + shake;
    const py = top + (Math.floor(a / SIZE) + (Math.floor(b / SIZE) - Math.floor(a / SIZE)) * t + 0.5) * cell;
    const cheer = state.doneAgo >= 0 && !view.reducedMotion ? Math.abs(Math.sin(state.doneAgo * 10)) * 12 : 0;
    sprites.draw(ctx, view.player, px, py - cheer, cell * 0.85, { flipX: g === 1, alpha: g === 1 ? 0.85 : 1 });
  });
  // The mirror between.
  const mx = state.leftX + side + (state.rightX - state.leftX - side) / 2;
  ctx.fillStyle = theme.waterLight;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 5;
  roundRect(ctx, mx - 10, top - 20, 20, side + 40, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.7;
  ctx.fillRect(mx - 4, top, 4, side * 0.4);
  ctx.globalAlpha = 1;

  paintLabel(ctx, view, state.doneAgo >= 0 ? 'Cả hai tới sao rồi!' : 'Vuốt để đi', arena.width / 2, top - 34, 30, state.doneAgo >= 0 ? theme.star : theme.light);
  const { undo } = state;
  ctx.globalAlpha = state.history.length > 0 ? 1 : 0.45;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(undo.x, undo.y, undo.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  paintLabel(ctx, view, 'Lùi', undo.x, undo.y + 2, 30, theme.primary);
  ctx.globalAlpha = 1;
}
