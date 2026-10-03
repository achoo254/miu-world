// Sliding tiles' picture: a wooden frame holding the 3 × 3 board, each tile showing its piece of a painted
// scene (a house in a garden, a boat at sea, a rocket at night, a farm) with its number in a corner, tiles
// gliding into the gap, the finished picture shown small beside the board, and the whole picture lighting
// up when it is put back together.
import { paintLabel, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import type { DrawView } from '../../types';
import { SIZE, SOLVED_SECONDS, type SlidingTilesState } from './logic';

/** Pictures of each scene: sprite, x, y (0–1 of the picture) and size (share of the picture). */
const SCENES: readonly (readonly [SpriteRef, number, number, number])[][] = [
  [
    ['sun', 0.8, 0.18, 0.26],
    ['deciduous-tree', 0.17, 0.55, 0.34],
    ['house', 0.52, 0.6, 0.44],
    ['rabbit', 0.84, 0.83, 0.22],
    ['tulip', 0.15, 0.88, 0.16],
  ],
  [
    ['sun', 0.18, 0.17, 0.24],
    ['cloud', 0.75, 0.2, 0.26],
    ['sailboat', 0.5, 0.52, 0.42],
    ['dolphin', 0.8, 0.82, 0.24],
    ['tropical-fish', 0.2, 0.85, 0.18],
  ],
  [
    ['full-moon', 0.8, 0.18, 0.26],
    ['star', 0.15, 0.15, 0.14],
    ['rocket', 0.45, 0.5, 0.44],
    ['star', 0.85, 0.6, 0.12],
    ['cloud', 0.2, 0.84, 0.26],
  ],
  [
    ['rainbow', 0.5, 0.2, 0.4],
    ['sunflower', 0.15, 0.62, 0.26],
    ['cow', 0.52, 0.66, 0.4],
    ['chicken', 0.85, 0.84, 0.2],
  ],
];

/** The whole scene in a square at (x, y), `size` across. */
function paintScene(ctx: CanvasRenderingContext2D, view: DrawView, scene: number, x: number, y: number, size: number): void {
  const { theme } = view;
  const night = scene === 2;
  const sky = ctx.createLinearGradient(0, y, 0, y + size);
  sky.addColorStop(0, night ? theme.ink : theme.sky[0]);
  sky.addColorStop(1, night ? theme.secondary : theme.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, size, size);
  if (scene === 1) {
    ctx.fillStyle = theme.water;
    ctx.fillRect(x, y + size * 0.6, size, size * 0.4);
  } else if (!night) {
    ctx.fillStyle = theme.leaf;
    ctx.fillRect(x, y + size * 0.72, size, size * 0.28);
  }
  for (const [sprite, sx, sy, s] of SCENES[scene] ?? []) view.sprites.draw(ctx, sprite, x + sx * size, y + sy * size, s * size);
}

export function drawSlidingTiles(ctx: CanvasRenderingContext2D, state: SlidingTilesState, view: DrawView): void {
  const { arena, theme } = view;
  ctx.fillStyle = theme.stone;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = theme.stoneEdge;
  for (let x = 0; x < arena.width; x += 80) for (let y = (x / 80) % 2 ? 40 : 0; y < arena.height; y += 80) ctx.fillRect(x, y, 40, 40);
  ctx.globalAlpha = 1;

  // The finished picture, small.
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, state.previewX - 10, state.previewY - 10, state.preview + 20, state.preview + 20, 16);
  ctx.fill();
  paintScene(ctx, view, state.scene, state.previewX, state.previewY, state.preview);
  paintLabel(ctx, view, 'Tranh mẫu', state.previewX + state.preview / 2, state.previewY + state.preview + 30, 26, theme.light);

  const tile = state.board / SIZE;
  ctx.fillStyle = theme.wood;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 6;
  roundRect(ctx, state.boardX - 16, state.boardY - 16, state.board + 32, state.board + 32, 22);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(state.boardX, state.boardY, state.board, state.board);

  if (state.solvedAgo >= 0) {
    paintScene(ctx, view, state.scene, state.boardX, state.boardY, state.board);
    const t = state.solvedAgo / SOLVED_SECONDS;
    ctx.globalAlpha = 0.5 * (1 - t);
    ctx.fillStyle = theme.light;
    ctx.fillRect(state.boardX, state.boardY, state.board, state.board);
    ctx.globalAlpha = 1;
    paintLabel(ctx, view, 'Xong rồi!', state.boardX + state.board / 2, state.boardY + state.board / 2, 64, theme.star);
    return;
  }
  const glide = Math.min(1, state.slideAgo / 0.12);
  state.tiles.forEach((t, i) => {
    if (t === SIZE * SIZE - 1) return;
    let col = i % SIZE;
    let row = Math.floor(i / SIZE);
    const moved = state.slid.find((s) => s.to === i);
    if (moved && glide < 1 && !view.reducedMotion) {
      col = (moved.from % SIZE) + (col - (moved.from % SIZE)) * glide;
      row = Math.floor(moved.from / SIZE) + (row - Math.floor(moved.from / SIZE)) * glide;
    }
    const x = state.boardX + col * tile;
    const y = state.boardY + row * tile;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 3, y + 3, tile - 6, tile - 6);
    ctx.clip();
    paintScene(ctx, view, state.scene, x - (t % SIZE) * tile, y - Math.floor(t / SIZE) * tile, state.board);
    ctx.restore();
    ctx.strokeStyle = t === i ? theme.star : theme.light;
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 3, y + 3, tile - 6, tile - 6);
    ctx.fillStyle = theme.light;
    ctx.beginPath();
    ctx.arc(x + 26, y + 26, 18, 0, Math.PI * 2);
    ctx.fill();
    paintLabel(ctx, view, String(t + 1), x + 26, y + 27, 24, theme.secondary);
  });
}
