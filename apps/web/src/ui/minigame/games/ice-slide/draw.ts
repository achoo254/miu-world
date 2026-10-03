// Ice slide's picture: a snowy bank around a frozen pond of shiny ice squares, rocks sitting on it, the
// penguin's little house glowing, and the penguin itself: it leans the way it slides, leaves streaks behind
// and squashes when it bumps. The reset button (a round arrow) sits beside or below the pond, and the moves
// so far against the fewest are written over it.
import { bob, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { IceState } from './logic';

function paintResetButton(ctx: CanvasRenderingContext2D, view: DrawView, state: IceState): void {
  const { theme } = view;
  const { x, y, r } = state.reset;
  const active = state.moves > 0;
  ctx.globalAlpha = active ? 1 : 0.5;
  ctx.fillStyle = theme.secondary;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // A circular arrow.
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y - 6, r * 0.42, -Math.PI * 0.15, Math.PI * 1.35);
  ctx.stroke();
  const tipA = -Math.PI * 0.15;
  const tx = x + Math.cos(tipA) * r * 0.42;
  const ty = y - 6 + Math.sin(tipA) * r * 0.42;
  ctx.fillStyle = theme.light;
  ctx.beginPath();
  ctx.moveTo(tx + 12, ty - 2);
  ctx.lineTo(tx - 10, ty - 12);
  ctx.lineTo(tx - 2, ty + 12);
  ctx.closePath();
  ctx.fill();
  ctx.lineCap = 'butt';
  paintLabel(ctx, view, 'Làm lại', x, y + r * 0.62, 20);
  ctx.globalAlpha = 1;
}

export function drawIceSlide(ctx: CanvasRenderingContext2D, state: IceState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { cell, left, top, cols, rows } = state;
  paintSky(ctx, view, arena.height, 5);
  // Snow bank under the pond.
  ctx.fillStyle = theme.light;
  roundRect(ctx, left - 26, top - 26, cols * cell + 52, rows * cell + 52, 34);
  ctx.fill();
  ctx.fillStyle = theme.water;
  roundRect(ctx, left - 8, top - 8, cols * cell + 16, rows * cell + 16, 20);
  ctx.fill();

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = left + col * cell;
      const y = top + row * cell;
      ctx.fillStyle = (row + col) % 2 === 0 ? theme.waterLight : theme.light;
      ctx.globalAlpha = (row + col) % 2 === 0 ? 0.9 : 0.75;
      roundRect(ctx, x + 2, y + 2, cell - 4, cell - 4, 8);
      ctx.fill();
      // A shine stroke on each square.
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = theme.light;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + cell * 0.2, y + cell * 0.35);
      ctx.lineTo(x + cell * 0.35, y + cell * 0.2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // The house: a glowing square, the house picture bobbing a little.
  const hx = left + (state.hut.col + 0.5) * cell;
  const hy = top + (state.hut.row + 0.5) * cell;
  ctx.globalAlpha = 0.45 + (view.reducedMotion ? 0 : 0.2 * Math.sin(view.time * 4));
  ctx.fillStyle = theme.star;
  roundRect(ctx, hx - cell / 2 + 3, hy - cell / 2 + 3, cell - 6, cell - 6, 10);
  ctx.fill();
  ctx.globalAlpha = 1;
  sprites.draw(ctx, 'house', hx, hy - 4 + bob(view, 2, 2), cell * 0.92);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (!state.rocks[row * cols + col]) continue;
      const x = left + (col + 0.5) * cell;
      const y = top + (row + 0.5) * cell;
      paintShadow(ctx, view, x, y + cell * 0.32, cell * 0.8);
      sprites.draw(ctx, 'rock', x, y, cell * 0.92);
    }
  }

  // The penguin.
  const x = left + (state.px + 0.5) * cell;
  const y = top + (state.py + 0.5) * cell;
  const sliding = state.slide !== null;
  if (sliding && !view.reducedMotion) {
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 5;
    ctx.globalAlpha = 0.8;
    const back = state.slide?.dir === 'left' ? 1 : state.slide?.dir === 'right' ? -1 : 0;
    const backY = state.slide?.dir === 'up' ? 1 : state.slide?.dir === 'down' ? -1 : 0;
    for (const off of [-0.2, 0, 0.2]) {
      ctx.beginPath();
      ctx.moveTo(x + back * cell * 0.3 + backY * off * cell, y + backY * cell * 0.3 + back * off * cell);
      ctx.lineTo(x + back * cell * 1.1 + backY * off * cell, y + backY * cell * 1.1 + back * off * cell);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  const bump = view.reducedMotion ? 0 : Math.max(0, 1 - state.bumped / 0.18);
  const lean = sliding && !view.reducedMotion ? (state.facing === 'left' ? -0.25 : state.facing === 'right' ? 0.25 : 0) : 0;
  if (state.home < 0 || state.home < 0.5) {
    const shrink = state.home >= 0 ? 1 - state.home / 0.5 : 1;
    paintShadow(ctx, view, x, y + cell * 0.36, cell * 0.7);
    sprites.draw(ctx, 'penguin', x, y - 4, cell * 0.95 * shrink, { flipX: state.facing === 'left', rotate: lean, squash: [1 + 0.2 * bump, 1 - 0.2 * bump] });
  }
  if (state.home >= 0) {
    sprites.draw(ctx, 'sparkles', hx + cell * 0.4, hy - cell * 0.5 - state.home * 30, cell * 0.6, { alpha: Math.max(0, 1 - state.home) });
    paintLabel(ctx, view, 'Về nhà rồi!', arena.width / 2, HUD_SAFE_TOP + 4 + cell * 0.1, 40, theme.star);
  }

  paintResetButton(ctx, view, state);
  const landscape = arena.width > arena.height;
  const x0 = landscape ? state.reset.x : left + (cols * cell - state.reset.r * 2) / 2;
  const y0 = landscape ? top + 40 : state.reset.y - 18;
  paintLabel(ctx, view, `Đã trượt: ${state.moves}`, x0, y0, 30);
  paintLabel(ctx, view, `Ít nhất: ${state.best}`, x0, y0 + 42, 30, theme.star);
}
