// Shell game's picture: a market stall (striped awning, checked tablecloth), three white bowls with a blue
// band, the gem glittering under one of them, the bowls swinging past each other (the one in front lower and
// bigger), and a line of words for what to do.
import { paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { ShellState } from './logic';

const CUP_BOTTOM = 150;
const CUP_TOP = 104;
const CUP_HEIGHT = 136;

function paintStall(ctx: CanvasRenderingContext2D, view: DrawView, tableY: number): void {
  const { arena, theme } = view;
  paintSky(ctx, view, tableY, 6);
  // Awning: alternating stripes with a scalloped edge.
  const top = HUD_SAFE_TOP - 10;
  const stripe = 70;
  for (let x = 0, i = 0; x < arena.width; x += stripe, i += 1) {
    ctx.fillStyle = i % 2 === 0 ? theme.primary : theme.light;
    ctx.fillRect(x, top, stripe, 46);
    ctx.beginPath();
    ctx.arc(x + stripe / 2, top + 46, stripe / 2, 0, Math.PI);
    ctx.fill();
  }
  // The table and its checked cloth.
  ctx.fillStyle = theme.light;
  ctx.fillRect(0, tableY + 10, arena.width, arena.height - tableY);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = theme.primary;
  const cell = 46;
  for (let y = tableY + 10, r = 0; y < arena.height; y += cell, r += 1) {
    for (let x = (r % 2) * cell; x < arena.width; x += cell * 2) ctx.fillRect(x, y, cell, cell);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(0, tableY + 4, arena.width, 10);
}

function paintCup(ctx: CanvasRenderingContext2D, view: DrawView, x: number, rimY: number, scale: number, glow: boolean): void {
  const { theme } = view;
  const b = (CUP_BOTTOM / 2) * scale;
  const t = (CUP_TOP / 2) * scale;
  const h = CUP_HEIGHT * scale;
  if (glow) {
    ctx.globalAlpha = 0.3 + 0.2 * Math.sin(view.time * 8);
    ctx.fillStyle = theme.star;
    ctx.beginPath();
    ctx.ellipse(x, rimY - h / 2, b + 24, h / 2 + 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.beginPath();
  ctx.moveTo(x - b, rimY);
  ctx.quadraticCurveTo(x - b + 4, rimY - h * 0.6, x - t, rimY - h);
  ctx.lineTo(x + t, rimY - h);
  ctx.quadraticCurveTo(x + b - 4, rimY - h * 0.6, x + b, rimY);
  ctx.closePath();
  ctx.fillStyle = theme.light;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = theme.ink;
  ctx.stroke();
  // The blue band and the foot ring on top.
  ctx.save();
  ctx.clip();
  ctx.fillStyle = theme.secondary;
  ctx.fillRect(x - b, rimY - h * 0.42, b * 2, 20 * scale);
  ctx.fillRect(x - b, rimY - 12 * scale, b * 2, 8 * scale);
  ctx.restore();
  ctx.fillStyle = theme.secondary;
  roundRect(ctx, x - t * 0.6, rimY - h - 14 * scale, t * 1.2, 16 * scale, 6);
  ctx.fill();
  ctx.stroke();
}

export function drawShellGame(ctx: CanvasRenderingContext2D, state: ShellState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { tableY } = state;
  paintStall(ctx, view, tableY);

  // The gem under its cup (hidden while the cup is down).
  const gemCup = state.cups[state.gem];
  // Only while a cup is up: a cup on the table hides it completely.
  if (gemCup && gemCup.lift > 0) {
    paintShadow(ctx, view, gemCup.x, tableY + 6, 70);
    sprites.draw(ctx, 'gem', gemCup.x, tableY - 30, 62, { rotate: view.reducedMotion ? 0 : Math.sin(view.time * 3) * 0.1 });
    if (gemCup.lift > 40) sprites.draw(ctx, 'sparkles', gemCup.x + 40, tableY - 70, 40);
  }

  const swapT = state.phase === 'shuffle' ? Math.min(1, state.phaseTime / state.swapSeconds) : 0;
  const order = state.cups.map((cup, i) => ({ cup, i })).sort((a, b) => a.cup.swing - b.cup.swing);
  for (const { cup, i } of order) {
    const arc = Math.sin(swapT * Math.PI) * 34 * cup.swing;
    const scale = 1 + Math.sin(swapT * Math.PI) * 0.08 * cup.swing;
    paintShadow(ctx, view, cup.x, tableY + 8 + arc, CUP_BOTTOM * scale, cup.lift / 200);
    paintCup(ctx, view, cup.x, tableY + 4 + arc - cup.lift, scale, state.phase === 'choose');
    if (state.phase === 'reveal' && i === state.picked && i !== state.gem) paintLabel(ctx, view, '✗', cup.x, tableY - 40, 60, theme.danger);
  }

  const y = Math.min(tableY + 120, arena.height - 50);
  if (state.phase === 'show') paintLabel(ctx, view, 'Nhớ viên ngọc nằm ở đâu nhé!', arena.width / 2, y, 34);
  else if (state.phase === 'choose') paintLabel(ctx, view, 'Ngọc ở dưới bát nào?', arena.width / 2, y, 40, theme.star);
  else if (state.phase === 'reveal') paintLabel(ctx, view, state.picked === state.gem ? 'Đúng rồi!' : 'Ngọc ở đây cơ!', arena.width / 2, y, 40, state.picked === state.gem ? theme.star : theme.light);
}
