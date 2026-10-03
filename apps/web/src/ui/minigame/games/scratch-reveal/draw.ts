// Scratch reveal's picture: the map's sky and ground, a wooden frame holding the card, the animal under it,
// the cover (snow, or sand on the beach and river maps) drawn cell by cell with soft lumpy edges and
// glints, a sparkle wandering over a fresh card to say "rub here", and the three round answer buttons: faded
// with a question mark until enough shows, fading away when wrong, glowing when right.
import { bob, paintGround, paintHills, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import type { DrawView } from '../../types';
import { ANIMAL_COUNT, GRID, OPEN_AT, type ScratchState } from './logic';

export const ANIMALS: readonly SpriteRef[] = [
  'penguin', 'fox', 'bear', 'rabbit', 'owl', 'frog', 'turtle', 'crab', 'octopus', 'dolphin',
  'duck', 'cat', 'panda', 'monkey-face', 'snail', 'butterfly', 'honeybee', 'chicken', 'cow', 'goat',
];
if (ANIMALS.length !== ANIMAL_COUNT) throw new Error('scratch-reveal: animal list and ANIMAL_COUNT differ');

const animal = (i: number): SpriteRef => ANIMALS[i] ?? 'cat';

function paintCover(ctx: CanvasRenderingContext2D, view: DrawView, state: ScratchState, alpha: number): void {
  const { theme } = view;
  const { card } = state;
  const cell = card.size / GRID;
  const sandy = theme.id === 'beach' || theme.id === 'river';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = sandy ? theme.ground : theme.light;
  for (let r = 0; r < GRID; r += 1) {
    for (let c = 0; c < GRID; c += 1) {
      if (state.cleared[r * GRID + c]) continue;
      const x = card.x + c * cell;
      const y = card.y + r * cell;
      ctx.fillRect(x - 0.5, y - 0.5, cell + 1, cell + 1);
      // Lumps where the cover meets a scratched cell.
      const open = (rr: number, cc: number): boolean => rr >= 0 && cc >= 0 && rr < GRID && cc < GRID && state.cleared[rr * GRID + cc] === true;
      if (open(r - 1, c) || open(r + 1, c) || open(r, c - 1) || open(r, c + 1)) {
        ctx.beginPath();
        ctx.arc(x + cell / 2, y + cell / 2, cell * 0.68, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // Snowflakes (or shells) pressed into the cover, and glints on what is left.
  for (let i = 0; i < 7; i += 1) {
    const c = (i * 5 + 2) % GRID;
    const r = (i * 9 + 1) % GRID;
    if (state.cleared[r * GRID + c]) continue;
    view.sprites.draw(ctx, sandy ? 'spiral-shell' : 'snowflake', card.x + (c + 0.5) * cell, card.y + (r + 0.5) * cell, cell * 1.4, { alpha: alpha * 0.55, rotate: i });
  }
  ctx.fillStyle = sandy ? theme.groundDeep : theme.waterLight;
  for (let i = 0; i < 26; i += 1) {
    const c = (i * 5 + (i * i) % 7) % GRID;
    const r = (i * 3 + 5) % GRID;
    if (state.cleared[r * GRID + c]) continue;
    const twinkle = view.reducedMotion ? 0.6 : 0.4 + 0.4 * Math.sin(view.time * 3 + i);
    ctx.globalAlpha = alpha * twinkle;
    ctx.beginPath();
    ctx.arc(card.x + (c + 0.5) * cell, card.y + (r + 0.5) * cell, cell * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawScratchReveal(ctx: CanvasRenderingContext2D, state: ScratchState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { card } = state;
  const horizon = arena.height * 0.45;
  paintSky(ctx, view, horizon, 8);
  paintHills(ctx, view, horizon, 120, 80, theme.leaf);
  paintGround(ctx, view, horizon + 10);

  // Frame and the picture.
  ctx.fillStyle = theme.wood;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 6;
  roundRect(ctx, card.x - 16, card.y - 16, card.size + 32, card.size + 32, 26);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.sky[2];
  ctx.fillRect(card.x, card.y, card.size, card.size);
  const pop = state.reveal > 0 && !view.reducedMotion ? 1 + 0.08 * Math.sin((1 - state.reveal) * Math.PI * 3) : 1;
  sprites.draw(ctx, animal(state.answer), card.x + card.size / 2, card.y + card.size / 2, card.size * 0.82 * pop);
  paintCover(ctx, view, state, state.reveal > 0 ? Math.max(0, state.reveal - 0.4) / 0.6 : 1);

  // A sparkle wandering over a fresh card: "rub here".
  if (state.clearedShare === 0 && state.reveal <= 0) {
    const t = view.reducedMotion ? 0.5 : view.time * 1.6;
    sprites.draw(ctx, 'sparkles', card.x + card.size * (0.5 + 0.3 * Math.sin(t * 2)), card.y + card.size * (0.5 + 0.2 * Math.sin(t * 3)), 70);
  }

  const open = state.clearedShare >= OPEN_AT;
  for (const c of state.choices) {
    const right = c.animal === state.answer && state.reveal > 0;
    const wobble = c.wrong && c.since < 0.4 && !view.reducedMotion ? Math.sin(c.since * 40) * 8 : 0;
    const alpha = !open ? 0.45 : c.wrong ? 0.25 : 1;
    ctx.globalAlpha = alpha;
    if (right) {
      ctx.fillStyle = theme.star;
      ctx.beginPath();
      ctx.arc(c.x, c.y, state.choiceRadius + 14, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = theme.light;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(c.x + wobble, c.y, state.choiceRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (open) sprites.draw(ctx, animal(c.animal), c.x + wobble, c.y + (c.wrong ? 0 : bob(view, 3, 3, c.x)), state.choiceRadius * 1.5);
    ctx.globalAlpha = 1;
    if (!open) paintLabel(ctx, view, '?', c.x, c.y, 60);
  }
  if (state.reveal > 0 && state.lastPoints === 2) paintLabel(ctx, view, 'Tinh mắt quá!', card.x + card.size / 2, card.y + card.size - 40, 44, theme.star);
}
