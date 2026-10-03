// Word chain's picture: a festival sky; the dragon (a dragon face and a body of scales) carries its last words
// as cards, the newest at the tail, its second sound in gold so the child knows what to look for; three
// picture cards below. A right card flies up to the tail; a wrong one drops away; a finished dragon swims off.
import { bob, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { firstSound, lastSound, type Card, type Word, type WordChainState } from './logic';

function paintWordCard(ctx: CanvasRenderingContext2D, view: DrawView, word: Word, x: number, y: number, w: number, h: number, options: { highlightLast?: boolean; alpha?: number } = {}): void {
  const { theme, sprites } = view;
  ctx.globalAlpha = options.alpha ?? 1;
  ctx.fillStyle = theme.light;
  roundRect(ctx, x, y, w, h, 20);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = theme.ink;
  ctx.stroke();
  sprites.draw(ctx, word.picture, x + w / 2, y + h * 0.36, Math.min(w * 0.5, h * 0.5), { alpha: options.alpha ?? 1 });
  const size = Math.min(34, w / (word.text.length * 0.5));
  if (options.highlightLast) {
    // The second sound in gold: the next word must start with it.
    const first = firstSound(word);
    const last = lastSound(word);
    ctx.font = `800 ${size}px ${theme.font}`;
    const space = ctx.measureText(' ').width;
    const a = ctx.measureText(first).width;
    const b = ctx.measureText(last).width;
    const start = x + w / 2 - (a + space + b) / 2;
    paintLabel(ctx, view, first, start + a / 2, y + h * 0.8, size, theme.light);
    paintLabel(ctx, view, last, start + a + space + b / 2, y + h * 0.8, size * 1.08, theme.star);
  } else {
    paintLabel(ctx, view, word.text, x + w / 2, y + h * 0.8, size, theme.light);
  }
  ctx.globalAlpha = 1;
}

function paintOption(ctx: CanvasRenderingContext2D, view: DrawView, card: Card, tailAt: { x: number; y: number }, resting: boolean): void {
  if (card.goneAgo < 0) {
    paintWordCard(ctx, view, card, card.x, card.y + bob(view, 2, 3, card.x), card.w, card.h, { alpha: resting ? 0.6 : 1 });
    return;
  }
  const t = Math.min(1, card.goneAgo / 0.5);
  if (card.right) {
    // Up to the dragon's tail, shrinking.
    const s = 1 - t * 0.35;
    const x = card.x + (tailAt.x - card.x - (card.w * s) / 2) * t;
    const y = card.y + (tailAt.y - card.y - (card.h * s) / 2) * t;
    paintWordCard(ctx, view, card, x, y, card.w * s, card.h * s);
    return;
  }
  paintWordCard(ctx, view, card, card.x + (view.reducedMotion ? 0 : Math.sin(t * 30) * 8), card.y + t * 220, card.w, card.h, { alpha: 1 - t });
}

export function drawWordChain(ctx: CanvasRenderingContext2D, state: WordChainState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, arena.height, 10);

  // The dragon: head at the left, its last words along a wavy body, swimming off right when complete.
  const away = state.flewAgo >= 0 ? state.flewAgo * state.flewAgo * 700 : 0;
  const segW = Math.min(190, (arena.width - 190) / 3);
  const segH = Math.min(segW * 0.82, 140);
  const shown = state.dragon.slice(-3);
  const headX = 70 + away;
  // Cards start behind the head.
  const bodyX = headX + segH * 0.55;
  const y = state.dragonY;
  // Body ribbon.
  ctx.strokeStyle = theme.danger;
  ctx.lineWidth = segH * 0.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(headX, y);
  for (let i = 0; i <= shown.length; i += 1) ctx.lineTo(bodyX + i * (segW + 10), y + Math.sin(view.time * 3 + i) * (view.reducedMotion ? 0 : 10));
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.fillStyle = theme.star;
  for (let i = 0; i < shown.length * 3 + 2; i += 1) {
    ctx.beginPath();
    ctx.arc(bodyX - 10 + i * ((segW + 10) / 3), y - segH * 0.25, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  shown.forEach((word, i) => {
    const last = i === shown.length - 1;
    const wiggle = last && state.grewAgo < 0.4 && !view.reducedMotion ? Math.sin(state.grewAgo * 30) * 6 : 0;
    const x = bodyX + i * (segW + 10);
    paintWordCard(ctx, view, word, x, y - segH / 2 + wiggle + Math.sin(view.time * 3 + i) * (view.reducedMotion ? 0 : 8), segW, segH, { highlightLast: last, alpha: last ? 1 : 0.85 });
  });
  sprites.draw(ctx, 'dragon-face', headX, y + bob(view, 3, 5), segH * 1.15, { flipX: true });
  const tail = { x: bodyX + shown.length * (segW + 10) + segW / 2, y };
  if (state.flewAgo >= 0) paintLabel(ctx, view, 'Rồng dài quá! Bay thôi!', arena.width / 2, y + segH * 0.9, 36, theme.star);

  const tailCard = shown.at(-1);
  if (tailCard && state.flewAgo < 0) paintLabel(ctx, view, `Từ nào bắt đầu bằng "${lastSound(tailCard)}"?`, arena.width / 2, (state.options[0]?.y ?? arena.height) - 40, 30);
  for (const card of state.options) paintOption(ctx, view, card, { x: Math.min(arena.width - segW / 2, tail.x), y }, state.rest > 0);
}
