// Flappy fly's picture: sky and drifting clouds over far hills, bamboo stems (green with joints and a few
// leaves) rising from the ground and hanging from above with the gap between, the bird tilting with its
// climb or dive (wings squashed on a flap, blinking after a bump), and the grass scrolling below.
import { paintGround, paintHills, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { BIRD_RADIUS, STEM_WIDTH, type FlappyState } from './logic';

function paintBamboo(ctx: CanvasRenderingContext2D, view: DrawView, x: number, from: number, to: number): void {
  const { theme } = view;
  if (to - from < 4) return;
  ctx.fillStyle = theme.leaf;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  roundRect(ctx, x, from, STEM_WIDTH, to - from, 12);
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = theme.light;
  ctx.fillRect(x + 12, from + 6, 12, to - from - 12);
  ctx.globalAlpha = 1;
  // Joints every so often.
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 5;
  for (let y = from + 60; y < to - 20; y += 90) {
    ctx.beginPath();
    ctx.moveTo(x + 4, y);
    ctx.lineTo(x + STEM_WIDTH - 4, y);
    ctx.stroke();
  }
}

export function drawFlappyFly(ctx: CanvasRenderingContext2D, state: FlappyState, view: DrawView): void {
  const { theme, sprites } = view;
  paintSky(ctx, view, state.groundY, 10);
  paintHills(ctx, view, state.groundY - 10, state.distance * 0.2, 150, theme.leaf);
  for (const stem of state.stems) {
    const gapTop = stem.gapY - state.gap / 2;
    const gapBottom = stem.gapY + state.gap / 2;
    paintBamboo(ctx, view, stem.x, -20, gapTop);
    paintBamboo(ctx, view, stem.x, gapBottom, state.groundY + 10);
    sprites.draw(ctx, 'leaf', stem.x + STEM_WIDTH + 8, gapTop - 40, 44, { rotate: 0.6 });
    sprites.draw(ctx, 'leaf', stem.x - 8, gapBottom + 50, 44, { rotate: -2.4 });
  }
  paintGround(ctx, view, state.groundY, state.distance);
  paintShadow(ctx, view, state.birdX, state.groundY + 8, 70, (state.groundY - state.birdY) / 500);

  const blink = state.invulnerable > 0 && Math.floor(state.invulnerable * 10) % 2 === 0;
  const tilt = view.reducedMotion ? 0 : Math.max(-0.5, Math.min(0.9, state.vy / 900));
  const flap = !view.reducedMotion && state.flapAgo < 0.12 ? 1 - state.flapAgo / 0.12 : 0;
  sprites.draw(ctx, 'bird', state.birdX, state.birdY, BIRD_RADIUS * 3.4, { rotate: tilt, alpha: blink ? 0.35 : 1, squash: [1 + 0.1 * flap, 1 - 0.12 * flap], flipX: true });
  if (state.time < 2.5 && state.score === 0) {
    // At the start: a pulsing ring around the bird, "tap".
    ctx.globalAlpha = 0.6 * (1 - ((view.time * 1.5) % 1));
    ctx.strokeStyle = theme.star;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(state.birdX, state.birdY, 50 + ((view.time * 1.5) % 1) * 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
