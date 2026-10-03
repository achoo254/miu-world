// Goalkeeper's picture: the pitch seen from the goal (stripes, the penalty box), a friend running up to the
// ball far away, the ball growing as it flies closer (with a shadow on the grass), the goal frame and net
// around the bottom of the screen, and the child as keeper with big gloves, leaning as she dives. "Bắt
// được!" for a save, shot dots along the bottom count the ten shots.
import { bob, paintLabel, paintShadow, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { REACH, SHOTS, type GoalkeeperState } from './logic';

export function drawGoalkeeper(ctx: CanvasRenderingContext2D, state: GoalkeeperState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = theme.ink;
  for (let y = 0; y < arena.height; y += 120) ctx.fillRect(0, y, arena.width, 60);
  ctx.globalAlpha = 0.8;
  const chalk = theme.id === 'snow' ? theme.secondary : theme.light;
  ctx.strokeStyle = chalk;
  ctx.lineWidth = 5;
  const boxTop = state.kickerY + 90;
  ctx.strokeRect(state.goalX - state.goalHalf - 60, boxTop, state.goalHalf * 2 + 120, state.goalLine - boxTop + 200);
  ctx.globalAlpha = 1;

  // The friend and the ball on the spot / in the air.
  const shot = state.shot;
  const runup = state.phase === 'runup' ? Math.min(1, state.phaseAgo / 1.0) : 1;
  const kickerY = state.kickerY - 50 + runup * 30;
  sprites.draw(ctx, 'panda', state.kickerX - 30 + runup * 20, kickerY + bob(view, 9, 4), 90);
  const p = state.phase === 'flight' ? shot.t / shot.flight : state.phase === 'result' ? 1 : 0;
  const size = 34 + 50 * p;
  if (state.phase !== 'result' || !shot.saved) {
    paintShadow(ctx, view, shot.x, shot.y + size * 0.5, size, 0);
    const lift = Math.sin(Math.PI * p) * 50;
    sprites.draw(ctx, 'soccer-ball', shot.x, shot.y - lift, size, { rotate: view.reducedMotion ? 0 : view.time * 8 });
  }

  // The goal: posts, crossbar seen from behind, the net.
  const left = state.goalX - state.goalHalf;
  const right = state.goalX + state.goalHalf;
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = left; x <= right; x += 26) {
    ctx.moveTo(x, state.goalLine);
    ctx.lineTo(x + (x - state.goalX) * 0.15, arena.height);
  }
  for (let y = state.goalLine; y < arena.height; y += 22) {
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  for (const x of [left - 8, right - 8]) {
    roundRect(ctx, x, state.goalLine - 160, 16, arena.height - state.goalLine + 170, 6);
    ctx.fill();
    ctx.stroke();
  }

  // The keeper.
  const moving = state.keeperTo !== null ? Math.sign(state.keeperTo - state.keeperX) : 0;
  const lean = view.reducedMotion ? 0 : moving * 0.35;
  const y = state.goalLine - 40;
  paintShadow(ctx, view, state.keeperX, state.goalLine + 20, 120);
  sprites.draw(ctx, view.player, state.keeperX, y, 110, { rotate: lean });
  sprites.draw(ctx, 'gloves', state.keeperX - REACH + 14, y - 30 - Math.abs(lean) * 30, 54, { flipX: true });
  sprites.draw(ctx, 'gloves', state.keeperX + REACH - 14, y - 30 - Math.abs(lean) * 30, 54);
  if (state.phase === 'result' && shot.saved) sprites.draw(ctx, 'soccer-ball', state.keeperX, y - 60, 70);

  // Ten shots along the bottom.
  for (let k = 0; k < SHOTS; k += 1) {
    ctx.fillStyle = k < state.shots ? theme.star : theme.light;
    ctx.globalAlpha = k < state.shots ? 1 : 0.5;
    ctx.beginPath();
    ctx.arc(arena.width / 2 + (k - (SHOTS - 1) / 2) * 30, arena.height - 26, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (state.phase === 'result') paintLabel(ctx, view, shot.saved ? 'Bắt được!' : 'Vào mất rồi', arena.width / 2, state.goalLine - 190, 46, shot.saved ? theme.star : theme.light);
}
