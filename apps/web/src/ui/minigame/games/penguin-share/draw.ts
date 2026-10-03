// Penguin share's picture: a snowy shore and the sea, the bucket of fish still to share, each penguin with its
// fish laid out on an ice tray in front of it and a count on its belly badge. Penguins hop when they get a fish,
// a fish flies back to the bucket when someone had too many, and everyone bounces with sparkles when it is fair.
import { bob, paintGround, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { PenguinShareState } from './logic';

function paintBucket(ctx: CanvasRenderingContext2D, view: DrawView, state: PenguinShareState): void {
  const { theme, sprites } = view;
  const { x, y } = state.bucket;
  // Fish peeking out of the top, as many as are left (up to 8 shown), then the bucket over them.
  const shown = Math.min(8, state.pile);
  for (let i = 0; i < shown; i += 1) {
    const fx = x + (i - (shown - 1) / 2) * 16;
    sprites.draw(ctx, 'fish', fx, y - 46 + (i % 2) * 10, 50, { rotate: -1.3 + (i % 3) * 0.55 });
  }
  sprites.draw(ctx, 'bucket', x, y, 130);
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x + 70, y + 30, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  paintLabel(ctx, view, String(state.pile), x + 70, y + 32, 32, theme.primary);
}

export function drawPenguinShare(ctx: CanvasRenderingContext2D, state: PenguinShareState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const shoreY = state.bucket.y + 70;
  paintSky(ctx, view, shoreY, 6);
  // The sea on the horizon, then the ice shelf.
  ctx.fillStyle = theme.water;
  ctx.fillRect(0, shoreY - 40, arena.width, 50);
  paintGround(ctx, view, shoreY);
  paintBucket(ctx, view, state);

  const cheer = state.phase === 'cheer';
  for (const [i, g] of state.penguins.entries()) {
    const since = state.time - g.changedAt;
    const hop = since < 0.25 && !view.reducedMotion ? Math.sin((since / 0.25) * Math.PI) * 16 : 0;
    const jump = cheer && !view.reducedMotion ? Math.abs(Math.sin(view.time * 8 + i)) * 24 : 0;
    paintShadow(ctx, view, g.x, g.y + state.size * 0.45, state.size * 0.7);
    sprites.draw(ctx, 'penguin', g.x, g.y - hop - jump + bob(view, 2, 2, i), state.size);
    // Count badge on the belly.
    ctx.fillStyle = theme.light;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(g.x + state.size * 0.38, g.y - state.size * 0.38 - hop - jump, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    paintLabel(ctx, view, String(g.fish), g.x + state.size * 0.38, g.y - state.size * 0.38 - hop - jump + 2, 28, theme.primary);
    // Ice tray with its fish.
    const trayW = Math.max(110, state.size * 0.95);
    const trayY = g.y + state.size * 0.55;
    ctx.fillStyle = theme.light;
    ctx.globalAlpha = 0.85;
    roundRect(ctx, g.x - trayW / 2, trayY, trayW, state.size * 0.62, 16);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = theme.waterLight;
    ctx.lineWidth = 4;
    ctx.stroke();
    const cell = Math.min(trayW / 3, state.size * 0.36);
    for (let f = 0; f < g.fish; f += 1) {
      const fx = g.x + ((f % 3) - 1) * cell;
      const fy = trayY + cell * 0.6 + Math.floor(f / 3) * cell * 0.9;
      sprites.draw(ctx, 'fish', fx, fy, cell * 1.05);
    }
    if (cheer) sprites.draw(ctx, 'sparkles', g.x + state.size * 0.3, g.y - state.size * 0.6 - jump, 40, { alpha: 0.9 });
  }

  // A fish going back to the bucket.
  if (state.phase === 'giveBack') {
    const t = Math.min(1, state.phaseAgo / 0.6);
    for (const index of state.givingBack) {
      const g = state.penguins[index];
      if (!g) continue;
      const x = g.x + (state.bucket.x - g.x) * t;
      const y = g.y + (state.bucket.y - g.y) * t - Math.sin(t * Math.PI) * 120;
      sprites.draw(ctx, 'fish', x, y, 50, { alpha: 1 - t * 0.5, rotate: t * 6 });
    }
  }
  if (cheer) paintLabel(ctx, view, 'Chia đều rồi!', arena.width / 2, shoreY + 60, 44, theme.star);
}
