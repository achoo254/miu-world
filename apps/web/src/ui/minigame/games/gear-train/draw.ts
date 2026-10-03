// Gear train's picture: a mill workshop wall, the crank wheel on the left (turning all the time), the millstone
// on the right (turning once joined, with flour puffs), pegs as brass studs, gears with teeth (turning with
// the crank when joined, the right way round), the tray of spare gears, and a shake when a gear will not fit.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { HUD_SAFE_TOP } from '../../types';
import { END_RADIUS, TRAY_SCALE, type GearState } from './logic';

function paintGear(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, r: number, angle: number, colour: string): void {
  const { theme } = view;
  const teeth = Math.max(8, Math.round(r / 6));
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = colour;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let k = 0; k < teeth * 2; k += 1) {
    const a = (k / (teeth * 2)) * Math.PI * 2;
    const rr = k % 2 === 0 ? r : r - 9;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.ink;
  ctx.fillRect(-r * 0.5, -4, r, 8);
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawGearTrain(ctx: CanvasRenderingContext2D, state: GearState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 3;
  for (let x = 0; x < arena.width; x += 70) {
    ctx.beginPath();
    ctx.moveTo(x, HUD_SAFE_TOP - 20);
    ctx.lineTo(x, arena.height);
    ctx.stroke();
  }
  const turn = view.reducedMotion ? state.turn * 0.3 : state.turn;
  paintGear(ctx, view, state.crank.x, state.crank.y, END_RADIUS, turn, theme.danger);
  paintLabel(ctx, view, 'Tay quay', state.crank.x, state.crank.y + END_RADIUS + 22, 22, theme.light);
  const millAngle = state.millTurning ? -turn : 0;
  paintGear(ctx, view, state.mill.x, state.mill.y, END_RADIUS, millAngle, theme.stone);
  paintLabel(ctx, view, 'Cối xay', state.mill.x, state.mill.y + END_RADIUS + 22, 22, theme.light);
  if (state.millTurning) sprites.draw(ctx, 'cloud', state.mill.x + 40, state.mill.y - 50 - state.doneAgo * 30, 60, { alpha: Math.max(0, 1 - state.doneAgo / 1.6) });

  state.pegs.forEach((p, i) => {
    ctx.fillStyle = theme.star;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (p.gear > 0) {
      const dir = state.driven.get(i);
      const angle = dir ? dir * turn * (END_RADIUS / p.gear) : 0;
      paintGear(ctx, view, p.x, p.y, p.gear, angle, dir ? theme.primary : theme.secondary);
    }
  });
  // The tray.
  const wide = arena.width > arena.height;
  ctx.fillStyle = theme.woodEdge;
  ctx.globalAlpha = 0.6;
  if (wide) roundRect(ctx, arena.width - 165, HUD_SAFE_TOP + 10, 150, arena.height - HUD_SAFE_TOP - 20, 20);
  else roundRect(ctx, 15, arena.height - 175, arena.width - 30, 155, 20);
  ctx.fill();
  ctx.globalAlpha = 1;
  state.tray.forEach((g, i) => {
    if (g.on >= 0) return;
    const shake = state.rejectedAgo < 0.3 && i === state.held ? Math.sin(state.rejectedAgo * 60) * 5 : 0;
    const r = i === state.held ? g.r : g.r * TRAY_SCALE;
    paintGear(ctx, view, g.x + shake, g.y, r, 0, theme.secondary);
  });
  const label = state.doneAgo >= 0 ? 'Cối xay quay rồi!' : 'Kéo bánh răng vào chốt';
  paintLabel(ctx, view, label, wide ? (arena.width - 170) / 2 : arena.width / 2, HUD_SAFE_TOP + 4, 30, state.doneAgo >= 0 ? theme.star : theme.light);
}
