// Cờ gánh's picture: a board scratched on a wooden plank in the village yard, its lines and diagonals, red
// pieces (hers) and blue pieces (the computer's) as round stones, the chosen piece lifted with its moves
// marked, the last step traced, pieces flipping colour when carried or surrounded, and whose turn it is.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { count, links, N, type GanhState } from './logic';

export function drawCoGanh(ctx: CanvasRenderingContext2D, state: GanhState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, arena.width, arena.height);
  const { left, top, gap } = state;
  const size = gap * (N - 1);
  ctx.fillStyle = theme.wood;
  roundRect(ctx, left - gap * 0.45, top - gap * 0.45, size + gap * 0.9, size + gap * 0.9, 18);
  ctx.fill();
  const at = (i: number) => ({ x: left + (i % N) * gap, y: top + Math.floor(i / N) * gap });
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 4;
  for (let i = 0; i < N * N; i += 1) {
    for (const j of links(i)) {
      if (j < i) continue;
      const a = at(i);
      const b = at(j);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  if (state.lastMove && state.movedAgo < 1) {
    const [f, t] = state.lastMove;
    ctx.strokeStyle = theme.star;
    ctx.lineWidth = 8;
    ctx.globalAlpha = 1 - state.movedAgo;
    ctx.beginPath();
    ctx.moveTo(at(f).x, at(f).y);
    ctx.lineTo(at(t).x, at(t).y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (state.selected >= 0) {
    for (const j of links(state.selected)) {
      if (state.board[j] !== 0) continue;
      ctx.fillStyle = theme.leaf;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(at(j).x, at(j).y, gap * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  const r = gap * 0.32;
  state.board.forEach((v, i) => {
    if (v === 0) return;
    const p = at(i);
    const flip = state.flippedAgo[i] ?? 9;
    const squeeze = flip < 0.3 ? Math.abs(Math.cos((flip / 0.3) * Math.PI)) : 1;
    const lift = i === state.selected ? 8 : 0;
    ctx.fillStyle = theme.ink;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + r * 0.6, r, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = v === 1 ? theme.danger : theme.secondary;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - lift, r * squeeze, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = theme.light;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(p.x - r * 0.3 * squeeze, p.y - lift - r * 0.3, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (flip < 0.6) sprites.draw(ctx, 'sparkles', p.x + r, p.y - r, r * 1.4, { alpha: 1 - flip / 0.6 });
  });
  const mine = count(state.board, 1);
  const theirs = count(state.board, 2);
  const labelY = top + size + gap * 0.45 + 30;
  paintLabel(ctx, view, `Đỏ ${mine} – Xanh ${theirs}`, arena.width / 2, Math.min(arena.height - 24, labelY), 30, mine > theirs ? theme.star : theme.light);
  const turn = state.restartAgo >= 0 ? 'Ván mới nhé!' : state.turn === 1 ? (state.selected >= 0 ? 'Chạm chấm xanh để đi' : 'Lượt của bé: chạm quân đỏ') : 'Bạn đang nghĩ…';
  paintLabel(ctx, view, turn, arena.width / 2, top - gap * 0.45 - 26, 28, theme.light);
}
