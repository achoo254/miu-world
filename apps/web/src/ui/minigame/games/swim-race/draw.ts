// Swim race's picture: a pool seen from the side of the lanes, with lane ropes of bright floats, a start
// wall and a chequered finish wall; the three rivals and the child (bottom lane) gliding along with a white
// wake, their places shown as they touch the wall; under the pool, the rhythm rings: a ring closing in on
// the goal ring once a beat, flashing on a good stroke, and "Mệt…" with a drop of sweat after an off-beat tap.
import { bob, paintLabel, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import type { DrawView } from '../../types';
import { toNearestBeat, type SwimState, type Swimmer } from './logic';

const RIVALS = ['penguin', 'frog', 'duck'] as const;
const GOAL_RING = 58;

function paintPool(ctx: CanvasRenderingContext2D, view: DrawView, state: SwimState): void {
  const { arena, theme } = view;
  ctx.fillStyle = theme.stone;
  ctx.fillRect(0, 0, arena.width, arena.height);
  const top = state.laneTop - 16;
  const bottom = state.laneTop + state.laneH * 4 + 16;
  const gradient = ctx.createLinearGradient(0, top, 0, bottom);
  gradient.addColorStop(0, theme.waterLight);
  gradient.addColorStop(1, theme.water);
  ctx.fillStyle = gradient;
  roundRect(ctx, state.poolLeft - 30, top, state.poolRight - state.poolLeft + 60, bottom - top, 18);
  ctx.fill();
  // Lane ropes: rows of floats in two colours.
  for (let lane = 1; lane < 4; lane += 1) {
    const y = state.laneTop + lane * state.laneH;
    for (let x = state.poolLeft - 10, i = 0; x < state.poolRight + 20; x += 26, i += 1) {
      ctx.fillStyle = i % 2 === 0 ? theme.danger : theme.light;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Walls: start (stone) and finish (chequered).
  ctx.fillStyle = theme.stoneEdge;
  ctx.fillRect(state.poolLeft - 34, top, 14, bottom - top);
  const cell = 14;
  for (let y = top, row = 0; y < bottom; y += cell, row += 1) {
    for (let c = 0; c < 2; c += 1) {
      ctx.fillStyle = (row + c) % 2 === 0 ? theme.ink : theme.light;
      ctx.fillRect(state.poolRight + 16 + c * cell, y, cell, Math.min(cell, bottom - y));
    }
  }
}

function paintSwimmer(ctx: CanvasRenderingContext2D, view: DrawView, state: SwimState, swimmer: Swimmer, lane: number, picture: SpriteRef, alpha: number): void {
  const { theme, sprites } = view;
  const y = state.laneTop + (lane + 0.5) * state.laneH;
  const x = state.poolLeft + swimmer.progress * (state.poolRight - state.poolLeft);
  const size = Math.min(84, state.laneH * 0.85);
  // The wake behind.
  if (swimmer.place === 0) {
    ctx.strokeStyle = theme.light;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 4;
    for (let i = 1; i <= 3; i += 1) {
      ctx.beginPath();
      ctx.arc(x - size * 0.4 - i * 16, y + 8, 10 + i * 3, -0.9, 0.9);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  sprites.draw(ctx, picture, x, y + bob(view, 9, 4, lane), size, { alpha, flipX: true });
  if (swimmer.place > 0) paintLabel(ctx, view, String(swimmer.place), x - size * 0.75, y - size * 0.35, 36, swimmer.place === 1 ? theme.star : theme.light);
}

export function drawSwimRace(ctx: CanvasRenderingContext2D, state: SwimState, view: DrawView): void {
  const { theme, sprites, arena } = view;
  paintPool(ctx, view, state);
  state.rivals.forEach((r, i) => paintSwimmer(ctx, view, state, r, i, RIVALS[i] ?? 'duck', 1));
  paintSwimmer(ctx, view, state, state.child, 3, view.player, state.tired > 0 ? 0.6 : 1);
  if (state.tired > 0) {
    const x = state.poolLeft + state.child.progress * (state.poolRight - state.poolLeft);
    sprites.draw(ctx, 'droplet', x + 34, state.laneTop + 3.1 * state.laneH, 30);
  }

  // The rhythm rings.
  const { ringX, ringY } = state;
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.25;
  roundRect(ctx, ringX - 190, ringY - 95, 380, 190, 40);
  ctx.fill();
  ctx.globalAlpha = 1;
  const flash = state.strokeAgo < 0.2 ? 1 - state.strokeAgo / 0.2 : 0;
  ctx.fillStyle = theme.star;
  ctx.globalAlpha = 0.25 + flash * 0.6;
  ctx.beginPath();
  ctx.arc(ringX, ringY, GOAL_RING, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(ringX, ringY, GOAL_RING, 0, Math.PI * 2);
  ctx.stroke();
  if (state.child.place === 0) {
    // Closing in once a beat: it meets the goal ring on the beat.
    const untilBeat = toNearestBeat(state) >= 0 ? toNearestBeat(state) : toNearestBeat(state) + state.beat;
    const radius = GOAL_RING + (untilBeat / state.beat) * 110;
    ctx.strokeStyle = theme.star;
    ctx.lineWidth = 8;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(ringX, ringY, Math.min(radius, 92), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  sprites.draw(ctx, view.player, ringX, ringY, 64);
  if (state.verdict && state.verdictAgo < 0.6) {
    const good = state.verdict === 'good';
    paintLabel(ctx, view, good ? 'Tốt!' : 'Mệt…', ringX + (arena.width > 700 ? 250 : 0), ringY - (arena.width > 700 ? 0 : 120), 40, good ? theme.star : theme.light);
  }
}
