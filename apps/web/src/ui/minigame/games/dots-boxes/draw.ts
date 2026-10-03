// Dots and boxes' picture: a chalkboard on the classroom wall with the dots; drawn lines in the child's colour
// or the owl's, closed boxes filled with the owner's picture (her character or the owl), the score of each side
// along the top, and a glow on the line just drawn. The owl sits by the board and bobs while it thinks.
import { bob, paintLabel, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { LINES, lineEnds, SIZE, type DotsState } from './logic';

export function drawDotsBoxes(ctx: CanvasRenderingContext2D, state: DotsState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 0, arena.width, arena.height);
  const { origin, gap } = state;
  const side = gap * SIZE;
  ctx.fillStyle = theme.ink;
  roundRect(ctx, origin.x - 34, origin.y - 34, side + 68, side + 68, 18);
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = theme.woodEdge;
  ctx.stroke();
  for (let b = 0; b < SIZE * SIZE; b += 1) {
    const owner = state.boxes[b];
    if (!owner) continue;
    const x = origin.x + (b % SIZE) * gap;
    const y = origin.y + Math.floor(b / SIZE) * gap;
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = owner === 'child' ? theme.star : theme.secondary;
    ctx.fillRect(x + 4, y + 4, gap - 8, gap - 8);
    ctx.globalAlpha = 1;
    sprites.draw(ctx, owner === 'child' ? view.player : 'owl', x + gap / 2, y + gap / 2, gap * 0.6);
  }
  for (let l = 0; l < LINES; l += 1) {
    const who = state.drawn[l];
    if (!who) continue;
    const [a, b] = lineEnds(state, l);
    ctx.strokeStyle = who === 'child' ? theme.star : theme.secondary;
    ctx.lineWidth = l === state.lastLine ? 12 : 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  ctx.fillStyle = theme.light;
  for (let r = 0; r <= SIZE; r += 1) {
    for (let c = 0; c <= SIZE; c += 1) {
      ctx.beginPath();
      ctx.arc(origin.x + c * gap, origin.y + r * gap, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const mine = state.boxes.filter((b) => b === 'child').length;
  const owl = state.boxes.filter((b) => b === 'owl').length;
  const y = HUD_SAFE_TOP + 26;
  sprites.draw(ctx, view.player, arena.width / 2 - 225, y, 54);
  paintLabel(ctx, view, String(mine), arena.width / 2 - 170, y, 40, theme.star);
  paintLabel(ctx, view, String(owl), arena.width / 2 + 170, y, 40, theme.secondary);
  sprites.draw(ctx, 'owl', arena.width / 2 + 225, y + (state.turn === 'owl' ? bob(view, 8, 6) : 0), 60);
  paintLabel(ctx, view, state.turn === 'child' ? 'Lượt của bạn' : 'Cú đang nghĩ…', arena.width / 2, y, 26);
  if (state.phase === 'over') paintLabel(ctx, view, mine * 2 > SIZE * SIZE ? 'Thắng rồi!' : 'Ván mới nhé!', arena.width / 2, origin.y + side / 2, 60, mine * 2 > SIZE * SIZE ? theme.star : theme.light);
}
