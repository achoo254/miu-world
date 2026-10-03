// Seesaw logic's picture: a park with the question on a sign (a rock for "heaviest", a feather for "lightest"),
// the seesaws in a grid, each tipped toward its heavier friend, and the friends standing in a line on the grass
// to be picked. A right pick jumps for joy; a wrong one shrugs while a hint seesaw drops in.
import { bob, paintGround, paintHills, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { Friend, Seesaw, SeesawLogicState } from './logic';

export const FRIEND_PICTURES: Readonly<Record<Friend, SpriteRef>> = {
  cat: 'cat',
  rabbit: 'rabbit',
  fox: 'fox',
  dog: 'dog-face',
  panda: 'panda',
  penguin: 'penguin',
  frog: 'frog',
  duck: 'duck',
};

function paintSeesaw(ctx: CanvasRenderingContext2D, view: DrawView, state: SeesawLogicState, seesaw: Seesaw, x: number, y: number, width: number): void {
  const { theme, sprites } = view;
  const leftHeavier = (state.rank[seesaw.left] ?? 0) > (state.rank[seesaw.right] ?? 0);
  // A new hint swings into place.
  const age = state.time - seesaw.shownAt;
  const settle = view.reducedMotion ? 1 : Math.min(1, age / 0.5);
  const tilt = (leftHeavier ? -1 : 1) * 0.28 * settle;
  const post = width * 0.18;
  ctx.fillStyle = theme.woodEdge;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y - 6);
  ctx.lineTo(x + post * 0.6, y + post);
  ctx.lineTo(x - post * 0.6, y + post);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.translate(x, y - 6);
  // Canvas angles turn clockwise: a negative angle lowers the left end.
  ctx.rotate(tilt);
  ctx.fillStyle = theme.wood;
  roundRect(ctx, -width / 2, -8, width, 16, 8);
  ctx.fill();
  ctx.stroke();
  const size = Math.min(110, width * 0.36);
  const left = state.friends[seesaw.left];
  const right = state.friends[seesaw.right];
  if (left) sprites.draw(ctx, FRIEND_PICTURES[left], -width / 2 + size * 0.5, -size * 0.45, size);
  if (right) sprites.draw(ctx, FRIEND_PICTURES[right], width / 2 - size * 0.5, -size * 0.45, size, { flipX: true });
  ctx.restore();
  if (age < 0.8 && state.seesaws.indexOf(seesaw) >= state.friends.length - 1) {
    sprites.draw(ctx, 'sparkles', x, y - size, 50, { alpha: 1 - age / 0.8 });
  }
}

export function drawSeesawLogic(ctx: CanvasRenderingContext2D, state: SeesawLogicState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const lineY = state.spots[0]?.y ?? arena.height - 90;
  const groundY = lineY - state.spotRadius - 40;
  paintSky(ctx, view, groundY, 6);
  paintHills(ctx, view, groundY, 40, 60, theme.leaf);
  paintGround(ctx, view, groundY);

  // The question sign.
  const heavy = state.question === 'heaviest';
  const signY = HUD_SAFE_TOP + 36;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  roundRect(ctx, arena.width / 2 - 170, signY - 32, 340, 64, 22);
  ctx.fill();
  ctx.stroke();
  sprites.draw(ctx, heavy ? 'rock' : 'feather', arena.width / 2 - 130, signY, 52);
  paintLabel(ctx, view, heavy ? 'Ai nặng nhất?' : 'Ai nhẹ nhất?', arena.width / 2 + 24, signY + 2, 36, theme.primary);

  // The seesaws: a grid between the sign and the grass.
  const top = signY + 50;
  const bottom = groundY - 10;
  const count = state.seesaws.length;
  // The number of columns that gives the widest seesaws.
  const widthFor = (c: number): number => Math.min(320, (arena.width - 20) / c - 30, ((bottom - top) / Math.ceil(count / c)) * 1.7);
  let cols = 1;
  for (let c = 2; c <= count; c += 1) if (widthFor(c) > widthFor(cols)) cols = c;
  const rows = Math.ceil(count / cols);
  const cellW = (arena.width - 20) / cols;
  const cellH = (bottom - top) / rows;
  const width = widthFor(cols);
  for (const [i, seesaw] of state.seesaws.entries()) {
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, count - row * cols);
    const col = i % cols;
    const x = arena.width / 2 + (col - (inRow - 1) / 2) * cellW;
    const y = top + (row + 0.62) * cellH;
    paintSeesaw(ctx, view, state, seesaw, x, y, width);
  }

  for (const [i, spot] of state.spots.entries()) {
    const friend = state.friends[i];
    if (!friend) continue;
    const since = state.time - state.pickedAt;
    let dy = bob(view, 2, 3, i);
    let dx = 0;
    if (i === state.picked && !view.reducedMotion) {
      if (state.pickedRight) dy -= Math.abs(Math.sin(since * 9)) * 30;
      else if (since < 0.5) dx = Math.sin(since * 40) * 8;
    }
    paintShadow(ctx, view, spot.x, spot.y + state.spotRadius * 0.8, state.spotRadius * 1.5);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = i === state.picked ? (state.pickedRight ? theme.star : theme.light) : theme.light;
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, state.spotRadius * 1.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    sprites.draw(ctx, FRIEND_PICTURES[friend], spot.x + dx, spot.y + dy, state.spotRadius * 1.7);
    if (i === state.picked && state.pickedRight) sprites.draw(ctx, 'sparkles', spot.x + 30, spot.y - state.spotRadius - since * 20, 44);
    if (i === state.picked && !state.pickedRight && since < 1) paintLabel(ctx, view, '?', spot.x + state.spotRadius * 0.8, spot.y - state.spotRadius, 40, theme.light);
  }
}
