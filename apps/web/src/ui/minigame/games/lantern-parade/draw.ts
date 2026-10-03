// Lantern parade's picture: a Mid-Autumn night (dark sky, full moon, stars), houses along the street with red
// lanterns, the friends walking ahead with their lanterns, mooncakes on the street, the child with her star
// lantern glowing (flickering when she hurries, dark while she lights it again), a speed needle with green
// (good), red (too fast) and blue (too slow) zones, and a hold button.
import { bob, paintLabel, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { LEFT_BEHIND, MAX_SPEED, SAFE_SPEED, type LanternParadeState } from './logic';

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  for (let k = 0; k < 10; k += 1) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

export function drawLanternParade(ctx: CanvasRenderingContext2D, state: LanternParadeState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const g = state.groundY;
  const sky = ctx.createLinearGradient(0, 0, 0, g);
  sky.addColorStop(0, theme.ink);
  sky.addColorStop(1, theme.secondary);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, arena.width, arena.height);
  sprites.draw(ctx, 'full-moon', arena.width - 110, HUD_SAFE_TOP + 70, 110);
  ctx.fillStyle = theme.light;
  for (let i = 0; i < 14; i += 1) {
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(view.time * 2 + i);
    ctx.fillRect((i * 197) % arena.width, HUD_SAFE_TOP + ((i * 71) % Math.max(1, g - HUD_SAFE_TOP - 200)), 4, 4);
  }
  ctx.globalAlpha = 1;
  const cam = state.x - state.screenX;
  // Houses, scrolling a little slower.
  for (let k = Math.floor((cam * 0.7) / 220) - 1; k < (cam * 0.7 + arena.width) / 220 + 1; k += 1) {
    const x = k * 220 - cam * 0.7;
    const h = 150 + ((k * 37) % 60);
    ctx.fillStyle = theme.woodEdge;
    ctx.fillRect(x + 10, g - h, 180, h);
    ctx.fillStyle = theme.star;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(x + 40, g - h + 40, 34, 30);
    ctx.fillRect(x + 120, g - h + 40, 34, 30);
    ctx.globalAlpha = 1;
    sprites.draw(ctx, 'red-paper-lantern', x + 100, g - h - 10 + bob(view, 2, 4, k), 46);
  }
  ctx.fillStyle = theme.stoneEdge;
  ctx.fillRect(0, g, arena.width, arena.height - g);
  ctx.fillStyle = theme.stone;
  ctx.fillRect(0, g, arena.width, 14);

  for (const c of state.cakes) {
    if (c.state !== 0) continue;
    const sx = c.x - cam;
    if (sx < -40 || sx > arena.width + 40) continue;
    sprites.draw(ctx, 'moon-cake', sx, g - 18 + bob(view, 3, 3, c.x), 48);
  }

  // Friends ahead.
  const friends = ['rabbit', 'panda', 'monkey-face'] as const;
  friends.forEach((f, k) => {
    const sx = state.paradeX - cam + k * 70;
    const step = view.reducedMotion ? 0 : Math.abs(Math.sin(view.time * 6 + k)) * 6;
    sprites.draw(ctx, f, sx, g - 45 - step, 74);
    sprites.draw(ctx, 'red-paper-lantern', sx + 30, g - 110 - step, 40);
  });

  // The child and her star lantern.
  const x = state.screenX;
  const lit = state.relight === 0;
  const flicker = lit && state.flicker > 0 && !view.reducedMotion ? 0.5 + 0.5 * Math.sin(view.time * 40) : 1;
  if (lit) {
    const glow = ctx.createRadialGradient(x + 40, g - 120, 5, x + 40, g - 120, 110);
    glow.addColorStop(0, theme.star);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.55 * flicker;
    ctx.fillStyle = glow;
    ctx.fillRect(x - 80, g - 240, 240, 240);
    ctx.globalAlpha = 1;
  }
  const walk = state.speed > 5 && !view.reducedMotion ? Math.abs(Math.sin(view.time * 10)) * 7 : 0;
  sprites.draw(ctx, view.player, x, g - 45 - walk, 84);
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + 20, g - 60 - walk);
  ctx.lineTo(x + 40, g - 100 - walk);
  ctx.stroke();
  ctx.fillStyle = lit ? theme.star : theme.stoneEdge;
  ctx.strokeStyle = theme.danger;
  ctx.lineWidth = 4;
  star(ctx, x + 40, g - 122 - walk, 26 * (lit ? 0.9 + 0.1 * flicker : 1));
  ctx.fill();
  ctx.stroke();
  if (!lit) paintLabel(ctx, view, 'Thắp lại đèn…', x + 40, g - 175, 30, theme.light);
  if (state.paradeX - state.x > LEFT_BEHIND * 0.7) paintLabel(ctx, view, 'Nhanh lên kẻo tụt lại!', arena.width / 2, HUD_SAFE_TOP + 40, 32, theme.light);

  // The speed needle.
  const cx = 110;
  const cy = arena.height - 34;
  const r = 80;
  const zones: [number, number, string][] = [
    [0, 90, theme.secondary],
    [90, SAFE_SPEED, theme.leaf],
    [SAFE_SPEED, MAX_SPEED, theme.danger],
  ];
  for (const [from, to, colour] of zones) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI + (from / MAX_SPEED) * Math.PI, Math.PI + (to / MAX_SPEED) * Math.PI);
    ctx.stroke();
  }
  const a = Math.PI + (state.speed / MAX_SPEED) * Math.PI;
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6));
  ctx.stroke();
  // Hold button.
  const bx = arena.width - 84;
  const by = arena.height - 84;
  ctx.fillStyle = state.holding ? theme.star : theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  roundRect(ctx, bx - 60, by - 50, 120, 100, 30);
  ctx.fill();
  ctx.stroke();
  paintLabel(ctx, view, 'Giữ để đi', bx, by, 24, state.holding ? theme.light : theme.star);
  if (state.pickedAgo < 0.7) sprites.draw(ctx, 'moon-cake', x, g - 200 - state.pickedAgo * 60, 60, { alpha: 1 - state.pickedAgo / 0.7 });
}
