// Road cross's picture: the pavement at the bottom, a three-lane road with dashed lines and cars and buses
// driving both ways, a grass strip in the middle, a river with logs and turtle rafts drifting, and the far
// bank with lotus flowers. The frog hops with a little arc; a splash or a bump shows where it went wrong.
import { bob, paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { HOP_SECONDS, rowY, type Lane, type RoadCrossState, type Thing } from './logic';

function paintThing(ctx: CanvasRenderingContext2D, view: DrawView, state: RoadCrossState, lane: Lane, thing: Thing, y: number): void {
  const { theme, sprites } = view;
  const left = lane.speed < 0;
  const size = state.rowH * 0.95;
  if (thing.kind === 'car') sprites.draw(ctx, 'automobile', thing.x, y, Math.min(thing.w, size * 1.6), { flipX: !left });
  else if (thing.kind === 'bus') sprites.draw(ctx, 'bus', thing.x, y, Math.min(thing.w, size * 2.4), { flipX: !left });
  else if (thing.kind === 'log') {
    ctx.fillStyle = theme.wood;
    ctx.strokeStyle = theme.woodEdge;
    ctx.lineWidth = 4;
    roundRect(ctx, thing.x - thing.w / 2, y - state.rowH * 0.36, thing.w, state.rowH * 0.72, state.rowH * 0.36);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(thing.x + (left ? -1 : 1) * (thing.w / 2 - 14), y, 8, state.rowH * 0.24, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    const n = 3;
    for (let i = 0; i < n; i += 1) sprites.draw(ctx, 'turtle', thing.x + (i - 1) * (thing.w / n), y + bob(view, 3, 2, i), Math.min(size, thing.w / n + 6), { flipX: !left });
  }
}

export function drawRoadCross(ctx: CanvasRenderingContext2D, state: RoadCrossState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, arena.width, arena.height);
  state.lanes.forEach((lane, row) => {
    const y = rowY(state, row);
    const top = y - state.rowH / 2;
    if (lane.kind === 'road') {
      ctx.fillStyle = theme.stoneEdge;
      ctx.fillRect(0, top, arena.width, state.rowH + 1);
      const next = state.lanes[row + 1];
      if (next?.kind === 'road') {
        ctx.fillStyle = theme.light;
        for (let x = 10; x < arena.width; x += 80) ctx.fillRect(x, top - 3, 44, 6);
      }
    } else if (lane.kind === 'river') {
      ctx.fillStyle = theme.water;
      ctx.fillRect(0, top, arena.width, state.rowH + 1);
      ctx.strokeStyle = theme.waterLight;
      ctx.lineWidth = 3;
      for (let x = ((view.time * lane.speed) % 90) - 90; x < arena.width + 90; x += 90) {
        ctx.beginPath();
        ctx.moveTo(x, y + 6);
        ctx.quadraticCurveTo(x + 15, y - 2, x + 30, y + 6);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = row === 0 ? theme.stone : theme.ground;
      ctx.fillRect(0, top, arena.width, state.rowH + 1);
    }
  });
  const topRow = state.lanes.length - 1;
  for (let x = 40; x < arena.width; x += 160) sprites.draw(ctx, 'lotus', x, rowY(state, topRow), state.rowH * 0.8);
  state.lanes.forEach((lane, row) => {
    for (const thing of lane.things) paintThing(ctx, view, state, lane, thing, rowY(state, row));
  });

  // The frog: an arc while hopping.
  let x = state.frogX;
  let y = rowY(state, state.frogRow);
  let lift = 0;
  if (state.hop >= 0) {
    const p = Math.min(1, state.hop / HOP_SECONDS);
    x = state.hopFromX + (state.frogX - state.hopFromX) * p;
    y = rowY(state, state.hopFromRow) + (rowY(state, state.frogRow) - rowY(state, state.hopFromRow)) * p;
    lift = Math.sin(p * Math.PI) * 18;
  }
  sprites.draw(ctx, 'frog', x, y - lift, state.rowH * 0.95, { squash: state.hop >= 0 ? [0.9, 1.1] : [1, 1] });
  if (state.splashAgo < 0.5) sprites.draw(ctx, 'droplet', x, y - 20 - state.splashAgo * 40, 50, { alpha: 1 - state.splashAgo / 0.5 });
  if (state.bumpAgo < 0.5) sprites.draw(ctx, 'collision', x, y - 10, 70, { alpha: 1 - state.bumpAgo / 0.5 });
  if (state.homeAgo < 1) paintLabel(ctx, view, 'Qua rồi!', arena.width / 2, rowY(state, topRow) + state.rowH, 48, theme.star);
}
