// Skate tricks' picture: a sunny skate park (hills behind, tiled ground scrolling), wooden ramps, the child on
// her skateboard: in the air the board and rider spin (left/right), flip (down), and a trick's name pops up
// when it lands in time; after a tumble she lies on the ground with stars.
import { paintGround, paintHills, paintLabel, paintShadow, paintSky } from '../../draw-kit';
import type { DrawView } from '../../types';
import { TRICK_SECONDS, type SkateState } from './logic';

const NAMES = { left: 'Xoay trái!', right: 'Xoay phải!', down: 'Lật ván!', up: '' } as const;

export function drawSkateTricks(ctx: CanvasRenderingContext2D, state: SkateState, view: DrawView): void {
  const { theme, sprites } = view;
  const g = state.groundY;
  paintSky(ctx, view, g);
  paintHills(ctx, view, g - 20, state.distance * 0.2, 110, theme.leaf);
  paintGround(ctx, view, g, state.distance);
  for (const r of state.ramps) {
    ctx.fillStyle = theme.wood;
    ctx.beginPath();
    ctx.moveTo(r.x - 70, g);
    ctx.quadraticCurveTo(r.x, g, r.x + 10, g - 60);
    ctx.lineTo(r.x + 30, g - 60);
    ctx.lineTo(r.x + 30, g);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = theme.woodEdge;
    ctx.stroke();
  }
  const y = g - state.height;
  paintShadow(ctx, view, state.x, g + 4, 90, state.height / 300);
  if (state.down > 0) {
    sprites.draw(ctx, view.player, state.x, g - 30, 90, { rotate: 1.4 });
    sprites.draw(ctx, 'skateboard', state.x + 70, g - 12, 80, { rotate: 0.4 });
    sprites.draw(ctx, 'sparkles', state.x, g - 90, 46, { rotate: view.time * 5 });
    return;
  }
  let spin = 0;
  let flip = 1;
  if (state.trick) {
    const t = state.trick.t / TRICK_SECONDS;
    if (state.trick.kind === 'left') spin = -t * Math.PI * 2;
    if (state.trick.kind === 'right') spin = t * Math.PI * 2;
    if (state.trick.kind === 'down') flip = Math.cos(t * Math.PI * 2);
  }
  ctx.save();
  ctx.translate(state.x, y - 50);
  ctx.rotate(view.reducedMotion ? 0 : spin);
  sprites.draw(ctx, 'skateboard', 0, 42, 90, { squash: [1, Math.max(0.15, Math.abs(flip))] });
  sprites.draw(ctx, view.player, 0, -6, 96);
  ctx.restore();
  const since = state.time - state.lastTrickAt;
  if (since < 0.8 && state.lastTrick) {
    paintLabel(ctx, view, NAMES[state.lastTrick], state.x + 110, y - 140 - since * 40, 36, theme.star);
    sprites.draw(ctx, 'star', state.x - 70, y - 120 - since * 60, 44, { alpha: 1 - since / 0.8 });
  }
}
