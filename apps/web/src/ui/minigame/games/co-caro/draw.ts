// Cờ caro's picture: a classroom desk with a squared paper board, the child's pieces (her own character)
// and Cún's (a puppy), a ring on the last move, the winning four joined by a gold line, and a turn badge:
// the child and Cún side by side, the one whose turn it is lit (Cún shows thinking dots), and a word when a
// game ends.
import { bob, paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { CHILD, CUN, N, type CoCaroState } from './logic';

function paintBadge(ctx: CanvasRenderingContext2D, view: DrawView, state: CoCaroState): void {
  const { theme, sprites, arena } = view;
  const wide = arena.width >= arena.height;
  const gap = 130;
  const spots = [
    { who: CHILD, x: state.badge.x - (wide ? 0 : gap / 2), y: state.badge.y - (wide ? gap / 2 : 0) },
    { who: CUN, x: state.badge.x + (wide ? 0 : gap / 2), y: state.badge.y + (wide ? gap / 2 : 0) },
  ];
  for (const spot of spots) {
    const active = (spot.who === CHILD && state.turn === 'child') || (spot.who === CUN && state.turn === 'cun') || (state.turn === 'over' && state.winner === spot.who);
    ctx.fillStyle = active ? theme.star : theme.light;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 5;
    ctx.globalAlpha = active ? 1 : 0.7;
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;
    sprites.draw(ctx, spot.who === CHILD ? view.player : 'dog-face', spot.x, spot.y + (active ? bob(view, 5, 4) : 0), 78);
    if (spot.who === CUN && state.turn === 'cun') {
      for (let k = 0; k < 3; k += 1) {
        ctx.globalAlpha = 0.4 + 0.6 * Math.max(0, Math.sin(view.time * 6 - k));
        ctx.fillStyle = theme.ink;
        ctx.beginPath();
        ctx.arc(spot.x - 16 + k * 16, spot.y + 66, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
  paintLabel(ctx, view, `Thắng ${state.score}`, spots[0]?.x ?? 0, (spots[0]?.y ?? 0) - 74, 26, theme.star);
}

export function drawCoCaro(ctx: CanvasRenderingContext2D, state: CoCaroState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = theme.woodEdge;
  for (let y = 0; y < arena.height; y += 70) ctx.fillRect(0, y, arena.width, 4);
  ctx.globalAlpha = 1;
  const size = state.cell * N;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 6;
  roundRect(ctx, state.left - 12, state.top - 12, size + 24, size + 24, 18);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = theme.secondary;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let k = 0; k <= N; k += 1) {
    ctx.moveTo(state.left + k * state.cell, state.top);
    ctx.lineTo(state.left + k * state.cell, state.top + size);
    ctx.moveTo(state.left, state.top + k * state.cell);
    ctx.lineTo(state.left + size, state.top + k * state.cell);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  state.board.forEach((v, i) => {
    if (v === 0) return;
    const x = state.left + ((i % N) + 0.5) * state.cell;
    const y = state.top + (Math.floor(i / N) + 0.5) * state.cell;
    if (i === state.lastMove) {
      ctx.strokeStyle = v === CHILD ? theme.primary : theme.secondary;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(x, y, state.cell * 0.46, 0, Math.PI * 2);
      ctx.stroke();
    }
    sprites.draw(ctx, v === CHILD ? view.player : 'dog-face', x, y, state.cell * 0.78);
  });

  if (state.line.length > 0) {
    const first = state.line[0] ?? 0;
    const last = state.line[state.line.length - 1] ?? 0;
    const at = (i: number) => [state.left + ((i % N) + 0.5) * state.cell, state.top + (Math.floor(i / N) + 0.5) * state.cell] as const;
    ctx.strokeStyle = theme.star;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(...at(first));
    ctx.lineTo(...at(last));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  paintBadge(ctx, view, state);
  if (state.turn === 'over') {
    const words = state.winner === CHILD ? 'Thắng rồi!' : state.winner === CUN ? 'Ván mới nào!' : 'Hòa!';
    paintLabel(ctx, view, words, state.left + size / 2, state.top + size / 2, 60, theme.star);
  }
}
