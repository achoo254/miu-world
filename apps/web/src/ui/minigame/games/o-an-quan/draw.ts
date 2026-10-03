// Ô ăn quan's picture: a schoolyard with the board chalked on a wooden plank (ten squares and the two half-
// round quan squares), pebbles in each square with their count, the big quan stones, the hand moving round
// with the pebbles it holds, a flash on a square just won, the two arrows under a picked square, and the
// winnings of the child and of the monkey she plays against.
import { bob, paintLabel, paintSky, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView, type Point } from '../../types';
import { ARROW_RADIUS, CHILD_SQUARES, isQuan, LEFT_QUAN, type Cell, type QuanState } from './logic';

function paintPebbles(ctx: CanvasRenderingContext2D, view: DrawView, cell: Cell, count: number, index: number): void {
  const { theme } = view;
  const shown = Math.min(count, 14);
  const r = Math.max(6, cell.w * 0.07);
  const colours = [theme.stone, theme.stoneEdge, theme.waterLight, theme.wood];
  for (let k = 0; k < shown; k += 1) {
    // A fixed scatter per square, so pebbles do not jump about between frames.
    const a = (k * 2.4 + index) % (Math.PI * 2);
    const d = Math.min(cell.w, cell.h) * (0.08 + 0.05 * (k % 5));
    ctx.fillStyle = colours[(k + index) % colours.length] ?? theme.stone;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cell.x + Math.cos(a) * d, cell.y + Math.sin(a) * d, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function paintArrow(ctx: CanvasRenderingContext2D, view: DrawView, at: Point, dir: -1 | 1): void {
  const { theme } = view;
  ctx.fillStyle = theme.star;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(at.x, at.y, ARROW_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.moveTo(at.x + dir * 22, at.y);
  ctx.lineTo(at.x - dir * 12, at.y - 20);
  ctx.lineTo(at.x - dir * 12, at.y + 20);
  ctx.closePath();
  ctx.fill();
}

export function drawOAnQuan(ctx: CanvasRenderingContext2D, state: QuanState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const c = state.cellSize;
  const left = state.cells[LEFT_QUAN];
  if (!left) return;
  const top = left.y - c;
  paintSky(ctx, view, top - 30, 6);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, top - 30, arena.width, arena.height);

  // The plank and the chalk lines.
  ctx.fillStyle = theme.wood;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 6;
  roundRect(ctx, left.x - c / 2 - 14, top - 14, c * 7 + 28, c * 2 + 28, 26);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 4;
  state.cells.forEach((cell, i) => {
    const picked = i === state.picked;
    const flashing = state.flash && state.flash.at === i && state.flash.ago < 0.6;
    if (picked || flashing) {
      ctx.fillStyle = flashing && state.flash?.side === 'computer' ? theme.danger : theme.star;
      ctx.globalAlpha = 0.45;
      roundRect(ctx, cell.x - cell.w / 2 + 4, cell.y - cell.h / 2 + 4, cell.w - 8, cell.h - 8, isQuan(i) ? cell.w / 2 : 12);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.beginPath();
    if (isQuan(i)) {
      const side = i === LEFT_QUAN ? 1 : -1;
      ctx.ellipse(cell.x + (side * cell.w) / 2, cell.y, cell.w, cell.h / 2, 0, side > 0 ? Math.PI / 2 : -Math.PI / 2, side > 0 ? Math.PI * 1.5 : Math.PI / 2);
    } else ctx.rect(cell.x - cell.w / 2, cell.y - cell.h / 2, cell.w, cell.h);
    ctx.stroke();
    const count = state.board.pebbles[i] ?? 0;
    paintPebbles(ctx, view, cell, count, i);
    if ((state.board.quan[i] ?? 0) > 0) sprites.draw(ctx, 'rock', cell.x + (i === LEFT_QUAN ? 8 : -8), cell.y - c * 0.35, c * 0.55);
    paintLabel(ctx, view, String(count), cell.x + cell.w / 2 - 18, cell.y + cell.h / 2 - 16, 22);
  });

  // The hand going round with what it holds.
  const sowing = state.sowing;
  if (sowing) {
    const cell = state.cells[sowing.at];
    if (cell) {
      const y = cell.y - c * 0.62 + bob(view, 8, 4);
      sprites.draw(ctx, sowing.side === 'child' ? view.player : 'monkey-face', cell.x, y, c * 0.55);
      if (sowing.hand > 0) paintLabel(ctx, view, String(sowing.hand), cell.x + c * 0.32, y - c * 0.2, 26, theme.star);
    }
  }
  if (state.arrows) {
    paintArrow(ctx, view, state.arrows.left, -1);
    paintArrow(ctx, view, state.arrows.right, 1);
  }

  // Winnings in the top corners: the child on the left, the monkey on the right.
  const scoreY = HUD_SAFE_TOP + 36;
  sprites.draw(ctx, view.player, 46, scoreY, 52);
  paintLabel(ctx, view, String(state.won.child), 100, scoreY, 34, theme.star);
  sprites.draw(ctx, 'monkey-face', arena.width - 100, scoreY, 52);
  paintLabel(ctx, view, String(state.won.computer), arena.width - 46, scoreY, 34);
  const belowY = Math.min(arena.height - 40, top + c * 2 + (state.arrows ? ARROW_RADIUS * 2 + 60 : 50));
  const words = state.overAgo >= 0 ? (state.won.child >= state.won.computer ? 'Bé thắng ván này!' : 'Ván mới nhé!') : state.turn === 'child' && !sowing ? (state.picked >= 0 ? 'Chọn chiều rải' : 'Chạm một ô của bé') : sowing?.side === 'computer' || state.turn === 'computer' ? 'Khỉ con đang đi...' : '';
  if (words) paintLabel(ctx, view, words, arena.width / 2, belowY, 32, state.overAgo >= 0 ? theme.star : theme.light);
  // The child's squares get a soft underline while it is her turn.
  if (state.turn === 'child' && !sowing && state.overAgo < 0) {
    ctx.fillStyle = theme.star;
    for (const i of CHILD_SQUARES) {
      const cell = state.cells[i];
      if (cell && (state.board.pebbles[i] ?? 0) > 0) ctx.fillRect(cell.x - cell.w * 0.3, cell.y + cell.h / 2 + 6, cell.w * 0.6, 5);
    }
  }
}
