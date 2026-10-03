// Magic letters' picture: a castle courtyard sky, balloons drifting down each with a big letter and, under it
// on the string, the picture of a word that starts with it; the glowing trail of the stroke being written with
// a magic sparkle at the fingertip; the letter just read shown big (green when it popped a balloon); a balloon
// that popped bursts into sparkles.
import { paintGround, paintLabel, paintSky } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import type { DrawView } from '../../types';
import type { MagicLettersState } from './logic';
import type { Letter } from './recognize';

/** A word picture for each letter: o – ong, c – cá, l – lá, n – nấm, m – mèo, v – vịt, s – sao, b – bóng. */
export const LETTER_PICTURES: Readonly<Record<Letter, SpriteRef>> = { o: 'honeybee', c: 'fish', l: 'leaf', n: 'mushroom', m: 'cat', v: 'duck', s: 'star', b: 'soccer-ball' };

export function drawMagicLetters(ctx: CanvasRenderingContext2D, state: MagicLettersState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, state.groundY, 6);
  paintGround(ctx, view, state.groundY);
  for (const b of state.balloons) {
    if (b.popped >= 0) {
      sprites.draw(ctx, 'sparkles', b.x, b.y, 90 + b.popped * 60, { alpha: 1 - b.popped / 0.6 });
      continue;
    }
    const sway = view.reducedMotion ? 0 : Math.sin(view.time * 2 + b.x) * 6;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(b.x + sway, b.y + 55);
    ctx.lineTo(b.x, b.y + 95);
    ctx.stroke();
    sprites.draw(ctx, 'balloon', b.x + sway, b.y, 130);
    paintLabel(ctx, view, b.letter, b.x + sway, b.y - 8, 64, theme.light);
    sprites.draw(ctx, LETTER_PICTURES[b.letter], b.x, b.y + 110, 46);
  }
  if (state.stroke.length > 1) {
    ctx.strokeStyle = theme.star;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    state.stroke.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.lineCap = 'butt';
    const tip = state.stroke.at(-1);
    if (tip) sprites.draw(ctx, 'sparkles', tip.x, tip.y, 46);
  }
  const since = state.time - state.lastReadAt;
  if (since < 0.8) paintLabel(ctx, view, state.lastRead ?? '?', arena.width / 2, arena.height * 0.45, 110, state.lastHit ? theme.leaf : theme.light);
}
