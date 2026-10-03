// Cube hop's picture: a castle courtyard at dusk, the pyramid of cubes drawn as little 3D blocks (top, left
// and right faces), coloured tops where the child has landed (a new colour for every pyramid), bouncing red
// balls with shadows, the child hopping in an arc (blinking after a hit), and a cheer on a finished pyramid.
import { paintLabel } from '../../draw-kit';
import type { DrawView } from '../../types';
import { cubeCentre, key, ROWS, type CubeState } from './logic';

function paintCube(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, s: number, top: string): void {
  const { theme } = view;
  const h = s * 0.5;
  ctx.lineWidth = 2;
  ctx.strokeStyle = theme.ink;
  // Top face (a diamond).
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.moveTo(x, y - h * 0.55);
  ctx.lineTo(x + s / 2, y);
  ctx.lineTo(x, y + h * 0.55);
  ctx.lineTo(x - s / 2, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Side faces.
  ctx.fillStyle = theme.stone;
  ctx.beginPath();
  ctx.moveTo(x - s / 2, y);
  ctx.lineTo(x, y + h * 0.55);
  ctx.lineTo(x, y + h * 0.55 + s * 0.42);
  ctx.lineTo(x - s / 2, y + s * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.stoneEdge;
  ctx.beginPath();
  ctx.moveTo(x + s / 2, y);
  ctx.lineTo(x, y + h * 0.55);
  ctx.lineTo(x, y + h * 0.55 + s * 0.42);
  ctx.lineTo(x + s / 2, y + s * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

export function drawCubeHop(ctx: CanvasRenderingContext2D, state: CubeState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const sky = ctx.createLinearGradient(0, 0, 0, arena.height);
  sky.addColorStop(0, theme.secondary);
  sky.addColorStop(1, theme.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, arena.width, arena.height);
  const colours = [theme.star, theme.leaf, theme.primary, theme.danger];
  const painted = colours[state.pyramids % colours.length] ?? theme.star;
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col <= row; col += 1) {
      const c = cubeCentre(state, { row, col });
      paintCube(ctx, view, c.x, c.y, state.size * 0.98, state.painted.has(key({ row, col })) ? painted : theme.light);
    }
  }
  for (const b of state.balls) {
    const a = cubeCentre(state, b.at);
    const n = cubeCentre(state, b.next);
    const t = Math.max(0, b.t) / 0.62;
    const x = a.x + (n.x - a.x) * t;
    const y = a.y + (n.y - a.y) * t - Math.sin(t * Math.PI) * state.size * 0.6 - state.size * 0.25;
    ctx.fillStyle = theme.ink;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.ellipse(a.x + (n.x - a.x) * t, a.y + (n.y - a.y) * t, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = b.t < 0 ? 0.5 : 1;
    ctx.fillStyle = theme.danger;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, state.size * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const t = Math.min(1, state.hopAgo / 0.24);
  const a = cubeCentre(state, state.from);
  const b = state.fellTo && state.hurtAgo < 0.4 ? state.fellTo : cubeCentre(state, state.at);
  const x = a.x + (b.x - a.x) * t;
  const y = a.y + (b.y - a.y) * t - (view.reducedMotion ? 0 : Math.sin(t * Math.PI) * state.size * 0.5) - state.size * 0.4;
  const blink = state.hurtAgo < 1.1 && Math.floor(state.hurtAgo * 10) % 2 === 0;
  if (!blink) sprites.draw(ctx, view.player, x, y, state.size * 0.85);
  if (state.doneAgo >= 0) {
    sprites.draw(ctx, 'sparkles', state.topX, state.topY - state.size, state.size * 1.4);
    paintLabel(ctx, view, 'Đổi màu cả tháp!', arena.width / 2, state.topY - state.size * 0.4 - 30, 36, theme.star);
  }
}
