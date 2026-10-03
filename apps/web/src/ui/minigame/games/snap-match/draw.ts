// Snap match's picture: a wooden table seen from above, the monkey on the far side with its paw ready (and its
// pile count), the pile in the middle with the card before peeking out under the top one. A turned card lands
// with a little bounce; a taken pile sweeps toward whoever took it. Pictures come from the map.
import { paintLabel, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import type { ThemeId } from '../../theme';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { SnapState } from './logic';

/** Six pictures per map, easy to tell apart at a glance (FACE_COUNT in logic.ts). */
export const FACES: Readonly<Record<ThemeId, readonly SpriteRef[]>> = {
  forest: ['fox', 'owl', 'mushroom', 'butterfly', 'frog', 'maple-leaf'],
  meadow: ['cat', 'dog-face', 'sunflower', 'strawberry', 'teddy-bear', 'balloon'],
  town: ['bus', 'bicycle', 'soccer-ball', 'gift', 'ice-cream', 'bell'],
  castle: ['crown', 'key', 'gem', 'trophy', 'owl', 'fire'],
  farm: ['chicken', 'carrot', 'watermelon', 'cow', 'egg', 'sunflower'],
  snow: ['penguin', 'snowflake', 'bear', 'gift', 'evergreen-tree', 'snowman'],
  beach: ['crab', 'octopus', 'spiral-shell', 'sailboat', 'pineapple', 'sun'],
  river: ['duck', 'fish', 'frog', 'lotus', 'turtle', 'canoe'],
};

function paintCard(ctx: CanvasRenderingContext2D, view: DrawView, face: SpriteRef, x: number, y: number, w: number, rotate: number, alpha = 1): void {
  const { theme, sprites } = view;
  const h = w * 1.3;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rotate);
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = alpha * 0.25;
  roundRect(ctx, -w / 2 + 5, -h / 2 + 9, w, h, 18);
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = theme.light;
  roundRect(ctx, -w / 2, -h / 2, w, h, 18);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = theme.ink;
  ctx.stroke();
  ctx.strokeStyle = theme.secondary;
  ctx.lineWidth = 3;
  roundRect(ctx, -w / 2 + 9, -h / 2 + 9, w - 18, h - 18, 12);
  ctx.stroke();
  ctx.restore();
  sprites.draw(ctx, face, x, y, w * 0.7, { rotate, alpha });
}

export function drawSnapMatch(ctx: CanvasRenderingContext2D, state: SnapState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  // The table: wood planks.
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.fillStyle = theme.woodEdge;
  ctx.globalAlpha = 0.25;
  for (let y = 40; y < arena.height; y += 90) ctx.fillRect(0, y, arena.width, 6);
  ctx.globalAlpha = 1;
  // A cloth under the pile.
  const w = Math.min(arena.width * 0.36, (arena.height - HUD_SAFE_TOP) * 0.33, 230);
  ctx.fillStyle = theme.leaf;
  roundRect(ctx, state.pileX - w * 1.25, state.pileY - w * 1.05, w * 2.5, w * 2.1, 30);
  ctx.fill();

  // The monkey across the table, with its pile count.
  const monkeyY = Math.max(HUD_SAFE_TOP + 50, state.pileY - w * 1.05 - 60);
  const grab = state.taker === 'monkey' && state.takenAgo < 0.4 && !view.reducedMotion ? Math.sin((state.takenAgo / 0.4) * Math.PI) * 40 : 0;
  sprites.draw(ctx, 'monkey-face', arena.width / 2, monkeyY + grab, 90);
  paintLabel(ctx, view, `${state.monkeyScore}`, arena.width / 2 + 80, monkeyY, 36);

  const faces = FACES[theme.id] ?? FACES.meadow;
  const faceOf = (n: number): SpriteRef => faces[n % faces.length] ?? 'star';
  const shake = state.wrongAgo < 0.4 && !view.reducedMotion ? Math.sin(state.wrongAgo * 50) * 10 * (1 - state.wrongAgo / 0.4) : 0;

  // A taken pile sweeps away toward its taker.
  if (state.takenAgo < 0.5 && state.taker) {
    const t = state.takenAgo / 0.5;
    const toY = state.taker === 'child' ? arena.height + w : monkeyY;
    paintCard(ctx, view, 'sparkles', state.pileX, state.pileY + (toY - state.pileY) * t, w * (1 - 0.4 * t), 0, 1 - t);
  }
  if (state.previous >= 0) paintCard(ctx, view, faceOf(state.previous), state.pileX - w * 0.42 + shake, state.pileY - w * 0.12, w * 0.85, -0.16);
  if (state.top >= 0) {
    const land = view.reducedMotion ? 0 : Math.max(0, 1 - state.age / 0.18);
    paintCard(ctx, view, faceOf(state.top), state.pileX + w * 0.18 + shake, state.pileY + w * 0.06 - land * 40, w * (1 + 0.12 * land), 0.08);
  }
  const labelY = Math.min(arena.height - 40, state.pileY + w * 1.05 + 40);
  paintLabel(ctx, view, 'Giống lá trước thì chạm!', arena.width / 2, labelY, 30);
  // The child's own seat on this side of the table, when there is room for it.
  if (arena.height - labelY > 170) {
    const cheer = state.taker === 'child' && state.takenAgo < 0.4 && !view.reducedMotion ? Math.sin((state.takenAgo / 0.4) * Math.PI) * 30 : 0;
    sprites.draw(ctx, view.player, arena.width / 2, labelY + 100 - cheer, 110);
  }
}
