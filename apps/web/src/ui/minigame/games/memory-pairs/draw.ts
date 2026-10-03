// Memory pairs' picture: a cloth spread over the map's ground, and the cards. A card's back is the theme's
// colour with a paw print; it turns over by narrowing to a line and widening on the other side. A matched
// pair glows and sparkles; a mismatched card wobbles as it turns back. Pictures come from the map.
import { paintGround, paintHills, paintSky, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import type { ThemeId } from '../../theme';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { Card, MemoryState } from './logic';

/** Twelve pictures per map, all different-looking at a glance (no two of the same colour and shape). */
export const FACES: Readonly<Record<ThemeId, readonly SpriteRef[]>> = {
  forest: ['fox', 'rabbit', 'owl', 'frog', 'mushroom', 'butterfly', 'snail', 'honeybee', 'bear', 'clover', 'maple-leaf', 'red-apple'],
  meadow: ['cat', 'dog-face', 'rabbit', 'baby-chick', 'sunflower', 'tulip', 'strawberry', 'butterfly', 'teddy-bear', 'balloon', 'kite', 'house'],
  town: ['bus', 'automobile', 'bicycle', 'airplane', 'balloon', 'soccer-ball', 'basketball', 'gift', 'doughnut', 'ice-cream', 'lollipop', 'bell'],
  castle: ['crown', 'key', 'gem', 'trophy', 'bell', 'owl', 'fire', 'light-bulb', 'gift', 'star', 'cherries', 'puzzle-piece'],
  farm: ['chicken', 'duck', 'carrot', 'watermelon', 'grapes', 'lemon', 'pineapple', 'sunflower', 'seedling', 'egg', 'dog-face', 'cat'],
  snow: ['penguin', 'snowflake', 'bear', 'fox', 'owl', 'cloud', 'sun', 'star', 'gift', 'bell', 'evergreen-tree', 'rabbit'],
  beach: ['crab', 'octopus', 'dolphin', 'tropical-fish', 'spiral-shell', 'sailboat', 'turtle', 'pineapple', 'banana', 'sun', 'watermelon', 'coin'],
  river: ['duck', 'fish', 'frog', 'lotus', 'turtle', 'sailboat', 'dolphin', 'butterfly', 'herb', 'droplet', 'rainbow', 'snail'],
};

function paintCard(ctx: CanvasRenderingContext2D, view: DrawView, card: Card, faces: readonly SpriteRef[]): void {
  const { theme, sprites } = view;
  const base = ctx.globalAlpha;
  // Width follows a half-turn: 1 → 0 (edge on) → 1, with the picture side after the middle.
  const showing = card.turn >= 0.5;
  const scaleX = Math.max(0.04, Math.abs(Math.cos(card.turn * Math.PI)));
  const wobble = card.side === 'down' && card.since < 0.4 && !view.reducedMotion ? Math.sin(card.since * 40) * 0.06 * (1 - card.since / 0.4) : 0;
  const cx = card.x + card.w / 2;
  const cy = card.y + card.h / 2;
  const lift = card.side === 'up' && !view.reducedMotion ? -6 : 0;
  ctx.save();
  ctx.translate(cx, cy + lift);
  ctx.rotate(wobble);
  ctx.scale(scaleX, 1);
  // Shadow under the card.
  ctx.globalAlpha = base * 0.25;
  ctx.fillStyle = theme.ink;
  roundRect(ctx, -card.w / 2 + 4, -card.h / 2 + 8, card.w, card.h, 18);
  ctx.fill();
  ctx.globalAlpha = base;
  ctx.lineWidth = 5;
  ctx.strokeStyle = theme.ink;
  if (showing) {
    ctx.fillStyle = theme.light;
    roundRect(ctx, -card.w / 2, -card.h / 2, card.w, card.h, 18);
    ctx.fill();
    ctx.stroke();
    if (card.side === 'matched') {
      // A soft glow ring inside the edge.
      ctx.globalAlpha = base * (0.45 + (view.reducedMotion ? 0 : 0.2 * Math.sin(view.time * 4 + cx)));
      ctx.strokeStyle = theme.star;
      ctx.lineWidth = 10;
      roundRect(ctx, -card.w / 2 + 8, -card.h / 2 + 8, card.w - 16, card.h - 16, 12);
      ctx.stroke();
      ctx.globalAlpha = base;
    }
    const face = faces[card.face % faces.length] ?? 'star';
    const pop = card.side === 'matched' && card.since < 0.3 && !view.reducedMotion ? 1 + 0.25 * Math.sin((card.since / 0.3) * Math.PI) : 1;
    sprites.draw(ctx, face, 0, 0, Math.min(card.w, card.h) * 0.72 * pop);
  } else {
    ctx.fillStyle = theme.primary;
    roundRect(ctx, -card.w / 2, -card.h / 2, card.w, card.h, 18);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = base * 0.35;
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 4;
    roundRect(ctx, -card.w / 2 + 10, -card.h / 2 + 10, card.w - 20, card.h - 20, 12);
    ctx.stroke();
    ctx.globalAlpha = base * 0.9;
    sprites.draw(ctx, 'paw-prints', 0, 0, Math.min(card.w, card.h) * 0.42);
    ctx.globalAlpha = base;
  }
  ctx.restore();
  if (card.side === 'matched' && card.since < 0.8) {
    sprites.draw(ctx, 'sparkles', card.x + card.w - 10, card.y + 10 - card.since * 30, 44, { alpha: base * (1 - card.since / 0.8) });
  }
}

export function drawMemoryPairs(ctx: CanvasRenderingContext2D, state: MemoryState, view: DrawView): void {
  const { arena, theme } = view;
  const horizon = Math.min(arena.height * 0.4, HUD_SAFE_TOP + 160);
  paintSky(ctx, view, horizon, 6);
  paintHills(ctx, view, horizon + 20, 80, 70, theme.leaf);
  paintGround(ctx, view, horizon + 20);
  // A cloth on the ground behind the cards.
  const first = state.cards[0];
  const last = state.cards[state.cards.length - 1];
  if (first && last) {
    const right = Math.max(...state.cards.map((c) => c.x + c.w));
    const pad = 22;
    ctx.fillStyle = theme.ground;
    roundRect(ctx, first.x - pad, first.y - pad, right - first.x + pad * 2, last.y + last.h - first.y + pad * 2, 30);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = theme.groundDeep;
    ctx.stroke();
  }
  const faces = FACES[theme.id] ?? FACES.meadow;
  // A cleared board fades away before the next deal.
  ctx.globalAlpha = state.dealIn > 0 ? Math.min(1, state.dealIn / 0.45) : 1;
  for (const card of state.cards) paintCard(ctx, view, card, faces);
  ctx.globalAlpha = 1;
}
