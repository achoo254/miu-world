// Leaf blow's picture: a mown lawn (stripes) with trees peeking in at the edges, the wooden frame with its
// growing pile, the leaves (spinning as they slide, swaying down from the trees when new), and the fan under
// the finger: a round guard with turning blades and streaks of wind blowing out of it. When nothing touches,
// the fan waits faded where it was, so the child sees what to hold.
import { roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import type { DrawView, Point } from '../../types';
import { FAN_RADIUS, type Leaf, type LeafBlowState } from './logic';

export const LEAF_SPRITES: readonly SpriteRef[] = ['fallen-leaf', 'maple-leaf', 'leaf'];

function paintLawn(ctx: CanvasRenderingContext2D, view: DrawView, state: LeafBlowState): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.groundDeep;
  ctx.fillRect(0, 0, arena.width, arena.height);
  const { yard } = state;
  ctx.fillStyle = theme.ground;
  roundRect(ctx, yard.x, yard.y, yard.w, yard.h, 26);
  ctx.fill();
  // Mower stripes.
  ctx.save();
  roundRect(ctx, yard.x, yard.y, yard.w, yard.h, 26);
  ctx.clip();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = theme.ink;
  for (let x = yard.x; x < yard.x + yard.w; x += 120) ctx.fillRect(x, yard.y, 60, yard.h);
  ctx.globalAlpha = 1;
  ctx.restore();
  // Trees leaning in at the corners (where the leaves come from).
  sprites.draw(ctx, 'deciduous-tree', yard.x + 10, yard.y + yard.h - 10, 130);
  sprites.draw(ctx, 'deciduous-tree', yard.x + yard.w * 0.45, yard.y + yard.h + 30, 120);
  sprites.draw(ctx, 'evergreen-tree', yard.x + 6, yard.y + 40, 110);
}

function paintPile(ctx: CanvasRenderingContext2D, view: DrawView, state: LeafBlowState): void {
  const { theme } = view;
  const { pile } = state;
  // Soil inside the frame, then the planks.
  ctx.fillStyle = theme.groundDeep;
  roundRect(ctx, pile.x, pile.y, pile.w, pile.h, 14);
  ctx.fill();
  ctx.lineWidth = 16;
  ctx.strokeStyle = theme.wood;
  roundRect(ctx, pile.x, pile.y, pile.w, pile.h, 14);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.woodEdge;
  roundRect(ctx, pile.x - 8, pile.y - 8, pile.w + 16, pile.h + 16, 18);
  ctx.stroke();
  // A pulsing arrow-ish glow inside: "here".
  ctx.globalAlpha = view.reducedMotion ? 0.18 : 0.12 + 0.08 * Math.sin(view.time * 4);
  ctx.fillStyle = theme.star;
  roundRect(ctx, pile.x + 10, pile.y + 10, pile.w - 20, pile.h - 20, 10);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function paintLeaf(ctx: CanvasRenderingContext2D, view: DrawView, leaf: Leaf): void {
  const sprite = LEAF_SPRITES[leaf.kind] ?? 'leaf';
  if (leaf.falling > 0) {
    // Drifting down: sways sideways, high above its spot, with its shadow on the grass.
    const t = leaf.falling;
    const sway = view.reducedMotion ? 0 : Math.sin(t * 7) * 30;
    ctx.globalAlpha = 0.25 * (1 - t / 1.2) + 0.05;
    ctx.fillStyle = view.theme.ink;
    ctx.beginPath();
    ctx.ellipse(leaf.x, leaf.y + 8, 20, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    view.sprites.draw(ctx, sprite, leaf.x + sway, leaf.y - t * 140, 50, { rotate: leaf.angle });
    return;
  }
  const pop = leaf.piled >= 0 && leaf.piled < 0.25 && !view.reducedMotion ? 1 + 0.3 * Math.sin((leaf.piled / 0.25) * Math.PI) : 1;
  view.sprites.draw(ctx, sprite, leaf.x, leaf.y, 52 * pop, { rotate: leaf.angle });
}

function paintFan(ctx: CanvasRenderingContext2D, view: DrawView, at: Point, spin: number, active: boolean): void {
  const { theme } = view;
  ctx.save();
  ctx.globalAlpha = active ? 1 : 0.4;
  if (active) {
    // Wind: streaks shooting out all around, fading with distance.
    const t = view.reducedMotion ? 0.5 : (view.time * 2.2) % 1;
    ctx.strokeStyle = theme.light;
    ctx.lineCap = 'round';
    ctx.lineWidth = 6;
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2 + (i % 2) * 0.3;
      const r0 = 46 + ((t + i * 0.37) % 1) * (FAN_RADIUS - 70);
      ctx.globalAlpha = 0.7 * (1 - r0 / FAN_RADIUS);
      ctx.beginPath();
      ctx.moveTo(at.x + Math.cos(a) * r0, at.y + Math.sin(a) * r0);
      ctx.lineTo(at.x + Math.cos(a) * (r0 + 26), at.y + Math.sin(a) * (r0 + 26));
      ctx.stroke();
    }
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = theme.light;
    ctx.beginPath();
    ctx.arc(at.x, at.y, FAN_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // The guard and blades.
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(at.x, at.y, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const turn = view.reducedMotion ? 0 : spin * 18;
  ctx.fillStyle = theme.secondary;
  for (let i = 0; i < 3; i += 1) {
    const a = turn + (i * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.ellipse(at.x + Math.cos(a) * 20, at.y + Math.sin(a) * 20, 20, 10, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = theme.primary;
  ctx.beginPath();
  ctx.arc(at.x, at.y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawLeafBlow(ctx: CanvasRenderingContext2D, state: LeafBlowState, view: DrawView): void {
  paintLawn(ctx, view, state);
  paintPile(ctx, view, state);
  // Piled leaves first (under), then the loose ones.
  for (const leaf of state.leaves) if (leaf.piled >= 0) paintLeaf(ctx, view, leaf);
  for (const leaf of state.leaves) if (leaf.piled < 0) paintLeaf(ctx, view, leaf);
  paintFan(ctx, view, state.fan ?? state.lastFan, state.spinTime, state.fan !== null);
}
