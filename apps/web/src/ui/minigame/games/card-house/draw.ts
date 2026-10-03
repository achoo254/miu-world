// Card house's picture: a castle hall with a wooden table, the cards already standing (leaning in A shapes,
// flat ones across), a dashed outline where the next card goes, the deck and the card in the hand (turning to
// the place's angle as it gets close), the house swaying with the wobble meter at the side (green to red), a
// floor tumbling down, and a crown on a finished house.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { CardHouseState, Slot } from './logic';

const THICK = 16;

function paintCard(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, angle: number, length: number, ghost = false): void {
  const { theme } = view;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (ghost) {
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    roundRect(ctx, -THICK / 2, -length / 2, THICK, length, 5);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    ctx.fillStyle = theme.danger;
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 3;
    roundRect(ctx, -THICK / 2, -length / 2, THICK, length, 5);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

export function drawCardHouse(ctx: CanvasRenderingContext2D, state: CardHouseState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.stone;
  ctx.fillRect(0, 0, arena.width, arena.height);
  const base = state.slots[0];
  const tableY = base ? base.y + (base.length * Math.cos(0.35)) / 2 : arena.height - 60;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, tableY, arena.width, arena.height - tableY);
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(0, tableY, arena.width, 10);

  // The house sways around its base.
  const sway = view.reducedMotion ? 0 : Math.sin(view.time * 18) * state.wobble * 0.05;
  const pivotX = base ? base.x + base.length * 0.6 : arena.width / 2;
  ctx.save();
  ctx.translate(pivotX, tableY);
  ctx.rotate(sway);
  ctx.translate(-pivotX, -tableY);
  const standing = state.slots.slice(0, state.placed);
  standing.forEach((s: Slot, i) => {
    const drop = i === state.placed - 1 ? Math.max(0, 1 - (state.time - state.placedAt) / 0.15) * 20 : 0;
    paintCard(ctx, view, s.x, s.y - drop, s.angle, s.length);
  });
  ctx.restore();
  const next = state.slots[state.placed];
  if (next && state.phase === 'build') paintCard(ctx, view, next.x, next.y, next.angle, next.length, true);
  // A floor tumbling down.
  if (state.phase === 'fall') {
    const t = state.phaseAgo;
    for (const i of state.fallen) {
      const s = state.slots[i];
      if (s) paintCard(ctx, view, s.x + (i % 2 === 0 ? -1 : 1) * t * 120, s.y + t * t * 500, s.angle + t * 4 * (i % 2 === 0 ? -1 : 1), s.length);
    }
  }
  if (state.phase === 'done') {
    const top = state.slots[state.slots.length - 1];
    if (top) sprites.draw(ctx, 'crown', top.x, top.y - top.length * 0.8, 80);
    paintLabel(ctx, view, 'Xong nhà!', arena.width / 2, 170, 48, theme.star);
  }

  // Deck and the card in the hand.
  const { deck } = state;
  for (let k = 3; k >= 0; k -= 1) {
    ctx.fillStyle = theme.danger;
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 3;
    roundRect(ctx, deck.x - 40 + k * 3, deck.y - 56 + k * 3, 80, 112, 10);
    ctx.fill();
    ctx.stroke();
  }
  sprites.draw(ctx, 'heart', deck.x, deck.y, 40);
  if (state.holding && next) {
    const d = Math.hypot(state.hand.x - next.x, state.hand.y - next.y);
    const turn = Math.max(0, 1 - d / 200);
    const shake = state.speed > 700 && !view.reducedMotion ? Math.sin(view.time * 60) * 6 : 0;
    paintCard(ctx, view, state.hand.x + shake, state.hand.y, next.angle * turn, next.length);
  }
  // Wobble meter.
  const mx = 30;
  const my = 130;
  const mh = Math.min(220, tableY - my - 20);
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.3;
  roundRect(ctx, mx - 12, my, 24, mh, 12);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = state.wobble > 0.6 ? theme.danger : state.wobble > 0.3 ? theme.star : theme.leaf;
  const fill = Math.max(0.05, state.wobble) * mh;
  roundRect(ctx, mx - 12, my + mh - fill, 24, fill, 12);
  ctx.fill();
}
