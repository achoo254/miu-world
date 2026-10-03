// Music box's picture: a wooden music box with its lid open, the brass drum as a grid (columns of time, rows of
// notes, high at the top), pins as round brass studs, the column sounding now lit, a bell note floating from
// the pin that rings, green or red ticks under each column after a turn, and the "Nghe" and "Quay" buttons.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { ROWS, type BoxButton, type MusicBoxState } from './logic';

function paintButton(ctx: CanvasRenderingContext2D, view: DrawView, b: BoxButton, active: boolean): void {
  const { theme } = view;
  ctx.globalAlpha = active ? 1 : 0.5;
  ctx.fillStyle = b.kind === 'play' ? theme.primary : theme.secondary;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  roundRect(ctx, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, 22);
  ctx.fill();
  ctx.stroke();
  paintLabel(ctx, view, b.kind === 'play' ? 'Quay' : 'Nghe', b.x, b.y + 2, 32, theme.light);
  ctx.globalAlpha = 1;
}

export function drawMusicBox(ctx: CanvasRenderingContext2D, state: MusicBoxState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.sky[2];
  ctx.fillRect(0, 0, arena.width, arena.height);
  const { left, top, cellW, cellH } = state;
  const cols = state.tune.length;
  const gridW = cols * cellW;
  const gridH = ROWS * cellH;
  // The box.
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, left - 30, top - 30, gridW + 60, gridH + 70, 20);
  ctx.fill();
  ctx.fillStyle = theme.wood;
  roundRect(ctx, left - 16, top - 16, gridW + 32, gridH + 32, 14);
  ctx.fill();
  // Drum rows.
  for (let r = 0; r < ROWS; r += 1) {
    ctx.fillStyle = r % 2 === 0 ? theme.star : theme.light;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(left, top + r * cellH, gridW, cellH);
  }
  ctx.globalAlpha = 1;
  const listening = state.phase === 'listen' || state.phase === 'play';
  for (let c = 0; c < cols; c += 1) {
    const x = left + c * cellW;
    if (listening && c === state.playing) {
      ctx.fillStyle = theme.light;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(x, top, cellW, gridH);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = theme.woodEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, top, cellW, gridH);
    // While the box's own tune plays, its pin glows as it rings.
    if (state.phase === 'listen' && c === state.playing) {
      const row = state.tune[c] ?? 0;
      ctx.fillStyle = theme.danger;
      ctx.beginPath();
      ctx.arc(x + cellW / 2, top + (row + 0.5) * cellH, Math.min(cellW, cellH) * 0.34, 0, Math.PI * 2);
      ctx.fill();
      sprites.draw(ctx, 'musical-note', x + cellW * 0.8, top + row * cellH - (state.phaseTime % 0.5) * 60, 40);
    }
    const pin = state.pins[c] ?? -1;
    if (pin >= 0 && state.phase !== 'listen') {
      ctx.fillStyle = theme.primary;
      ctx.strokeStyle = theme.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + cellW / 2, top + (pin + 0.5) * cellH, Math.min(cellW, cellH) * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    const checked = state.checked[c];
    if (checked !== null && checked !== undefined) paintLabel(ctx, view, checked ? '✓' : '✗', x + cellW / 2, top + gridH + 22, 30, checked ? theme.leaf : theme.danger);
  }
  // Note names along the side, high to low.
  sprites.draw(ctx, 'bell', left - 50, top + cellH / 2, 34);
  sprites.draw(ctx, 'bell', left - 50, top + gridH - cellH / 2, 24);
  for (const b of state.buttons) paintButton(ctx, view, b, state.phase === 'edit');
  const label = state.phase === 'listen' ? 'Nghe hộp nhạc hát…' : state.phase === 'play' ? 'Hộp nhạc đang quay…' : state.phase === 'solved' ? 'Giống hệt rồi!' : 'Cắm chốt rồi chạm Quay';
  paintLabel(ctx, view, label, left + gridW / 2, top - 52, 30, state.phase === 'solved' ? theme.star : theme.primary);
}
