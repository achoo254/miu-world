// Crane drop's picture: sky, the crane's rope coming down from above with a yellow hook, the house floor
// swinging on it with a faint plumb line under it, the tower of floors (walls with windows, a door at the bottom)
// swaying more the higher it is, a floor falling, a missed floor tumbling away, and "Đẹp!" for an exact
// landing.
import { paintGround, paintHills, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { hookX, hookY, type CraneDropState } from './logic';

function paintFloor(ctx: CanvasRenderingContext2D, view: DrawView, state: CraneDropState, x: number, y: number, style: number, ground: boolean, angle = 0): void {
  const { theme } = view;
  const w = state.floorW;
  const h = state.floorH;
  const walls = [theme.primary, theme.secondary, theme.leaf];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = walls[style % walls.length] ?? theme.primary;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, -w / 2, 0, w, h, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(-w / 2 - 6, 0, w + 12, 8);
  const windows = ground ? [-w * 0.3, w * 0.3] : [-w * 0.3, 0, w * 0.3];
  for (const wx of windows) {
    ctx.fillStyle = theme.light;
    ctx.fillRect(wx - 15, 20, 30, 30);
    ctx.strokeRect(wx - 15, 20, 30, 30);
    ctx.beginPath();
    ctx.moveTo(wx, 20);
    ctx.lineTo(wx, 50);
    ctx.stroke();
  }
  if (ground) {
    ctx.fillStyle = theme.wood;
    ctx.fillRect(-16, 22, 32, h - 22);
    ctx.strokeRect(-16, 22, 32, h - 22);
  }
  ctx.restore();
}

export function drawCraneDrop(ctx: CanvasRenderingContext2D, state: CraneDropState, view: DrawView): void {
  const { arena, theme } = view;
  const n = state.floors.length;
  const groundY = state.topY + n * state.floorH;
  paintSky(ctx, view, Math.min(arena.height, groundY), 8);
  if (groundY < arena.height + 200) paintHills(ctx, view, groundY, 0, 100, theme.leaf);
  if (groundY < arena.height) paintGround(ctx, view, groundY);

  // The tower: higher floors sway more.
  let x = state.baseX;
  const wave = state.sway * Math.sin(state.time * 1.7);
  state.floors.forEach((f, k) => {
    x += f.offset;
    const top = state.topY + (n - 1 - k) * state.floorH;
    if (top > arena.height) return;
    paintFloor(ctx, view, state, x + (wave * (k + 1)) / Math.max(1, n), top, f.style, k === 0);
  });

  if (state.hooked !== null) {
    const hx = hookX(state);
    const hy = hookY(state);
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(state.pivotX, state.pivotY);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    // The hook.
    ctx.fillStyle = theme.star;
    roundRect(ctx, hx - 16, hy - 26, 32, 22, 6);
    ctx.fill();
    ctx.stroke();
    // Plumb line: where it would land.
    ctx.globalAlpha = 0.35;
    ctx.setLineDash([10, 12]);
    ctx.strokeStyle = theme.light;
    ctx.beginPath();
    ctx.moveTo(hx, hy + state.floorH);
    ctx.lineTo(hx, state.topY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    const tilt = view.reducedMotion ? 0 : -Math.atan2(hx - state.pivotX, hy - state.pivotY) * 0.4;
    paintFloor(ctx, view, state, hx, hy, state.hooked, false, tilt);
  }
  const f = state.falling;
  if (f) paintFloor(ctx, view, state, f.x, f.y, f.style, false, f.missed >= 0 && !view.reducedMotion ? f.missed * 3 * f.missDir : 0);
  if (state.landedAgo < 0.8 && state.exact) {
    ctx.globalAlpha = 1 - state.landedAgo / 0.8;
    paintLabel(ctx, view, 'Đẹp!', arena.width / 2, state.topY - 40 - state.landedAgo * 40, 46, theme.star);
    ctx.globalAlpha = 1;
  }
}
