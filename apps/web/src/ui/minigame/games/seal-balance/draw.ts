// Seal balance's picture: a circus tent (striped canvas, flags), a round stage, the seal sliding on it with the
// ball tilting on its nose. A gauge under the ball shows its lean (green while steady, red near falling); gusts
// blow streaks and leaves across; a fallen ball bounces and rolls away.
import { paintLabel, paintShadow, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { FALL_LEAN, STEADY_LEAN, type SealState } from './logic';

const BALL = 70;

export function drawSealBalance(ctx: CanvasRenderingContext2D, state: SealState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { floorY } = state;
  // Tent stripes.
  const stripe = 70;
  for (let x = 0, i = 0; x < arena.width; x += stripe, i += 1) {
    ctx.fillStyle = i % 2 === 0 ? theme.primary : theme.light;
    ctx.fillRect(x, 0, stripe, floorY);
  }
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = theme.ink;
  ctx.fillRect(0, 0, arena.width, floorY);
  ctx.globalAlpha = 1;
  // Spotlight.
  const light = ctx.createRadialGradient(state.x, floorY - 120, 20, state.x, floorY - 120, 320);
  light.addColorStop(0, theme.light);
  light.addColorStop(1, 'transparent');
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, arena.width, floorY);
  ctx.globalAlpha = 1;
  // Stage.
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, floorY, arena.width, arena.height - floorY);
  ctx.fillStyle = theme.danger;
  ctx.fillRect(0, floorY, arena.width, 16);
  ctx.fillStyle = theme.star;
  for (let x = 20; x < arena.width; x += 60) {
    ctx.beginPath();
    ctx.arc(x, floorY + 8, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wind.
  if (state.gustAge < 0.9) {
    const dir = Math.sign(state.gust) || 1;
    const t = state.gustAge / 0.9;
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 5;
    ctx.globalAlpha = 0.7 * (1 - t);
    for (let i = 0; i < 5; i += 1) {
      const y = floorY - 330 + i * 40;
      const x = dir > 0 ? t * arena.width - 120 + i * 30 : arena.width - t * arena.width + 120 - i * 30;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - dir * 120, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    sprites.draw(ctx, 'leaf', dir > 0 ? t * arena.width : arena.width - t * arena.width, floorY - 280 + Math.sin(t * 12) * 20, 44, { rotate: t * 8 });
  }

  // The seal.
  paintShadow(ctx, view, state.x, floorY + 4, 150);
  const lean = Math.max(-0.25, Math.min(0.25, -state.vx / 2400));
  sprites.draw(ctx, 'seal', state.x, floorY - 62, 150, { rotate: lean });
  const nose = { x: state.x + 6, y: floorY - 140 };

  // The ball.
  if (state.fallen < 0) {
    const bx = nose.x + Math.sin(state.lean) * (BALL / 2 + 6);
    const by = nose.y - Math.cos(state.lean) * (BALL / 2 + 6);
    const steady = Math.abs(state.lean) < STEADY_LEAN;
    if (steady) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = theme.leaf;
      ctx.beginPath();
      ctx.arc(bx, by, BALL * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    sprites.draw(ctx, 'volleyball', bx, by, BALL, { rotate: state.lean * 2 });
  } else {
    const t = state.fallen;
    const x = nose.x + state.fellTo * (60 + t * 380);
    const drop = Math.min(1, t / 0.45);
    const bounce = t > 0.45 && !view.reducedMotion ? Math.abs(Math.sin((t - 0.45) * 9)) * 50 * Math.max(0, 1 - (t - 0.45) * 1.4) : 0;
    const y = nose.y - BALL / 2 + drop * drop * (floorY - nose.y) - bounce;
    sprites.draw(ctx, 'volleyball', x, Math.min(y, floorY - BALL / 2), BALL, { rotate: t * 10 * state.fellTo });
  }

  // Lean gauge.
  const gx = state.x;
  const gy = floorY + Math.min(60, (arena.height - floorY) / 2);
  const w = 170;
  ctx.fillStyle = theme.light;
  roundRect(ctx, gx - w / 2, gy - 12, w, 24, 12);
  ctx.fill();
  ctx.fillStyle = theme.leaf;
  roundRect(ctx, gx - (w / 2) * (STEADY_LEAN / FALL_LEAN), gy - 12, w * (STEADY_LEAN / FALL_LEAN), 24, 12);
  ctx.fill();
  const needle = Math.max(-1, Math.min(1, state.fallen < 0 ? state.lean / FALL_LEAN : state.fellTo));
  ctx.fillStyle = Math.abs(needle) * FALL_LEAN < STEADY_LEAN ? theme.ink : theme.danger;
  ctx.beginPath();
  ctx.arc(gx + needle * (w / 2 - 10), gy, 13, 0, Math.PI * 2);
  ctx.fill();
  if (state.fallen >= 0 && state.fallen < 1) paintLabel(ctx, view, 'Ối!', nose.x + state.fellTo * 120, nose.y - 60, 44, theme.light);
}
