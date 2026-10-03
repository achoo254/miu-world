// Flip stones' picture: a felt board on a wooden table, the child's light stones (with her face) and the owl's
// dark ones (with the owl), stones turning over one after another, dots on the squares she can play, and the
// score badge (who has how many, whose turn, the owl thinking, a pass, the end of a game).
import { bob, paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { CHILD, countOf, legalMoves, N, OWL, type ReversiState } from './logic';

const FLIP_SECONDS = 0.25;

function paintBadge(ctx: CanvasRenderingContext2D, view: DrawView, state: ReversiState): void {
  const { theme, sprites, arena } = view;
  const wide = arena.width >= arena.height;
  const gap = 140;
  const spots = [
    { who: CHILD, x: state.badge.x - (wide ? 0 : gap / 2), y: state.badge.y - (wide ? gap / 2 : 0) },
    { who: OWL, x: state.badge.x + (wide ? 0 : gap / 2), y: state.badge.y + (wide ? gap / 2 : 0) },
  ];
  for (const spot of spots) {
    const active = (spot.who === CHILD && state.turn === 'child') || (spot.who === OWL && state.turn === 'owl');
    ctx.fillStyle = spot.who === CHILD ? theme.light : theme.ink;
    ctx.strokeStyle = active ? theme.star : theme.woodEdge;
    ctx.lineWidth = active ? 8 : 4;
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    sprites.draw(ctx, spot.who === CHILD ? view.player : 'owl', spot.x, spot.y - 6 + (active ? bob(view, 5, 3) : 0), 66);
    paintLabel(ctx, view, String(countOf(state.board, spot.who)), spot.x + 40, spot.y + 36, 30, theme.star);
    if (spot.who === OWL && state.turn === 'owl') {
      for (let k = 0; k < 3; k += 1) {
        ctx.globalAlpha = 0.4 + 0.6 * Math.max(0, Math.sin(view.time * 6 - k));
        ctx.fillStyle = theme.light;
        ctx.beginPath();
        ctx.arc(spot.x - 16 + k * 16, spot.y + 66, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
}

export function drawReversi(ctx: CanvasRenderingContext2D, state: ReversiState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = theme.woodEdge;
  for (let y = 0; y < arena.height; y += 70) ctx.fillRect(0, y, arena.width, 4);
  ctx.globalAlpha = 1;

  const { cell, left, top } = state;
  const size = cell * N;
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, left - 14, top - 14, size + 28, size + 28, 18);
  ctx.fill();
  ctx.fillStyle = theme.leaf;
  ctx.fillRect(left, top, size, size);
  ctx.strokeStyle = theme.ink;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let k = 0; k <= N; k += 1) {
    ctx.moveTo(left + k * cell, top);
    ctx.lineTo(left + k * cell, top + size);
    ctx.moveTo(left, top + k * cell);
    ctx.lineTo(left + size, top + k * cell);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  if (state.turn === 'child') {
    ctx.fillStyle = theme.light;
    ctx.globalAlpha = 0.45;
    for (const i of legalMoves(state.board, CHILD)) {
      ctx.beginPath();
      ctx.arc(left + ((i % N) + 0.5) * cell, top + (Math.floor(i / N) + 0.5) * cell, cell * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  state.board.forEach((who, i) => {
    if (who === 0) return;
    const x = left + ((i % N) + 0.5) * cell;
    const y = top + (Math.floor(i / N) + 0.5) * cell;
    const t = (state.time - (state.changedAt[i] ?? -9)) / FLIP_SECONDS;
    const placed = i === state.lastMove;
    const flipping = !placed && t >= 0 && t < 1 && !view.reducedMotion;
    const showing = flipping && t < 0.5 ? (who === CHILD ? OWL : CHILD) : who;
    const scaleX = flipping ? Math.max(0.05, Math.abs(Math.cos(t * Math.PI))) : 1;
    const pop = placed && t >= 0 && t < 1 && !view.reducedMotion ? 1 + 0.2 * Math.sin(t * Math.PI) : 1;
    const r = cell * 0.4 * pop;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scaleX, 1);
    ctx.fillStyle = theme.ink;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(3, 5, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = showing === CHILD ? theme.light : theme.ink;
    ctx.strokeStyle = showing === CHILD ? theme.stoneEdge : theme.stone;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    sprites.draw(ctx, showing === CHILD ? view.player : 'owl', 0, 0, r * 1.25, { alpha: 0.9 });
    ctx.restore();
  });

  paintBadge(ctx, view, state);
  if (state.passed) paintLabel(ctx, view, state.passed === CHILD ? 'Bạn hết nước, bỏ lượt' : 'Cú bỏ lượt', left + size / 2, top + size / 2, 34, theme.light);
  if (state.turn === 'over') {
    const won = countOf(state.board, CHILD) > countOf(state.board, OWL);
    paintLabel(ctx, view, won ? 'Thắng rồi!' : 'Ván mới nhé!', left + size / 2, top + size / 2, 48, won ? theme.star : theme.light);
  }
}
