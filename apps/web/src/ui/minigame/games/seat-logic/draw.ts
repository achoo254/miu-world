// Seat logic's picture: the castle hall, picture cards along the top (two faces with a heart = sit together,
// with a cross = not together, a crown with a face = the crown chair), the long feast table with its chairs
// (the first under a crown), guests on chairs or waiting in a line, the dragged guest under the finger.
// Broken cards blink red after a full table; a kept table makes everyone hop.
import { bob, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { Clue, Guest, SeatLogicState } from './logic';

export const GUEST_PICTURES: Readonly<Record<Guest, SpriteRef>> = {
  rabbit: 'rabbit',
  turtle: 'turtle',
  cat: 'cat',
  mouse: 'mouse-face',
  fox: 'fox',
  frog: 'frog',
  panda: 'panda',
  penguin: 'penguin',
};

function paintClue(ctx: CanvasRenderingContext2D, view: DrawView, state: SeatLogicState, clue: Clue, x: number, y: number, broken: boolean): void {
  const { theme, sprites } = view;
  const w = 150;
  const h = 66;
  ctx.fillStyle = broken && Math.sin(view.time * 12) > 0 ? theme.danger : theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 16);
  ctx.fill();
  ctx.stroke();
  const pic = (g: number): SpriteRef => GUEST_PICTURES[state.guests[g] ?? 'rabbit'];
  if (clue.kind === 'crown') {
    sprites.draw(ctx, 'crown', x - 32, y, 48);
    sprites.draw(ctx, pic(clue.a), x + 30, y, 54);
    return;
  }
  sprites.draw(ctx, pic(clue.a), x - 46, y, 52);
  sprites.draw(ctx, pic(clue.b), x + 46, y, 52);
  if (clue.kind === 'next') sprites.draw(ctx, 'heart', x, y, 36);
  else {
    ctx.strokeStyle = theme.danger;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x - 12, y - 12);
    ctx.lineTo(x + 12, y + 12);
    ctx.moveTo(x + 12, y - 12);
    ctx.lineTo(x - 12, y + 12);
    ctx.stroke();
  }
}

export function drawSeatLogic(ctx: CanvasRenderingContext2D, state: SeatLogicState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, arena.height, 2);
  ctx.fillStyle = theme.stone;
  ctx.globalAlpha = 0.6;
  ctx.fillRect(0, HUD_SAFE_TOP - 20, arena.width, arena.height);
  ctx.globalAlpha = 1;

  // Cards.
  const n = state.clues.length;
  const cols = Math.max(1, Math.min(n, Math.floor((arena.width - 20) / 165)));
  const rows = Math.ceil(n / cols);
  const tableY = state.chairs[0]?.y ?? arena.height / 2;
  const cardTop = HUD_SAFE_TOP + 10;
  const cardH = Math.min(80, (tableY - 90 - cardTop) / rows);
  state.clues.forEach((clue, i) => {
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, n - row * cols);
    paintClue(ctx, view, state, clue, arena.width / 2 + ((i % cols) - (inRow - 1) / 2) * 165, cardTop + 36 + row * cardH, state.broken.includes(i));
  });

  // Table and chairs.
  const first = state.chairs[0];
  const last = state.chairs.at(-1);
  if (first && last) {
    ctx.fillStyle = theme.wood;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 5;
    roundRect(ctx, first.x - 70, first.y + 30, last.x - first.x + 140, 40, 14);
    ctx.fill();
    ctx.stroke();
    sprites.draw(ctx, 'crown', first.x, first.y - 70, 48);
  }
  for (const chair of state.chairs) {
    ctx.fillStyle = theme.danger;
    roundRect(ctx, chair.x - 40, chair.y - 50, 80, 90, 16);
    ctx.fill();
  }
  const cheer = state.nextIn > 0;
  state.guests.forEach((guest, g) => {
    if (g === state.dragged && state.finger) return;
    const seat = state.seatOf[g] ?? -1;
    const at = seat >= 0 ? state.chairs[seat] : state.line[g];
    if (!at) return;
    const hop = cheer && !view.reducedMotion ? Math.abs(Math.sin(view.time * 9 + g)) * 20 : 0;
    if (g === state.selected) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = theme.star;
      ctx.beginPath();
      ctx.arc(at.x, at.y, 52, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    sprites.draw(ctx, GUEST_PICTURES[guest], at.x, at.y - hop + bob(view, 2, 2, g), 90);
  });
  const dragged = state.guests[state.dragged];
  if (dragged && state.finger) sprites.draw(ctx, GUEST_PICTURES[dragged], state.finger.x, state.finger.y, 100);
  if (cheer) paintLabel(ctx, view, 'Vua khen đẹp!', arena.width / 2, tableY + 110, 40, theme.star);
}
