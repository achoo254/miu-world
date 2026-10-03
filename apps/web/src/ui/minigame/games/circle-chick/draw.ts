// Circle the chick's picture: a farmyard, a field of grassy hexagon tiles, wooden fence posts on fenced tiles,
// the chick hopping from tile to tile (pecking now and then), and the coop it runs home to when it escapes.
// When it is fenced in it jumps for joy with sparkles.
import { paintLabel, paintShadow, paintSky } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { COLS, ROWS, tileCentre, type ChickState } from './logic';

function hexPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  for (let k = 0; k < 6; k += 1) {
    const a = Math.PI / 6 + (k * Math.PI) / 3;
    if (k === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

export function drawCircleChick(ctx: CanvasRenderingContext2D, state: ChickState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, HUD_SAFE_TOP + 10, 5);
  ctx.fillStyle = theme.groundDeep;
  ctx.fillRect(0, HUD_SAFE_TOP + 10, arena.width, arena.height);
  sprites.draw(ctx, 'house', arena.width - 50, HUD_SAFE_TOP + 40, 70);
  for (let i = 0; i < COLS * ROWS; i += 1) {
    const p = tileCentre(state, i);
    hexPath(ctx, p.x, p.y, state.r * 0.95);
    ctx.fillStyle = state.fences[i] ? theme.ground : theme.leaf;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = theme.groundDeep;
    ctx.stroke();
    if (state.fences[i]) {
      ctx.fillStyle = theme.wood;
      for (const dx of [-0.4, 0, 0.4]) ctx.fillRect(p.x + dx * state.r - 5, p.y - state.r * 0.55, 10, state.r * 0.95);
      ctx.fillStyle = theme.woodEdge;
      ctx.fillRect(p.x - state.r * 0.55, p.y - state.r * 0.3, state.r * 1.1, 8);
      ctx.fillRect(p.x - state.r * 0.55, p.y + state.r * 0.1, state.r * 1.1, 8);
    }
  }
  // The chick.
  let at = tileCentre(state, state.chick);
  let hop = 0;
  if (state.phase === 'chick') {
    const t = Math.min(1, state.phaseTime / 0.3);
    const from = tileCentre(state, state.from);
    at = { x: from.x + (at.x - from.x) * t, y: from.y + (at.y - from.y) * t };
    hop = view.reducedMotion ? 0 : Math.sin(t * Math.PI) * 18;
  }
  if (state.phase === 'escaped' && state.escapeTo) {
    const t = Math.min(1, state.phaseTime / 0.6);
    at = { x: at.x + (state.escapeTo.x - at.x) * t, y: at.y + (state.escapeTo.y - at.y) * t };
    hop = view.reducedMotion ? 0 : Math.abs(Math.sin(state.phaseTime * 14)) * 14;
  }
  if (state.phase === 'caught' && !view.reducedMotion) hop = Math.abs(Math.sin(state.phaseTime * 10)) * 20;
  paintShadow(ctx, view, at.x, at.y + state.r * 0.4, state.r);
  sprites.draw(ctx, 'baby-chick', at.x, at.y - hop - state.r * 0.1, state.r * 1.3);
  if (state.phase === 'caught') {
    sprites.draw(ctx, 'sparkles', at.x + state.r, at.y - state.r, state.r);
    paintLabel(ctx, view, 'Bắt được rồi!', arena.width / 2, HUD_SAFE_TOP + 40, 44, theme.star);
  }
  if (state.phase === 'escaped') paintLabel(ctx, view, 'Gà chạy về chuồng!', arena.width / 2, HUD_SAFE_TOP + 40, 38);
}
