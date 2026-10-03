// Blueprint build's picture: a building site (grass and a sandy plot), the small plan on blue paper with a
// tick on every square already right, the building grid where bricks drop in with a bounce, and four round
// paint pots (the picked one raised with a ring). A finished building gets a flag and words.
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { BlueprintState } from './logic';

const brickColours = (view: DrawView): readonly string[] => [view.theme.primary, view.theme.secondary, view.theme.star, view.theme.leaf];

function paintBrick(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, size: number, colour: string): void {
  const inset = size * 0.05;
  ctx.fillStyle = colour;
  ctx.strokeStyle = view.theme.ink;
  ctx.lineWidth = Math.max(2, size * 0.05);
  roundRect(ctx, x + inset, y + inset, size - inset * 2, size - inset * 2, size * 0.14);
  ctx.fill();
  ctx.stroke();
  // Brick lines and a shine.
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = view.theme.ink;
  ctx.lineWidth = Math.max(1, size * 0.03);
  ctx.beginPath();
  ctx.moveTo(x + inset * 2, y + size / 2);
  ctx.lineTo(x + size - inset * 2, y + size / 2);
  ctx.moveTo(x + size / 2, y + inset * 2);
  ctx.lineTo(x + size / 2, y + size / 2);
  ctx.stroke();
  ctx.fillStyle = view.theme.light;
  ctx.globalAlpha = 0.45;
  roundRect(ctx, x + size * 0.15, y + size * 0.12, size * 0.3, size * 0.1, size * 0.05);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawBlueprintBuild(ctx: CanvasRenderingContext2D, state: BlueprintState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const colours = brickColours(view);
  const { size, cell, left, top } = state;
  paintSky(ctx, view, arena.height * 0.4, 6);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, arena.height * 0.4, arena.width, arena.height);

  // The plan on blue paper.
  const pc = state.planCell;
  ctx.fillStyle = theme.secondary;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, state.planX - 12, state.planY - 12, pc * size + 24, pc * size + 24, 10);
  ctx.fill();
  ctx.stroke();
  state.plan.forEach((v, i) => {
    const x = state.planX + (i % size) * pc;
    const y = state.planY + Math.floor(i / size) * pc;
    ctx.strokeStyle = theme.light;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, pc, pc);
    ctx.globalAlpha = 1;
    if (v > 0) paintBrick(ctx, view, x, y, pc, colours[v - 1] ?? theme.light);
    if (v > 0 && state.built[i] === v) {
      ctx.strokeStyle = theme.light;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + pc * 0.25, y + pc * 0.5);
      ctx.lineTo(x + pc * 0.45, y + pc * 0.72);
      ctx.lineTo(x + pc * 0.78, y + pc * 0.28);
      ctx.stroke();
    }
  });

  // The plot and its grid.
  ctx.fillStyle = theme.groundDeep;
  roundRect(ctx, left - 12, top - 12, cell * size + 24, cell * size + 24, 16);
  ctx.fill();
  ctx.strokeStyle = theme.light;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2;
  for (let i = 0; i < size * size; i += 1) ctx.strokeRect(left + (i % size) * cell + 3, top + Math.floor(i / size) * cell + 3, cell - 6, cell - 6);
  ctx.globalAlpha = 1;
  state.built.forEach((v, i) => {
    if (v === 0) return;
    const drop = view.reducedMotion ? 0 : Math.max(0, 1 - (state.changed[i] ?? 9) / 0.15) * 30;
    paintBrick(ctx, view, left + (i % size) * cell, top + Math.floor(i / size) * cell - drop, cell, colours[v - 1] ?? theme.light);
  });

  // Paint pots.
  for (const b of state.buttons) {
    const picked = b.colour === state.colour;
    const r = state.buttonRadius * (picked ? 1.08 : 0.92);
    if (picked) {
      ctx.strokeStyle = theme.star;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r + 10, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = colours[b.colour] ?? theme.light;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = theme.light;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(b.x - r * 0.3, b.y - r * 0.3, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (state.doneAgo >= 0) {
    const grow = view.reducedMotion ? 1 : Math.min(1, state.doneAgo / 0.2);
    sprites.draw(ctx, 'house', left + cell * size - 10, top + 10, 80 * grow);
    paintLabel(ctx, view, 'Xây xong rồi!', left + (cell * size) / 2, top + (cell * size) / 2, 52 * grow, theme.star);
  }
}
