// Who swapped's picture: a market stall with a striped awning, a wooden counter and a little crate under each
// good. While looking, a bar under the awning runs down; then a curtain drops over the stall and rises again.
// Found goods glow; on a wrong pick the two that moved glide back and forth slowly, with a dotted trail.
import { paintGround, paintLabel, paintSky, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { BLINK_SECONDS, slotPosition, type SwapState } from './logic';

function paintStall(ctx: CanvasRenderingContext2D, view: DrawView, top: number, bottom: number): void {
  const { arena, theme } = view;
  // Posts and back wall.
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(16, top, 18, bottom - top);
  ctx.fillRect(arena.width - 34, top, 18, bottom - top);
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = theme.light;
  ctx.fillRect(34, top + 50, arena.width - 68, bottom - top - 50);
  ctx.globalAlpha = 1;
  // Striped awning with a scalloped edge.
  const stripes = Math.max(8, Math.round(arena.width / 70));
  const w = (arena.width - 20) / stripes;
  for (let i = 0; i < stripes; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? theme.primary : theme.light;
    ctx.fillRect(10 + i * w, top, w + 1, 44);
    ctx.beginPath();
    ctx.arc(10 + i * w + w / 2, top + 44, w / 2, 0, Math.PI);
    ctx.fill();
  }
}

export function drawWhoSwapped(ctx: CanvasRenderingContext2D, state: SwapState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, arena.height, 6);
  paintGround(ctx, view, arena.height - 40);
  const top = HUD_SAFE_TOP + 4;
  paintStall(ctx, view, top, arena.height - 40);

  const s = state.size;
  state.slots.forEach((slot, i) => {
    // A small crate under each good.
    ctx.fillStyle = theme.wood;
    roundRect(ctx, slot.x - s * 0.55, slot.y + s * 0.25, s * 1.1, s * 0.32, 8);
    ctx.fill();
    ctx.strokeStyle = theme.woodEdge;
    ctx.lineWidth = 4;
    ctx.stroke();
    if (slot.found) {
      ctx.globalAlpha = 0.55 + (view.reducedMotion ? 0 : 0.2 * Math.sin(view.time * 6));
      ctx.fillStyle = theme.star;
      ctx.beginPath();
      ctx.arc(slot.x, slot.y, s * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    const p = slotPosition(state, i);
    const shake = slot.shook < 0.5 && !view.reducedMotion ? Math.sin(slot.shook * 45) * 10 * (1 - slot.shook / 0.5) : 0;
    const pop = state.phase === 'solved' && slot.found && !view.reducedMotion ? 1 + 0.2 * Math.sin(Math.min(1, state.inPhase / 0.4) * Math.PI) : 1;
    sprites.draw(ctx, slot.sprite, p.x + shake, p.y, s * pop);
  });

  if (state.phase === 'replay') {
    // A dotted trail between the two that moved.
    const [a, b] = state.swapped.map((i) => state.slots[i]);
    if (a && b) {
      ctx.setLineDash([10, 12]);
      ctx.strokeStyle = theme.star;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 - 60, b.x, b.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // The look timer: a bar under the awning running down.
  if (state.phase === 'look') {
    const left = 1 - state.inPhase / state.look;
    ctx.fillStyle = theme.ink;
    ctx.globalAlpha = 0.25;
    roundRect(ctx, arena.width * 0.2, top + 132, arena.width * 0.6, 14, 7);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.star;
    roundRect(ctx, arena.width * 0.2, top + 132, arena.width * 0.6 * left, 14, 7);
    ctx.fill();
  }

  // The curtain: drops over the stall and rises again.
  if (state.phase === 'blink') {
    const t = state.inPhase / BLINK_SECONDS;
    const cover = Math.sin(Math.min(1, t) * Math.PI);
    const h = (arena.height - top - 40) * cover;
    ctx.fillStyle = theme.danger;
    ctx.fillRect(34, top + 40, arena.width - 68, h);
    ctx.fillStyle = theme.ink;
    ctx.globalAlpha = 0.18;
    for (let x = 60; x < arena.width - 40; x += 46) ctx.fillRect(x, top + 40, 10, h);
    ctx.globalAlpha = 1;
  }

  const label = state.phase === 'look' ? 'Nhìn thật kỹ nhé!' : state.phase === 'find' ? 'Hai món nào đổi chỗ?' : state.phase === 'replay' ? 'Xem lại nè' : '';
  if (label) paintLabel(ctx, view, label, arena.width / 2, top + 104, 30);
}
