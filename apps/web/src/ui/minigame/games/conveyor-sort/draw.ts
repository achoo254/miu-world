// Conveyor sort's picture: a market stall wall, the conveyor belt running down the middle (rollers turning,
// side rails), things riding it, the front one glowing with arrows either side; two baskets at the bottom
// under their signs (two pictures and a word); a sorted thing arcs into its basket, a wrong one bounces off.
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { frontThing, PAIRS, type ConveyorState, type SortGroup, type Thing } from './logic';

/** Signs never go up under the HUD. */
const SIGN_TOP = 190;

function paintBelt(ctx: CanvasRenderingContext2D, view: DrawView, state: ConveyorState): void {
  const { theme } = view;
  const left = state.beltX - state.beltW / 2;
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.8;
  ctx.fillRect(left, 0, state.beltW, state.endY + 20);
  ctx.globalAlpha = 1;
  // Slats moving down with the belt.
  ctx.fillStyle = theme.stone;
  const gap = 46;
  for (let y = (state.belt % gap) - gap; y < state.endY + 10; y += gap) ctx.fillRect(left + 8, y, state.beltW - 16, 30);
  // Rails.
  ctx.fillStyle = theme.stoneEdge;
  ctx.fillRect(left - 12, 0, 12, state.endY + 30);
  ctx.fillRect(left + state.beltW, 0, 12, state.endY + 30);
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, left - 20, state.endY + 10, state.beltW + 40, 24, 12);
  ctx.fill();
}

function paintSign(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, group: SortGroup, w: number): void {
  const { theme, sprites } = view;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 6;
  roundRect(ctx, x - w / 2, y - 64, w, 112, 18);
  ctx.fill();
  ctx.stroke();
  sprites.draw(ctx, group.things[0], x - w * 0.2, y - 22, 56);
  sprites.draw(ctx, group.things[1] ?? group.things[0], x + w * 0.2, y - 22, 56);
  ctx.font = `800 28px ${theme.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = theme.ink;
  ctx.fillText(group.label, x, y + 26);
}

function paintThing(ctx: CanvasRenderingContext2D, view: DrawView, state: ConveyorState, thing: Thing, isFront: boolean): void {
  const { sprites, theme } = view;
  if (thing.sent) {
    const t = Math.min(1, thing.sent.t / 0.35);
    const x = thing.sent.side === 'left' ? state.leftX : state.rightX;
    if (thing.sent.right) {
      sprites.draw(ctx, thing.picture, state.beltX + (x - state.beltX) * t, thing.y + (state.basketY - 30 - thing.y) * t - Math.sin(t * Math.PI) * 120, 90 - 30 * t, { alpha: 1.3 - t });
    } else {
      // Bounces off the basket's rim and away.
      const after = Math.max(0, thing.sent.t - 0.35);
      sprites.draw(ctx, thing.picture, state.beltX + (x - state.beltX) * t + after * (x < state.beltX ? -500 : 500), thing.y + (state.basketY - 80 - thing.y) * t - Math.sin(t * Math.PI) * 100 + after * 300, 80, { alpha: 1 - after / 0.3, rotate: after * 8 });
    }
    return;
  }
  if (thing.fell >= 0) {
    sprites.draw(ctx, thing.picture, state.beltX, thing.y + thing.fell * 260, 84, { alpha: 1 - thing.fell / 0.6 });
    return;
  }
  if (isFront) {
    ctx.fillStyle = theme.star;
    ctx.globalAlpha = 0.45 + 0.2 * Math.sin(view.time * 8);
    ctx.beginPath();
    ctx.arc(state.beltX, thing.y, 62, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    paintLabel(ctx, view, '◀', state.beltX - 120, thing.y, 46, theme.star);
    paintLabel(ctx, view, '▶', state.beltX + 120, thing.y, 46, theme.star);
  }
  sprites.draw(ctx, thing.picture, state.beltX, thing.y, 92);
}

export function drawConveyorSort(ctx: CanvasRenderingContext2D, state: ConveyorState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, arena.height, 4);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, state.basketY - 40, arena.width, arena.height);
  paintBelt(ctx, view, state);
  const pair = PAIRS[state.signs];
  const signY = Math.min(state.basketY - 150, Math.max(SIGN_TOP, state.basketY - 260));
  if (pair) {
    const w = Math.min(220, (state.beltX - state.beltW / 2 - 24) * 2 - 20, (state.rightX - state.beltX) * 1.1);
    paintSign(ctx, view, state.leftX, signY, pair[0], w);
    paintSign(ctx, view, state.rightX, signY, pair[1], w);
  }
  sprites.draw(ctx, 'basket', state.leftX, state.basketY, 150);
  sprites.draw(ctx, 'basket', state.rightX, state.basketY, 150);
  const front = frontThing(state);
  for (const thing of state.things) paintThing(ctx, view, state, thing, thing === front);
}
