// Lift numbers' picture: a tall building with a big number on each floor, the lift shaft and the lift car with
// its riders, everyone holding a card that reads "4 chục 7" (and shows four ten-sticks and seven dots), the
// lobby with friends waiting, and a happy friend stepping out where they wanted to go.
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import type { DrawView } from '../../types';
import type { LiftNumbersState, Rider } from './logic';
import { FLOORS, rowY } from './logic';

export const RIDER_FACES: readonly SpriteRef[] = ['rabbit', 'bear', 'fox', 'panda', 'cat-face', 'monkey-face'];

/** A rider's card: "4 chục 7" over four sticks and seven dots. */
function paintCard(ctx: CanvasRenderingContext2D, view: DrawView, rider: Rider, x: number, y: number): void {
  const { theme } = view;
  const tens = Math.floor(rider.want / 10);
  const ones = rider.want % 10;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  roundRect(ctx, x - 52, y - 24, 104, 48, 10);
  ctx.fill();
  ctx.stroke();
  paintLabel(ctx, view, `${tens} chục ${ones}`, x, y - 8, 20, theme.primary);
  ctx.fillStyle = theme.secondary;
  for (let i = 0; i < tens; i += 1) ctx.fillRect(x - 46 + i * 7, y + 6, 4, 14);
  ctx.fillStyle = theme.danger;
  for (let i = 0; i < ones; i += 1) {
    ctx.beginPath();
    ctx.arc(x + 4 + (i % 5) * 9, y + 9 + Math.floor(i / 5) * 8, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawLiftNumbers(ctx: CanvasRenderingContext2D, state: LiftNumbersState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, arena.height, 4);
  const top = rowY(state, FLOORS) - state.rowH / 2;
  const left = 16;
  ctx.fillStyle = theme.stone;
  ctx.fillRect(left, top, arena.width - 32, state.lobbyY + state.rowH / 2 - top);
  for (let row = 0; row <= FLOORS; row += 1) {
    const y = rowY(state, row);
    ctx.fillStyle = row % 2 === 0 ? theme.light : theme.waterLight;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(left, y - state.rowH / 2 + 2, arena.width - 32, state.rowH - 4);
    ctx.globalAlpha = 1;
    const label = row === 0 ? 'Sảnh' : String(state.numbers[row - 1] ?? '');
    const isTarget = row === state.target;
    ctx.fillStyle = isTarget ? theme.star : theme.light;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    roundRect(ctx, left + 8, y - state.rowH * 0.38, 96, state.rowH * 0.76, 10);
    ctx.fill();
    ctx.stroke();
    paintLabel(ctx, view, label, left + 56, y + 2, row === 0 ? 26 : Math.min(40, state.rowH * 0.6), theme.ink);
  }
  // Shaft and car.
  const carW = 150;
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.2;
  ctx.fillRect(state.shaftX - carW / 2, top, carW, state.lobbyY + state.rowH / 2 - top);
  ctx.globalAlpha = 1;
  const carY = rowY(state, state.at);
  ctx.fillStyle = theme.star;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  roundRect(ctx, state.shaftX - carW / 2, carY - state.rowH / 2 + 3, carW, state.rowH - 6, 10);
  ctx.fill();
  ctx.stroke();
  const size = Math.min(44, state.rowH * 0.6);
  state.riders.forEach((r, i) => sprites.draw(ctx, RIDER_FACES[r.face] ?? 'rabbit', state.shaftX - carW / 2 + 22 + i * 35, carY, size));
  // Cards of the riders, beside the shaft.
  const cardX = state.shaftX + carW / 2 + 70;
  state.riders.forEach((r, i) => {
    if (cardX + 52 < arena.width) paintCard(ctx, view, r, cardX, rowY(state, FLOORS) + i * 56);
  });
  // Lobby queue.
  state.lobby.forEach((r, i) => {
    const x = Math.max(cardX, arena.width - 60 - i * 60);
    sprites.draw(ctx, RIDER_FACES[r.face] ?? 'rabbit', x, state.lobbyY, size);
  });
  if (state.lobby[0]) paintCard(ctx, view, state.lobby[0], Math.min(arena.width - 60, cardX + 20), state.lobbyY - state.rowH * 0.85);
  if (state.time - state.dropAt < 0.8) sprites.draw(ctx, 'sparkles', state.shaftX + carW / 2 + 20, rowY(state, state.dropRow), 50);
}
