// Egg catch's picture: sky, a long leafy branch across the top with hens and a monkey walking on it, eggs and
// rocks falling (golden eggs glow), the grass, and the basket the child moves (squashes when it catches,
// shakes when a rock lands in it). A missed egg cracks on the grass.
import { bob, paintGround, paintHills, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { EggCatchState, Item } from './logic';

function paintBranch(ctx: CanvasRenderingContext2D, view: DrawView, y: number): void {
  const { arena, theme } = view;
  ctx.fillStyle = theme.leaf;
  for (let x = -40; x < arena.width + 60; x += 70) {
    ctx.beginPath();
    ctx.arc(x, y - 52 + (x % 140 === 0 ? 10 : 0), 58, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = theme.wood;
  roundRect(ctx, -20, y + 18, arena.width + 40, 22, 11);
  ctx.fill();
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(-20, y + 34, arena.width + 40, 6);
}

function paintItem(ctx: CanvasRenderingContext2D, view: DrawView, item: Item, state: EggCatchState): void {
  const { sprites, theme } = view;
  if (item.ended >= 0 && item.caught) {
    // Caught: drops into the basket and fades.
    const t = item.ended / 0.7;
    sprites.draw(ctx, item.kind === 'rock' ? 'rock' : 'egg', state.basketX + (item.x - state.basketX) * (1 - t), state.basketY - 20 + t * 20, 50, { alpha: 1 - t });
    return;
  }
  if (item.ended >= 0) {
    // On the grass: a rock rests, an egg cracks (the yolk spreads).
    const t = Math.min(1, item.ended / 0.2);
    if (item.kind === 'rock') {
      sprites.draw(ctx, 'rock', item.x, item.y - 18, 56, { alpha: 1 - item.ended / 0.7 });
      return;
    }
    ctx.globalAlpha = 1 - item.ended / 0.7;
    ctx.fillStyle = theme.light;
    ctx.beginPath();
    ctx.ellipse(item.x, item.y - 4, 34 * t, 10 * t, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.star;
    ctx.beginPath();
    ctx.arc(item.x, item.y - 6, 10 * t, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }
  const spin = view.reducedMotion ? 0 : Math.sin(view.time * 5 + item.x) * 0.25;
  if (item.kind === 'golden') {
    ctx.globalAlpha = 0.55 + 0.25 * Math.sin(view.time * 8);
    ctx.fillStyle = theme.star;
    ctx.beginPath();
    ctx.arc(item.x, item.y, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    sprites.draw(ctx, 'sparkles', item.x + 26, item.y - 26, 34);
  }
  sprites.draw(ctx, item.kind === 'rock' ? 'rock' : 'egg', item.x, item.y, item.kind === 'rock' ? 62 : 58, { rotate: spin });
}

export function drawEggCatch(ctx: CanvasRenderingContext2D, state: EggCatchState, view: DrawView): void {
  const { sprites, theme } = view;
  paintSky(ctx, view, state.groundY, 8);
  paintHills(ctx, view, state.groundY - 30, 120, 110, theme.leaf);
  paintGround(ctx, view, state.groundY);
  paintBranch(ctx, view, state.branchY);

  for (const hen of state.hens) {
    const hop = hen.dropped < 0.25 && !view.reducedMotion ? Math.sin((hen.dropped / 0.25) * Math.PI) * 14 : 0;
    sprites.draw(ctx, 'chicken', hen.x, state.branchY - 14 - hop + bob(view, 6, 2, hen.x), 76, { flipX: hen.dir > 0 });
  }
  const monkeyHop = state.monkey.dropped < 0.3 && !view.reducedMotion ? Math.sin((state.monkey.dropped / 0.3) * Math.PI) * 18 : 0;
  sprites.draw(ctx, 'monkey-face', state.monkey.x, state.branchY - 16 - monkeyHop, 70);

  for (const item of state.items) paintItem(ctx, view, item, state);

  // The basket: squash on a catch, shake after a rock.
  const catchSquash = view.reducedMotion ? 0 : Math.max(0, 1 - state.caughtAgo / 0.18);
  const shake = view.reducedMotion || state.hitAgo > 0.4 ? 0 : Math.sin(state.hitAgo * 60) * 10 * (1 - state.hitAgo / 0.4);
  paintShadow(ctx, view, state.basketX, state.groundY + 4, 130);
  sprites.draw(ctx, 'basket', state.basketX + shake, state.basketY + 16, 140, { squash: [1 + 0.15 * catchSquash, 1 - 0.15 * catchSquash] });
  // Guide line from the basket up, faint: where things will land.
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = theme.light;
  ctx.fillRect(state.basketX - 2, state.branchY + 50, 4, state.basketY - state.branchY - 80);
  ctx.globalAlpha = 1;
}
