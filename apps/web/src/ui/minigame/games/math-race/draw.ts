// Math race's picture: a wooden sign with the sum under the HUD, a four-lane road with the cars (the child's
// red racing car in its own highlighted lane, with a flame while it is boosted), a chequered finish, and three
// answer bubbles along the bottom. The sign flashes green-ish (the leaf colour) after a right answer and wobbles
// after a wrong one; a place badge shows at the finish.
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { TRACK, type MathRaceState } from './logic';

export const CARS: readonly SpriteName[] = ['racing-car', 'automobile', 'fire-engine', 'bus'];

export function drawMathRace(ctx: CanvasRenderingContext2D, state: MathRaceState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const signY = HUD_SAFE_TOP + 36;
  const roadTop = signY + 56;
  const roadBottom = (state.buttons[0]?.y ?? arena.height - 100) - state.buttonRadius - 14;
  const laneH = (roadBottom - roadTop) / state.cars.length;
  paintSky(ctx, view, roadTop, 10);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, roadBottom, arena.width, arena.height - roadBottom);

  // Road and lanes; the child's lane is lighter.
  ctx.fillStyle = theme.stoneEdge;
  ctx.fillRect(0, roadTop, arena.width, roadBottom - roadTop);
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = theme.light;
  ctx.fillRect(0, roadTop, arena.width, laneH);
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.light;
  const dash = view.reducedMotion ? 0 : (state.time * 120) % 60;
  for (let lane = 1; lane < state.cars.length; lane += 1) {
    for (let x = -dash; x < arena.width; x += 60) ctx.fillRect(x, roadTop + lane * laneH - 2, 30, 4);
  }
  const startX = 60;
  const finishX = arena.width - 70;
  const cell = 14;
  for (let row = 0; row * cell < roadBottom - roadTop; row += 1) {
    for (let col = 0; col < 2; col += 1) {
      ctx.fillStyle = (row + col) % 2 === 0 ? theme.ink : theme.light;
      ctx.fillRect(finishX + col * cell, roadTop + row * cell, cell, Math.min(cell, roadBottom - roadTop - row * cell));
    }
  }

  const size = Math.min(laneH * 1.0, 110);
  for (const car of state.cars) {
    const x = startX + (finishX - startX) * Math.min(1.08, car.at / TRACK);
    const y = roadTop + (car.id + 0.5) * laneH;
    const me = car.id === 0;
    const wobble = me && state.slow > 0 && !view.reducedMotion ? Math.sin(state.time * 30) * 0.12 : 0;
    if (me && state.boost > 0 && car.finishedAt < 0) sprites.draw(ctx, 'fire', x - size * 0.75, y + 4, size * 0.55, { rotate: -Math.PI / 2 });
    sprites.draw(ctx, CARS[car.id] ?? 'automobile', x, y, size, { rotate: wobble, flipX: true });
  }
  if (state.place > 0) {
    const y = roadTop + laneH / 2;
    sprites.draw(ctx, state.place === 1 ? 'trophy' : 'star', finishX - size, y - laneH * 0.2, size * 0.8);
    paintLabel(ctx, view, `Về thứ ${state.place}!`, arena.width / 2, (roadTop + roadBottom) / 2, 54, theme.star);
  }

  // The sign.
  const signW = Math.min(arena.width - 40, 360);
  const shake = !state.lastRight && state.answeredAgo < 0.4 && !view.reducedMotion ? Math.sin(state.answeredAgo * 50) * 8 : 0;
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(arena.width / 2 - 6 + shake, signY + 30, 12, roadTop - signY - 30);
  ctx.fillStyle = state.lastRight && state.answeredAgo < 0.35 ? theme.leaf : theme.wood;
  roundRect(ctx, arena.width / 2 - signW / 2 + shake, signY - 34, signW, 68, 16);
  ctx.fill();
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 6;
  ctx.stroke();
  paintLabel(ctx, view, state.sum.text, arena.width / 2 + shake, signY + 2, 44);

  // The answers.
  state.sum.options.forEach((value, i) => {
    const b = state.buttons[i];
    if (!b) return;
    const pressed = state.lastButton === i && state.answeredAgo < 0.15 ? 0.9 : 1;
    const r = state.buttonRadius * pressed;
    ctx.fillStyle = theme.secondary;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = theme.ink;
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = theme.light;
    ctx.beginPath();
    ctx.arc(b.x - r * 0.3, b.y - r * 0.35, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    paintLabel(ctx, view, `${value}`, b.x, b.y + 2, Math.min(52, r * 0.85));
  });
}
