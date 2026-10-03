// Hand span's picture: a room's wall and floor, the thing to measure lying across it (a little table, a rope, a
// striped mat or a bamboo pole), the hands laid on it with their count above each one (red when laid with a
// gap or an overlap), and three round number buttons once it is covered. After a wrong answer, ghost hands show
// the true spans.
import { paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { HandSpanState, Thing } from './logic';

export const THING_NAMES: Readonly<Record<Thing, string>> = { table: 'Cái bàn', rope: 'Sợi dây', mat: 'Tấm thảm', pole: 'Cây gậy tre' };

function paintThing(ctx: CanvasRenderingContext2D, view: DrawView, state: HandSpanState): void {
  const { theme } = view;
  const { start, end, y } = state;
  const length = end - start;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  switch (state.thing) {
    case 'table':
      ctx.fillStyle = theme.woodEdge;
      ctx.fillRect(start + 14, y + 16, 16, 70);
      ctx.fillRect(end - 30, y + 16, 16, 70);
      ctx.fillStyle = theme.wood;
      roundRect(ctx, start, y - 12, length, 32, 8);
      ctx.fill();
      ctx.stroke();
      break;
    case 'rope': {
      ctx.lineWidth = 22;
      ctx.lineCap = 'round';
      ctx.strokeStyle = theme.woodEdge;
      ctx.beginPath();
      ctx.moveTo(start + 11, y);
      ctx.lineTo(end - 11, y);
      ctx.stroke();
      ctx.lineWidth = 4;
      ctx.strokeStyle = theme.wood;
      for (let x = start + 16; x < end - 16; x += 18) {
        ctx.beginPath();
        ctx.moveTo(x, y - 9);
        ctx.lineTo(x + 10, y + 9);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      break;
    }
    case 'mat': {
      roundRect(ctx, start, y - 26, length, 52, 6);
      ctx.fillStyle = theme.secondary;
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = theme.star;
      for (let x = start; x < end; x += 36) ctx.fillRect(x, y - 26, 14, 52);
      ctx.restore();
      ctx.stroke();
      break;
    }
    default: {
      ctx.fillStyle = theme.leaf;
      roundRect(ctx, start, y - 14, length, 28, 14);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = theme.ink;
      ctx.globalAlpha = 0.35;
      for (let x = start + 70; x < end - 20; x += 90) ctx.fillRect(x, y - 14, 6, 28);
      ctx.globalAlpha = 1;
    }
  }
  // Both ends marked, so it is clear where to start and stop.
  ctx.fillStyle = theme.primary;
  for (const x of [start, end]) {
    ctx.beginPath();
    ctx.moveTo(x, y - 46);
    ctx.lineTo(x - 10, y - 64);
    ctx.lineTo(x + 10, y - 64);
    ctx.closePath();
    ctx.fill();
  }
}

export function drawHandSpan(ctx: CanvasRenderingContext2D, state: HandSpanState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const floorY = state.y - 70;
  paintSky(ctx, view, floorY, 0);
  // A room: wall and floorboards.
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(0, HUD_SAFE_TOP, arena.width, floorY - HUD_SAFE_TOP);
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, floorY, arena.width, arena.height - floorY);
  ctx.fillStyle = theme.woodEdge;
  for (let yy = floorY + 40; yy < arena.height; yy += 60) ctx.fillRect(0, yy, arena.width, 4);

  paintLabel(ctx, view, `${THING_NAMES[state.thing]} dài mấy gang tay?`, arena.width / 2, HUD_SAFE_TOP + 40, Math.min(38, arena.width / 16), theme.light);
  paintShadow(ctx, view, (state.start + state.end) / 2, state.y + 40, state.end - state.start + 30);
  paintThing(ctx, view, state);

  const span = state.span;
  for (const [i, hand] of state.hands.entries()) {
    const since = state.time - hand.laidAt;
    const drop = view.reducedMotion ? 0 : Math.max(0, 1 - since / 0.15) * 30;
    const x = hand.left + span / 2;
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = hand.snug ? theme.star : theme.danger;
    roundRect(ctx, hand.left + 3, state.y - 54, span - 6, 92, 14);
    ctx.fill();
    ctx.globalAlpha = 1;
    sprites.draw(ctx, 'hand-with-fingers-splayed', x, state.y - 10 - drop, span * 1.05, { alpha: 0.95 });
    paintLabel(ctx, view, String(i + 1), x, state.y - 82, 32, hand.snug ? theme.light : theme.danger);
  }
  if (state.phase === 'wrong') {
    // The true spans, as ghost outlines.
    ctx.strokeStyle = theme.star;
    ctx.lineWidth = 5;
    ctx.setLineDash([10, 8]);
    for (let i = 0; i < state.spans; i += 1) {
      roundRect(ctx, state.start + i * span + 4, state.y - 50, span - 8, 84, 12);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    paintLabel(ctx, view, `${state.spans} gang`, arena.width / 2, state.y + 100, 40, theme.star);
  }

  if (state.phase !== 'lay') {
    for (const [i, button] of state.buttons.entries()) {
      const chosen = i === state.chosen;
      const right = state.choices[i] === state.spans;
      const pop = chosen && !view.reducedMotion ? 1 + 0.15 * Math.max(0, 1 - state.phaseAgo / 0.3) : 1;
      const r = state.buttonRadius * pop;
      ctx.fillStyle = chosen ? (right ? theme.star : theme.danger) : theme.light;
      ctx.strokeStyle = theme.ink;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(button.x, button.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      paintLabel(ctx, view, String(state.choices[i] ?? ''), button.x, button.y + 3, r * 1.1, chosen ? theme.light : theme.primary);
      if (chosen && right) sprites.draw(ctx, 'sparkles', button.x + r * 0.7, button.y - r * 0.8, 50);
    }
  } else if (state.hands.length === 0) {
    // A hint: where the first hand goes.
    const pulse = 0.4 + 0.3 * Math.sin(view.time * 5);
    ctx.globalAlpha = pulse;
    sprites.draw(ctx, 'hand-with-fingers-splayed', state.start + span / 2, state.y - 10, span * 1.05);
    ctx.globalAlpha = 1;
  }
}
