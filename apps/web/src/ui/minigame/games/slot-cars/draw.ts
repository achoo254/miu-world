// Slot cars' picture: a play mat with the oval track (two slots, red-and-white kerbs on the bends, a
// chequered start line), the two cars as little racers with their drivers (the child's character and Cáo),
// "Nhả tay!" when she is too fast coming up to a bend, a spinning car and a bump when one flies off, the
// laps of both cars, and the winner at the end.
import { paintLabel, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import type { DrawView } from '../../types';
import { BEND_SPEED, LAPS, lapLength, placeOn, section, TOP_SPEED, type SlotCarsState } from './logic';

function paintTrack(ctx: CanvasRenderingContext2D, view: DrawView, state: SlotCarsState): void {
  const { theme } = view;
  const outline = (r: number): void => {
    const steps = 80;
    const L = lapLength(state, r);
    ctx.beginPath();
    for (let i = 0; i <= steps; i += 1) {
      const p = placeOn(state, r, (L * i) / steps);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
  };
  ctx.lineJoin = 'round';
  // Kerbs on the bends, then the asphalt band, then the slots.
  ctx.strokeStyle = theme.stoneEdge;
  ctx.lineWidth = 130;
  outline(state.radius);
  ctx.stroke();
  for (const r of [state.radius - 62, state.radius + 62]) {
    const L = lapLength(state, r);
    for (let d = 0; d < L; d += 22) {
      if (!section(state, r, d).bend) continue;
      const p = placeOn(state, r, d);
      ctx.fillStyle = Math.floor(d / 22) % 2 === 0 ? theme.danger : theme.light;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  for (const r of [state.childR, state.rivalR]) {
    outline(r);
    ctx.stroke();
  }
  // The start line.
  const a = placeOn(state, state.radius - 62, 0);
  const b = placeOn(state, state.radius + 62, 0);
  for (let i = 0; i < 8; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? theme.light : theme.ink;
    const t = i / 8;
    ctx.beginPath();
    ctx.arc(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintCar(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, angle: number, colour: string, driver: SpriteRef, spin: number): void {
  const { theme, sprites } = view;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + spin);
  ctx.fillStyle = colour;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  roundRect(ctx, -34, -20, 68, 40, 14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.ink;
  for (const [wx, wy] of [[-22, -24], [18, -24], [-22, 18], [18, 18]] as const) ctx.fillRect(wx, wy, 14, 6);
  ctx.restore();
  sprites.draw(ctx, driver, x, y - 6, 40);
}

export function drawSlotCars(ctx: CanvasRenderingContext2D, state: SlotCarsState, view: DrawView): void {
  const { arena, theme } = view;
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, arena.width, arena.height);
  paintTrack(ctx, view, state);

  const rival = placeOn(state, state.rivalR, state.rival.d);
  paintCar(ctx, view, rival.x, rival.y, rival.angle, theme.secondary, 'fox', 0);
  const child = placeOn(state, state.childR, state.child.d);
  const spin = state.child.crashed >= 0 && !view.reducedMotion ? state.child.crashed * 14 : 0;
  const off = state.child.crashed >= 0 ? Math.sin(Math.min(1, state.child.crashed * 3) * Math.PI) * 50 : 0;
  paintCar(ctx, view, child.x + Math.cos(child.angle - Math.PI / 2) * off, child.y + Math.sin(child.angle - Math.PI / 2) * off, child.angle, theme.danger, view.player, spin);

  // Speed bar in the middle of the oval: green up to the bend speed.
  const w = Math.min(260, state.half * 2);
  const x = state.cx - w / 2;
  const y = state.cy + 20;
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.3;
  roundRect(ctx, x - 6, y - 6, w + 12, 32, 16);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.leaf;
  roundRect(ctx, x, y, (w * BEND_SPEED) / TOP_SPEED, 20, 10);
  ctx.fill();
  ctx.fillStyle = theme.star;
  ctx.fillRect(x + (w * BEND_SPEED) / TOP_SPEED, y, w * (1 - BEND_SPEED / TOP_SPEED), 20);
  ctx.fillStyle = theme.light;
  ctx.fillRect(x + (w * state.child.speed) / TOP_SPEED - 3, y - 6, 6, 32);
  paintLabel(ctx, view, `Vòng ${Math.min(LAPS, state.child.laps + 1)}/${LAPS}`, state.cx, state.cy - 30, 34);
  const s = section(state, state.childR, state.child.d);
  if (state.child.crashed < 0 && state.child.speed > BEND_SPEED && s.toBend < 160) paintLabel(ctx, view, 'Nhả tay!', state.cx, state.cy - 80, 40, theme.star);
  if (state.finished) paintLabel(ctx, view, state.finished === 'child' ? 'Về nhất!' : 'Cáo về trước rồi', state.cx, state.cy + 90, 48, state.finished === 'child' ? theme.star : theme.light);
}
