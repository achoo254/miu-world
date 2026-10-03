// Word search's picture: a sheet of squared paper with the letters big and clear, capsules over the words
// found (each in its own colour), the drag or first tapped letter lit, and the six words to find as picture
// cards with the word under each picture (ticked and faded once found).
import { paintLabel, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import type { DrawView } from '../../types';
import { cellsOf, N, WORDS, type WordSearchState } from './logic';

/** Pictures by WORDS index. */
export const PICTURES: readonly SpriteRef[] = [
  'cat',
  'duck',
  'crab',
  'star',
  'tulip',
  'bear',
  'rabbit',
  'fox',
  'red-apple',
  'grapes',
  'watermelon',
  'candy',
  'soccer-ball',
  'kite',
  'drum',
  'turtle',
  'monkey',
  'mushroom',
  'dog',
  'honeybee',
  'frog',
  'butterfly',
];

export function drawWordSearch(ctx: CanvasRenderingContext2D, state: WordSearchState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 0, arena.width, arena.height);
  const { cell, left, top } = state;
  const size = cell * N;
  ctx.fillStyle = theme.light;
  roundRect(ctx, left - 8, top - 8, size + 16, size + 16, 16);
  ctx.fill();
  const colours = [theme.primary, theme.secondary, theme.leaf, theme.danger, theme.water, theme.star];
  const centre = (i: number) => ({ x: left + ((i % N) + 0.5) * cell, y: top + (Math.floor(i / N) + 0.5) * cell });
  const capsule = (cells: number[], colour: string, alpha: number): void => {
    const a = centre(cells[0] ?? 0);
    const b = centre(cells[cells.length - 1] ?? 0);
    ctx.strokeStyle = colour;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = cell * 0.78;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x + 0.01, b.y);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.globalAlpha = 1;
  };
  state.placed.forEach((p, k) => {
    if (p.found) capsule(cellsOf(p), colours[k % colours.length] ?? theme.primary, 0.45);
  });
  if (state.selection.length > 0) capsule(state.selection, theme.star, 0.7);
  ctx.strokeStyle = theme.waterLight;
  ctx.lineWidth = 2;
  for (let k = 1; k < N; k += 1) {
    ctx.beginPath();
    ctx.moveTo(left + k * cell, top);
    ctx.lineTo(left + k * cell, top + size);
    ctx.moveTo(left, top + k * cell);
    ctx.lineTo(left + size, top + k * cell);
    ctx.stroke();
  }
  state.grid.forEach((letter, i) => {
    const c = centre(i);
    ctx.font = `800 ${Math.round(cell * 0.52)}px ${theme.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = theme.ink;
    ctx.fillText(letter, c.x, c.y + 2);
  });

  // Picture cards.
  state.placed.forEach((p, k) => {
    const at = state.hints[k];
    if (!at) return;
    const s = state.hintSize;
    ctx.globalAlpha = p.found ? 0.5 : 1;
    ctx.fillStyle = theme.light;
    ctx.strokeStyle = colours[k % colours.length] ?? theme.primary;
    ctx.lineWidth = 5;
    roundRect(ctx, at.x - s / 2 + 4, at.y - s / 2 + 4, s - 8, s - 8, 14);
    ctx.fill();
    ctx.stroke();
    sprites.draw(ctx, PICTURES[WORDS[p.word]?.[1] ?? 0] ?? 'star', at.x, at.y - s * 0.12, s * 0.5);
    ctx.font = `800 ${Math.round(s * 0.22)}px ${theme.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = theme.ink;
    ctx.fillText(WORDS[p.word]?.[0] ?? '', at.x, at.y + s * 0.3);
    ctx.globalAlpha = 1;
    if (p.found) paintLabel(ctx, view, '✓', at.x + s * 0.32, at.y - s * 0.32, s * 0.3, theme.leaf);
  });
  if (state.phase === 'next') paintLabel(ctx, view, 'Tìm hết rồi!', left + size / 2, top + size / 2, 44, theme.star);
}
