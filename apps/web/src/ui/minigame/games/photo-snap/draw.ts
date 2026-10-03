// Photo snap's picture: a forest glade scrolling past (far hills, trees, the path), hideouts (bushes drawn
// as leafy puffs, rocks, tree trunks) with animals popping up behind them and a "!" while they look around,
// the camera's viewfinder in the middle (corner brackets, glowing when a good photo is there), a white flash
// on the shutter, and the film strip below: the photos taken so far and the shots left.
import { paintGround, paintHills, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { animalX, FILM, inShot, upness, type Hideout, type PhotoState } from './logic';

function paintCover(ctx: CanvasRenderingContext2D, view: DrawView, h: Hideout, groundY: number): void {
  const { theme, sprites } = view;
  if (h.cover === 'rock') {
    sprites.draw(ctx, 'rock', h.x, groundY - 45, 140);
    return;
  }
  if (h.cover === 'tree') {
    ctx.fillStyle = theme.woodEdge;
    roundRect(ctx, h.x - 38, groundY - 150, 76, 150, 14);
    ctx.fill();
    ctx.fillStyle = theme.leaf;
    ctx.beginPath();
    ctx.arc(h.x, groundY - 190, 90, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.fillStyle = theme.leaf;
  for (const [dx, dy, r] of [[-50, -30, 46], [0, -52, 56], [50, -30, 46], [0, -20, 50]] as const) {
    ctx.beginPath();
    ctx.arc(h.x + dx, groundY + dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintAnimal(ctx: CanvasRenderingContext2D, view: DrawView, h: Hideout, groundY: number): void {
  const up = upness(h);
  if (up <= 0) return;
  const { sprites, theme } = view;
  const size = 100;
  // Peeks up over its cover (over a tree: from beside the trunk).
  const baseY = h.cover === 'tree' ? groundY - 60 : groundY - 70;
  const x = animalX(h);
  const y = baseY - up * 70;
  ctx.save();
  if (h.cover !== 'tree') {
    ctx.beginPath();
    ctx.rect(h.x - 200, 0, 400, groundY - 50);
    ctx.clip();
  }
  sprites.draw(ctx, h.animal, x, y, size);
  ctx.restore();
  if (up >= 1 && !h.taken) paintLabel(ctx, view, '!', x + 50, y - 50, 40, theme.star);
}

export function drawPhotoSnap(ctx: CanvasRenderingContext2D, state: PhotoState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, state.groundY, 8);
  paintHills(ctx, view, state.groundY - 60, state.scroll * 0.3, 140, theme.leaf);
  for (let x = -((state.scroll * 0.6) % 220); x < arena.width + 100; x += 220) sprites.draw(ctx, 'evergreen-tree', x, state.groundY - 120, 150, { alpha: 0.7 });
  paintGround(ctx, view, state.groundY, state.scroll);
  for (const h of state.hideouts) {
    if (h.cover === 'tree') {
      paintCover(ctx, view, h, state.groundY);
      paintAnimal(ctx, view, h, state.groundY);
    } else {
      paintAnimal(ctx, view, h, state.groundY);
      paintCover(ctx, view, h, state.groundY);
    }
  }

  // The viewfinder.
  const { frameX, frameY, frameW, frameH } = state;
  const good = state.hideouts.some((h) => inShot(state, h));
  ctx.strokeStyle = good ? theme.star : theme.light;
  ctx.lineWidth = good ? 9 : 6;
  const l = frameX - frameW / 2;
  const t = frameY - frameH / 2;
  const c = 44;
  ctx.beginPath();
  for (const [x, y, dx, dy] of [[l, t, 1, 1], [l + frameW, t, -1, 1], [l, t + frameH, 1, -1], [l + frameW, t + frameH, -1, -1]] as const) {
    ctx.moveTo(x + dx * c, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * c);
  }
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(frameX - 14, frameY);
  ctx.lineTo(frameX + 14, frameY);
  ctx.moveTo(frameX, frameY - 14);
  ctx.lineTo(frameX, frameY + 14);
  ctx.stroke();
  ctx.globalAlpha = 1;
  if (state.flashAgo < 0.25) {
    ctx.fillStyle = theme.light;
    ctx.globalAlpha = 1 - state.flashAgo / 0.25;
    ctx.fillRect(0, 0, arena.width, arena.height);
    ctx.globalAlpha = 1;
  }

  // The film strip: photos taken, then the shots left.
  const stripY = arena.height - 70;
  const cell = Math.min(66, (arena.width - 40) / FILM);
  const left = arena.width / 2 - (cell * FILM) / 2;
  ctx.fillStyle = theme.ink;
  roundRect(ctx, left - 10, stripY - cell * 0.5 - 12, cell * FILM + 20, cell + 24, 12);
  ctx.fill();
  for (let i = 0; i < FILM; i += 1) {
    const x = left + i * cell + cell / 2;
    const photo = state.photos[i];
    ctx.fillStyle = photo ? theme.light : theme.stone;
    roundRect(ctx, x - cell * 0.42, stripY - cell * 0.42, cell * 0.84, cell * 0.84, 6);
    ctx.fill();
    if (photo?.animal) sprites.draw(ctx, photo.animal, x, stripY, cell * 0.7);
    else if (photo) {
      ctx.globalAlpha = 0.4;
      sprites.draw(ctx, 'leaf', x, stripY, cell * 0.6);
      ctx.globalAlpha = 1;
    }
  }
  if (state.film <= 0) paintLabel(ctx, view, 'Hết phim!', arena.width / 2, frameY - frameH / 2 - 40, 44, theme.star);
}
