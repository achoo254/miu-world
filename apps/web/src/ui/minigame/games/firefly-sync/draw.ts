// Firefly sync's picture: a night forest (dark sky from the theme's ink, a moon, fir trees along the bottom).
// The swarm is a cloud of little lights over the trees that blaze together on each flash and fade; a ring
// around it closes in to show the next flash coming. The child's paper lantern stands at the bottom and
// glows when she taps (gold on the beat); the fireflies she has won circle around it. A startled swarm jitters
// and dims until its next flash has passed.
import { paintLabel } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { FireflyState } from './logic';

/** Fixed places of the swarm's lights around its centre (unit circle), the same every frame. */
const SPOTS = Array.from({ length: 26 }, (_, i) => {
  const a = i * 2.39996;
  const r = Math.sqrt((i + 0.5) / 26);
  return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.6 };
});

export function drawFireflySync(ctx: CanvasRenderingContext2D, state: FireflyState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const sky = ctx.createLinearGradient(0, 0, 0, arena.height);
  sky.addColorStop(0, theme.ink);
  sky.addColorStop(1, theme.secondary);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, arena.width, arena.height);
  sprites.draw(ctx, 'full-moon', arena.width - 90, 170, 90, { alpha: 0.9 });
  for (let x = 30; x < arena.width + 40; x += 90) sprites.draw(ctx, 'evergreen-tree', x, arena.height - 40 - ((x * 7) % 30), 150 + ((x * 13) % 50), { alpha: 0.75 });

  const since = state.time - state.lastFlash;
  const blaze = Math.exp(-since / 0.22);
  const startled = state.time < state.calmAt;
  const spread = Math.min(180, arena.width * 0.3);
  for (const [i, spot] of SPOTS.entries()) {
    const jitter = startled && !view.reducedMotion ? Math.sin(view.time * 30 + i) * 6 : 0;
    const drift = view.reducedMotion ? 0 : Math.sin(view.time * 1.5 + i) * 5;
    const x = state.swarm.x + spot.x * spread + jitter + drift;
    const y = state.swarm.y + spot.y * spread + Math.cos(view.time * 1.2 + i) * 4;
    const glow = (startled ? 0.15 : 0.3) + (startled ? 0.4 : 0.7) * blaze;
    ctx.globalAlpha = glow * 0.5;
    ctx.fillStyle = theme.star;
    ctx.beginPath();
    ctx.arc(x, y, 9 + 9 * blaze, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = Math.min(1, glow + 0.2);
    ctx.fillStyle = theme.light;
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // The ring closing in on the next flash.
  const left = Math.max(0, Math.min(1, (state.nextFlash - state.time) / state.period));
  ctx.strokeStyle = theme.star;
  ctx.globalAlpha = 0.35 + 0.5 * (1 - left);
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(state.swarm.x, state.swarm.y, spread * 0.75 + left * spread * 0.9, (spread * 0.75 + left * spread * 0.9) * 0.6, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // The lantern, its glow, and the fireflies she has won.
  const l = state.lantern;
  if (state.lanternAgo < 0.35) {
    ctx.globalAlpha = (1 - state.lanternAgo / 0.35) * 0.6;
    ctx.fillStyle = state.lanternOn ? theme.star : theme.light;
    ctx.beginPath();
    ctx.arc(l.x, l.y, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  const shown = Math.min(state.score, 40);
  for (let i = 0; i < shown; i += 1) {
    const a = view.time * (0.8 + (i % 3) * 0.2) + i * 2.4;
    const r = 70 + (i % 5) * 12;
    ctx.fillStyle = theme.star;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(l.x + Math.cos(a) * r, l.y - 20 + Math.sin(a) * r * 0.5, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  sprites.draw(ctx, 'red-paper-lantern', l.x, l.y, 100);
  if (state.flashes < 3) paintLabel(ctx, view, 'Chạm khi đàn đom đóm nháy!', arena.width / 2, l.y - 150, 28);
}
