// Train switch's picture: the countryside seen from above, the tunnel the trains come out of, rails on
// sleepers (the branch a fork is not set to is faded), round fork buttons with an arrow toward their branch,
// four stations with a coloured roof and their sign, and trains (an engine and a wagon carrying the sign) in
// their colour. An arriving train cheers at the right station, droops at a wrong one.
import { bob, paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { EDGES, FORK_NODES, FORK_RADIUS, FORKS, SIGNS, STATION_NODE, trainPoint, type TrainSwitchState } from './logic';

const colourOf = (view: DrawView, c: number): string => [view.theme.primary, view.theme.secondary, view.theme.star, view.theme.leaf][c] ?? view.theme.primary;

function paintTrack(ctx: CanvasRenderingContext2D, view: DrawView, state: TrainSwitchState, e: number, alpha: number): void {
  const [a, b] = EDGES[e] ?? [0, 0];
  const p = state.nodes[a];
  const q = state.nodes[b];
  if (!p || !q) return;
  const len = Math.hypot(q.x - p.x, q.y - p.y);
  const ux = (q.x - p.x) / len;
  const uy = (q.y - p.y) / len;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = view.theme.woodEdge;
  ctx.lineWidth = 7;
  ctx.beginPath();
  for (let d = 10; d < len; d += 24) {
    ctx.moveTo(p.x + ux * d - uy * 17, p.y + uy * d + ux * 17);
    ctx.lineTo(p.x + ux * d + uy * 17, p.y + uy * d - ux * 17);
  }
  ctx.stroke();
  ctx.strokeStyle = view.theme.stoneEdge;
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (const side of [-1, 1]) {
    ctx.moveTo(p.x - uy * 10 * side, p.y + ux * 10 * side);
    ctx.lineTo(q.x - uy * 10 * side, q.y + ux * 10 * side);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function paintCar(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, angle: number, colour: string, engine: boolean, sign: string | null): void {
  const { theme } = view;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = theme.ink;
  for (const wx of [-18, 18]) for (const wy of [-21, 21]) ctx.fillRect(wx - 7, wy - 4, 14, 8);
  ctx.fillStyle = colour;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, -32, -20, 64, 40, 10);
  ctx.fill();
  ctx.stroke();
  if (engine) {
    ctx.fillStyle = theme.ink;
    ctx.beginPath();
    ctx.arc(18, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.light;
    roundRect(ctx, -26, -14, 22, 28, 5);
    ctx.fill();
  }
  ctx.restore();
  if (sign) view.sprites.draw(ctx, sign as (typeof SIGNS)[number], x, y, 34);
}

export function drawTrainSwitch(ctx: CanvasRenderingContext2D, state: TrainSwitchState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = theme.leaf;
  for (let i = 0; i < 18; i += 1) {
    ctx.beginPath();
    ctx.arc((i * 211) % arena.width, (i * 137) % arena.height, 30 + (i % 4) * 12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  EDGES.forEach((_, e) => {
    const from = EDGES[e]?.[0] ?? 0;
    const fork = FORKS[from];
    const off = fork !== undefined && fork[state.forks[from] ?? 0] !== e;
    paintTrack(ctx, view, state, e, off ? 0.35 : 1);
  });

  // Tunnel.
  const tunnel = state.nodes[0];
  if (tunnel) {
    ctx.fillStyle = theme.stone;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(tunnel.x, tunnel.y, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = theme.ink;
    ctx.beginPath();
    ctx.arc(tunnel.x, tunnel.y, 26, 0, Math.PI * 2);
    ctx.fill();
  }

  // Stations.
  for (let k = 0; k < 4; k += 1) {
    const p = state.nodes[STATION_NODE + k];
    if (!p) continue;
    const w = state.landscape ? 70 : 96;
    const h = state.landscape ? 96 : 70;
    ctx.fillStyle = theme.light;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4;
    roundRect(ctx, p.x - w / 2, p.y - h / 2, w, h, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = colourOf(view, k);
    roundRect(ctx, p.x - w / 2 + 6, p.y - h / 2 + 6, w - 12, h - 12, 10);
    ctx.fill();
    sprites.draw(ctx, SIGNS[k] ?? 'star', p.x, p.y, 48);
  }

  for (const t of state.trains) {
    const fade = t.arrived >= 0 ? Math.max(0, 1 - t.arrived / 1.2) : 1;
    ctx.globalAlpha = fade;
    const wagon = trainPoint(state, t, 70);
    const engine = trainPoint(state, t, 0);
    paintCar(ctx, view, wagon.x, wagon.y, wagon.angle, colourOf(view, t.colour), false, SIGNS[t.colour] ?? null);
    paintCar(ctx, view, engine.x, engine.y, engine.angle, colourOf(view, t.colour), true, null);
    if (t.arrived >= 0) paintLabel(ctx, view, t.right ? 'Đúng ga!' : 'Nhầm ga', engine.x, engine.y - 60 - t.arrived * 30, 30, t.right ? theme.star : theme.light);
    ctx.globalAlpha = 1;
  }

  // Forks on top, so they are never hidden by a train.
  for (const n of FORK_NODES) {
    const p = state.nodes[n];
    const fork = FORKS[n];
    if (!p || !fork) continue;
    const edge = EDGES[fork[state.forks[n] ?? 0] ?? fork[0]];
    const to = state.nodes[edge?.[1] ?? 0] ?? p;
    const angle = Math.atan2(to.y - p.y, to.x - p.x);
    const pop = (state.switchedAgo[n] ?? 9) < 0.2 && !view.reducedMotion ? 1.12 : 1;
    ctx.fillStyle = theme.light;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, FORK_RADIUS * 0.82 * pop + bob(view, 3, 1.5, n), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.fillStyle = theme.primary;
    ctx.beginPath();
    ctx.moveTo(28, 0);
    ctx.lineTo(4, -20);
    ctx.lineTo(4, -8);
    ctx.lineTo(-24, -8);
    ctx.lineTo(-24, 8);
    ctx.lineTo(4, 8);
    ctx.lineTo(4, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
