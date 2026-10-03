// Spot the difference's picture: two framed pictures of the same meadow (sky, sun, a cloud, grass) filled with
// Fluent pictures; the second differs in five places. Found differences get a ring in both pictures, a hint
// glows, a wrong tap shows a small cross, and the pictures show how many of the five are found.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { DIFFS, thingAt, thingReach, type Panel, type SpotDiffState, type Thing } from './logic';

function paintPanel(ctx: CanvasRenderingContext2D, view: DrawView, state: SpotDiffState, panel: Panel, second: boolean): void {
  const { theme, sprites } = view;
  ctx.save();
  roundRect(ctx, panel.x, panel.y, panel.w, panel.h, 18);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, panel.y, 0, panel.y + panel.h);
  sky.addColorStop(0, theme.sky[0]);
  sky.addColorStop(0.5, theme.sky[1]);
  sky.addColorStop(1, theme.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  ctx.fillStyle = theme.ground;
  ctx.beginPath();
  ctx.moveTo(panel.x, panel.y + panel.h);
  ctx.lineTo(panel.x, panel.y + panel.h * 0.32);
  ctx.quadraticCurveTo(panel.x + panel.w / 2, panel.y + panel.h * 0.22, panel.x + panel.w, panel.y + panel.h * 0.34);
  ctx.lineTo(panel.x + panel.w, panel.y + panel.h);
  ctx.fill();
  const unit = Math.min(panel.w, panel.h);
  sprites.draw(ctx, 'sun', panel.x + panel.w * 0.88, panel.y + unit * 0.1, unit * 0.14);
  sprites.draw(ctx, 'cloud', panel.x + panel.w * 0.3, panel.y + unit * 0.09, unit * 0.16);

  for (const thing of [...state.things].sort((a, b) => a.v - b.v)) paintThing(ctx, view, panel, thing, second);
  ctx.restore();
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 7;
  roundRect(ctx, panel.x, panel.y, panel.w, panel.h, 18);
  ctx.stroke();
}

function paintThing(ctx: CanvasRenderingContext2D, view: DrawView, panel: Panel, thing: Thing, second: boolean): void {
  const at = thingAt(panel, thing);
  const size = thing.size * Math.min(panel.w, panel.h);
  // The left (or upper) picture has what was there; the other picture differs.
  if (!second) {
    if (thing.diff !== 'extra') view.sprites.draw(ctx, thing.sprite, at.x, at.y, size);
    return;
  }
  if (thing.diff === 'missing') return;
  const sprite = thing.diff === 'swapped' ? thing.other : thing.sprite;
  view.sprites.draw(ctx, sprite, at.x, at.y, thing.diff === 'bigger' ? size * 1.55 : size);
}

export function drawSpotDiff(ctx: CanvasRenderingContext2D, state: SpotDiffState, view: DrawView): void {
  const { arena, theme } = view;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 0, arena.width, arena.height);
  paintPanel(ctx, view, state, state.panels[0], false);
  paintPanel(ctx, view, state, state.panels[1], true);

  for (const [i, thing] of state.things.entries()) {
    if (!thing.diff) continue;
    const glowing = i === state.hint && state.hintLeft > 0;
    if (!thing.found && !glowing) continue;
    for (const panel of state.panels) {
      const at = thingAt(panel, thing);
      const r = thingReach(panel, thing);
      ctx.strokeStyle = thing.found ? theme.primary : theme.star;
      ctx.lineWidth = thing.found ? 7 : 6 + Math.sin(view.time * 10) * 3;
      ctx.beginPath();
      ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  if (state.missAt && state.missAgo < 0.5) {
    ctx.globalAlpha = 1 - state.missAgo / 0.5;
    paintLabel(ctx, view, '✕', state.missAt.x, state.missAt.y, 44, theme.danger);
    ctx.globalAlpha = 1;
  }
  const found = state.things.filter((t) => t.diff && t.found).length;
  const [, second] = state.panels;
  paintLabel(ctx, view, `${found}/${DIFFS}`, second.x + second.w - 50, second.y + second.h - 34, 34, theme.star);
  if (state.doneAgo >= 0) paintLabel(ctx, view, 'Tìm đủ rồi!', arena.width / 2, arena.height / 2, 54, theme.star);
}
