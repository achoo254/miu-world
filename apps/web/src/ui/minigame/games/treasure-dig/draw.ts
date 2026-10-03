// Treasure dig's picture: sea and sky behind a sandy beach of squares (shells here and there). A dug square
// is a hole tinted by its clue with a picture a child reads without words: fire = very close, sun = close,
// leaf = far, snowflake = very far. A legend shows the four, and round marks show the digs left. The found
// treasure jumps out of its hole; a missed one shows where it was.
import { bob, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { TREASURES, type Clue, type TreasureState } from './logic';

export const CLUE_PICTURES: Readonly<Record<Exclude<Clue, 0>, SpriteRef>> = { 1: 'fire', 2: 'sun', 3: 'leaf', 4: 'snowflake' };
const CLUE_WORDS: Readonly<Record<Exclude<Clue, 0>, string>> = { 1: 'Rất gần', 2: 'Gần', 3: 'Xa', 4: 'Rất xa' };

function clueColour(view: DrawView, clue: Exclude<Clue, 0>): string {
  const { theme } = view;
  return clue === 1 ? theme.danger : clue === 2 ? theme.star : clue === 3 ? theme.leaf : theme.water;
}

function paintLegend(ctx: CanvasRenderingContext2D, view: DrawView, state: TreasureState): void {
  const { arena, sprites, theme } = view;
  const gridRight = state.left + state.cols * state.cell;
  const gridBottom = state.top + state.rows * state.cell;
  const clues = [1, 2, 3, 4] as const;
  const right = state.side === 'right';
  const boxW = right ? arena.width - gridRight - 36 : Math.min(arena.width - 40, 560);
  const boxH = right ? 330 : 136;
  const bx = right ? gridRight + 18 : (arena.width - boxW) / 2;
  const by = right ? state.top : Math.min(gridBottom + 18, arena.height - boxH - 10);
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = theme.light;
  roundRect(ctx, bx, by, boxW, boxH, 20);
  ctx.fill();
  ctx.globalAlpha = 1;
  clues.forEach((clue, i) => {
    const x = right ? bx + 36 : bx + boxW * ((i + 0.5) / 4);
    const y = right ? by + 36 + i * 52 : by + 34;
    ctx.fillStyle = clueColour(view, clue);
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    sprites.draw(ctx, CLUE_PICTURES[clue], x, y, 34);
    if (right) paintLabel(ctx, view, CLUE_WORDS[clue], x + 70, y, 20);
    else paintLabel(ctx, view, CLUE_WORDS[clue], x, y + 36, 18);
  });
  // Digs left: a row of dots, full ones still to use.
  const dotsY = right ? by + boxH - 48 : by + boxH - 26;
  const span = Math.min(boxW - 30, state.digs * 26);
  for (let i = 0; i < state.digs; i += 1) {
    const x = bx + (boxW - span) / 2 + (i + 0.5) * (span / state.digs);
    ctx.fillStyle = i < state.digsLeft ? theme.primary : theme.stone;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, dotsY, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  if (right) paintLabel(ctx, view, `Còn ${state.digsLeft} lần`, bx + boxW / 2, dotsY + 28, 20);
}

export function drawTreasureDig(ctx: CanvasRenderingContext2D, state: TreasureState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { cell, left, top, cols, rows } = state;
  const shore = top - 20;
  paintSky(ctx, view, shore, 6);
  ctx.fillStyle = theme.water;
  ctx.fillRect(0, Math.max(HUD_SAFE_TOP - 20, shore - 70), arena.width, 70);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, shore, arena.width, arena.height - shore);

  const treasure = TREASURES[(state.round - 1) % TREASURES.length] ?? 'gift';
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = left + col * cell;
      const y = top + row * cell;
      // Sand: a pale square warmed with the star colour, every other square a shade darker.
      ctx.fillStyle = theme.light;
      roundRect(ctx, x + 3, y + 3, cell - 6, cell - 6, 12);
      ctx.fill();
      ctx.globalAlpha = (row + col) % 2 === 0 ? 0.5 : 0.68;
      ctx.fillStyle = theme.star;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = theme.groundDeep;
      ctx.lineWidth = 2;
      roundRect(ctx, x + 3, y + 3, cell - 6, cell - 6, 12);
      ctx.stroke();
      // A shell on some untouched squares, fixed by position.
      if ((col * 7 + row * 13 + state.round) % 11 === 0 && !state.dug.some((d) => d.col === col && d.row === row)) {
        sprites.draw(ctx, 'spiral-shell', x + cell * 0.72, y + cell * 0.7, cell * 0.3, { alpha: 0.8 });
      }
    }
  }

  for (const d of state.dug) {
    const cx = left + (d.col + 0.5) * cell;
    const cy = top + (d.row + 0.5) * cell;
    const pop = view.reducedMotion ? 1 : Math.min(1, d.t / 0.15);
    ctx.fillStyle = theme.groundDeep;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, cell * 0.4 * pop, cell * 0.3 * pop, 0, 0, Math.PI * 2);
    ctx.fill();
    if (d.clue === 0) continue;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = clueColour(view, d.clue);
    roundRect(ctx, cx - cell / 2 + 5, cy - cell / 2 + 5, cell - 10, cell - 10, 12);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    ctx.stroke();
    sprites.draw(ctx, CLUE_PICTURES[d.clue], cx, cy, cell * 0.6 * (0.6 + 0.4 * pop));
  }

  const tx = left + (state.treasure.col + 0.5) * cell;
  const ty = top + (state.treasure.row + 0.5) * cell;
  if (state.ended) {
    const t = state.ended.t;
    if (state.ended.how === 'found') {
      const jump = view.reducedMotion ? 0 : Math.sin(Math.min(1, t / 0.5) * Math.PI) * cell * 0.6;
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = theme.star;
      ctx.beginPath();
      ctx.arc(tx, ty, cell * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      sprites.draw(ctx, treasure, tx, ty - jump, cell * 0.9);
      sprites.draw(ctx, 'sparkles', tx + cell * 0.45, ty - cell * 0.5 - jump, cell * 0.5);
      paintLabel(ctx, view, 'Tìm thấy rồi!', arena.width / 2, HUD_SAFE_TOP + 24, 44, theme.star);
    } else {
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 8);
      ctx.strokeStyle = theme.star;
      ctx.lineWidth = 8;
      roundRect(ctx, tx - cell / 2 + 4, ty - cell / 2 + 4, cell - 8, cell - 8, 12);
      ctx.stroke();
      ctx.globalAlpha = 1;
      sprites.draw(ctx, treasure, tx, ty + bob(view, 4, 3), cell * 0.75);
      paintLabel(ctx, view, 'Kho báu ở đây!', arena.width / 2, HUD_SAFE_TOP + 24, 40);
    }
  }
  paintLegend(ctx, view, state);
}
