// Tone mark's picture: a school-board scene with the picture bouncing on a little stage, the word big on a
// paper card (the bare word, then the right word in gold, or the funny wrong one with a shake), and five
// round hats along the bottom, each with its mark drawn big and its name under it.
import { bob, paintGround, paintHills, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { TONE_NAMES, type Hat, type Tone, type ToneMarkState } from './logic';

/** A tone mark drawn as a shape (fonts differ; the shapes do not). */
function paintMark(ctx: CanvasRenderingContext2D, tone: Tone, x: number, y: number, size: number, colour: string): void {
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = size * 0.16;
  ctx.lineCap = 'round';
  ctx.beginPath();
  switch (tone) {
    case 'sac':
      ctx.moveTo(x - size * 0.2, y + size * 0.28);
      ctx.lineTo(x + size * 0.2, y - size * 0.28);
      ctx.stroke();
      break;
    case 'huyen':
      ctx.moveTo(x - size * 0.2, y - size * 0.28);
      ctx.lineTo(x + size * 0.2, y + size * 0.28);
      ctx.stroke();
      break;
    case 'hoi':
      ctx.arc(x, y - size * 0.1, size * 0.2, Math.PI * 1.1, Math.PI * 0.45);
      ctx.lineTo(x, y + size * 0.3);
      ctx.stroke();
      break;
    case 'nga':
      ctx.moveTo(x - size * 0.32, y + size * 0.06);
      ctx.bezierCurveTo(x - size * 0.18, y - size * 0.24, x - size * 0.04, y - size * 0.1, x, y);
      ctx.bezierCurveTo(x + size * 0.04, y + size * 0.1, x + size * 0.18, y + size * 0.24, x + size * 0.32, y - size * 0.06);
      ctx.stroke();
      break;
    case 'nang':
      ctx.arc(x, y, size * 0.13, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
  ctx.lineCap = 'butt';
}

function paintHat(ctx: CanvasRenderingContext2D, view: DrawView, hat: Hat, size: number, chosen: boolean): void {
  const { theme } = view;
  const r = size / 2;
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.arc(hat.x + 3, hat.y + 7, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.light;
  ctx.beginPath();
  ctx.arc(hat.x, hat.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = chosen ? 9 : 5;
  ctx.strokeStyle = chosen ? theme.star : theme.ink;
  ctx.stroke();
  paintMark(ctx, hat.tone, hat.x, hat.y - r * 0.18, size * 0.62, theme.primary);
  // The tone's name in plain dark letters (an outline would blur the small marks of "sắc", "ngã").
  ctx.font = `800 ${Math.max(18, size * 0.2)}px ${theme.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = theme.ink;
  ctx.fillText(TONE_NAMES[hat.tone], hat.x, hat.y + r * 0.58);
}

export function drawToneMark(ctx: CanvasRenderingContext2D, state: ToneMarkState, view: DrawView): void {
  const { theme, sprites } = view;
  const groundY = Math.min(state.card.y - 46, state.pictureAt.y + state.pictureSize * 0.45);
  paintSky(ctx, view, groundY, 6);
  paintHills(ctx, view, groundY, 30, 80, theme.leaf);
  paintGround(ctx, view, groundY);

  // The picture on a little round stage on the grass.
  const { pictureAt, pictureSize: size } = state;
  const jump = state.mood === 'right' && !view.reducedMotion ? Math.sin(Math.min(1, state.moodAgo / 0.4) * Math.PI) * 30 : 0;
  ctx.fillStyle = theme.wood;
  ctx.beginPath();
  ctx.ellipse(pictureAt.x, pictureAt.y + size * 0.45, size * 0.6, size * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  sprites.draw(ctx, state.picture, pictureAt.x, pictureAt.y + bob(view, 2.5, 5) - jump, size);
  if (state.mood === 'right') sprites.draw(ctx, 'sparkles', pictureAt.x + size * 0.5, pictureAt.y - size * 0.4, 70, { alpha: 1 - state.moodAgo });

  // The word card.
  const { card } = state;
  const shake = state.mood === 'wrong' && !view.reducedMotion && state.moodAgo < 0.4 ? Math.sin(state.moodAgo * 50) * 10 * (1 - state.moodAgo / 0.4) : 0;
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.25;
  roundRect(ctx, card.x + 4 + shake, card.y + 8, card.w, card.h, 24);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.light;
  roundRect(ctx, card.x + shake, card.y, card.w, card.h, 24);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = state.mood === 'right' ? theme.star : state.mood === 'wrong' ? theme.danger : theme.ink;
  ctx.stroke();
  const text = state.mood === 'wrong' ? `${state.shown}?` : state.shown;
  const colour = state.mood === 'right' ? theme.star : state.mood === 'wrong' ? theme.danger : theme.primary;
  paintLabel(ctx, view, text, card.x + card.w / 2 + shake, card.y + card.h / 2 + 6, Math.min(card.h * 0.7, 100), colour);

  const held = state.hats.find((h) => h.tone === state.held);
  for (const hat of state.hats) if (hat !== held) paintHat(ctx, view, hat, state.hatSize, false);
  if (held) {
    // Its empty place stays outlined while it is carried.
    if (state.dragging) {
      ctx.globalAlpha = 0.4;
      ctx.setLineDash([10, 10]);
      ctx.lineWidth = 4;
      ctx.strokeStyle = theme.light;
      ctx.beginPath();
      ctx.arc(held.home.x, held.home.y, state.hatSize / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    paintHat(ctx, view, held, state.hatSize * (state.dragging ? 1.12 : 1), true);
  }
}
