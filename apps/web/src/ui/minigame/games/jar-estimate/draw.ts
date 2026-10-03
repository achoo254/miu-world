// Jar estimate's picture: a market stall, the big glass jar full of sweets, a striped cloth that drops over it
// while the child guesses, a ruler from 0 to 100 with a needle and the guess written large, and the "Xong"
// button. On the reveal the sweets fly out into rows of ten with a "10" tag for every full row, and the real
// number is written as tens and ones next to the guess.
import { paintLabel, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { MAX, REVEAL_SECONDS, ROUNDS, type JarState } from './logic';

const SWEETS = ['candy', 'lollipop', 'cookie'] as const;

function paintRuler(ctx: CanvasRenderingContext2D, view: DrawView, state: JarState): void {
  const { theme } = view;
  const { x0, x1, y } = state.ruler;
  ctx.fillStyle = theme.wood;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, x0 - 20, y - 22, x1 - x0 + 40, 44, 12);
  ctx.fill();
  ctx.stroke();
  for (let v = 0; v <= MAX; v += 5) {
    const x = x0 + (v / MAX) * (x1 - x0);
    ctx.lineWidth = v % 10 === 0 ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 22);
    ctx.lineTo(x, y - (v % 10 === 0 ? 2 : 10));
    ctx.stroke();
    if (v % 20 === 0) paintLabel(ctx, view, String(v), x, y + 38, 20, theme.light);
  }
  const nx = x0 + (state.guess / MAX) * (x1 - x0);
  ctx.fillStyle = theme.danger;
  ctx.beginPath();
  ctx.moveTo(nx, y + 6);
  ctx.lineTo(nx - 22, y - 40);
  ctx.lineTo(nx + 22, y - 40);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(nx, y - 46, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  paintLabel(ctx, view, String(state.guess), nx, y - 96, 44, theme.star);
}

export function drawJarEstimate(ctx: CanvasRenderingContext2D, state: JarState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  // A warm market awning and a wooden counter.
  ctx.fillStyle = theme.sky[2];
  ctx.fillRect(0, 0, arena.width, arena.height);
  for (let x = 0; x < arena.width; x += 80) {
    ctx.fillStyle = (x / 80) % 2 === 0 ? theme.danger : theme.light;
    ctx.fillRect(x, 0, 80, 80);
  }
  const counterY = state.jar.y + state.jar.size * 0.45;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, counterY, arena.width, arena.height - counterY);
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(0, counterY, arena.width, 10);

  const { x, y, size } = state.jar;
  const pour = state.phase === 'reveal' ? Math.min(1, state.phaseTime / (REVEAL_SECONDS * 0.45)) : 0;
  // Rows of ten for the reveal.
  const rows = Math.ceil(state.count / 10);
  const rowsTop = HUD_SAFE_TOP + 40;
  const cell = Math.min(42, (arena.width - 80) / 10.5, (state.ruler.y - 50 - rowsTop) / Math.max(1, rows * 0.95));
  const targetOf = (i: number) => ({ x: arena.width / 2 - cell * 4.5 + (i % 10) * cell, y: rowsTop + cell / 2 + Math.floor(i / 10) * cell * 0.95 });

  sprites.draw(ctx, 'jar', x, y, size, { alpha: state.phase === 'reveal' ? 1 - pour * 0.6 : 1 });
  state.sweets.forEach((s, i) => {
    const t = state.phase === 'reveal' ? Math.min(1, Math.max(0, pour * 1.6 - (i / state.sweets.length) * 0.6)) : 0;
    const to = targetOf(i);
    const sx = s.x + (to.x - s.x) * t;
    const sy = s.y + (to.y - s.y) * t - Math.sin(t * Math.PI) * 60;
    if (state.phase !== 'guess') sprites.draw(ctx, SWEETS[s.kind], sx, sy, state.phase === 'reveal' ? cell * 0.9 : 30);
  });
  if (state.phase === 'reveal' && pour >= 1) {
    const tens = Math.floor(state.count / 10);
    for (let r = 0; r < tens; r += 1) {
      const a = targetOf(r * 10);
      paintLabel(ctx, view, '10', a.x - cell * 0.9, a.y, 22, theme.star);
    }
  }

  if (state.phase === 'show') {
    paintLabel(ctx, view, 'Nhìn nhanh nào!', arena.width / 2, y - size / 2 - 4, 34, theme.light);
    const left = Math.max(0, 1 - state.phaseTime / 3);
    ctx.fillStyle = theme.star;
    roundRect(ctx, arena.width / 2 - 100, counterY + 14, 200 * left, 14, 7);
    ctx.fill();
  }
  if (state.phase === 'guess') {
    // The cloth over the jar.
    const drop = Math.min(1, state.phaseTime / 0.3);
    ctx.fillStyle = theme.secondary;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 5;
    const top = y - size / 2;
    roundRect(ctx, x - size * 0.42, top - 20 + (1 - drop) * -60, size * 0.84, size * 0.96, 30);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = theme.light;
    for (let k = 0; k < 4; k += 1) ctx.fillRect(x - size * 0.42, top + 20 + k * size * 0.22, size * 0.84, 10);
    paintLabel(ctx, view, 'Có bao nhiêu kẹo?', x, y, 34, theme.light);
  }
  if (state.phase === 'reveal') {
    const tens = Math.floor(state.count / 10);
    const ones = state.count % 10;
    paintLabel(ctx, view, `${state.count} kẹo = ${tens} chục ${ones} đơn vị`, arena.width / 2, state.ruler.y + 10, 30, theme.star);
    paintLabel(ctx, view, state.close ? `Bé đoán ${state.guess}: rất gần!` : `Bé đoán ${state.guess}`, arena.width / 2, state.ruler.y + 60, 30, state.close ? theme.star : theme.light);
  } else {
    paintRuler(ctx, view, state);
  }
  if (state.phase === 'guess') {
    const { done } = state;
    ctx.fillStyle = theme.primary;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 5;
    roundRect(ctx, done.x, done.y, done.w, done.h, 22);
    ctx.fill();
    ctx.stroke();
    paintLabel(ctx, view, 'Xong', done.x + done.w / 2, done.y + done.h / 2 + 2, 36, theme.light);
  }
  paintLabel(ctx, view, `Hũ ${Math.min(ROUNDS, state.round + 1)}/${ROUNDS}`, arena.width - 80, counterY + 30, 24, theme.light);
}
