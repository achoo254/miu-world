// Reef sweeper's picture: a sea with a sandy patch of 25 raised squares; dug squares sink into clear shallow
// water and show their number (each number its own colour), rocks show where they are hit, flags are little
// red pennants, a held square fills a ring while the flag is coming, and a cleared patch sparkles.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { HUD_SAFE_TOP } from '../../types';
import { FLAG_HOLD, SIDE, type ReefState } from './logic';

function paintFlag(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, size: number): void {
  const { theme } = view;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x - size * 0.15, y + size * 0.35);
  ctx.lineTo(x - size * 0.15, y - size * 0.35);
  ctx.stroke();
  ctx.fillStyle = theme.danger;
  ctx.beginPath();
  ctx.moveTo(x - size * 0.13, y - size * 0.35);
  ctx.lineTo(x + size * 0.3, y - size * 0.2);
  ctx.lineTo(x - size * 0.13, y - size * 0.05);
  ctx.closePath();
  ctx.fill();
}

export function drawReefSweeper(ctx: CanvasRenderingContext2D, state: ReefState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const sea = ctx.createLinearGradient(0, 0, 0, arena.height);
  sea.addColorStop(0, theme.waterLight);
  sea.addColorStop(1, theme.water);
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.strokeStyle = theme.light;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 3;
  for (let i = 0; i < 10; i += 1) {
    const y = HUD_SAFE_TOP + ((i * 97 + view.time * 12) % (arena.height - HUD_SAFE_TOP));
    ctx.beginPath();
    ctx.moveTo((i * 151) % arena.width, y);
    ctx.quadraticCurveTo(((i * 151) % arena.width) + 30, y - 8, ((i * 151) % arena.width) + 60, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  sprites.draw(ctx, 'sailboat', arena.width - 80, HUD_SAFE_TOP + 30, 70);

  const { left, top, size } = state;
  const colours = [theme.ink, theme.secondary, theme.leaf, theme.danger, theme.primary, theme.woodEdge];
  state.cells.forEach((cell, i) => {
    const x = left + (i % SIDE) * size;
    const y = top + Math.floor(i / SIDE) * size;
    if (cell.open) {
      ctx.fillStyle = theme.waterLight;
      roundRect(ctx, x + 4, y + 4, size - 8, size - 8, 12);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = theme.water;
      ctx.stroke();
      const pop = cell.openedAgo < 0.25 && !view.reducedMotion ? 1 + 0.3 * Math.sin((cell.openedAgo / 0.25) * Math.PI) : 1;
      if (cell.hit) sprites.draw(ctx, 'rock', x + size / 2, y + size / 2, size * 0.7 * pop);
      else if (cell.count > 0) paintLabel(ctx, view, String(cell.count), x + size / 2, y + size / 2 + 3, size * 0.5 * pop, colours[cell.count] ?? theme.ink);
      return;
    }
    ctx.fillStyle = theme.groundDeep;
    roundRect(ctx, x + 4, y + 8, size - 8, size - 8, 12);
    ctx.fill();
    ctx.fillStyle = theme.ground;
    roundRect(ctx, x + 4, y + 2, size - 8, size - 10, 12);
    ctx.fill();
    ctx.fillStyle = theme.light;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(x + size * 0.3, y + size * 0.3, size * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (cell.flag) paintFlag(ctx, view, x + size / 2, y + size / 2, size);
  });
  // A hold filling up toward a flag.
  const hold = state.holding;
  if (hold && !hold.flagged && hold.cell >= 0) {
    const x = left + ((hold.cell % SIDE) + 0.5) * size;
    const y = top + (Math.floor(hold.cell / SIDE) + 0.5) * size;
    ctx.strokeStyle = theme.danger;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, (state.time - hold.since) / FLAG_HOLD));
    ctx.stroke();
  }
  if (state.clearedAgo >= 0) {
    sprites.draw(ctx, 'sparkles', left + (size * SIDE) / 2, top + (size * SIDE) / 2 - state.clearedAgo * 40, size * 2, { alpha: Math.max(0, 1 - state.clearedAgo / 1.2) });
    paintLabel(ctx, view, 'Dò xong bãi này!', arena.width / 2, top - 36, 40, theme.star);
  } else {
    paintLabel(ctx, view, state.laid ? `Có ${state.rocks} hòn đá ngầm` : 'Chạm một ô cát để bắt đầu dò', arena.width / 2, top - 36, 30);
  }
}
