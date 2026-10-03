// Head count's picture: a little house on a lawn with a big door and a side window, friends running in and
// out (one climbing through the window), the door swinging shut when the round ends, and four round number
// buttons below. On a replay a counter on the roof goes up and down with every friend.
import { paintGround, paintHills, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { insideAt, ROUNDS, type HeadCountState, type Visit } from './logic';

function runnerAt(state: HeadCountState, view: DrawView, v: Visit, t: number): { x: number; y: number; flip: boolean } | null {
  const k = (t - v.at) / state.runSeconds;
  if (k < 0 || k > 1) return null;
  const { house, groundY } = state;
  const door = { x: house.x + house.w / 2, y: groundY - 34 };
  const window = { x: v.side < 0 ? house.x + 40 : house.x + house.w - 40, y: house.y + house.h * 0.4 };
  const target = v.via === 'door' ? door : window;
  const edge = { x: v.side < 0 ? -60 : view.arena.width + 60, y: groundY - 34 };
  const from = v.dir === 'in' ? edge : target;
  const to = v.dir === 'in' ? target : edge;
  const hop = view.reducedMotion ? 0 : Math.abs(Math.sin(k * Math.PI * 4)) * 12;
  // Climbing to the window: run along the ground, then up.
  const climb = v.via === 'window' ? Math.max(0, (v.dir === 'in' ? k - 0.6 : 0.4 - k) / 0.4) : 0;
  const x = from.x + (to.x - from.x) * k;
  const y = v.via === 'window' ? groundY - 34 - (groundY - 34 - window.y) * climb : from.y + (to.y - from.y) * k - hop;
  return { x, y, flip: to.x < from.x };
}

export function drawHeadCount(ctx: CanvasRenderingContext2D, state: HeadCountState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { house, groundY } = state;
  paintSky(ctx, view, groundY, 10);
  paintHills(ctx, view, groundY - 10, 80, 70, theme.leaf);
  paintGround(ctx, view, groundY);

  // The house.
  ctx.fillStyle = theme.wood;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  roundRect(ctx, house.x, house.y, house.w, house.h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.danger;
  ctx.beginPath();
  ctx.moveTo(house.x - 30, house.y + 6);
  ctx.lineTo(house.x + house.w / 2, house.y - house.h * 0.42);
  ctx.lineTo(house.x + house.w + 30, house.y + 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Windows on both sides.
  for (const side of [-1, 1]) {
    const wx = side < 0 ? house.x + 40 : house.x + house.w - 40;
    const wy = house.y + house.h * 0.4;
    ctx.fillStyle = theme.waterLight;
    roundRect(ctx, wx - 28, wy - 26, 56, 52, 8);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(wx, wy - 26);
    ctx.lineTo(wx, wy + 26);
    ctx.moveTo(wx - 28, wy);
    ctx.lineTo(wx + 28, wy);
    ctx.stroke();
  }
  // The door: open while friends come and go, shut when it is time to count.
  const doorW = 74;
  const doorH = Math.min(110, house.h * 0.55);
  const dx = house.x + house.w / 2 - doorW / 2;
  const dy = groundY - doorH;
  ctx.fillStyle = theme.ink;
  roundRect(ctx, dx, dy, doorW, doorH, 8);
  ctx.fill();
  const shut = state.phase === 'ask' || state.phase === 'right' ? Math.min(1, state.phaseTime / 0.3) : 0;
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, dx, dy, doorW * (0.25 + 0.75 * shut), doorH, 8);
  ctx.fill();
  ctx.stroke();

  // Friends on the move.
  for (const v of state.visits) {
    const at = runnerAt(state, view, v, state.phaseTime);
    if (!at) continue;
    paintShadow(ctx, view, at.x, groundY - 4, 56);
    sprites.draw(ctx, v.who, at.x, at.y, 72, { flipX: at.flip });
  }

  const roofY = house.y - house.h * 0.42 - 34;
  if (state.phase === 'replay') {
    const n = insideAt(state.visits, state.runSeconds, state.phaseTime);
    ctx.fillStyle = theme.light;
    ctx.beginPath();
    ctx.arc(house.x + house.w / 2, roofY, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    paintLabel(ctx, view, String(n), house.x + house.w / 2, roofY + 2, 48, theme.star);
  } else if (state.phase === 'ask') {
    paintLabel(ctx, view, 'Trong nhà có mấy bạn?', arena.width / 2, Math.max(roofY, 140), 36, theme.light);
  } else if (state.phase === 'right') {
    paintLabel(ctx, view, `Đúng rồi, ${state.answer} bạn!`, arena.width / 2, Math.max(roofY, 140), 38, theme.star);
  }

  for (const c of state.choices) {
    if (state.phase !== 'ask' && state.phase !== 'right') break;
    const isPicked = state.picked === c.value;
    ctx.fillStyle = isPicked && state.phase === 'right' ? theme.leaf : theme.light;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    paintLabel(ctx, view, String(c.value), c.x, c.y + 2, 50, isPicked ? theme.star : theme.primary);
  }
  paintLabel(ctx, view, `Lượt ${Math.min(ROUNDS, state.rounds + 1)}/${ROUNDS}`, arena.width - 90, groundY + 40, 24, theme.light);
}
