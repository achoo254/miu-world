// Bánh chưng's picture: a kitchen table, the wooden mould with the layers going in (green leaves, white rice,
// yellow beans, pink pork), the four leaf flaps folding over (the next one glowing with its arrow), the two
// crossing ties (dotted guides before), the recipe strip at the top with the current step ringed and the
// done ones ticked, the ingredient tray at the bottom, and the finished cakes stacked on a plate.
import { bob, paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { FOLD_SWIPE, SPRITE, TRAY_ORDER, type BanhChungState, type Flap, type Ingredient } from './logic';

const ARROW = { up: '↑', down: '↓', left: '←', right: '→' } as const;

function layerColour(view: DrawView, item: Ingredient): string {
  const { theme } = view;
  return item === 'leaf' ? theme.leaf : item === 'rice' ? theme.light : item === 'beans' ? theme.star : theme.primary;
}

function paintFlap(ctx: CanvasRenderingContext2D, view: DrawView, flap: Flap, cx: number, cy: number, h: number, folded: boolean, glow: boolean): void {
  const { theme } = view;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate({ top: 0, right: Math.PI / 2, bottom: Math.PI, left: -Math.PI / 2 }[flap]);
  ctx.fillStyle = theme.leaf;
  ctx.strokeStyle = glow ? theme.star : theme.ink;
  ctx.lineWidth = glow ? 8 : 4;
  ctx.beginPath();
  if (folded) {
    // Folded over the top of the cake: a triangle to the middle.
    ctx.moveTo(-h, -h);
    ctx.lineTo(h, -h);
    ctx.lineTo(0, 0);
  } else {
    // Lying open outside the mould.
    ctx.moveTo(-h, -h);
    ctx.lineTo(h, -h);
    ctx.lineTo(h * 0.75, -h * 1.7);
    ctx.lineTo(-h * 0.75, -h * 1.7);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawBanhChung(ctx: CanvasRenderingContext2D, state: BanhChungState, view: DrawView): void {
  const { arena, sprites, theme } = view;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 3;
  for (let y = 0; y < arena.height; y += 90) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(arena.width, y);
    ctx.stroke();
  }

  // Recipe strip.
  const n = state.steps.length;
  const cell = Math.min(52, (arena.width - 40) / n);
  const stripY = 140;
  state.steps.forEach((step, i) => {
    const x = arena.width / 2 + (i - (n - 1) / 2) * cell;
    ctx.fillStyle = i < state.done ? theme.leaf : theme.light;
    ctx.strokeStyle = i === state.done ? theme.primary : theme.ink;
    ctx.lineWidth = i === state.done ? 5 : 2;
    ctx.beginPath();
    ctx.arc(x, stripY, cell * 0.44, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (step.kind === 'add') sprites.draw(ctx, SPRITE[step.item], x, stripY, cell * 0.66);
    else paintLabel(ctx, view, step.kind === 'fold' ? ARROW[FOLD_SWIPE[step.flap]] : '✕', x, stripY + 1, cell * 0.5, theme.secondary);
  });

  // The mould and the cake in it.
  const { x: cx, y: cy } = state.mould;
  const h = state.mouldHalf;
  const wobble = state.wrongAgo < 0.3 && !view.reducedMotion ? Math.sin(state.wrongAgo * 50) * 6 : 0;
  const slide = state.finished >= 0 ? state.finished * 600 : 0;
  ctx.save();
  ctx.translate(wobble + slide, 0);
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, cx - h - 14, cy - h - 14, (h + 14) * 2, (h + 14) * 2, 10);
  ctx.fill();
  const added = state.steps.slice(0, state.done).flatMap((s) => (s.kind === 'add' ? [s.item] : []));
  added.forEach((item, i) => {
    const inset = item === 'leaf' ? 0 : 10 + i * 6;
    ctx.fillStyle = layerColour(view, item);
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 2;
    roundRect(ctx, cx - h + inset, cy - h + inset, (h - inset) * 2, (h - inset) * 2, 6);
    ctx.fill();
    ctx.stroke();
  });
  if (added.length === 0) {
    ctx.fillStyle = theme.groundDeep;
    ctx.fillRect(cx - h, cy - h, h * 2, h * 2);
  }
  const lastAdded = added.at(-1);
  if (lastAdded && lastAdded !== 'leaf' && state.done <= 7) sprites.draw(ctx, SPRITE[lastAdded], cx, cy, h * 0.9, { alpha: 0.85 });

  // Flaps: open while the layers go in, folding one by one.
  const folds = state.steps.flatMap((s, i) => (s.kind === 'fold' ? [{ flap: s.flap, done: i < state.done, next: i === state.done }] : []));
  if (added.length >= 2) {
    for (const f of folds) if (!f.done) paintFlap(ctx, view, f.flap, cx, cy, h, false, f.next);
    for (const f of folds) if (f.done) paintFlap(ctx, view, f.flap, cx, cy, h, true, false);
  }
  // Ties.
  const step = state.steps[state.done];
  const tying = step?.kind === 'tie' || state.finished >= 0;
  if (tying) {
    for (const [way, from, to] of [['down', [-1, -1], [1, 1]], ['up', [1, -1], [-1, 1]]] as const) {
      const tied = state.ties[way] || state.finished >= 0;
      ctx.strokeStyle = tied ? theme.light : theme.star;
      ctx.lineWidth = tied ? 10 : 5;
      ctx.setLineDash(tied ? [] : [14, 10]);
      ctx.beginPath();
      ctx.moveTo(cx + from[0] * h * 1.1, cy + from[1] * h * 1.1);
      ctx.lineTo(cx + to[0] * h * 1.1, cy + to[1] * h * 1.1);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.restore();
  if (step?.kind === 'fold') paintLabel(ctx, view, ARROW[FOLD_SWIPE[step.flap]], cx + h + 60, cy + bob(view, 6, 6), 70, theme.star);
  if (state.finished >= 0) paintLabel(ctx, view, 'Bánh vuông rồi!', arena.width / 2, cy, 50, theme.star);

  // Tray.
  TRAY_ORDER.forEach((item, i) => {
    const at = state.tray[i];
    if (!at) return;
    const wanted = step?.kind === 'add' && step.item === item;
    ctx.fillStyle = wanted ? theme.star : theme.light;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(at.x, at.y, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    sprites.draw(ctx, SPRITE[item], at.x, at.y + (wanted ? bob(view, 6, 4) : 0), 76);
  });
  if (state.dragging) sprites.draw(ctx, SPRITE[state.dragging.item], state.dragging.at.x, state.dragging.at.y, 86);

  // Finished cakes on a plate.
  for (let i = 0; i < state.cakes; i += 1) {
    const px = arena.width - 60;
    const py = 230 + i * 26;
    ctx.fillStyle = theme.leaf;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 2;
    roundRect(ctx, px - 30, py - 12, 60, 24, 4);
    ctx.fill();
    ctx.stroke();
  }
}
