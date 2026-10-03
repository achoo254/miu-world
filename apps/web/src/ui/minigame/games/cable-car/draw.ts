// Cable car's picture: snowy peaks, the cable running flat through the wooden station then up the mountain,
// cabins hanging from it with four windows (a face in each taken seat), the boarding gate glowing while a cabin
// stands in it, and the groups waiting on the platform, each with a big number of how many they are.
import { bob, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import type { DrawView } from '../../types';
import type { Cabin, CableCarState } from './logic';
import { cabinPoint, freeSeats, SEATS } from './logic';

export const RIDERS: readonly SpriteRef[] = ['rabbit', 'bear', 'fox', 'panda', 'penguin', 'cat-face', 'dog-face', 'monkey-face'];
const face = (i: number): SpriteRef => RIDERS[i % RIDERS.length] ?? 'rabbit';

const CABIN_W = 150;
const CABIN_H = 104;

function paintMountains(ctx: CanvasRenderingContext2D, view: DrawView, baseY: number): void {
  const { arena, theme } = view;
  const peaks = [
    [0.15, 0.55],
    [0.5, 0.85],
    [0.88, 0.7],
  ] as const;
  for (const [fx, fh] of peaks) {
    const x = arena.width * fx;
    const h = (baseY - 60) * fh;
    ctx.fillStyle = theme.stone;
    ctx.beginPath();
    ctx.moveTo(x - h * 0.9, baseY);
    ctx.lineTo(x, baseY - h);
    ctx.lineTo(x + h * 0.9, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = theme.light;
    ctx.beginPath();
    ctx.moveTo(x - h * 0.3, baseY - h * 0.66);
    ctx.lineTo(x, baseY - h);
    ctx.lineTo(x + h * 0.3, baseY - h * 0.66);
    ctx.lineTo(x + h * 0.1, baseY - h * 0.72);
    ctx.lineTo(x - h * 0.08, baseY - h * 0.62);
    ctx.closePath();
    ctx.fill();
  }
}

function paintCabin(ctx: CanvasRenderingContext2D, view: DrawView, state: CableCarState, cabin: Cabin): void {
  const { theme, sprites } = view;
  const p = cabinPoint(state, cabin.s);
  const since = state.time - cabin.boardedAt;
  const swing = view.reducedMotion ? 0 : Math.sin(state.time * 2 + cabin.s * 0.01) * 0.04 + (since < 0.6 ? Math.sin(since * 18) * 0.08 * (1 - since / 0.6) : 0);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(swing);
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 34);
  ctx.stroke();
  ctx.fillStyle = theme.danger;
  roundRect(ctx, -CABIN_W / 2, 34, CABIN_W, CABIN_H, 20);
  ctx.fill();
  ctx.stroke();
  const win = (CABIN_W - 20) / SEATS;
  for (let i = 0; i < SEATS; i += 1) {
    const wx = -CABIN_W / 2 + 10 + i * win;
    ctx.fillStyle = theme.waterLight;
    roundRect(ctx, wx + 3, 48, win - 6, 56, 10);
    ctx.fill();
    const rider = cabin.seats[i] ?? -1;
    if (rider >= 0) sprites.draw(ctx, face(rider), wx + win / 2, 78, win - 4);
  }
  // Free seats, counted big on the cabin's side.
  paintLabel(ctx, view, String(freeSeats(cabin)), 0, 34 + CABIN_H - 14, 28, theme.light);
  ctx.restore();
}

export function drawCableCar(ctx: CanvasRenderingContext2D, state: CableCarState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const platformY = state.stationY + CABIN_H + 70;
  paintSky(ctx, view, platformY, 5);
  paintMountains(ctx, view, platformY);
  // Snow field and the platform.
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, platformY, arena.width, arena.height - platformY);
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, platformY - 12, arena.width, 24);
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(0, platformY + 8, arena.width, 6);

  // The station roof over the gate, and the gate glowing when a cabin waits in it.
  const gateMid = (state.gateLeft + state.gateRight) / 2;
  const open = state.cabins.some((c) => {
    const p = cabinPoint(state, c.s);
    return p.y === state.stationY && p.x >= state.gateLeft && p.x <= state.gateRight;
  });
  ctx.globalAlpha = open ? 0.45 + 0.15 * Math.sin(view.time * 8) : 0.18;
  ctx.fillStyle = open ? theme.star : theme.light;
  roundRect(ctx, state.gateLeft - 10, state.stationY + 20, state.gateRight - state.gateLeft + 20, platformY - state.stationY - 20, 16);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(state.gateLeft - 18, state.stationY - 40, 14, platformY - state.stationY + 30);
  ctx.fillRect(state.gateRight + 4, state.stationY - 40, 14, platformY - state.stationY + 30);
  ctx.fillStyle = theme.primary;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(state.gateLeft - 50, state.stationY - 30);
  ctx.lineTo(gateMid, state.stationY - 90);
  ctx.lineTo(state.gateRight + 50, state.stationY - 30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // The cable.
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  const a = cabinPoint(state, 0);
  const b = cabinPoint(state, state.climbX + 160);
  const c = cabinPoint(state, state.climbX + 160 + 1600);
  ctx.moveTo(a.x - 100, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.stroke();
  for (const cabin of state.cabins) paintCabin(ctx, view, state, cabin);

  // Waiting groups.
  for (const group of state.groups) {
    const since = state.time - group.refusedAt;
    const shake = since < 0.45 && !view.reducedMotion ? Math.sin(since * 40) * 9 : 0;
    const gx = group.x + shake;
    const w = state.groupW - 16;
    paintShadow(ctx, view, gx, state.queueY + 60, w);
    ctx.fillStyle = theme.light;
    ctx.globalAlpha = 0.75;
    roundRect(ctx, gx - w / 2, state.queueY - 66, w, 126, 22);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = since < 0.45 ? theme.danger : theme.secondary;
    ctx.lineWidth = 5;
    ctx.stroke();
    const n = group.faces.length;
    const size = Math.min(54, (w - 16) / Math.min(n, 2));
    for (const [k, rider] of group.faces.entries()) {
      const col = k % 2;
      const row = Math.floor(k / 2);
      const cols = Math.min(2, n - row * 2);
      const fx = gx + (col - (cols - 1) / 2) * size;
      const fy = state.queueY - 30 + row * size * 0.9 + bob(view, 3, 2, k + group.joinedAt);
      sprites.draw(ctx, face(rider), fx, fy, size);
    }
    paintLabel(ctx, view, String(n), gx + w / 2 - 20, state.queueY - 56, 34, theme.star);
  }
}
