// Penalty kick's picture: sky over a striped pitch, the goal with its net, the keeper (Vẹt with big gloves)
// walking along the line, the ball on its spot or flying (smaller as it goes, spinning), a hint arrow before
// the first shot, and the shot's result in big letters.
import { bob, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { PenaltyState, ShotResult } from './logic';

const RESULT_WORDS: Record<ShotResult, string> = { goal: 'VÀO!', saved: 'Bắt được rồi!', wide: 'Ra ngoài' };

function paintPitch(ctx: CanvasRenderingContext2D, view: DrawView, state: PenaltyState): void {
  const { arena, theme } = view;
  const top = state.goalTop + 40;
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, top, arena.width, arena.height - top);
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = theme.ink;
  for (let y = top; y < arena.height; y += 120) ctx.fillRect(0, y, arena.width, 60);
  ctx.globalAlpha = 0.85;
  // Chalk lines: white on grass, blue on snow (white would vanish).
  const chalk = theme.id === 'snow' ? theme.secondary : theme.light;
  ctx.strokeStyle = chalk;
  ctx.lineWidth = 5;
  // The goal area and the spot.
  ctx.strokeRect(state.goalX - state.goalHalf - 70, state.goalLine, state.goalHalf * 2 + 140, (state.spotY - state.goalLine) * 0.55);
  ctx.beginPath();
  ctx.moveTo(0, state.goalLine);
  ctx.lineTo(arena.width, state.goalLine);
  ctx.stroke();
  ctx.fillStyle = chalk;
  ctx.beginPath();
  ctx.ellipse(state.spotX, state.spotY + 14, 16, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function paintGoal(ctx: CanvasRenderingContext2D, view: DrawView, state: PenaltyState): void {
  const { theme } = view;
  const left = state.goalX - state.goalHalf;
  const width = state.goalHalf * 2;
  const height = state.goalLine - state.goalTop;
  // The net: a light panel with a grid.
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(left, state.goalTop, width, height);
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = theme.stoneEdge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = left; x <= left + width; x += 24) {
    ctx.moveTo(x, state.goalTop);
    ctx.lineTo(x, state.goalLine);
  }
  for (let y = state.goalTop; y <= state.goalLine; y += 24) {
    ctx.moveTo(left, y);
    ctx.lineTo(left + width, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  // Posts and crossbar.
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  for (const [x, y, w, h] of [
    [left - 12, state.goalTop - 12, 14, height + 12],
    [left + width - 2, state.goalTop - 12, 14, height + 12],
    [left - 12, state.goalTop - 12, width + 26, 14],
  ] as const) {
    roundRect(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.stroke();
  }
}

/** An upward arrow (tip at y - 40), outlined, for "swipe up". */
function paintArrow(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, alpha: number): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = view.theme.star;
  ctx.strokeStyle = view.theme.ink;
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y - 40);
  ctx.lineTo(x + 34, y);
  ctx.lineTo(x + 13, y);
  ctx.lineTo(x + 13, y + 36);
  ctx.lineTo(x - 13, y + 36);
  ctx.lineTo(x - 13, y);
  ctx.lineTo(x - 34, y);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawPenaltyKick(ctx: CanvasRenderingContext2D, state: PenaltyState, view: DrawView): void {
  const { sprites } = view;
  paintSky(ctx, view, state.goalTop + 40, 6);
  paintPitch(ctx, view, state);
  paintGoal(ctx, view, state);

  // The keeper: Vẹt in the middle, a glove on each side, bobbing as it walks.
  const ky = state.goalLine - 52 + bob(view, 9, 4);
  paintShadow(ctx, view, state.keeperX, state.goalLine + 4, 120);
  sprites.draw(ctx, 'parrot', state.keeperX, ky, 96, { flipX: state.keeperDir > 0 });
  sprites.draw(ctx, 'gloves', state.keeperX - 58, ky + 4, 52, { rotate: -0.3 });
  sprites.draw(ctx, 'gloves', state.keeperX + 58, ky + 4, 52, { rotate: 0.3, flipX: true });

  const ball = state.ball;
  if (!ball) {
    paintShadow(ctx, view, state.spotX, state.spotY + 26, 60);
    sprites.draw(ctx, 'soccer-ball', state.spotX, state.spotY - 4 + bob(view, 4, 3), 64);
    if (state.shots === 0) {
      // Before the first shot: an arrow pulsing upward from the ball, "swipe this way".
      const pulse = view.reducedMotion ? 0.5 : (view.time * 1.4) % 1;
      paintArrow(ctx, view, state.spotX, state.spotY - 70 - pulse * 60, 0.85 * (1 - pulse));
    }
  } else {
    const p = Math.min(1, ball.t / ball.flight);
    const size = 64 * (1 - 0.4 * p);
    const arc = Math.sin(p * Math.PI) * 40;
    paintShadow(ctx, view, ball.x, ball.y + 26 - 10 * p, size, arc / 60);
    // After the line: a goal sinks into the net, a save bounces back, a wide ball rolls away.
    const after = Math.max(0, ball.after);
    const dx = ball.result === 'wide' ? after * 300 * Math.sign(ball.toX - state.goalX) : 0;
    const dy = ball.result === 'saved' ? after * 260 : ball.result === 'goal' ? -after * 30 : 0;
    sprites.draw(ctx, 'soccer-ball', ball.x + dx, ball.y - arc + dy, size, { rotate: view.reducedMotion ? 0 : (ball.t + after) * 14 });
  }

  if (state.lastResult && state.resultAgo < 0.9) {
    const grow = view.reducedMotion ? 1 : Math.min(1, state.resultAgo / 0.15);
    paintLabel(ctx, view, RESULT_WORDS[state.lastResult], state.goalX, state.goalTop + 70, 64 * grow, state.lastResult === 'goal' ? view.theme.star : view.theme.light);
    if (state.lastResult === 'goal') sprites.draw(ctx, 'party-popper', state.goalX + 170, state.goalTop + 60, 70, { alpha: 1 - state.resultAgo / 0.9 });
  }
}
