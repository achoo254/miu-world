// Jump rope's picture: a yard with two friends holding the rope's ends, the rope swinging round (drawn behind
// the child on its way over the top, in front on its way under), the child jumping with a shadow that shrinks,
// the run of clean jumps on a little board, and a word on a catch.
import { paintGround, paintHills, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { SpriteName } from '../../sprites';
import type { DrawView } from '../../types';
import { feetAt, type RopeState } from './logic';

const TURNERS: readonly SpriteName[] = ['rabbit', 'bear', 'panda', 'fox'];
/** Feet this high leave only a faint shadow. */
const JUMP_SHADOW = 120;

function paintRope(ctx: CanvasRenderingContext2D, view: DrawView, state: RopeState, left: number, right: number, handY: number): void {
  // A quadratic curve whose middle sweeps from the ground (angle 0) to well above her head (angle π).
  const bottom = state.groundY - 4;
  const top = handY - 150;
  const middle = (bottom + top) / 2 + ((bottom - top) / 2) * Math.cos(state.stopped > 0 ? 0 : state.angle);
  const control = 2 * middle - handY;
  ctx.strokeStyle = view.theme.primary;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(left, handY);
  ctx.quadraticCurveTo(state.childX, state.stopped > 0 ? state.groundY + 30 : control, right, handY);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

export function drawJumpRope(ctx: CanvasRenderingContext2D, state: RopeState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { groundY, childX } = state;
  paintSky(ctx, view, groundY - 60, 8);
  paintHills(ctx, view, groundY - 60, 50, 90, theme.leaf);
  paintGround(ctx, view, groundY - 40);
  const reach = Math.min(250, arena.width * 0.38);
  const left = childX - reach;
  const right = childX + reach;
  const handY = groundY - 64;
  const turners = TURNERS.filter((t) => t !== view.player);
  const turning = state.stopped > 0 ? 0 : state.angle;
  for (const [i, x] of [left - 34, right + 34].entries()) {
    paintShadow(ctx, view, x, groundY + 6, 70);
    sprites.draw(ctx, turners[i] ?? 'rabbit', x, groundY - 44, 88, { flipX: i === 1, rotate: view.reducedMotion ? 0 : Math.sin(turning) * 0.06 });
  }
  // Behind her while it goes over the top (the far side of its turn).
  const behind = Math.sin(turning) > 0;
  if (behind) paintRope(ctx, view, state, left, right, handY);
  const feet = feetAt(state.air);
  paintShadow(ctx, view, childX, groundY + 6, 74, feet / JUMP_SHADOW);
  const tucked = feet > 0 && !view.reducedMotion ? [1.05, 0.92] as const : ([1, 1] as const);
  const caught = state.last === 'caught' && state.lastAgo < 0.6 && !view.reducedMotion;
  sprites.draw(ctx, view.player, childX, groundY - 50 - feet, 100, { squash: tucked, rotate: caught ? Math.sin(state.lastAgo * 30) * 0.2 : 0 });
  if (!behind) paintRope(ctx, view, state, left, right, handY);

  // The run of clean jumps.
  ctx.fillStyle = theme.wood;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 4;
  roundRect(ctx, arena.width / 2 - 90, groundY + 50, 180, 60, 16);
  ctx.fill();
  ctx.stroke();
  paintLabel(ctx, view, `Chuỗi ${state.streak}`, arena.width / 2, groundY + 80, 32, state.streak >= 5 ? theme.star : theme.light);
  if (caught || (state.last === 'caught' && state.lastAgo < 1.2)) paintLabel(ctx, view, 'Vướng dây rồi!', arena.width / 2, handY - 190, 40);
  else if (state.score === 0 && state.time < 4) paintLabel(ctx, view, 'Chạm để nhảy khi dây tới chân', arena.width / 2, handY - 190, 30);
}

