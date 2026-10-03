// Swing push's picture: a festival ground, two tall bamboo poles with a beam, the swing on its two ropes with
// the child on the seat, the red ribbon hanging high on its string with a sparkle, and a glowing ring at the
// back high point that lights up while a push would count. A trail of dots shows how high the swing goes.
import { bob, paintGround, paintHills, paintLabel, paintSky, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { fromBackPeak, PUSH_WINDOW, type SwingState } from './logic';

function paintBamboo(ctx: CanvasRenderingContext2D, view: DrawView, x: number, top: number, bottom: number): void {
  const { theme } = view;
  ctx.fillStyle = theme.leaf;
  roundRect(ctx, x - 11, top, 22, bottom - top, 10);
  ctx.fill();
  ctx.fillStyle = theme.woodEdge;
  for (let y = top + 50; y < bottom; y += 70) ctx.fillRect(x - 12, y, 24, 6);
}

export function drawSwingPush(ctx: CanvasRenderingContext2D, state: SwingState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const groundY = arena.height - 50;
  paintSky(ctx, view, groundY, 8);
  paintHills(ctx, view, groundY - 10, 30, 80, theme.leaf);
  paintGround(ctx, view, groundY);

  const { pivotX, pivotY, rope } = state;
  // On a tall screen a string of festival lanterns fills the sky above the swing.
  if (pivotY - HUD_SAFE_TOP > 220) {
    const y = HUD_SAFE_TOP + 70;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y - 30);
    ctx.quadraticCurveTo(arena.width / 2, y + 30, arena.width, y - 30);
    ctx.stroke();
    for (let x = 60; x < arena.width; x += 120) {
      const sag = y - 30 + 60 * (1 - ((x - arena.width / 2) / (arena.width / 2)) ** 2) * 0.5;
      sprites.draw(ctx, 'red-paper-lantern', x, sag + 34 + bob(view, 2, 3, x), 64);
    }
  }
  const span = Math.min(arena.width / 2 - 30, Math.sin(1.3) * rope + 40);
  paintBamboo(ctx, view, pivotX - span, pivotY - 20, groundY + 10);
  paintBamboo(ctx, view, pivotX + span, pivotY - 20, groundY + 10);
  ctx.fillStyle = theme.wood;
  roundRect(ctx, pivotX - span - 20, pivotY - 24, span * 2 + 40, 20, 10);
  ctx.fill();

  // The ribbon on its string, from the beam.
  const rx = pivotX + Math.sin(state.ribbon) * rope;
  const ry = pivotY + Math.cos(state.ribbon) * rope - 40;
  const appear = Math.min(1, state.grabbedAgo / 0.4);
  ctx.globalAlpha = appear;
  ctx.strokeStyle = theme.danger;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(rx, pivotY - 6);
  ctx.lineTo(rx, ry - 20);
  ctx.stroke();
  sprites.draw(ctx, 'ribbon', rx, ry + bob(view, 3, 4), 70, { rotate: view.reducedMotion ? 0 : Math.sin(view.time * 2) * 0.15 });
  sprites.draw(ctx, 'sparkles', rx + 32, ry - 26, 30, { alpha: 0.6 + 0.4 * Math.sin(view.time * 5) });
  ctx.globalAlpha = 1;

  // Dots along the arc up to the swing's height on each side.
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.5;
  for (let a = -state.amplitude; a <= state.amplitude; a += 0.12) {
    ctx.beginPath();
    ctx.arc(pivotX + Math.sin(a) * rope, pivotY + Math.cos(a) * rope + 30, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // The push point behind: a ring that lights up while a push counts.
  const backX = pivotX - Math.sin(state.amplitude) * rope;
  const backY = pivotY + Math.cos(state.amplitude) * rope;
  const open = !state.pushed && fromBackPeak(state.phase) <= PUSH_WINDOW;
  ctx.lineWidth = 8;
  ctx.strokeStyle = open ? theme.star : theme.light;
  ctx.globalAlpha = open ? 0.95 : 0.35;
  ctx.beginPath();
  ctx.arc(backX, backY, 56, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  if (open) paintLabel(ctx, view, 'Nhún!', backX, backY - 80, 32, theme.star);

  // Ropes, seat and child.
  const seatX = pivotX + Math.sin(state.angle) * rope;
  const seatY = pivotY + Math.cos(state.angle) * rope;
  const across = { x: Math.cos(state.angle) * 34, y: -Math.sin(state.angle) * 34 };
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(pivotX - 30, pivotY - 6);
  ctx.lineTo(seatX - across.x, seatY - across.y);
  ctx.moveTo(pivotX + 30, pivotY - 6);
  ctx.lineTo(seatX + across.x, seatY + across.y);
  ctx.stroke();
  const pushSquash = view.reducedMotion ? 0 : Math.max(0, 1 - state.pushAgo / 0.25) * 0.12;
  sprites.draw(ctx, view.player, seatX, seatY - 44, 96, { rotate: state.angle, squash: [1 + pushSquash, 1 - pushSquash] });
  ctx.save();
  ctx.translate(seatX, seatY);
  ctx.rotate(-state.angle);
  ctx.fillStyle = theme.wood;
  roundRect(ctx, -48, -6, 96, 16, 6);
  ctx.fill();
  ctx.restore();

  if (state.badAgo < 0.6) {
    ctx.globalAlpha = 1 - state.badAgo / 0.6;
    paintLabel(ctx, view, 'Chưa tới lúc', seatX, seatY + 60, 28, theme.light);
    ctx.globalAlpha = 1;
  }
  if (state.grabbedAgo < 1) {
    ctx.globalAlpha = 1 - state.grabbedAgo;
    paintLabel(ctx, view, 'Lấy được lộc!', arena.width / 2, groundY - 40, 40, theme.star);
    ctx.globalAlpha = 1;
  }
}
