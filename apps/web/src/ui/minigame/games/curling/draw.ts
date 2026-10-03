// Curling's picture: snowy banks either side of a long ice sheet with wooden side boards, the house's three
// coloured rings and the back line, the stones (spinning as they slide, each resting one wearing its points),
// the broom under the finger with fresh sweep marks, the stones still to throw, and an arrow showing "swipe up"
// before the first throw.
import { paintLabel, paintShadow, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { ringPoints, RINGS, STONE_RADIUS, STONES, type CurlingState } from './logic';

function paintSheet(ctx: CanvasRenderingContext2D, view: DrawView, state: CurlingState): void {
  const { arena, theme } = view;
  // Banks.
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = theme.light;
  for (let i = 0; i < 18; i += 1) {
    const x = (i * 197) % arena.width;
    const y = (i * 263) % arena.height;
    ctx.beginPath();
    ctx.arc(x, y, 18 + (i % 3) * 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // The ice and its boards.
  const w = state.sheetRight - state.sheetLeft;
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, state.sheetLeft - 14, -20, w + 28, arena.height + 40, 10);
  ctx.fill();
  const ice = ctx.createLinearGradient(0, 0, 0, arena.height);
  ice.addColorStop(0, theme.light);
  ice.addColorStop(1, theme.waterLight);
  ctx.fillStyle = ice;
  ctx.fillRect(state.sheetLeft, -20, w, arena.height + 40);
  // Long faint streaks on the ice.
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = theme.water;
  ctx.lineWidth = 2;
  for (let x = state.sheetLeft + 40; x < state.sheetRight; x += 70) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 10, arena.height);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // The house.
  const colours = [theme.danger, theme.light, theme.secondary];
  for (let i = RINGS.length - 1; i >= 0; i -= 1) {
    const ring = RINGS[i];
    if (!ring) continue;
    ctx.fillStyle = colours[i] ?? theme.light;
    ctx.beginPath();
    ctx.arc(state.houseX, state.houseY, ring.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.fillStyle = theme.light;
  ctx.beginPath();
  ctx.arc(state.houseX, state.houseY, 10, 0, Math.PI * 2);
  ctx.fill();
  // Ring points, small, on the rings' right side.
  RINGS.forEach((ring, i) => {
    const inner = RINGS[i - 1]?.r ?? 0;
    paintLabel(ctx, view, `${ring.points}`, state.houseX + (ring.r + inner) / 2, state.houseY, 24, theme.light);
  });
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.5;
  for (const y of [state.backLine, state.houseY]) {
    ctx.beginPath();
    ctx.moveTo(state.sheetLeft, y);
    ctx.lineTo(state.sheetRight, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // The hack the stones start from.
  ctx.fillStyle = theme.ink;
  roundRect(ctx, state.houseX - 30, state.hackY + 34, 60, 14, 7);
  ctx.fill();
}

function paintBroom(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number): void {
  const { theme } = view;
  const wiggle = view.reducedMotion ? 0 : Math.sin(view.time * 30) * 0.25;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(wiggle);
  ctx.strokeStyle = theme.wood;
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(50, 110);
  ctx.stroke();
  ctx.fillStyle = theme.primary;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, -42, -14, 84, 28, 10);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawCurling(ctx: CanvasRenderingContext2D, state: CurlingState, view: DrawView): void {
  const { theme, sprites, arena } = view;
  paintSheet(ctx, view, state);

  for (const m of state.sweepMarks) {
    ctx.globalAlpha = 0.5 * (1 - m.age / 0.6);
    ctx.fillStyle = theme.light;
    roundRect(ctx, m.x - 40, m.y - 6, 80, 12, 6);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const s of state.stones) {
    if (s.out) continue;
    paintShadow(ctx, view, s.x, s.y + STONE_RADIUS * 0.8, STONE_RADIUS * 2.4);
    sprites.draw(ctx, 'curling-stone', s.x, s.y, STONE_RADIUS * 2.5, { rotate: view.reducedMotion ? 0 : s.angle });
    const points = ringPoints(state, s);
    if (points > 0 && s.vx === 0 && s.vy === 0) paintLabel(ctx, view, `+${points}`, s.x + STONE_RADIUS + 14, s.y - STONE_RADIUS, 28, theme.star);
  }

  if (state.broom) paintBroom(ctx, view, state.broom.x, state.broom.y);

  if (state.phase === 'aim') {
    // The waiting stone on the hack, and before the first throw an arrow pulsing upward.
    sprites.draw(ctx, 'curling-stone', state.houseX, state.hackY, STONE_RADIUS * 2.5);
    if (state.thrown === 0) {
      const pulse = view.reducedMotion ? 0.5 : (view.time * 1.3) % 1;
      const y = state.hackY - 70 - pulse * 70;
      ctx.globalAlpha = 0.9 * (1 - pulse);
      ctx.fillStyle = theme.star;
      ctx.strokeStyle = theme.ink;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(state.houseX, y - 40);
      ctx.lineTo(state.houseX + 32, y);
      ctx.lineTo(state.houseX + 12, y);
      ctx.lineTo(state.houseX + 12, y + 34);
      ctx.lineTo(state.houseX - 12, y + 34);
      ctx.lineTo(state.houseX - 12, y);
      ctx.lineTo(state.houseX - 32, y);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  } else if (state.stones.some((s) => !s.out && (s.vx !== 0 || s.vy !== 0)) && !state.broom && state.thrown <= 2) {
    paintLabel(ctx, view, 'Xoa băng phía trước!', arena.width / 2, state.hackY - 20, 34);
  }

  // Stones still to throw, down the right side of the sheet.
  const left = STONES - state.thrown - (state.phase === 'aim' ? 1 : 0);
  for (let i = 0; i < left; i += 1) sprites.draw(ctx, 'curling-stone', state.sheetRight + (arena.width - state.sheetRight > 60 ? 34 : -30), state.hackY - i * 46, 40, { alpha: 0.9 });
}
