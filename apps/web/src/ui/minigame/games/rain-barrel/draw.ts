// Rain barrel's picture: a grey-blue sky, the rain cloud drifting, falling drops, the banana leaf on its stalk
// tilting (drops sliding down it), the three earthen jars (the waiting one open with an arrow and its water
// level showing, the others lidded), and sparkles when a jar fills up.
import { bob, paintGround, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { CAPACITY, MOUTH, type RainState } from './logic';

export function drawRainBarrel(ctx: CanvasRenderingContext2D, state: RainState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const groundY = arena.height - 40;
  paintSky(ctx, view, groundY, 4);
  paintGround(ctx, view, groundY);
  sprites.draw(ctx, 'cloud', state.cloudX, 150, 200);

  // The leaf's stalk and the leaf.
  const { pivot, half, tilt } = state;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(pivot.x, pivot.y);
  ctx.lineTo(pivot.x, groundY);
  ctx.stroke();
  ctx.save();
  ctx.translate(pivot.x, pivot.y);
  ctx.rotate(tilt);
  ctx.fillStyle = theme.leaf;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-half, 0);
  ctx.quadraticCurveTo(0, -46, half, 0);
  ctx.quadraticCurveTo(0, 22, -half, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = theme.light;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-half + 10, -4);
  ctx.lineTo(half - 10, -4);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();

  for (const d of state.drops) sprites.draw(ctx, 'droplet', d.x, d.y, d.sliding ? 22 : 26);

  // Jars.
  state.jars.forEach((j, i) => {
    const active = i === state.active;
    const w = MOUTH * 2.4;
    const h = 96;
    ctx.fillStyle = theme.woodEdge;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(j.x - MOUTH, j.y - h / 2);
    ctx.quadraticCurveTo(j.x - w / 2 - 20, j.y, j.x - MOUTH * 0.8, j.y + h / 2);
    ctx.lineTo(j.x + MOUTH * 0.8, j.y + h / 2);
    ctx.quadraticCurveTo(j.x + w / 2 + 20, j.y, j.x + MOUTH, j.y - h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (active) {
      // Water level.
      const level = state.fill / CAPACITY;
      ctx.fillStyle = theme.water;
      roundRect(ctx, j.x - MOUTH * 0.9, j.y + h / 2 - 8 - level * (h - 20), MOUTH * 1.8, level * (h - 20) + 4, 8);
      ctx.fill();
      sprites.draw(ctx, 'droplet', j.x, j.y - h / 2 - 50 + bob(view, 5, 6), 40);
    } else {
      ctx.fillStyle = theme.wood;
      roundRect(ctx, j.x - MOUTH - 8, j.y - h / 2 - 12, MOUTH * 2 + 16, 16, 8);
      ctx.fill();
      ctx.stroke();
    }
  });
  const since = state.time - state.filledAt;
  if (since < 0.8) sprites.draw(ctx, 'sparkles', arena.width / 2, arena.height - 160 - since * 40, 60, { alpha: 1 - since / 0.8 });
}
