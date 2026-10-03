// Sentence train's picture: a card with the scene the sentence tells, the main line with the engine and the
// wagons already in order behind it, the siding below with the words still waiting (big letters on each
// wagon), a wrong wagon shaking, wagons rolling between the lines, and the finished train steaming away.
import { paintGround, paintHills, paintSky, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import type { DrawView, Point } from '../../types';
import { SENTENCES, type SentenceTrainState, type Wagon } from './logic';

/** Scene pictures by index (logic.ts SENTENCES). */
export const SCENE: readonly SpriteRef[] = [
  'cat',
  'mouse-face',
  'seedling',
  'droplet',
  'chicken',
  'baby-chick',
  'dog',
  'soccer-ball',
  'fish',
  'tropical-fish',
  'bird',
  'deciduous-tree',
  'cooked-rice',
  'kite',
  'honeybee',
  'sunflower',
  'duck',
  'lotus',
  'rabbit',
  'carrot',
  'cow',
  'herb',
  'bicycle',
  'cloud',
  'monkey',
  'banana',
  'butterfly',
  'tulip',
  'frog',
  'sheaf-of-rice',
  'gift',
  'bear',
  'sun',
];
const ENGINE_W = 120;
const GAP = 14;

function paintWagon(ctx: CanvasRenderingContext2D, view: DrawView, wagon: Wagon, at: Point, h: number, scale: number): void {
  const { theme } = view;
  const w = wagon.w * scale;
  const hh = h * scale;
  ctx.fillStyle = wagon.order % 2 === 0 ? theme.primary : theme.secondary;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, at.x - w / 2, at.y - hh / 2, w, hh * 0.86, 12 * scale);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.ink;
  for (const dx of [-w / 2 + 20 * scale, w / 2 - 20 * scale]) {
    ctx.beginPath();
    ctx.arc(at.x + dx, at.y + hh * 0.4, 11 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = theme.light;
  roundRect(ctx, at.x - w / 2 + 8 * scale, at.y - hh / 2 + 8 * scale, w - 16 * scale, hh * 0.86 - 16 * scale, 8 * scale);
  ctx.fill();
  ctx.font = `800 ${Math.round(30 * scale)}px ${theme.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = theme.ink;
  ctx.fillText(wagon.word, at.x, at.y - hh * 0.07);
}

function paintRails(ctx: CanvasRenderingContext2D, view: DrawView, y: number): void {
  const { arena, theme } = view;
  ctx.fillStyle = theme.woodEdge;
  for (let x = 6; x < arena.width; x += 34) ctx.fillRect(x, y - 4, 14, 16);
  ctx.fillStyle = theme.stoneEdge;
  ctx.fillRect(0, y - 2, arena.width, 5);
  ctx.fillRect(0, y + 8, arena.width, 5);
}

export function drawSentenceTrain(ctx: CanvasRenderingContext2D, state: SentenceTrainState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const horizon = state.trackY - state.wagonH;
  paintSky(ctx, view, horizon, 8);
  paintHills(ctx, view, horizon, 30, 50, theme.leaf);
  paintGround(ctx, view, horizon);

  // The scene card.
  const scene = SENTENCES[state.sentence]?.scene ?? [];
  const pic = Math.min(86, (state.trackY - state.wagonH - state.sceneY) * 1.4 + 40);
  const cardW = scene.length * (pic + 16) + 30;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, arena.width / 2 - cardW / 2, state.sceneY - pic / 2 - 10, cardW, pic + 20, 18);
  ctx.fill();
  ctx.stroke();
  scene.forEach((index, k) => {
    const ref = index < 0 ? view.player : (SCENE[index] ?? 'star');
    sprites.draw(ctx, ref, arena.width / 2 + (k - (scene.length - 1) / 2) * (pic + 16), state.sceneY, pic);
  });

  // Main line: engine and the wagons in order (shrunk to fit a narrow screen).
  const railY = state.trackY + state.wagonH * 0.42;
  paintRails(ctx, view, railY);
  const ordered = [...state.wagons].sort((a, b) => a.order - b.order);
  const full = ENGINE_W + ordered.reduce((s, w) => s + w.w + GAP, 0);
  const scale = Math.min(1, (arena.width - 30) / full);
  const drive = state.phase === 'drive' ? state.phaseAgo * state.phaseAgo * 900 : 0;
  const left = (arena.width - full * scale) / 2 - drive;
  const slots = new Map<Wagon, Point>();
  let x = left + ENGINE_W * scale;
  for (const w of ordered) {
    slots.set(w, { x: x + (GAP + w.w / 2) * scale, y: state.trackY });
    x += (w.w + GAP) * scale;
  }
  sprites.draw(ctx, 'locomotive', left + (ENGINE_W * scale) / 2, state.trackY - 8 * scale, ENGINE_W * 1.1 * scale);
  if (state.phase === 'drive') {
    for (let k = 0; k < 3; k += 1) sprites.draw(ctx, 'cloud', left + 30 + k * 40, state.trackY - 70 - k * 20 - state.phaseAgo * 40, 50 - k * 8, { alpha: 0.8 - k * 0.2 });
  }

  // Siding rails under each row.
  const rowsY = [...new Set(state.wagons.map((w) => w.home.y))];
  for (const y of rowsY) paintRails(ctx, view, y + state.wagonH * 0.42);

  for (const wagon of state.wagons) {
    const slot = slots.get(wagon) ?? wagon.home;
    const t = Math.min(1, (state.time - wagon.movedAt) / 0.35);
    const ease = t * t * (3 - 2 * t);
    const [from, to] = wagon.attached ? [wagon.home, slot] : [slot, wagon.home];
    const moving = t < 1 && wagon.movedAt > 0;
    const at = moving ? { x: from.x + (to.x - from.x) * ease, y: from.y + (to.y - from.y) * ease } : wagon.attached ? slot : wagon.home;
    const since = state.time - wagon.shakeAt;
    const shake = since < 0.4 && !view.reducedMotion ? Math.sin(since * 50) * 8 * (1 - since / 0.4) : 0;
    const s = wagon.attached || moving ? scale + (1 - scale) * (wagon.attached ? 1 - ease : ease) : 1;
    paintWagon(ctx, view, wagon, { x: at.x + shake, y: at.y }, state.wagonH, wagon.attached && !moving ? scale : s);
  }
}
