// Chơi chuyền's picture: a yard with a woven mat, bamboo sticks scattered on it (picked ones lift and glow),
// the ball tossed up from the child's hand with its shadow, the bàn and its sticks to pick at the top, and a
// word after each toss.
import { bob, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { ChuyenState, Stick } from './logic';

const OUTCOME_WORDS = { cleared: 'Qua bàn!', short: 'Chưa đủ que', dropped: 'Rơi mất rồi' } as const;

function paintStick(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, angle: number, length: number, glow: boolean): void {
  const { theme } = view;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (glow) {
    ctx.fillStyle = theme.star;
    ctx.globalAlpha = 0.5;
    roundRect(ctx, -length / 2 - 8, -14, length + 16, 28, 14);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = theme.leaf;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 2.5;
  roundRect(ctx, -length / 2, -6, length, 12, 6);
  ctx.fill();
  ctx.stroke();
  // Bamboo nodes.
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 3;
  for (const f of [-0.25, 0.2]) {
    ctx.beginPath();
    ctx.moveTo(length * f, -6);
    ctx.lineTo(length * f, 6);
    ctx.stroke();
  }
  ctx.restore();
}

/** The ball: a round yellow fruit-sized ball with a shine. */
function paintBall(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, alpha: number): void {
  const { theme } = view;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = theme.star;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = alpha * 0.7;
  ctx.beginPath();
  ctx.arc(x - 10, y - 10, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function paintMat(ctx: CanvasRenderingContext2D, view: DrawView, mat: ChuyenState['mat']): void {
  const { theme } = view;
  ctx.fillStyle = theme.wood;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 6;
  roundRect(ctx, mat.x, mat.y, mat.w, mat.h, 22);
  ctx.fill();
  ctx.stroke();
  // Woven stripes.
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = theme.light;
  for (let x = mat.x + 20; x < mat.x + mat.w - 10; x += 44) ctx.fillRect(x, mat.y + 8, 18, mat.h - 16);
  ctx.globalAlpha = 1;
}

function paintNeed(ctx: CanvasRenderingContext2D, view: DrawView, state: ChuyenState): void {
  const picked = state.sticks.filter((s: Stick) => s.picked).length;
  const y = Math.max(state.apexY - 10, 132);
  paintLabel(ctx, view, `Bàn ${state.level}`, state.handX - 40 - state.need * 30, y, 38, view.theme.star);
  for (let i = 0; i < state.need; i += 1) {
    const x = state.handX + 20 + (i - (state.need - 1) / 2) * 56;
    ctx.globalAlpha = i < picked ? 1 : 0.35;
    paintStick(ctx, view, x, y, -1.2, 50, i < picked);
  }
  ctx.globalAlpha = 1;
}

export function drawChuyen(ctx: CanvasRenderingContext2D, state: ChuyenState, view: DrawView): void {
  const { theme, sprites, arena } = view;
  paintSky(ctx, view, state.mat.y - 40, 6);
  // A grassy yard.
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, state.mat.y - 40, arena.width, arena.height);
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = theme.ink;
  for (let y = state.mat.y - 40; y < arena.height; y += 90) ctx.fillRect(0, y, arena.width, 45);
  ctx.globalAlpha = 1;
  paintMat(ctx, view, state.mat);
  for (const s of state.sticks) {
    if (s.gone) continue;
    paintStick(ctx, view, s.x, s.y - (s.picked ? 10 : 0), s.angle, 104, s.picked);
  }

  // The child kneels by the mat; the ball's resting spot is a ring in front of her.
  sprites.draw(ctx, view.player, Math.max(70, state.handX - Math.min(arena.width * 0.36, 300)), state.handY - 10 + bob(view, 3, 2), 120);
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(state.handX, state.handY + 34, 56, 16, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const { ball } = state;
  const height = Math.max(0, state.handY - ball.y);
  paintShadow(ctx, view, ball.x, state.handY + 34, 70, height / 400);
  if (ball.phase === 'hand' && state.score === 0 && !view.reducedMotion) {
    // Before the first toss: a pulsing ring says "tap the ball".
    const pulse = (view.time * 1.2) % 1;
    ctx.globalAlpha = 1 - pulse;
    ctx.strokeStyle = theme.star;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 50 + pulse * 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  paintBall(ctx, view, ball.x, ball.y, ball.phase === 'dropped' ? 0.6 : 1);

  paintNeed(ctx, view, state);
  if (state.outcome && state.outcomeAgo < 0.9) {
    paintLabel(ctx, view, OUTCOME_WORDS[state.outcome], state.handX, state.mat.y + state.mat.h / 2, 56, state.outcome === 'cleared' ? theme.star : theme.light);
  }
}
