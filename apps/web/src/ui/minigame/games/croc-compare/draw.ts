// Hungry crocodile's picture: a riverbank, two plates (a big number, or a little group of fruit to count),
// the crocodile between them turning toward what it eats (a snap) or yawning after a wrong choice, the "="
// button under it, and the sign of the answer shown big once it is right.
import { paintGround, paintHills, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import type { DrawView, Point } from '../../types';
import { EQUAL_RADIUS, type CrocState, type Plate } from './logic';

export const ITEMS: readonly SpriteRef[] = ['strawberry', 'red-apple', 'banana', 'fish', 'carrot', 'egg', 'cherries', 'lemon'];

function paintPlate(ctx: CanvasRenderingContext2D, view: DrawView, plate: Plate, at: Point, radius: number, eaten: number): void {
  const { theme, sprites } = view;
  paintShadow(ctx, view, at.x, at.y + radius * 0.85, radius * 1.8);
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.stoneEdge;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(at.x, at.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = theme.stone;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(at.x, at.y, radius * 0.8, 0, Math.PI * 2);
  ctx.stroke();
  const alpha = 1 - eaten;
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;
  if (plate.kind === 'number') {
    paintLabel(ctx, view, String(plate.value), at.x, at.y + 4, radius * 0.75, theme.primary);
  } else {
    // Up to 10 things: rows of 3–4 inside the plate.
    const cols = plate.value <= 4 ? 2 : plate.value <= 9 ? 3 : 4;
    const rows = Math.ceil(plate.value / cols);
    const cell = Math.min((radius * 1.4) / cols, (radius * 1.4) / rows);
    for (let i = 0; i < plate.value; i += 1) {
      const row = Math.floor(i / cols);
      const inRow = Math.min(cols, plate.value - row * cols);
      const col = i % cols;
      const x = at.x + (col - (inRow - 1) / 2) * cell;
      const y = at.y + (row - (rows - 1) / 2) * cell;
      sprites.draw(ctx, ITEMS[plate.item % ITEMS.length] ?? 'strawberry', x, y, cell * 0.9);
    }
  }
  ctx.globalAlpha = 1;
}

export function drawCrocCompare(ctx: CanvasRenderingContext2D, state: CrocState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const horizon = state.leftPlate.y - state.plateRadius - 20;
  paintSky(ctx, view, horizon, 8);
  paintHills(ctx, view, horizon + 10, 60, 50, theme.leaf);
  paintGround(ctx, view, horizon + 10);
  // The river behind the crocodile.
  ctx.fillStyle = theme.water;
  roundRect(ctx, -20, state.croc.y - state.crocSize * 0.3, arena.width + 40, state.crocSize * 0.6, 40);
  ctx.fill();
  ctx.fillStyle = theme.waterLight;
  ctx.globalAlpha = 0.5;
  for (let x = ((view.time * 30) % 120) - 120; x < arena.width; x += 120) ctx.fillRect(x, state.croc.y + state.crocSize * 0.18, 50, 6);
  ctx.globalAlpha = 1;

  const chomp = state.phase === 'chomp' ? Math.min(1, state.phaseAgo / 0.35) : 0;
  paintPlate(ctx, view, state.left, state.leftPlate, state.plateRadius, state.chosen === 'left' || state.chosen === 'equal' ? chomp : 0);
  paintPlate(ctx, view, state.right, state.rightPlate, state.plateRadius, state.chosen === 'right' || state.chosen === 'equal' ? chomp : 0);

  // The crocodile (seen from above, head down in its picture): waits head up, turns its head toward its
  // choice and lunges; yawns (stretches) after a wrong choice.
  const facing = state.chosen;
  const turn = facing === 'left' ? Math.PI / 2 : facing === 'right' ? -Math.PI / 2 : facing === 'equal' ? 0 : Math.PI;
  const toward = facing === 'left' ? { x: -1, y: 0 } : facing === 'right' ? { x: 1, y: 0 } : facing === 'equal' ? { x: 0, y: 1 } : { x: 0, y: 0 };
  const lunge = state.phase === 'chomp' && !view.reducedMotion ? Math.sin(Math.min(1, state.phaseAgo / 0.3) * Math.PI) * 40 : 0;
  const yawn = state.phase === 'yawn' && !view.reducedMotion ? Math.sin(Math.min(1, state.phaseAgo / 0.8) * Math.PI) : 0;
  const wiggle = state.phase === 'ask' && !view.reducedMotion ? Math.sin(view.time * 3) * 0.06 : 0;
  sprites.draw(ctx, 'crocodile', state.croc.x + toward.x * lunge, state.croc.y + toward.y * lunge, state.crocSize, { rotate: turn + wiggle, squash: [1 + 0.12 * yawn, 1 - 0.1 * yawn] });
  if (state.phase === 'yawn') paintLabel(ctx, view, 'Ơ…', state.croc.x + state.crocSize * 0.35, state.croc.y - state.crocSize * 0.35, 34, theme.light);

  // The sign of the right answer, big between the plates.
  if (state.phase === 'chomp') {
    const sign = state.answer === 'left' ? '>' : state.answer === 'right' ? '<' : '=';
    const size = Math.min(100, state.plateRadius * 0.8);
    ctx.fillStyle = theme.ink;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.arc(arena.width / 2, state.leftPlate.y, size * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    paintLabel(ctx, view, sign, arena.width / 2, state.leftPlate.y + 4, size, theme.star);
  }

  // "=" button.
  const b = state.equalButton;
  ctx.fillStyle = theme.secondary;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(b.x, b.y, EQUAL_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  paintLabel(ctx, view, '=', b.x, b.y + 2, 54, theme.light);
}
