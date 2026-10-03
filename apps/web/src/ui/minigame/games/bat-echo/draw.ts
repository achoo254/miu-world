// Bat echo's picture: a dark cave (the theme's ink). Walls are drawn as glowing stone lines only where a squeak
// reaches: brightest right after it, fading over a second, and only within the squeak's reach (a widening ring
// shows it going out). A faint glow always marks the walls right next to the bat. The way out is the full
// moon shining through, always visible. A stunned bat spins with little stars.
import { paintLabel } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { BAT_RADIUS, cellCentre, ECHO_RADIUS, ECHO_SECONDS, type EchoState } from './logic';

export function drawBatEcho(ctx: CanvasRenderingContext2D, state: EchoState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.ink;
  ctx.fillRect(0, 0, arena.width, arena.height);
  const cave = state.cave;
  const exit = cellCentre(cave, cave.exit);
  ctx.fillStyle = theme.star;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.arc(exit.x, exit.y, cave.cell * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  sprites.draw(ctx, 'full-moon', exit.x, exit.y, cave.cell * 0.6);

  const echo = Math.max(0, 1 - state.echoAgo / ECHO_SECONDS);
  const reach = ECHO_RADIUS * Math.min(1, state.echoAgo / 0.25);
  ctx.lineCap = 'round';
  for (const w of cave.walls) {
    const mid = { x: (w.a.x + w.b.x) / 2, y: (w.a.y + w.b.y) / 2 };
    const fromEcho = Math.hypot(mid.x - state.echoAt.x, mid.y - state.echoAt.y);
    const fromBat = Math.hypot(mid.x - state.bat.x, mid.y - state.bat.y);
    const lit = Math.max(fromEcho <= reach ? echo : 0, fromBat < cave.cell * 0.75 ? 0.18 : 0);
    if (lit <= 0) continue;
    ctx.globalAlpha = lit;
    ctx.strokeStyle = theme.stone;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(w.a.x, w.a.y);
    ctx.lineTo(w.b.x, w.b.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineCap = 'butt';
  if (echo > 0) {
    ctx.strokeStyle = theme.waterLight;
    ctx.globalAlpha = echo * 0.5;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(state.echoAt.x, state.echoAt.y, reach, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const spin = state.stunned > 0 && !view.reducedMotion ? state.time * 12 : 0;
  sprites.draw(ctx, 'bat', state.bat.x, state.bat.y + (view.reducedMotion ? 0 : Math.sin(view.time * 10) * 3), BAT_RADIUS * 3.6, { rotate: spin });
  if (state.stunned > 0) for (let k = 0; k < 3; k += 1) sprites.draw(ctx, 'star', state.bat.x + Math.cos(view.time * 6 + k * 2) * 30, state.bat.y - 30 + Math.sin(view.time * 6 + k * 2) * 8, 16);
  if (state.time < 4 && state.caves === 1) paintLabel(ctx, view, 'Chạm để dơi kêu, kéo để bay', arena.width / 2, HUD_SAFE_TOP + 10, 26);
  if (state.out >= 0) paintLabel(ctx, view, 'Ra khỏi hang rồi!', arena.width / 2, arena.height / 2, 44, theme.star);
}
