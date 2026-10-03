// Three-span bag's picture: sky and sea behind a sandy island with palms, the magic bird hovering with the
// cloth bag (its number sewn on, and a strip showing how full it is), numbered gems glittering on the sand.
// Gems fly into the bag; a burst bag throws them back; a full bag is carried off over the sea.
import { bob, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { Gem, ThreeSpanState } from './logic';
import { bagSum } from './logic';

function paintBag(ctx: CanvasRenderingContext2D, view: DrawView, state: ThreeSpanState, x: number, y: number, shake: number): void {
  const { theme } = view;
  const w = 170;
  const h = 120;
  ctx.save();
  ctx.translate(x + shake, y);
  // The sack: a rounded body gathered at the neck, with a cord to the bird.
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, -h / 2 - 50);
  ctx.lineTo(0, -h / 2 - 8);
  ctx.stroke();
  ctx.fillStyle = theme.primary;
  ctx.beginPath();
  ctx.moveTo(-26, -h / 2 + 4);
  ctx.quadraticCurveTo(-w / 2 - 10, -h / 4, -w / 2 + 6, h / 2 - 16);
  ctx.quadraticCurveTo(0, h / 2 + 18, w / 2 - 6, h / 2 - 16);
  ctx.quadraticCurveTo(w / 2 + 10, -h / 4, 26, -h / 2 + 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.star;
  roundRect(ctx, -30, -h / 2 - 8, 60, 16, 8);
  ctx.fill();
  ctx.stroke();
  paintLabel(ctx, view, String(state.capacity), 0, -4, 54, theme.light);
  // How full: a strip of `capacity` cells under the number.
  const cells = state.capacity;
  const stripW = w - 40;
  const cellW = stripW / cells;
  const sum = bagSum(state);
  for (let i = 0; i < cells; i += 1) {
    ctx.fillStyle = i < sum ? theme.star : theme.light;
    ctx.globalAlpha = i < sum ? 1 : 0.5;
    ctx.fillRect(-stripW / 2 + i * cellW + 1, 34, cellW - 2, 16);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function paintGem(ctx: CanvasRenderingContext2D, view: DrawView, gem: Gem, x: number, y: number, radius: number, alpha = 1): void {
  view.sprites.draw(ctx, 'gem', x, y, radius * 2.1, { alpha });
  ctx.globalAlpha = alpha;
  paintLabel(ctx, view, String(gem.value), x, y + 2, radius * 0.95, view.theme.light);
  ctx.globalAlpha = 1;
}

export function drawThreeSpanBag(ctx: CanvasRenderingContext2D, state: ThreeSpanState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const shoreY = state.bag.y + 95;
  paintSky(ctx, view, shoreY, 6);
  ctx.fillStyle = theme.water;
  ctx.fillRect(0, shoreY - 50, arena.width, 60);
  // Little waves rolling along.
  ctx.strokeStyle = theme.waterLight;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (let row = 0; row < 2; row += 1) {
    const y = shoreY - 38 + row * 18;
    const drift = view.reducedMotion ? 0 : (view.time * (18 + row * 10)) % 60;
    for (let x = drift - 60 + row * 30; x < arena.width; x += 60) {
      ctx.beginPath();
      ctx.arc(x, y, 9, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  }
  // Sand.
  ctx.fillStyle = theme.ground;
  ctx.beginPath();
  ctx.moveTo(0, shoreY + 20);
  ctx.quadraticCurveTo(arena.width / 2, shoreY - 30, arena.width, shoreY + 20);
  ctx.lineTo(arena.width, arena.height);
  ctx.lineTo(0, arena.height);
  ctx.closePath();
  ctx.fill();
  sprites.draw(ctx, 'palm-tree', 50, shoreY - 30, 130);
  sprites.draw(ctx, 'palm-tree', arena.width - 50, shoreY - 20, 120, { flipX: true });

  // The bird and its bag: hovering, bursting, or flying away over the sea.
  let bx = state.bag.x;
  let by = state.bag.y + bob(view, 2.5, 5);
  let shake = 0;
  if (state.phase === 'fly') {
    const t = state.phaseAgo / 1.4;
    bx += t * t * arena.width * 0.9;
    by -= t * 160;
  }
  if (state.phase === 'burst' && !view.reducedMotion) shake = Math.sin(state.phaseAgo * 50) * 10 * Math.max(0, 1 - state.phaseAgo / 0.5);
  paintBag(ctx, view, state, bx, by + 40, shake);
  sprites.draw(ctx, 'bird', bx, by - 72, 84, { flipX: true, squash: view.reducedMotion ? undefined : [1, 1 + 0.06 * Math.sin(view.time * 14)] });

  const r = state.gemRadius;
  for (const gem of state.gems) {
    const since = state.time - gem.movedAt;
    const t = Math.min(1, since / 0.3);
    if (gem.inBag) {
      // Flying in, then hidden inside.
      if (t < 1) paintGem(ctx, view, gem, gem.home.x + (bx - gem.home.x) * t, gem.home.y + (by + 40 - gem.home.y) * t - Math.sin(t * Math.PI) * 80, r * (1 - 0.5 * t));
      continue;
    }
    paintShadow(ctx, view, gem.home.x, gem.home.y + r * 0.85, r * 1.6);
    if (t < 1) {
      paintGem(ctx, view, gem, bx + (gem.home.x - bx) * t, by + 40 + (gem.home.y - by - 40) * t - Math.sin(t * Math.PI) * 80, r);
      continue;
    }
    paintGem(ctx, view, gem, gem.home.x, gem.home.y + bob(view, 2, 3, gem.home.x), r);
  }
  // What is in the bag so far, as a sum under the bag.
  const inside = state.gems.filter((g) => g.inBag).map((g) => g.value);
  if (inside.length > 0 && state.phase === 'choose') paintLabel(ctx, view, `${inside.join(' + ')} = ${bagSum(state)}`, bx, by + 128, 32, theme.light);
  if (state.phase === 'fly') paintLabel(ctx, view, 'Vừa khít!', arena.width / 2, shoreY + 40, 46, theme.star);
  if (state.phase === 'burst') paintLabel(ctx, view, 'Quá túi rồi!', arena.width / 2, shoreY + 40, 40, theme.light);
}
