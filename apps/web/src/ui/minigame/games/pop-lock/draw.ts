// Pop the lock's picture: a stone vault, a big padlock whose face is the ring, the needle (a red hand with a
// key's bow at its hub), the golden dot pulsing on the ring, the dots still to pop as pips, and on success the
// shackle springing open with coins and gems flying out. A failed lock shakes and flashes.
import { bob, paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { DOTS_PER_LOCK, TOLERANCE, type PopLockState } from './logic';

function paintVault(ctx: CanvasRenderingContext2D, view: DrawView): void {
  const { arena, theme } = view;
  ctx.fillStyle = theme.stone;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.strokeStyle = theme.stoneEdge;
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.5;
  const rowH = 60;
  for (let row = 0; row * rowH < arena.height; row += 1) {
    const y = row * rowH;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(arena.width, y);
    ctx.stroke();
    for (let x = (row % 2) * 60; x < arena.width; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + rowH);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

export function drawPopLock(ctx: CanvasRenderingContext2D, state: PopLockState, view: DrawView): void {
  const { theme, sprites } = view;
  const { centre, radius } = state;
  paintVault(ctx, view);

  const shake = state.phase === 'fail' && !view.reducedMotion ? Math.sin(state.phaseAgo * 50) * 10 * (1 - state.phaseAgo / 0.9) : 0;
  const open = state.phase === 'open' ? Math.min(1, state.phaseAgo / 0.3) : 0;
  ctx.save();
  ctx.translate(shake, 0);

  // Shackle: lifts when the lock opens.
  const bodyHalf = radius + 34;
  ctx.strokeStyle = theme.stoneEdge;
  ctx.lineWidth = 30;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const lift = open * radius * 0.35;
  const shackleR = radius * 0.62;
  ctx.moveTo(centre.x - shackleR, centre.y - bodyHalf + 10 - lift);
  ctx.arc(centre.x, centre.y - bodyHalf + 10 - lift, shackleR, Math.PI, 0);
  ctx.lineTo(centre.x + shackleR, centre.y - bodyHalf + 10 - (open > 0 ? lift + 26 : 0));
  ctx.stroke();
  ctx.lineCap = 'butt';

  // Body.
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.25;
  roundRect(ctx, centre.x - bodyHalf + 8, centre.y - bodyHalf + 14, bodyHalf * 2, bodyHalf * 2, 40);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = state.phase === 'fail' && state.phaseAgo < 0.3 ? theme.danger : theme.star;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 8;
  roundRect(ctx, centre.x - bodyHalf, centre.y - bodyHalf, bodyHalf * 2, bodyHalf * 2, 40);
  ctx.fill();
  ctx.stroke();

  // The ring track.
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 46;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(centre.x, centre.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  if (state.phase === 'play') {
    // The dot, with its window shown faintly on the track.
    ctx.strokeStyle = theme.light;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 46;
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, radius, state.dot - TOLERANCE, state.dot + TOLERANCE);
    ctx.stroke();
    ctx.globalAlpha = 1;
    const pulse = view.reducedMotion ? 1 : 1 + 0.12 * Math.sin(view.time * 9);
    const dx = centre.x + Math.cos(state.dot) * radius;
    const dy = centre.y + Math.sin(state.dot) * radius;
    sprites.draw(ctx, 'coin', dx, dy, 60 * pulse);
  }

  // The popped dot's flash.
  const flash = state.time - state.poppedAt;
  if (flash < 0.3) {
    ctx.strokeStyle = theme.light;
    ctx.globalAlpha = 1 - flash / 0.3;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, radius + flash * 80, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Needle.
  const tip = { x: centre.x + Math.cos(state.needle) * (radius + 24), y: centre.y + Math.sin(state.needle) * (radius + 24) };
  ctx.strokeStyle = theme.danger;
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(centre.x + Math.cos(state.needle) * (radius - 30), centre.y + Math.sin(state.needle) * (radius - 30));
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();
  ctx.lineCap = 'butt';

  // Hub: dots left, as a number and pips.
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(centre.x, centre.y, radius * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (state.phase === 'open') {
    sprites.draw(ctx, 'unlocked', centre.x, centre.y + bob(view, 6, 4), radius * 0.7);
  } else {
    paintLabel(ctx, view, String(state.dotsLeft), centre.x, centre.y - 8, Math.max(40, radius * 0.42), theme.primary);
    for (let i = 0; i < DOTS_PER_LOCK; i += 1) {
      const px = centre.x + (i - (DOTS_PER_LOCK - 1) / 2) * 16;
      ctx.fillStyle = i < DOTS_PER_LOCK - state.dotsLeft ? theme.star : theme.stoneEdge;
      ctx.beginPath();
      ctx.arc(px, centre.y + radius * 0.3, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // Opening: treasure bursts out.
  if (state.phase === 'open') {
    const t = state.phaseAgo;
    const loot = ['coin', 'gem', 'coin', 'crown', 'coin', 'gem'] as const;
    loot.forEach((ref, i) => {
      const a = -Math.PI / 2 + (i - 2.5) * 0.45;
      const dist = 60 + t * 260;
      const fall = t * t * 260;
      sprites.draw(ctx, ref, centre.x + Math.cos(a) * dist, centre.y + Math.sin(a) * dist + fall, 48, { alpha: Math.max(0, 1 - t / 1.3) });
    });
  }
}
