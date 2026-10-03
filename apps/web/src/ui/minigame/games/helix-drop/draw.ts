// Helix drop's picture: a sky that darkens slowly as the ball goes down, the tower's pole, each floor drawn as
// a ring seen from a little above (its gap open, red patches glowing), back half behind the pole and front
// half in front of it, the bouncing ball (squashing as it lands), sparkles when it drops through, and a red
// flash when it lands on a red patch.
import { roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { FLOOR_GAP, SEGMENTS, type HelixState, type Segment } from './logic';

const SEG = (Math.PI * 2) / SEGMENTS;
const TILT = 0.34;
const THICK = 26;

function segmentColour(view: DrawView, s: Segment, k: number): string {
  const { theme } = view;
  if (s === 'red') return theme.danger;
  return k % 2 === 0 ? theme.primary : theme.secondary;
}

/** The ring's segments whose middle is in the back half (sin < 0) or the front half. */
function paintRing(ctx: CanvasRenderingContext2D, view: DrawView, state: HelixState, floor: readonly Segment[], k: number, y: number, front: boolean): void {
  const { theme } = view;
  const R = state.radius;
  const inner = R * 0.28;
  const cx = state.centreX;
  for (let i = 0; i < SEGMENTS; i += 1) {
    const s = floor[i] ?? 'floor';
    if (s === 'gap') continue;
    const a0 = i * SEG + state.turn;
    const a1 = a0 + SEG;
    const mid = (a0 + a1) / 2;
    if (Math.sin(mid) >= 0 !== front) continue;
    const pts = (r: number, a: number, dy = 0): [number, number] => [cx + Math.cos(a) * r, y + Math.sin(a) * r * TILT + dy];
    // Side band (thickness) for the front, then the top face.
    if (front) {
      ctx.fillStyle = theme.ink;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      for (let t = 0; t <= 6; t += 1) ctx.lineTo(...pts(R, a0 + (SEG * t) / 6));
      for (let t = 6; t >= 0; t -= 1) ctx.lineTo(...pts(R, a0 + (SEG * t) / 6, THICK));
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = segmentColour(view, s, k);
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let t = 0; t <= 6; t += 1) ctx.lineTo(...pts(R, a0 + (SEG * t) / 6));
    for (let t = 6; t >= 0; t -= 1) ctx.lineTo(...pts(inner, a0 + (SEG * t) / 6));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

export function drawHelixDrop(ctx: CanvasRenderingContext2D, state: HelixState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const depth = Math.min(1, state.camY / (FLOOR_GAP * 60));
  const sky = ctx.createLinearGradient(0, 0, 0, arena.height);
  sky.addColorStop(0, theme.sky[0]);
  sky.addColorStop(1, theme.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = depth * 0.35;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.globalAlpha = 1;

  const screenY = (worldY: number): number => state.ballScreenY + (worldY - state.camY);
  const first = Math.max(0, Math.floor((state.camY - state.ballScreenY) / FLOOR_GAP));
  const last = Math.ceil((state.camY + arena.height) / FLOOR_GAP);
  // The pole.
  ctx.fillStyle = theme.stone;
  roundRect(ctx, state.centreX - state.radius * 0.28, 0, state.radius * 0.56, arena.height, 10);
  ctx.fill();
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.3;
  ctx.fillRect(state.centreX - state.radius * 0.18, 0, state.radius * 0.08, arena.height);
  ctx.globalAlpha = 1;

  const ballFloor = Math.floor(state.ballY / FLOOR_GAP) + 1;
  for (let k = first; k <= last; k += 1) {
    const floor = state.floors[k];
    if (!floor) continue;
    const y = screenY(k * FLOOR_GAP);
    paintRing(ctx, view, state, floor, k, y, false);
    paintRing(ctx, view, state, floor, k, y, true);
    if (k === ballFloor) {
      // The ball sits just in front of the pole, above this floor.
      const since = state.time - state.landedAt;
      const squash = since < 0.12 && !view.reducedMotion ? 1 - since / 0.12 : 0;
      const by = screenY(state.ballY) + state.radius * TILT * 0.6;
      const r = 26;
      ctx.fillStyle = theme.ink;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.ellipse(state.centreX, y + state.radius * TILT * 0.6, r, r * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = state.time - state.hitAt < 0.3 ? theme.danger : theme.star;
      ctx.strokeStyle = theme.ink;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(state.centreX, by - r * (1 - squash * 0.3), r * (1 + squash * 0.25), r * (1 - squash * 0.3), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = theme.light;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(state.centreX - 8, by - r * 1.3, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  const since = state.time - state.passedAt;
  if (since < 0.5) {
    sprites.draw(ctx, 'sparkles', state.centreX - state.radius * 0.6, state.ballScreenY - 20 - since * 60, 46, { alpha: 1 - since / 0.5 });
    sprites.draw(ctx, 'star', state.centreX + state.radius * 0.6, state.ballScreenY - since * 80, 40, { alpha: 1 - since / 0.5 });
  }
}
