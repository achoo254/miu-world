// Wave surf's picture: a sunny sky, islands rising out of the sea as she nears them, a pale wave behind for
// depth, the sea itself (blue, foam along its crest), the child on her surfboard tilted with the wave and
// crouching while the finger holds, spray when she is fast, a bar to the next island and a hold button that
// lights while the finger is down.
import { bob, paintLabel, paintSky, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { ISLAND_GAP, seaAt, type WaveSurfState } from './logic';

function paintSea(ctx: CanvasRenderingContext2D, view: DrawView, state: WaveSurfState): void {
  const { arena, theme } = view;
  // A paler wave far behind, rolling slower.
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = theme.waterLight;
  ctx.beginPath();
  ctx.moveTo(0, arena.height);
  for (let sx = 0; sx <= arena.width + 10; sx += 10) {
    const wx = (state.x - state.screenX + sx) * 0.5;
    ctx.lineTo(sx, state.baseY - 40 + Math.sin(wx / 90 + view.time) * 14);
  }
  ctx.lineTo(arena.width, arena.height);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  const surface: number[] = [];
  for (let sx = 0; sx <= arena.width + 8; sx += 8) surface.push(state.baseY - seaAt(state.waves, state.x - state.screenX + sx).h);
  const gradient = ctx.createLinearGradient(0, state.baseY - 20, 0, arena.height);
  gradient.addColorStop(0, theme.water);
  gradient.addColorStop(1, theme.secondary);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(0, arena.height);
  surface.forEach((y, i) => ctx.lineTo(i * 8, y));
  ctx.lineTo(arena.width, arena.height);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  surface.forEach((y, i) => (i === 0 ? ctx.moveTo(0, y + 3) : ctx.lineTo(i * 8, y + 3)));
  ctx.stroke();
}

function paintIslands(ctx: CanvasRenderingContext2D, view: DrawView, state: WaveSurfState): void {
  state.islands.forEach((island, i) => {
    const sx = state.screenX + island - state.x;
    if (sx < -150 || sx > view.arena.width + 150) return;
    const passed = i < state.passed;
    view.sprites.draw(ctx, 'desert-island', sx, state.baseY - 80, 190);
    view.sprites.draw(ctx, 'crab', sx + 60, state.baseY - 40 + bob(view, 4, 3, i), 44);
    paintLabel(ctx, view, String(i + 1), sx, state.baseY - 200 + bob(view, 2, 4, i), 40, passed ? view.theme.star : view.theme.light);
  });
}

function paintSurfer(ctx: CanvasRenderingContext2D, view: DrawView, state: WaveSurfState): void {
  const { theme } = view;
  const x = state.screenX;
  const y = state.baseY - state.y;
  const slope = state.airborne ? state.vy / state.speed : seaAt(state.waves, state.x).slope;
  const angle = -Math.atan(slope);
  // Spray behind a fast board on the water.
  if (!state.airborne && state.speed > 260) {
    ctx.fillStyle = theme.light;
    for (let i = 0; i < 6; i += 1) {
      const t = (view.time * 3 + i / 6) % 1;
      ctx.globalAlpha = 0.8 * (1 - t);
      ctx.beginPath();
      ctx.arc(x - 50 - t * 70, y - 6 - Math.sin(t * Math.PI) * 34 + (i % 2) * 8, 7 * (1 - t) + 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = theme.primary;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, -62, -16, 124, 20, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.star;
  ctx.fillRect(-40, -10, 80, 6);
  const crouch = state.holding && !view.reducedMotion;
  view.sprites.draw(ctx, view.player, 0, crouch ? -46 : -54, 88, { squash: crouch ? [1.12, 0.84] : [1, 1] });
  ctx.restore();
  if (state.landedAgo < 0.6 && state.landedWell) {
    ctx.globalAlpha = 1 - state.landedAgo / 0.6;
    view.sprites.draw(ctx, 'sparkles', x + 40, y - 100 - state.landedAgo * 40, 54);
    paintLabel(ctx, view, 'Tuyệt!', x, y - 140 - state.landedAgo * 40, 36, theme.star);
    ctx.globalAlpha = 1;
  }
}

/** How far to the next island, as a bar under the HUD, with its number at the end. */
function paintProgress(ctx: CanvasRenderingContext2D, view: DrawView, state: WaveSurfState): void {
  const { arena, theme } = view;
  const next = state.islands[state.passed];
  if (next === undefined) return;
  const from = next - ISLAND_GAP;
  const p = Math.min(1, Math.max(0, (state.x - from) / (next - from)));
  const left = 40;
  const width = arena.width - 140;
  const y = HUD_SAFE_TOP + 16;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, left, y, width, 20, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.water;
  roundRect(ctx, left + 3, y + 3, Math.max(14, (width - 6) * p), 14, 7);
  ctx.fill();
  view.sprites.draw(ctx, view.player, left + 3 + (width - 6) * p, y + 10, 40);
  view.sprites.draw(ctx, 'desert-island', left + width + 40, y + 8, 60);
}

/** A round button bottom right: "hold" lights up while the finger is down (anywhere on the screen). */
function paintHoldButton(ctx: CanvasRenderingContext2D, view: DrawView, state: WaveSurfState): void {
  const { arena, theme } = view;
  const x = arena.width - 84;
  const y = arena.height - 84;
  ctx.globalAlpha = state.holding ? 1 : 0.75;
  ctx.fillStyle = state.holding ? theme.star : theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y, state.holding ? 52 : 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 1;
  paintLabel(ctx, view, 'Giữ', x, y, 30, state.holding ? theme.light : theme.star);
}

export function drawWaveSurf(ctx: CanvasRenderingContext2D, state: WaveSurfState, view: DrawView): void {
  paintSky(ctx, view, state.baseY, 6);
  // The sun sits halfway down the sky, so a tall phone screen is not an empty sky.
  view.sprites.draw(ctx, 'sun', view.arena.width - 110, Math.max(HUD_SAFE_TOP + 110, (HUD_SAFE_TOP + state.baseY - 140) / 2) + bob(view, 1, 6), 120);
  paintIslands(ctx, view, state);
  paintSea(ctx, view, state);
  paintSurfer(ctx, view, state);
  paintProgress(ctx, view, state);
  paintHoldButton(ctx, view, state);
  if (state.islandAgo < 1) {
    ctx.globalAlpha = 1 - state.islandAgo;
    paintLabel(ctx, view, `Đảo ${state.passed}!`, view.arena.width / 2, HUD_SAFE_TOP + 90, 52, view.theme.star);
    ctx.globalAlpha = 1;
  }
}
