// Hopscotch's picture: a schoolyard (paving), the eight chalk boxes with their numbers (the target box
// ringed in gold), the throwing marker sliding over the boxes, the stone on the box it landed on, the child
// hopping from box to box (boxes done turn green), and short words for a missed throw or a wrong hop.
import { paintLabel } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { BOXES, type HopscotchState } from './logic';

export function drawHopscotch(ctx: CanvasRenderingContext2D, state: HopscotchState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.stone;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.strokeStyle = theme.stoneEdge;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 2;
  for (let x = 0; x < arena.width; x += 90) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, arena.height);
    ctx.stroke();
  }
  for (let y = 0; y < arena.height; y += 90) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(arena.width, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const s = state.box;
  const chalk = theme.light;
  state.boxes.forEach((b, i) => {
    const hopped = state.hopped.includes(i);
    ctx.fillStyle = hopped ? theme.leaf : theme.ink;
    ctx.globalAlpha = hopped ? 0.45 : 0.12;
    ctx.fillRect(b.x - s / 2, b.y - s / 2, s, s);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = i === state.target ? theme.star : chalk;
    ctx.lineWidth = i === state.target ? 9 : 6;
    ctx.strokeRect(b.x - s / 2 + 3, b.y - s / 2 + 3, s - 6, s - 6);
    paintLabel(ctx, view, String(i + 1), b.x, b.y, s * 0.42, i === state.target ? theme.star : chalk);
  });
  if (state.phase === 'throw') {
    const i = Math.min(BOXES - 1, Math.floor(state.marker));
    const b = state.boxes[i];
    if (b) {
      ctx.fillStyle = theme.primary;
      ctx.globalAlpha = 0.45;
      ctx.fillRect(b.x - s / 2, b.y - s / 2, s, s);
      ctx.globalAlpha = 1;
    }
    paintLabel(ctx, view, `Chạm để ném vào ô ${state.target + 1}`, arena.width / 2, HUD_SAFE_TOP + 24, 30, theme.star);
  }
  if (state.stone !== null) {
    const b = state.boxes[state.stone];
    if (b) sprites.draw(ctx, 'rock', b.x + s * 0.22, b.y + s * 0.22, s * 0.4);
  }
  // The child, hopping.
  const t = Math.min(1, state.hopAgo / 0.28);
  const x = state.hopFrom.x + (state.at.x - state.hopFrom.x) * t;
  const y = state.hopFrom.y + (state.at.y - state.hopFrom.y) * t - (view.reducedMotion ? 0 : Math.sin(t * Math.PI) * 50);
  const wobble = state.phase === 'oops' && state.oops === 'hop' && !view.reducedMotion ? Math.sin(state.phaseAgo * 30) * 0.3 : 0;
  sprites.draw(ctx, view.player, x, y - 20, Math.min(100, s * 0.85), { rotate: wobble });
  if (state.phase === 'oops') paintLabel(ctx, view, state.oops === 'throw' ? 'Ném trượt rồi, ném lại nhé' : 'Nhảy sai ô, làm lại nào', arena.width / 2, arena.height / 2, 36, theme.light);
  if (state.phase === 'done') paintLabel(ctx, view, 'Giỏi quá!', arena.width / 2, arena.height / 2, 54, theme.star);
}
