// Air hockey's picture: an icy rink, the table with its rails, centre line and circle, the two goals (the
// child's near her, the penguin's far away), the penguin behind its paddle, the child's paddle with her face,
// the puck with a short trail, and a big "Vào!" after a goal.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView, Point } from '../../types';
import { PADDLE_R, PUCK_R, toScreen, type Body, type HockeyState } from './logic';

function paintPaddle(ctx: CanvasRenderingContext2D, view: DrawView, at: Point, colour: string): void {
  const { theme } = view;
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.arc(at.x + 4, at.y + 6, PADDLE_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = colour;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(at.x, at.y, PADDLE_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(at.x, at.y, PADDLE_R * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawAirHockey(ctx: CanvasRenderingContext2D, state: HockeyState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.waterLight;
  ctx.fillRect(0, 0, arena.width, arena.height);
  const corner = toScreen(state, 0, state.length);
  const far = toScreen(state, state.width, 0);
  const x0 = Math.min(corner.x, far.x);
  const y0 = Math.min(corner.y, far.y);
  const w = Math.abs(far.x - corner.x);
  const h = Math.abs(far.y - corner.y);
  ctx.fillStyle = theme.stoneEdge;
  roundRect(ctx, x0 - 14, y0 - 14, w + 28, h + 28, 30);
  ctx.fill();
  ctx.fillStyle = theme.light;
  roundRect(ctx, x0, y0, w, h, 22);
  ctx.fill();
  // Lines.
  ctx.strokeStyle = theme.danger;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 4;
  const midA = toScreen(state, 0, state.length / 2);
  const midB = toScreen(state, state.width, state.length / 2);
  ctx.beginPath();
  ctx.moveTo(midA.x, midA.y);
  ctx.lineTo(midB.x, midB.y);
  ctx.stroke();
  const mid = toScreen(state, state.width / 2, state.length / 2);
  ctx.beginPath();
  ctx.arc(mid.x, mid.y, state.width * 0.16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  // Goals: dark mouths in the end rails.
  for (const v of [0, state.length]) {
    const a = toScreen(state, state.width / 2 - state.goalHalf, v);
    const b = toScreen(state, state.width / 2 + state.goalHalf, v);
    ctx.strokeStyle = v === 0 ? theme.secondary : theme.primary;
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }
  // The penguin behind its goal.
  const pen = toScreen(state, state.width / 2, -60);
  sprites.draw(ctx, 'penguin', state.wide ? Math.min(arena.width - 40, pen.x) : pen.x, state.wide ? pen.y : Math.max(140, pen.y), 90);

  const puck = toScreen(state, state.puck.u, state.puck.v);
  const trail = (b: Body): Point => toScreen(state, b.u - b.vu * 0.04, b.v - b.vv * 0.04);
  if (state.pause <= 0) {
    const t = trail(state.puck);
    ctx.strokeStyle = theme.ink;
    ctx.globalAlpha = 0.2;
    ctx.lineWidth = PUCK_R * 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(t.x, t.y);
    ctx.lineTo(puck.x, puck.y);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.ink;
    ctx.beginPath();
    ctx.arc(puck.x, puck.y, PUCK_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = theme.star;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(puck.x, puck.y, PUCK_R * 0.6, 0, Math.PI * 2);
    ctx.stroke();
  }
  const ai = toScreen(state, state.ai.u, state.ai.v);
  paintPaddle(ctx, view, ai, theme.secondary);
  sprites.draw(ctx, 'penguin', ai.x, ai.y, PADDLE_R * 1.1);
  const mine = toScreen(state, state.mine.u, state.mine.v);
  paintPaddle(ctx, view, mine, theme.primary);
  sprites.draw(ctx, view.player, mine.x, mine.y, PADDLE_R * 1.2);

  if (state.pause > 0 && state.lastGoal) {
    paintLabel(ctx, view, state.lastGoal === 'mine' ? 'Vào!' : 'Ối!', mid.x, mid.y, 64, state.lastGoal === 'mine' ? theme.star : theme.light);
  }
}
