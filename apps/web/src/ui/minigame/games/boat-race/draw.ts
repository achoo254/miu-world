// Boat race's picture: a river seen from above scrolling down past the child's canoe (green banks with trees,
// ripples, buoy lines between lanes), rival canoes with a frog, a duck and a turtle, the chequered finish,
// paddle splashes on the side just stroked, two big drum pads at the bottom corners lighting in turn at the
// beat, a progress strip on the side, and the place at the end.
import { paintLabel, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import type { DrawView } from '../../types';
import { BEAT_MAX, BEAT_MIN, FINISH, RIVAL_SPRITES, type Boat, type BoatState } from './logic';

/** Where the finishing place is written, under the HUD. */
const HUD_LABEL_Y = 180;

export function drawBoatRace(ctx: CanvasRenderingContext2D, state: BoatState, view: DrawView): void {
  const { arena, sprites, theme } = view;
  const riverW = state.laneWidth * state.lanes;
  const left = (arena.width - riverW) / 2;
  const playerScreenY = arena.height * 0.68;
  const toScreen = (y: number): number => playerScreenY - (y - state.player.y);
  // Banks and water.
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.fillStyle = theme.water;
  ctx.fillRect(left, 0, riverW, arena.height);
  ctx.fillStyle = theme.waterLight;
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 18; i += 1) {
    const y = ((i * 97 + state.player.y) % (arena.height + 100)) - 50;
    roundRect(ctx, left + ((i * 131) % riverW), y, 50, 6, 3);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 8; i += 1) {
    const y = ((i * 210 + state.player.y * 1) % (arena.height + 200)) - 100;
    if (left > 50) {
      sprites.draw(ctx, 'deciduous-tree', left / 2, y, Math.min(110, left * 0.9));
      sprites.draw(ctx, 'deciduous-tree', arena.width - left / 2, y + 100, Math.min(110, left * 0.9));
    }
  }
  // Buoy lines.
  ctx.fillStyle = theme.danger;
  for (let lane = 1; lane < state.lanes; lane += 1) {
    const x = left + lane * state.laneWidth;
    for (let k = 0; k < 14; k += 1) {
      const y = ((k * 70 + state.player.y) % (arena.height + 70)) - 35;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Finish line.
  const fy = toScreen(FINISH);
  if (fy > -40 && fy < arena.height + 40) {
    for (let k = 0; k < riverW / 30; k += 1) {
      for (let row = 0; row < 2; row += 1) {
        ctx.fillStyle = (k + row) % 2 === 0 ? theme.ink : theme.light;
        ctx.fillRect(left + k * 30, fy - 30 + row * 15, 30, 15);
      }
    }
  }

  const paintBoat = (b: Boat, rider: SpriteRef, mine: boolean): void => {
    const x = left + (b.lane + 0.5) * state.laneWidth;
    const y = toScreen(b.y);
    if (y < -120 || y > arena.height + 120) return;
    const yaw = mine ? state.yaw : view.reducedMotion ? 0 : Math.sin(view.time * 7 + b.lane) * 0.05;
    // A long canoe seen from above, pointing up the river.
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(yaw);
    ctx.fillStyle = theme.woodEdge;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 30, 80, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = mine ? theme.primary : theme.wood;
    ctx.beginPath();
    ctx.ellipse(0, 4, 20, 62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    sprites.draw(ctx, rider, x, y - 6, 70);
  };
  state.rivals.forEach((r, i) => paintBoat(r, RIVAL_SPRITES[i] ?? 'frog', false));
  paintBoat(state.player, view.player, true);

  // Splash on the last stroke's side.
  if (state.sinceStroke < 0.3 && state.lastStroke) {
    const x = left + (state.player.lane + 0.5) * state.laneWidth + (state.lastStroke === 'left' ? -50 : 50);
    const t = state.sinceStroke / 0.3;
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x, playerScreenY + 20, 14 + t * 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (state.strokeKind === 'good' && state.sinceStroke < 0.4) paintLabel(ctx, view, 'Đều tay!', arena.width / 2, playerScreenY - 110, 34, theme.star);

  // Drum pads: the next side to stroke glows on the beat.
  const next = state.lastStroke === 'left' ? 'right' : 'left';
  const ready = state.sinceStroke >= BEAT_MIN && state.sinceStroke <= BEAT_MAX;
  for (const side of ['left', 'right'] as const) {
    const x = side === 'left' ? 70 : arena.width - 70;
    const y = arena.height - 70;
    const lit = side === next && (ready || state.lastStroke === null);
    ctx.fillStyle = lit ? theme.star : theme.light;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 5;
    ctx.globalAlpha = lit ? 1 : 0.6;
    ctx.beginPath();
    ctx.arc(x, y, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    sprites.draw(ctx, 'drum', x, y, 64);
    ctx.globalAlpha = 1;
  }

  // Progress strip.
  const stripX = arena.width - 18;
  const stripTop = 130;
  const stripH = arena.height - 260;
  ctx.fillStyle = theme.light;
  roundRect(ctx, stripX - 6, stripTop, 12, stripH, 6);
  ctx.fill();
  const mark = (b: Boat, colour: string): void => {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(stripX, stripTop + stripH * (1 - Math.min(1, b.y / FINISH)), 9, 0, Math.PI * 2);
    ctx.fill();
  };
  for (const r of state.rivals) mark(r, theme.stoneEdge);
  mark(state.player, theme.primary);

  if (state.player.finished >= 0) paintLabel(ctx, view, state.place === 1 ? 'Về nhất!' : `Về thứ ${state.place}`, arena.width / 2, HUD_LABEL_Y, 60, theme.star);
}

