// Fruit skewer's picture: a market table with the skewer on top (its handle on the left, the pattern's fruit on
// it, empty places as dashed rings and a "?" pulsing at the next one), and the belt below with rollers and fruit
// riding on it (a refill drops in where one was taken). A taken fruit arcs up to its place; a wrong one shakes the skewer back to its start; a full
// skewer sparkles and slides away.
import { paintGround, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { SLOTS, slotPoint, type FruitSkewerState } from './logic';

export const FRUITS: readonly SpriteRef[] = ['strawberry', 'banana', 'grapes', 'tangerine', 'kiwi-fruit', 'lemon', 'red-apple', 'cherries'];

const fruitOf = (kind: number): SpriteRef => FRUITS[kind % FRUITS.length] ?? 'strawberry';

function paintSkewer(ctx: CanvasRenderingContext2D, state: FruitSkewerState, view: DrawView): void {
  const { theme, sprites } = view;
  const { x, y, w } = state.skewerAt;
  const slide = state.finished >= 0 ? (view.reducedMotion ? 0 : Math.max(0, state.finished - 0.4) * 1400) : 0;
  const shake = state.wrongAgo < 0.4 && !view.reducedMotion ? Math.sin(state.wrongAgo * 60) * 8 * (1 - state.wrongAgo / 0.4) : 0;
  ctx.save();
  ctx.translate(slide + shake, 0);
  // Board behind.
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.85;
  roundRect(ctx, x - 10, y - state.fruitSize * 0.75, w + 20, state.fruitSize * 1.5, 26);
  ctx.fill();
  ctx.globalAlpha = 1;
  // The stick and its handle.
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + 14, y);
  ctx.lineTo(x + w - 10, y);
  ctx.stroke();
  ctx.strokeStyle = theme.wood;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.fillStyle = theme.wood;
  roundRect(ctx, x, y - 16, 44, 32, 10);
  ctx.fill();
  const landing = new Set(state.belt.filter((f) => f.taken >= 0).map((f) => f.slot));
  for (let i = 0; i < SLOTS; i += 1) {
    const p = slotPoint(state, i);
    const kind = state.skewer[i];
    if (kind !== undefined && !landing.has(i)) {
      const unit = i < state.unit.length;
      sprites.draw(ctx, fruitOf(kind), p.x, p.y, state.fruitSize * 0.85);
      if (unit) {
        // The pattern's start sits on a soft plate so it reads as the example.
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = theme.star;
        ctx.beginPath();
        ctx.arc(p.x, p.y + state.fruitSize * 0.42, state.fruitSize * 0.3, 0, Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      continue;
    }
    if (landing.has(i)) continue;
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = theme.ink;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, state.fruitSize * 0.38, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    if (i === state.skewer.length && state.finished < 0) {
      const pulse = view.reducedMotion ? 1 : 1 + 0.12 * Math.sin(view.time * 6);
      paintLabel(ctx, view, '?', p.x, p.y, 44 * pulse, theme.star);
    }
  }
  ctx.restore();
  if (state.finished >= 0) sprites.draw(ctx, 'sparkles', x + w / 2, y - state.fruitSize * 0.8 - state.finished * 40, 60, { alpha: Math.max(0, 1 - state.finished) });
}

export function drawFruitSkewer(ctx: CanvasRenderingContext2D, state: FruitSkewerState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const tableY = HUD_SAFE_TOP + 20;
  paintSky(ctx, view, tableY, 6);
  paintGround(ctx, view, tableY);
  ctx.fillStyle = theme.wood;
  roundRect(ctx, 10, tableY, arena.width - 20, arena.height - tableY - 10, 24);
  ctx.fill();
  paintSkewer(ctx, state, view);

  // The belt.
  const s = state.fruitSize;
  const by = state.beltY;
  ctx.fillStyle = theme.stoneEdge;
  roundRect(ctx, -20, by - s * 0.55, arena.width + 40, s * 1.1, s * 0.3);
  ctx.fill();
  ctx.fillStyle = theme.stone;
  roundRect(ctx, -20, by - s * 0.48, arena.width + 40, s * 0.96, s * 0.28);
  ctx.fill();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = theme.ink;
  const offset = view.reducedMotion ? 0 : (view.time * 150) % 60;
  for (let x = -60 + offset; x < arena.width + 60; x += 60) ctx.fillRect(x, by - s * 0.48, 6, s * 0.96);
  ctx.globalAlpha = 1;
  for (const f of state.belt) {
    if (f.taken >= 0) {
      const t = Math.min(1, f.taken / 0.4);
      const to = slotPoint(state, f.slot);
      const lift = view.reducedMotion ? 0 : Math.sin(t * Math.PI) * 80;
      sprites.draw(ctx, fruitOf(f.kind), f.x + (to.x - f.x) * t, by + (to.y - by) * t - lift, s * (0.95 - 0.1 * t));
      continue;
    }
    // A refill drops in from the hopper above.
    const drop = view.reducedMotion ? 0 : Math.max(0, 1 - f.age / 0.25) * s * 1.2;
    paintShadow(ctx, view, f.x, by + s * 0.32, s * 0.8);
    sprites.draw(ctx, fruitOf(f.kind), f.x, by - s * 0.05 - drop, s * 0.95);
  }
}
