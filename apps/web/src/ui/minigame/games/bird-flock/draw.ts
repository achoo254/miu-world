// Bird flock's picture: a wide sky with hills far below, cloud rings (a ring of white puffs) drifting in, dark
// storm clouds with lightning, the leader with a gold ring and its followers in a V behind. A lost bird
// tumbles away and flies back faded; the flock count shows next to the leader, gold when there are five or more.
import { paintHills, paintLabel, paintSky } from '../../draw-kit';
import type { DrawView } from '../../types';
import { flockSize, followerPoint, NEED, RING_REACH, type FlockState } from './logic';

export function drawBirdFlock(ctx: CanvasRenderingContext2D, state: FlockState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, arena.height, 20);
  paintHills(ctx, view, arena.height, state.time * 40, 60, theme.leaf);
  for (const s of state.storms) {
    sprites.draw(ctx, 'cloud-with-lightning', s.x, s.y, 130);
  }
  for (const r of state.rings) {
    const done = r.passed === true;
    for (let k = 0; k < 10; k += 1) {
      const a = (k / 10) * Math.PI * 2;
      ctx.fillStyle = done ? theme.star : theme.light;
      ctx.globalAlpha = r.passed === false ? 0.4 : 0.9;
      ctx.beginPath();
      ctx.arc(r.x + Math.cos(a) * 28, r.y + Math.sin(a) * (RING_REACH + 12), 16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  const flap = (k: number): number => (view.reducedMotion ? 0 : Math.sin(view.time * 12 + k) * 0.12);
  state.lost.forEach((l, k) => {
    const p = followerPoint(state, k);
    if (l > 0) {
      const away = (3 - l) * 60;
      sprites.draw(ctx, 'bird', p.x - away, p.y + away * 0.5, 44, { alpha: 0.35, rotate: away * 0.02, flipX: true });
      return;
    }
    sprites.draw(ctx, 'bird', p.x, p.y, 52, { rotate: flap(k), flipX: true });
  });
  ctx.strokeStyle = theme.star;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(state.leadX, state.leadY, 38, 0, Math.PI * 2);
  ctx.stroke();
  sprites.draw(ctx, 'bird', state.leadX, state.leadY, 64, { rotate: flap(9), flipX: true });
  const n = flockSize(state);
  paintLabel(ctx, view, `${n}`, state.leadX + 50, state.leadY - 40, 26, n >= NEED ? theme.star : theme.light);
}
