// Fruit sudoku's picture: a garden bed of 16 soil squares in four plots (thick wooden edges between plots),
// fruit planted in them (the child's own pop in), a wrong fruit shaking in red with the fruit it clashes with
// flashing, and the basket row of the four fruit, the chosen one lifted with a gold ring.
import { paintGround, paintHills, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { SpriteName } from '../../sprites';
import type { DrawView } from '../../types';
import { SIDE, type SudokuState } from './logic';

export const FRUIT: readonly SpriteName[] = ['red-apple', 'banana', 'grapes', 'lemon'];

export function drawSudokuMini(ctx: CanvasRenderingContext2D, state: SudokuState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { left, top, cell } = state;
  const size = cell * SIDE;
  paintSky(ctx, view, top + 40, 6);
  paintHills(ctx, view, top + 40, 20, 80, theme.leaf);
  paintGround(ctx, view, top + 40);

  // The bed.
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, left - 14, top - 14, size + 28, size + 28, 20);
  ctx.fill();
  for (let i = 0; i < SIDE * SIDE; i += 1) {
    const x = left + (i % SIDE) * cell;
    const y = top + Math.floor(i / SIDE) * cell;
    const plot = (Math.floor(i / SIDE / 2) + Math.floor((i % SIDE) / 2)) % 2;
    ctx.fillStyle = plot === 0 ? theme.groundDeep : theme.ground;
    roundRect(ctx, x + 4, y + 4, cell - 8, cell - 8, 12);
    ctx.fill();
    const wrong = state.wrong;
    if (wrong && wrong.clash === i && Math.sin(wrong.ago * 24) > 0) {
      ctx.lineWidth = 7;
      ctx.strokeStyle = theme.danger;
      ctx.stroke();
    }
  }
  // Plot edges.
  ctx.strokeStyle = theme.wood;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(left + size / 2, top - 8);
  ctx.lineTo(left + size / 2, top + size + 8);
  ctx.moveTo(left - 8, top + size / 2);
  ctx.lineTo(left + size + 8, top + size / 2);
  ctx.stroke();

  const fruitSize = cell * 0.72;
  state.grid.forEach((fruit, i) => {
    if (fruit < 0) return;
    const ago = state.planted[i]?.ago ?? 99;
    const pop = ago < 0.3 && !view.reducedMotion ? 1 + 0.3 * Math.sin((ago / 0.3) * Math.PI) : 1;
    sprites.draw(ctx, FRUIT[fruit] ?? 'red-apple', left + ((i % SIDE) + 0.5) * cell, top + (Math.floor(i / SIDE) + 0.5) * cell, fruitSize * pop);
  });
  if (state.wrong) {
    const { cell: i, fruit, ago } = state.wrong;
    const shake = view.reducedMotion ? 0 : Math.sin(ago * 50) * 10 * Math.max(0, 1 - ago / 0.8);
    sprites.draw(ctx, FRUIT[fruit] ?? 'red-apple', left + ((i % SIDE) + 0.5) * cell + shake, top + (Math.floor(i / SIDE) + 0.5) * cell, fruitSize, { alpha: Math.max(0, 1 - ago / 0.8) });
  }
  if (state.doneAgo >= 0) {
    sprites.draw(ctx, 'sparkles', left + size / 2, top + size / 2 - state.doneAgo * 50, size * 0.8, { alpha: Math.max(0, 1 - state.doneAgo / 1.2) });
    paintLabel(ctx, view, 'Đủ hết rồi!', left + size / 2, top + size / 2, 52, theme.star);
  }

  // The basket row.
  for (const t of state.tray) {
    const chosen = state.held === t.fruit;
    const s = state.traySize;
    ctx.fillStyle = theme.ink;
    ctx.globalAlpha = 0.25;
    roundRect(ctx, t.x - s / 2 + 3, t.y - s / 2 + 7, s, s, 22);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.light;
    roundRect(ctx, t.x - s / 2, t.y - s / 2 - (chosen ? 8 : 0), s, s, 22);
    ctx.fill();
    ctx.lineWidth = chosen ? 9 : 5;
    ctx.strokeStyle = chosen ? theme.star : theme.ink;
    ctx.stroke();
    if (!(chosen && state.dragging)) sprites.draw(ctx, FRUIT[t.fruit] ?? 'red-apple', t.x, t.y - (chosen ? 8 : 0), s * 0.72);
    else sprites.draw(ctx, FRUIT[t.fruit] ?? 'red-apple', t.x, t.y, s * 0.72, { alpha: 0.35 });
  }
  if (state.dragging && state.carry && state.held >= 0) sprites.draw(ctx, FRUIT[state.held] ?? 'red-apple', state.carry.x, state.carry.y - 20, fruitSize * 1.1);
  if (state.boards === 1 && state.time < 4) {
    const landscape = arena.width > arena.height * 1.15;
    paintLabel(ctx, view, 'Mỗi hàng, cột, ô vuông: đủ 4 loại quả', arena.width / 2 - (landscape ? state.traySize / 2 : 0), top - 40, 28);
  }
}
