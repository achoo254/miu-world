// Runner's picture: sky, two layers of hills and trees scrolling slower than the trail, the trail itself,
// rocks, logs and leafy branches, twinkling stars, and the child running (bobbing, squashing on landing,
// ducking, blinking after a bump).
import { bob, paintGround, paintHills, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { Obstacle, RunnerState } from './logic';

function paintBranch(ctx: CanvasRenderingContext2D, view: DrawView, o: Obstacle, groundY: number): void {
  const { theme } = view;
  const bottom = groundY - o.h;
  // A bough hanging from above the screen's middle: a trunk post on each side and leaves along the bar.
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(o.x - o.w / 2 - 6, bottom - 260, 14, 260);
  ctx.fillRect(o.x + o.w / 2 - 8, bottom - 260, 14, 260);
  ctx.fillStyle = theme.wood;
  roundRect(ctx, o.x - o.w / 2 - 18, bottom - 30, o.w + 36, 30, 14);
  ctx.fill();
  ctx.fillStyle = theme.leaf;
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.arc(o.x - o.w / 2 + i * (o.w / 4), bottom - 34, 22, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawRunner(ctx: CanvasRenderingContext2D, state: RunnerState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { groundY } = state;
  paintSky(ctx, view, groundY);
  paintHills(ctx, view, groundY - 70, state.distance * 0.15, 140, theme.waterLight);
  paintHills(ctx, view, groundY - 10, state.distance * 0.35 + 400, 90, theme.leaf);
  // Trees along the far edge of the trail.
  const treeGap = 230;
  const shift = (state.distance * 0.6) % treeGap;
  for (let x = -shift; x < arena.width + treeGap; x += treeGap) {
    const n = Math.round((x + state.distance * 0.6) / treeGap);
    sprites.draw(ctx, n % 3 === 0 ? 'evergreen-tree' : 'deciduous-tree', x, groundY - 60, 120);
  }
  paintGround(ctx, view, groundY, state.distance);

  for (const o of state.obstacles) {
    if (o.kind === 'branch') {
      paintBranch(ctx, view, o, groundY);
      continue;
    }
    paintShadow(ctx, view, o.x, groundY + 6, o.w * 1.1);
    sprites.draw(ctx, o.kind === 'rock' ? 'rock' : 'wood', o.x, groundY - o.h / 2 - 4, o.kind === 'rock' ? o.w * 1.15 : o.w * 1.1);
  }

  for (const s of state.stars) {
    const y = groundY - s.lift;
    if (s.taken >= 0) {
      // Picked up: flies up, grows and fades.
      const t = s.taken / 0.6;
      sprites.draw(ctx, 'star', s.x, y - t * 90, 54 * (1 + t * 0.6), { alpha: 1 - t });
      continue;
    }
    const twinkle = view.reducedMotion ? 0 : Math.sin(view.time * 6 + s.x * 0.05) * 0.12;
    sprites.draw(ctx, 'star', s.x, y + bob(view, 4, 4, s.x * 0.02), 54, { rotate: twinkle });
  }

  // The child: a bouncy run, squashed for a moment on landing, flat while ducking, blinking after a bump.
  const ducking = state.sliding > 0 && state.lift <= 0;
  const landing = view.reducedMotion ? 0 : Math.max(0, 1 - state.landed / 0.15);
  const squash: [number, number] = ducking ? [1.3, 0.55] : [1 + 0.18 * landing, 1 - 0.2 * landing];
  const run = state.lift > 0 || view.reducedMotion ? 0 : Math.abs(Math.sin(state.distance / 38)) * 8;
  const height = 96 * squash[1];
  const blink = state.invulnerable > 0 && Math.floor(state.invulnerable * 10) % 2 === 0;
  paintShadow(ctx, view, state.playerX, groundY + 6, 70, state.lift / 220);
  sprites.draw(ctx, view.player, state.playerX, groundY - state.lift - height / 2 - run, 96, {
    squash,
    rotate: state.lift > 0 && !view.reducedMotion ? -0.12 : 0,
    alpha: blink ? 0.35 : 1,
  });
}
