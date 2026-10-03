// Sink or float's picture: a belt with rollers across the top that ends over a glass tank of water. The thing
// about to drop carries the child's guess as a big arrow; dropped things splash in, then bob on the surface or
// sink to the sand at the bottom, with a star (right) or a little "ồ" (wrong) for a moment. Two round buttons
// beside the tank (under it on a tall screen) guess by tapping: an arrow up "Nổi", an arrow down "Chìm".
import { bob, paintGround, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView, Point } from '../../types';
import { FALL_SECONDS, SETTLE_SECONDS, thingX, type SinkFloatState, type Thing } from './logic';

function arrow(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, up: boolean, fill: string, edge: string): void {
  const d = up ? -1 : 1;
  ctx.beginPath();
  ctx.moveTo(x, y + d * size * 0.55);
  ctx.lineTo(x + size * 0.5, y);
  ctx.lineTo(x + size * 0.2, y);
  ctx.lineTo(x + size * 0.2, y - d * size * 0.5);
  ctx.lineTo(x - size * 0.2, y - d * size * 0.5);
  ctx.lineTo(x - size * 0.2, y);
  ctx.lineTo(x - size * 0.5, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 4;
  ctx.stroke();
}

function paintButton(ctx: CanvasRenderingContext2D, view: DrawView, at: Point, r: number, up: boolean): void {
  const { theme } = view;
  ctx.fillStyle = theme.light;
  ctx.beginPath();
  ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  ctx.stroke();
  arrow(ctx, at.x, at.y - 8, r * 0.9, up, up ? theme.secondary : theme.groundDeep, theme.ink);
  paintLabel(ctx, view, up ? 'Nổi' : 'Chìm', at.x, at.y + r * 0.62, 22);
}

/** Where a dropped thing is: falling into the water, then bobbing at the top or lying at the bottom. */
function droppedAt(state: SinkFloatState, thing: Thing, view: DrawView): Point {
  const { tank } = state;
  const since = state.time - thing.dropAt;
  const surface = tank.y + 34;
  if (since < FALL_SECONDS) {
    const t = since / FALL_SECONDS;
    return { x: state.dropX + (thing.settleX - state.dropX) * t, y: state.beltY + (surface - state.beltY) * t * t };
  }
  const t = Math.min(1, (since - FALL_SECONDS) / SETTLE_SECONDS);
  if (thing.floats) return { x: thing.settleX, y: surface + 30 * Math.sin(t * Math.PI) + bob(view, 2.5, 4, thing.settleX) };
  return { x: thing.settleX, y: surface + (tank.y + tank.h - 50 - surface) * (1 - (1 - t) * (1 - t)) };
}

export function drawSinkFloat(ctx: CanvasRenderingContext2D, state: SinkFloatState, view: DrawView): void {
  const { theme, sprites } = view;
  const { tank } = state;
  paintSky(ctx, view, tank.y + tank.h, 6);
  paintGround(ctx, view, tank.y + tank.h - 10);

  // The tank: water, sand, glass.
  ctx.fillStyle = theme.water;
  ctx.globalAlpha = 0.75;
  ctx.fillRect(tank.x, tank.y + 30, tank.w, tank.h - 30);
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.groundDeep;
  ctx.fillRect(tank.x, tank.y + tank.h - 28, tank.w, 28);
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = tank.x; x <= tank.x + tank.w; x += 12) {
    const y = tank.y + 30 + (view.reducedMotion ? 0 : Math.sin(x / 20 + view.time * 3) * 3);
    if (x === tank.x) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Things already in the water (the latest few).
  const dropped = state.things.filter((t) => state.time >= t.dropAt).slice(-7);
  for (const thing of dropped) {
    const p = droppedAt(state, thing, view);
    const age = state.time - thing.dropAt;
    sprites.draw(ctx, thing.sprite, p.x, p.y, 74, { alpha: age > 9 ? Math.max(0.2, 1 - (age - 9) / 4) : 1 });
    if (thing.right !== null && age < FALL_SECONDS + 1.2) {
      if (thing.right) sprites.draw(ctx, 'star', p.x + 40, p.y - 40, 44);
      else paintLabel(ctx, view, 'ồ', p.x + 40, p.y - 40, 34, theme.light);
    }
  }

  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 6;
  roundRect(ctx, tank.x, tank.y, tank.w, tank.h, 16);
  ctx.stroke();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = theme.light;
  ctx.fillRect(tank.x + 14, tank.y + 44, 10, tank.h - 90);
  ctx.globalAlpha = 1;

  // The belt.
  const belt = state.beltY + 34;
  ctx.fillStyle = theme.stoneEdge;
  roundRect(ctx, state.beltLeft - 20, belt, state.dropX - state.beltLeft + 40, 24, 12);
  ctx.fill();
  ctx.fillStyle = theme.stone;
  const roll = view.reducedMotion ? 0 : (state.time * 60) % 40;
  for (let x = state.beltLeft + roll; x < state.dropX + 10; x += 40) {
    ctx.beginPath();
    ctx.arc(x, belt + 12, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const thing of state.things) {
    if (thing.dropAt <= state.time) continue;
    const x = thingX(state, thing);
    if (x < -60) continue;
    sprites.draw(ctx, thing.sprite, x, state.beltY - 2, 78);
    if (thing.guess) arrow(ctx, x + 48, state.beltY - 48, 46, thing.guess === 'float', thing.guess === 'float' ? theme.secondary : theme.groundDeep, theme.ink);
  }

  paintButton(ctx, view, state.upButton, state.buttonRadius, true);
  paintButton(ctx, view, state.downButton, state.buttonRadius, false);
}
