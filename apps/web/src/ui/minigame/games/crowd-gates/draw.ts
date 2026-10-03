// Crowd gates' picture: a road through the park seen from above, two lanes, gate pairs sliding down with their
// sums on bright boards (green for more, red for fewer), the crowd of little friends running in a bunch (a
// badge with the count; it pops on every change), the chequered finish line and the stuck car with its sign
// "Cần 30 bạn", pushed out with a cheer when there are enough friends.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { NEEDED, opText, type CrowdState, type GateOp } from './logic';

const RUNNERS = ['cat', 'rabbit', 'fox', 'bear', 'panda', 'penguin', 'frog', 'monkey-face'] as const;
export { RUNNERS };

function paintGate(ctx: CanvasRenderingContext2D, view: DrawView, op: GateOp, x: number, y: number, w: number, faded: boolean): void {
  const { theme } = view;
  const good = op.kind !== '-';
  ctx.globalAlpha = faded ? 0.35 : 0.9;
  ctx.fillStyle = good ? theme.leaf : theme.danger;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, x - w / 2, y - 40, w, 80, 16);
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 1;
  paintLabel(ctx, view, opText(op), x, y + 2, 50, theme.light);
}

export function drawCrowdGates(ctx: CanvasRenderingContext2D, state: CrowdState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const [left, right] = state.lanes;
  const roadW = (right - left) * 2;
  const speed = (state.crowdY - state.topY) / state.travel;
  const scroll = state.time * speed;
  // Grass and road.
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.fillStyle = theme.leaf;
  for (let y = ((scroll % 140) - 140); y < arena.height; y += 140) {
    for (const x of [30, arena.width - 30]) {
      ctx.beginPath();
      ctx.arc(x, y, 26, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const roadX = (left + right) / 2 - roadW / 2;
  ctx.fillStyle = theme.stone;
  ctx.fillRect(roadX, 0, roadW, arena.height);
  ctx.fillStyle = theme.light;
  for (let y = (scroll % 80) - 80; y < arena.height; y += 80) ctx.fillRect((left + right) / 2 - 4, y, 8, 44);
  ctx.fillStyle = theme.stoneEdge;
  ctx.fillRect(roadX - 8, 0, 8, arena.height);
  ctx.fillRect(roadX + roadW, 0, 8, arena.height);

  // Gates on their way down.
  const gateW = roadW / 2 - 24;
  for (const pair of state.pairs) {
    const y = state.crowdY - (pair.at - state.time) * speed;
    if (y < state.topY - 60 || y > arena.height + 60) continue;
    pair.ops.forEach((op, lane) => paintGate(ctx, view, op, lane === 0 ? left : right, y, gateW, pair.taken >= 0 && pair.taken !== lane));
  }

  // Finish line and the stuck car.
  const finishY = state.crowdY - (state.finishAt - state.time) * speed;
  if (finishY > state.topY - 200) {
    const pushed = state.finishedAgo >= 0 && state.crowd >= NEEDED ? Math.min(1, state.finishedAgo / 1.2) : 0;
    for (let k = 0; k < roadW / 30; k += 1) {
      ctx.fillStyle = k % 2 === 0 ? theme.ink : theme.light;
      ctx.fillRect(roadX + k * 30, finishY, 30, 15);
      ctx.fillStyle = k % 2 === 0 ? theme.light : theme.ink;
      ctx.fillRect(roadX + k * 30, finishY + 15, 30, 15);
    }
    const carY = finishY - 90 - pushed * 300;
    ctx.fillStyle = theme.groundDeep;
    ctx.beginPath();
    ctx.ellipse((left + right) / 2, finishY - 60, roadW * 0.35, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    sprites.draw(ctx, 'automobile', (left + right) / 2, carY, 150, { rotate: -Math.PI / 2 });
    paintLabel(ctx, view, `Cần ${NEEDED} bạn`, (left + right) / 2, carY - 100, 30, theme.star);
  }

  // The crowd: a bunch of friends (up to 30 drawn) around its centre.
  const shown = Math.min(30, state.crowd);
  const pop = view.reducedMotion ? 0 : Math.max(0, 1 - state.changedAgo / 0.3) * 0.25;
  const cx = state.crowdX;
  const cy = state.finishedAgo >= 0 ? state.crowdY - Math.min(1, state.finishedAgo / 1.2) * 120 : state.crowdY;
  for (let i = shown - 1; i >= 0; i -= 1) {
    const ring = Math.floor(Math.sqrt(i));
    const a = i * 2.4;
    const r = ring * 24;
    const hop = view.reducedMotion ? 0 : Math.abs(Math.sin(view.time * 12 + i)) * 5;
    sprites.draw(ctx, RUNNERS[i % RUNNERS.length] ?? 'cat', cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.7 - hop, 40 * (1 + pop));
  }
  const badgeY = cy - 30 - Math.sqrt(shown) * 18 - 34;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, cx - 50, badgeY - 26, 100, 52, 26);
  ctx.fill();
  ctx.stroke();
  paintLabel(ctx, view, String(state.crowd), cx, badgeY + 2, 38 * (1 + pop), state.crowd >= NEEDED ? theme.leaf : theme.primary);
  if (state.changedAgo < 0.8 && state.lastChange !== 0) {
    paintLabel(ctx, view, state.lastChange > 0 ? `+${state.lastChange}` : `${state.lastChange}`, cx + 80, badgeY - 20 - state.changedAgo * 40, 32, state.lastChange > 0 ? theme.star : theme.danger);
  }
  if (state.finishedAgo >= 0) {
    paintLabel(ctx, view, state.crowd >= NEEDED ? 'Đẩy được xe rồi!' : 'Ít bạn quá, lần sau nhé', arena.width / 2, arena.height * 0.35, 40, state.crowd >= NEEDED ? theme.star : theme.light);
  }
}
