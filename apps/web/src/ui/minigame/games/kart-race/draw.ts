// Kart race's picture, from above: striped grass, trees in the infield, the oval track with red-and-white kerbs
// and a dashed centre line, the chequered start line, stars on the track, and the karts (a coloured body with
// four wheels turned along its heading, the driver's face on top: the child's own character for her kart).
// The lap and the child's place are painted big in the infield.
import { paintLabel, paintShadow, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import type { DrawView } from '../../types';
import { LAPS, TRACK_HALF, trackPoint, type Kart, type KartState } from './logic';

/** Friends' drivers; one that looks like the child's own character is skipped. */
const DRIVERS: readonly SpriteRef[] = ['fox', 'panda', 'monkey-face', 'rabbit'];

function strokeOval(ctx: CanvasRenderingContext2D, state: KartState, grow: number): void {
  ctx.beginPath();
  ctx.ellipse(state.cx, state.cy, state.rx + grow, state.ry + grow, 0, 0, Math.PI * 2);
}

function paintTrack(ctx: CanvasRenderingContext2D, view: DrawView, state: KartState): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = theme.ink;
  for (let y = 0; y < arena.height; y += 80) ctx.fillRect(0, y, arena.width, 40);
  ctx.globalAlpha = 1;
  // Kerbs: a dashed red and light band on both edges.
  for (const edge of [TRACK_HALF + 6, -TRACK_HALF - 6]) {
    ctx.lineWidth = 12;
    ctx.strokeStyle = theme.light;
    strokeOval(ctx, state, edge);
    ctx.stroke();
    ctx.strokeStyle = theme.danger;
    ctx.setLineDash([22, 22]);
    strokeOval(ctx, state, edge);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.lineWidth = TRACK_HALF * 2;
  ctx.strokeStyle = theme.stone;
  strokeOval(ctx, state, 0);
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.strokeStyle = theme.light;
  ctx.globalAlpha = 0.6;
  ctx.setLineDash([26, 24]);
  strokeOval(ctx, state, 0);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  // The chequered start line across the track at the bottom.
  const cell = 16;
  const inner = trackPoint(state, Math.PI / 2, -TRACK_HALF);
  for (let row = 0; row < 2; row += 1) {
    for (let i = 0; i < Math.ceil((TRACK_HALF * 2) / cell); i += 1) {
      ctx.fillStyle = (i + row) % 2 === 0 ? theme.ink : theme.light;
      ctx.fillRect(inner.x - cell + row * cell, inner.y + i * cell, cell, cell);
    }
  }
  // Trees in the infield, a few along the inside.
  const trees = 6;
  for (let i = 0; i < trees; i += 1) {
    const a = (i / trees) * Math.PI * 2 + 0.3;
    const p = trackPoint(state, a, -TRACK_HALF - 52);
    if (Math.abs(p.x - state.cx) < state.rx - TRACK_HALF - 30 || Math.abs(p.y - state.cy) < state.ry - TRACK_HALF - 30) sprites.draw(ctx, i % 2 ? 'deciduous-tree' : 'evergreen-tree', p.x, p.y - 20, 70);
  }
}

function paintKart(ctx: CanvasRenderingContext2D, view: DrawView, k: Kart, colour: string, driver: SpriteRef): void {
  const { theme, sprites } = view;
  paintShadow(ctx, view, k.x, k.y + 22, 80);
  ctx.save();
  ctx.translate(k.x, k.y);
  ctx.rotate(k.heading);
  ctx.fillStyle = theme.ink;
  for (const [wx, wy] of [
    [-22, -26],
    [-22, 18],
    [18, -26],
    [18, 18],
  ] as const) {
    roundRect(ctx, wx, wy, 16, 8, 3);
    ctx.fill();
  }
  ctx.fillStyle = colour;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, -32, -20, 64, 40, 14);
  ctx.fill();
  ctx.stroke();
  // Nose.
  ctx.fillStyle = theme.light;
  roundRect(ctx, 22, -10, 14, 20, 6);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  sprites.draw(ctx, driver, k.x, k.y - 6, 46);
}

export function drawKartRace(ctx: CanvasRenderingContext2D, state: KartState, view: DrawView): void {
  const { theme, sprites } = view;
  paintTrack(ctx, view, state);

  for (const star of state.stars) {
    const p = trackPoint(state, star.angle, star.lane);
    if (star.taken >= 0) {
      if (star.taken < 0.5) sprites.draw(ctx, 'star', p.x, p.y - star.taken * 80, 44 * (1 + star.taken), { alpha: 1 - star.taken / 0.5 });
      continue;
    }
    sprites.draw(ctx, 'star', p.x, p.y, 44, { rotate: view.reducedMotion ? 0 : Math.sin(view.time * 4 + star.angle) * 0.2 });
  }

  const colours = [theme.danger, theme.secondary, theme.star];
  const drivers = DRIVERS.filter((d) => d !== view.player);
  // Karts lower on screen are nearer: draw them last.
  const karts = [
    ...state.rivals.map((k, i) => ({ k, colour: colours[i] ?? theme.danger, driver: drivers[i] ?? 'panda' })),
    { k: state.player, colour: theme.primary, driver: view.player },
  ].sort((a, b) => a.k.y - b.k.y);
  for (const { k, colour, driver } of karts) {
    if (k === state.player) {
      // The child's kart: a glowing ring under it, so she always finds herself.
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = theme.star;
      ctx.beginPath();
      ctx.arc(k.x, k.y, 46 + (view.reducedMotion ? 0 : Math.sin(view.time * 6) * 3), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    paintKart(ctx, view, k, colour, driver);
  }

  // The infield board: lap and place, or the result.
  const size = Math.min(48, state.ry * 0.3);
  if (state.place > 0) {
    paintLabel(ctx, view, `Về thứ ${state.place}!`, state.cx, state.cy - size * 0.6, size * 1.3, state.place <= 3 ? theme.star : theme.light);
    if (state.place <= 3) sprites.draw(ctx, state.place === 1 ? 'trophy' : '1st-place-medal', state.cx, state.cy + size * 0.9, size * 1.6);
  } else {
    const lap = Math.min(LAPS, Math.max(1, Math.floor(state.player.progress) + 1));
    paintLabel(ctx, view, `Vòng ${lap}/${LAPS}`, state.cx, state.cy - size * 0.6, size);
    paintLabel(ctx, view, `Hạng ${state.position}`, state.cx, state.cy + size * 0.6, size, state.position <= 3 ? theme.star : theme.light);
    if (state.starsTaken > 0) {
      sprites.draw(ctx, 'star', state.cx - size, state.cy + size * 1.7, size * 0.9);
      paintLabel(ctx, view, `${state.starsTaken}`, state.cx + size * 0.3, state.cy + size * 1.7, size * 0.8);
    }
  }
  if (state.offTrack && state.place === 0) paintLabel(ctx, view, 'Vào đường đua!', state.player.x, state.player.y - 50, 30, theme.light);
}
