// Hide and seek's picture: a garden (sky, hills, grass) with trees, bushes, crates and logs to hide behind;
// a friend's head popping up from behind one and ducking back, places shaking in the wind, a found friend
// jumping out and running to the row of found friends along the bottom, and "Không có ai" after a wrong
// guess.
import { bob, paintHills, paintLabel, paintSky } from '../../draw-kit';
import type { DrawView } from '../../types';
import { FRIENDS, PEEK_SECONDS, PLACES, type HideAndSeekState } from './logic';

export function drawHideAndSeek(ctx: CanvasRenderingContext2D, state: HideAndSeekState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const horizon = (state.places[0]?.y ?? arena.height / 2) - 90;
  paintSky(ctx, view, horizon, 6);
  paintHills(ctx, view, horizon + 30, 0, 80, theme.leaf);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, horizon + 20, arena.width, arena.height - horizon);

  state.places.forEach((pl, i) => {
    // Friends behind this place.
    for (const f of state.friends) {
      if (f.place !== i || f.foundAgo >= 0 || f.peekAgo >= PEEK_SECONDS) continue;
      const t = f.peekAgo / PEEK_SECONDS;
      const up = Math.sin(t * Math.PI);
      sprites.draw(ctx, FRIENDS[f.kind] ?? 'rabbit', pl.x + pl.size * 0.28, pl.y - pl.size * 0.1 - up * pl.size * 0.45, pl.size * 0.55);
    }
    const shake = pl.rustleAgo < 0.5 && !view.reducedMotion ? Math.sin(pl.rustleAgo * 40) * 0.08 * (1 - pl.rustleAgo / 0.5) : 0;
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = theme.ink;
    ctx.beginPath();
    ctx.ellipse(pl.x, pl.y + pl.size * 0.45, pl.size * 0.4, pl.size * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    sprites.draw(ctx, PLACES[pl.kind] ?? 'herb', pl.x, pl.y, pl.size, { rotate: shake });
    if (state.looking > 0 && state.lookedAt === i) paintLabel(ctx, view, 'Không có ai', pl.x, pl.y - pl.size * 0.6, 28, theme.light);
  });

  // Found friends: jump out, then line up at the bottom.
  const rowY = arena.height - 50;
  state.found.forEach((kind, k) => {
    const x = 50 + (k % 12) * 52;
    sprites.draw(ctx, FRIENDS[kind] ?? 'rabbit', x, rowY + bob(view, 4, 2, k), 48);
  });
  for (const f of state.friends) {
    if (f.foundAgo < 0) continue;
    const pl = state.places[f.place];
    if (!pl) continue;
    const t = Math.min(1, f.foundAgo / 1.2);
    const k = state.found.length - 1;
    const tx = 50 + (Math.max(0, k) % 12) * 52;
    sprites.draw(ctx, FRIENDS[f.kind] ?? 'rabbit', pl.x + (tx - pl.x) * t, pl.y - pl.size * 0.5 + (rowY - pl.y + pl.size * 0.5) * t - Math.sin(t * Math.PI) * 120, 80 - 30 * t);
    if (t < 0.6) paintLabel(ctx, view, 'Tìm thấy rồi!', pl.x, pl.y - pl.size * 0.9, 34, theme.star);
  }
}
