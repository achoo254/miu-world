// Barrel climb's picture: the inside of a rice barn, wooden floors with ladders at alternate ends, sheaves of
// rice stacked at the top by the monkey, rolling rice sacks (round sacks with a tied neck, turning as they
// roll), and the child running, jumping, climbing, or sitting dazed with stars after a hit.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { FLOORS, jumpHeight, runDir, type BarrelState } from './logic';

export function drawBarrelClimb(ctx: CanvasRenderingContext2D, state: BarrelState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.strokeStyle = theme.woodEdge;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 4;
  for (let x = 0; x < arena.width; x += 70) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, arena.height);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Floors and ladders.
  state.floorY.forEach((y, i) => {
    ctx.fillStyle = theme.woodEdge;
    roundRect(ctx, state.edgeL - 10, y, state.edgeR - state.edgeL + 20, 14, 6);
    ctx.fill();
    const lx = state.ladderX[i];
    if (lx === undefined || i >= FLOORS) return;
    const top = state.floorY[i + 1] ?? y;
    ctx.strokeStyle = theme.star;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(lx - 18, y);
    ctx.lineTo(lx - 18, top);
    ctx.moveTo(lx + 18, y);
    ctx.lineTo(lx + 18, top);
    for (let r = y - 16; r > top; r -= 18) {
      ctx.moveTo(lx - 18, r);
      ctx.lineTo(lx + 18, r);
    }
    ctx.stroke();
  });
  const topY = state.floorY[FLOORS] ?? 0;
  sprites.draw(ctx, 'monkey', state.monkeyX, topY - 34, 70);
  for (let k = 0; k < 3; k += 1) sprites.draw(ctx, 'sheaf-of-rice', state.edgeR - 40 - k * 46, topY - 28, 56);

  // Sacks.
  for (const s of state.sacks) {
    const floorY = state.floorY[s.floor] ?? 0;
    const y = s.dropping > 0 ? floorY - 22 - (s.dropping / 0.35) * ((state.floorY[s.floor + 1] ?? floorY) - floorY) * -1 : floorY - 22;
    ctx.save();
    ctx.translate(s.x, Math.min(floorY - 22, y));
    ctx.rotate(view.reducedMotion ? 0 : (s.x / 22) * s.dir);
    ctx.fillStyle = theme.light;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = theme.woodEdge;
    ctx.stroke();
    ctx.fillStyle = theme.danger;
    ctx.fillRect(-4, -22, 8, 12);
    ctx.restore();
  }

  // The child.
  const c = state.child;
  const floorY = state.floorY[c.floor] ?? 0;
  let y = floorY - 32 - jumpHeight(c.jump);
  if (c.climb > 0) y -= (1 - c.climb / 0.8) * ((floorY - (state.floorY[c.floor + 1] ?? floorY)));
  sprites.draw(ctx, view.player, c.x, y, 64, { flipX: runDir(c.floor) < 0, rotate: c.stunned > 0 ? 0.6 : 0 });
  if (c.stunned > 0) sprites.draw(ctx, 'star', c.x, y - 40, 28, { rotate: view.time * 6 });
  const atLadder = c.climb === 0 && Math.abs(c.x - (state.ladderX[c.floor] ?? -99)) < 2;
  if (atLadder && c.stunned <= 0) paintLabel(ctx, view, 'Vuốt lên ↑', c.x, y - 56, 26, theme.star);
  if (state.toppedAgo < 1.2) paintLabel(ctx, view, 'Lên đỉnh rồi!', arena.width / 2, topY + 40, 44, theme.star);
}
