// Story order's picture: a classroom wall with the story's title on a ribbon, the shuffled pictures pinned in
// the top half and four numbered places below (1 → 2 → 3 → 4 with little arrows). Each picture is a paper card
// with its little scene of emoji; a dragged one follows the finger, a wrong one shakes, and while the pictures
// rest they are dimmed. A finished story glows and the four cards bounce one after another.
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { centre, type Rect, type StoryState } from './logic';
import { STORIES, type Frame } from './stories';

function paintFrame(ctx: CanvasRenderingContext2D, view: DrawView, frame: Frame | undefined, r: Rect, alpha: number, ring: string | null): void {
  const { theme, sprites } = view;
  ctx.globalAlpha = alpha * 0.25;
  ctx.fillStyle = theme.ink;
  roundRect(ctx, r.x + 4, r.y + 8, r.w, r.h, 16);
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = theme.light;
  roundRect(ctx, r.x, r.y, r.w, r.h, 16);
  ctx.fill();
  ctx.lineWidth = ring ? 8 : 4;
  ctx.strokeStyle = ring ?? theme.ink;
  ctx.stroke();
  // A strip of ground at the bottom of every scene.
  ctx.fillStyle = theme.ground;
  ctx.fillRect(r.x + 6, r.y + r.h * 0.84, r.w - 12, r.h * 0.12);
  if (!frame) return;
  const side = Math.min(r.w, r.h);
  for (const item of frame.items) {
    sprites.draw(ctx, item.sprite, r.x + item.x * r.w, r.y + item.y * r.h, item.size * side, { rotate: item.rotate, flipX: item.flipX, alpha });
  }
  if (frame.word) paintLabel(ctx, view, frame.word.text, r.x + frame.word.x * r.w, r.y + frame.word.y * r.h, side * 0.14);
  ctx.globalAlpha = 1;
}

export function drawStoryOrder(ctx: CanvasRenderingContext2D, state: StoryState, view: DrawView): void {
  const { arena, theme } = view;
  paintSky(ctx, view, arena.height, 4);
  const story = STORIES[state.story];
  paintLabel(ctx, view, story?.title ?? '', arena.width / 2, HUD_SAFE_TOP + 24, 36);

  // The numbered places.
  state.slots.forEach((slot, i) => {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = theme.light;
    roundRect(ctx, slot.x, slot.y, slot.w, slot.h, 16);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.setLineDash([12, 10]);
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4;
    roundRect(ctx, slot.x, slot.y, slot.w, slot.h, 16);
    ctx.stroke();
    ctx.setLineDash([]);
    paintLabel(ctx, view, `${i + 1}`, slot.x + slot.w / 2, slot.y + slot.h / 2, Math.min(slot.w, slot.h) * 0.42, theme.secondary);
    const next = state.slots[i + 1];
    if (next && next.y === slot.y) paintLabel(ctx, view, '›', (slot.x + slot.w + next.x) / 2, slot.y + slot.h / 2, 30);
  });

  const resting = state.sulk > 0;
  state.cards.forEach((card, i) => {
    if (state.held === i && state.dragAt) return;
    const frame = story?.frames[card.frame];
    if (card.placed >= 0) {
      const slot = state.slots[card.placed];
      if (!slot) return;
      const pop = state.finished >= 0 && !view.reducedMotion ? Math.max(0, Math.sin((state.finished - card.placed * 0.15) * 8)) * 14 : 0;
      paintFrame(ctx, view, frame, { ...slot, y: slot.y - pop }, 1, state.finished >= 0 ? theme.star : null);
      return;
    }
    const shake = card.shook < 0.45 && !view.reducedMotion ? Math.sin(card.shook * 45) * 12 * (1 - card.shook / 0.45) : 0;
    paintFrame(ctx, view, frame, { ...card.home, x: card.home.x + shake }, resting ? 0.6 : 1, null);
  });
  const held = state.cards[state.held];
  if (held && state.dragAt) {
    const c = centre(held.home);
    const r = { ...held.home, x: held.home.x + state.dragAt.x - c.x, y: held.home.y + state.dragAt.y - c.y - 10 };
    paintFrame(ctx, view, story?.frames[held.frame], r, 1, theme.star);
  }
}
