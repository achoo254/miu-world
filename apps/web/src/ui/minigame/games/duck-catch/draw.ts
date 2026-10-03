// Duck catch's picture: grass banks, the pond with ripples and lotus pads, a bamboo fence on every side, reeds
// in the corners, the ducks (each trailing a little wake), the child wading with a ring of ripples (stretched
// forward in a lunge, a splash when it misses), and on the top fence a basket the caught ducks fly into.
import { bob, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { DuckCatchState } from './logic';

function paintPond(ctx: CanvasRenderingContext2D, view: DrawView, state: DuckCatchState): void {
  const { arena, theme, sprites } = view;
  const { pond } = state;
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, arena.width, arena.height);
  const water = ctx.createLinearGradient(0, pond.y, 0, pond.y + pond.h);
  water.addColorStop(0, theme.waterLight);
  water.addColorStop(1, theme.water);
  ctx.fillStyle = water;
  roundRect(ctx, pond.x, pond.y, pond.w, pond.h, 30);
  ctx.fill();
  // Slow ripples drifting across.
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 9; i += 1) {
    const x = pond.x + 50 + ((i * 211 + (view.reducedMotion ? 0 : view.time * 14)) % (pond.w - 100));
    const y = pond.y + 50 + ((i * 137) % (pond.h - 100));
    ctx.beginPath();
    ctx.ellipse(x, y, 30, 8, 0, 0, Math.PI);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Lotus pads.
  for (let i = 0; i < 4; i += 1) {
    const x = pond.x + 70 + ((i * 331) % (pond.w - 140));
    const y = pond.y + 80 + ((i * 197) % (pond.h - 160));
    ctx.fillStyle = theme.leaf;
    ctx.beginPath();
    ctx.ellipse(x, y, 34, 20, 0, 0.3, Math.PI * 2);
    ctx.lineTo(x, y);
    ctx.fill();
    if (i % 2 === 0) sprites.draw(ctx, 'lotus', x + 6, y - 10, 40);
  }
  // Reeds in the corners.
  for (const [x, y] of [
    [pond.x + 20, pond.y + 30],
    [pond.x + pond.w - 20, pond.y + 30],
    [pond.x + 20, pond.y + pond.h - 30],
    [pond.x + pond.w - 20, pond.y + pond.h - 30],
  ] as const) {
    sprites.draw(ctx, 'herb', x, y, 64);
  }
}

function paintFence(ctx: CanvasRenderingContext2D, view: DrawView, state: DuckCatchState): void {
  const { theme } = view;
  const { pond } = state;
  const pad = 6;
  ctx.strokeStyle = theme.wood;
  ctx.lineWidth = 7;
  roundRect(ctx, pond.x - pad, pond.y - pad, pond.w + pad * 2, pond.h + pad * 2, 32);
  ctx.stroke();
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 3;
  roundRect(ctx, pond.x - pad - 8, pond.y - pad - 8, pond.w + pad * 2 + 16, pond.h + pad * 2 + 16, 36);
  ctx.stroke();
  ctx.fillStyle = theme.woodEdge;
  const posts: Array<[number, number]> = [];
  for (let x = pond.x + 30; x < pond.x + pond.w - 20; x += 70) posts.push([x, pond.y - pad - 4], [x, pond.y + pond.h + pad + 4]);
  for (let y = pond.y + 40; y < pond.y + pond.h - 20; y += 70) posts.push([pond.x - pad - 4, y], [pond.x + pond.w + pad + 4, y]);
  for (const [x, y] of posts) {
    roundRect(ctx, x - 6, y - 6, 12, 12, 4);
    ctx.fill();
  }
}

export function drawDuckCatch(ctx: CanvasRenderingContext2D, state: DuckCatchState, view: DrawView): void {
  const { theme, sprites } = view;
  paintPond(ctx, view, state);
  paintFence(ctx, view, state);

  // Ducks with their wakes.
  for (const d of state.ducks) {
    const speed = Math.hypot(d.vx, d.vy);
    const alpha = d.entering > 0 ? 1 - d.entering / 0.9 : 1;
    if (speed > 40) {
      ctx.globalAlpha = 0.4 * alpha;
      ctx.strokeStyle = theme.light;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(d.x - (d.vx / speed) * 30 - (d.vy / speed) * 18, d.y + 14 - (d.vy / speed) * 30 + (d.vx / speed) * 18);
      ctx.lineTo(d.x, d.y + 14);
      ctx.lineTo(d.x - (d.vx / speed) * 30 + (d.vy / speed) * 18, d.y + 14 - (d.vy / speed) * 30 - (d.vx / speed) * 18);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const paddle = view.reducedMotion ? 0 : Math.sin(view.time * (speed > 100 ? 18 : 5) + d.x) * 0.08;
    sprites.draw(ctx, 'duck', d.x, d.y + bob(view, 4, 2, d.y), 76, { flipX: d.vx > 0, rotate: paddle, alpha });
  }

  // The child: ripples round the waist, stretched in a lunge.
  const p = state.player;
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.6;
  const ring = view.reducedMotion ? 0 : (view.time * 1.5) % 1;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 30, 40 + ring * 22, 12 + ring * 6, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  const lunging = state.lunge > 0;
  sprites.draw(ctx, view.player, p.x, p.y, 96, {
    flipX: state.facing < 0,
    rotate: lunging ? state.lungeDir.x * 0.5 : 0,
    squash: lunging && !view.reducedMotion ? [1.15, 0.9] : [1, 1],
  });
  if (state.splashAgo < 0.5) {
    const t = state.splashAgo / 0.5;
    for (let i = 0; i < 5; i += 1) {
      const a = -Math.PI / 2 + (i - 2) * 0.5;
      sprites.draw(ctx, 'droplet', state.splashAt.x + Math.cos(a) * 50 * t, state.splashAt.y + Math.sin(a) * 50 * t + 60 * t * t, 26, { alpha: 1 - t });
    }
  }

  // The basket on the top fence, with the catch flying in.
  const basket = { x: state.pond.x + state.pond.w / 2, y: state.pond.y - 4 };
  for (const [i, c] of state.caught.entries()) {
    const t = Math.min(1, (state.time - c.at) / 0.5);
    if (t < 1) {
      const x = c.from.x + (basket.x - c.from.x) * t;
      const y = c.from.y + (basket.y - c.from.y) * t - Math.sin(t * Math.PI) * 80;
      sprites.draw(ctx, 'duck', x, y, 64, { rotate: t * 6 });
    } else if (i >= state.caught.length - 4) {
      const k = state.caught.length - 1 - i;
      sprites.draw(ctx, 'duck', basket.x - 30 + k * 20, basket.y - 22, 40);
    }
  }
  sprites.draw(ctx, 'basket', basket.x, basket.y, 76);
}
