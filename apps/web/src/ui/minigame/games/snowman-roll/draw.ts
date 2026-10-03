// Snowman roll's picture: a winter sky with drifting snowflakes over a snowy field, the snow pile, the
// snowman's spot with a dashed ring for the size wanted, the stacked parts (coal buttons, eyes, a carrot
// nose once finished), and the rolling ball, speckled so its turning shows, glowing green at the right size.
import { paintLabel, paintShadow, paintSky } from '../../draw-kit';
import type { DrawView, Point } from '../../types';
import { partCentre, wanted, type SnowmanState } from './logic';

function paintSnowball(ctx: CanvasRenderingContext2D, view: DrawView, at: Point, r: number, spin: number): void {
  const { theme } = view;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.stoneEdge;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Shade on the lower side, speckles that turn as it rolls.
  ctx.fillStyle = theme.waterLight;
  ctx.beginPath();
  ctx.arc(at.x, at.y, r, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = theme.stone;
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 5; i += 1) {
    const a = spin + i * 1.3;
    const d = r * (0.3 + 0.12 * i);
    ctx.beginPath();
    ctx.arc(at.x + Math.cos(a) * d, at.y + Math.sin(a) * d * 0.8, Math.max(2, r * 0.06), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawSnowmanRoll(ctx: CanvasRenderingContext2D, state: SnowmanState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { field, spot, pile, ball } = state;
  paintSky(ctx, view, field.top + 20, 5);
  ctx.fillStyle = theme.light;
  ctx.fillRect(0, field.top - 10, arena.width, arena.height);
  ctx.fillStyle = theme.waterLight;
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 26; i += 1) {
    ctx.beginPath();
    ctx.ellipse((i * 173) % arena.width, field.top + ((i * 97) % (arena.height - field.top)), 30, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Falling snowflakes.
  for (let i = 0; i < 6; i += 1) {
    const y = view.reducedMotion ? 150 + i * 60 : ((view.time * 40 + i * 120) % (arena.height + 60)) - 30;
    sprites.draw(ctx, 'snowflake', ((i * 211 + 60) % arena.width) + Math.sin(view.time + i) * 20, y, 28, { alpha: 0.7 });
  }

  // The snow pile the fresh balls come from.
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.waterLight;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(pile.x, pile.y + 30, 90, 40, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // The spot: stacked parts, then the ring for the next one.
  paintShadow(ctx, view, spot.x, spot.y + 4, 170);
  const finishing = state.doneAgo >= 0;
  const hop = finishing && !view.reducedMotion ? Math.abs(Math.sin(state.doneAgo * 8)) * 14 * (1 - state.doneAgo / 1.6) : 0;
  state.stacked.forEach((r, i) => {
    const c = partCentre(state, i, r);
    paintSnowball(ctx, view, { x: c.x, y: c.y - hop }, r, i);
    ctx.fillStyle = theme.ink;
    if (i === 1) for (const k of [-0.4, 0, 0.4]) {
      ctx.beginPath();
      ctx.arc(c.x, c.y - hop + k * r, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    if (i === 2) {
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(c.x + side * r * 0.35, c.y - hop - r * 0.2, r * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
      if (finishing) sprites.draw(ctx, 'carrot', c.x + r * 0.45, c.y - hop + r * 0.12, r * 0.9, { rotate: Math.PI / 4 });
    }
  });
  if (!finishing) {
    const [low, high] = wanted(state);
    const mid = partCentre(state, state.stacked.length, (low + high) / 2);
    ctx.fillStyle = theme.secondary;
    ctx.globalAlpha = 0.12;
    ctx.beginPath();
    ctx.arc(mid.x, mid.y, high, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = theme.secondary;
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 10]);
    for (const r of [low, high]) {
      ctx.beginPath();
      ctx.arc(mid.x, mid.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    const fits = ball.r >= low && ball.r <= high;
    paintShadow(ctx, view, ball.x, ball.y + ball.r * 0.9, ball.r * 2);
    if (fits) {
      ctx.strokeStyle = theme.leaf;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r + 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    paintSnowball(ctx, view, ball, ball.r, ball.spin);
  }

  const labelY = field.top + 24;
  if (finishing) paintLabel(ctx, view, 'Người tuyết xong rồi!', arena.width / 2, labelY, 44, theme.star);
  else if (state.last && state.lastAgo < 1.2) {
    const words = state.last === 'stacked' ? 'Vừa khít!' : state.last === 'small' ? 'Nhỏ quá, lăn thêm nhé' : 'To quá, làm quả mới nhé';
    paintLabel(ctx, view, words, arena.width / 2, labelY, 36, state.last === 'stacked' ? theme.star : theme.light);
  } else if (state.score === 0 && !state.holding) paintLabel(ctx, view, 'Kéo quả tuyết lăn cho to ra', arena.width / 2, labelY, 34);
}
