// Chopsticks' picture: a wooden table, a round plate of beans, a bowl, the beans already in it, and the
// chopsticks following the finger with a bean between the tips. A speed ring around the tips turns from
// green to red as the hand goes faster; "Chậm thôi" pops up when a bean slips and rolls back.
import { paintLabel } from '../../draw-kit';
import type { DrawView } from '../../types';
import { SLIP_SPEED, type ChopsticksState } from './logic';

export function drawChopsticks(ctx: CanvasRenderingContext2D, state: ChopsticksState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.5;
  for (let y = 40; y < arena.height; y += 70) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(arena.width * 0.3, y + 14, arena.width * 0.6, y - 14, arena.width, y + 6);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Plate and beans.
  const { plate, bowl } = state;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.stoneEdge;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(plate.x, plate.y, plate.r, plate.r * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(plate.x, plate.y, plate.r * 0.72, plate.r * 0.58, 0, 0, Math.PI * 2);
  ctx.stroke();
  for (const b of state.beans) {
    const bounce = b.backAgo < 0.3 && !view.reducedMotion ? Math.sin((b.backAgo / 0.3) * Math.PI) * 10 : 0;
    sprites.draw(ctx, 'beans', b.x, b.y - bounce, 46, { rotate: b.spin });
  }
  for (const s of state.slipping) {
    const t = s.ago / 0.5;
    sprites.draw(ctx, 'beans', s.from.x + (s.to.x - s.from.x) * t, s.from.y + (s.to.y - s.from.y) * t - Math.sin(t * Math.PI) * 50, 46, { rotate: t * 6 });
  }

  // The bowl, and the beans in it.
  sprites.draw(ctx, 'bowl-with-spoon', bowl.x, bowl.y, bowl.r * 2.2);
  for (const d of state.dropped) {
    const fall = Math.min(1, d.ago / 0.25);
    sprites.draw(ctx, 'beans', d.x, d.y - 30 * (1 - fall), 34);
  }
  paintLabel(ctx, view, `Trong bát: ${state.score}`, bowl.x, bowl.y + bowl.r + 30, 28, theme.light);

  // The chopsticks: tips at the finger, sticks reaching up and to the right.
  const tip = state.tip;
  if (tip) {
    const ratio = Math.min(1, state.speed / SLIP_SPEED);
    ctx.lineWidth = 6;
    ctx.strokeStyle = ratio > 0.75 ? theme.danger : ratio > 0.45 ? theme.star : theme.leaf;
    ctx.globalAlpha = state.held ? 0.85 : 0.3;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 40, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.05, ratio));
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (state.held) sprites.draw(ctx, 'beans', tip.x, tip.y, 46, { rotate: state.held.spin });
    const pinch = state.held ? 0.94 : 1;
    sprites.draw(ctx, 'chopsticks', tip.x + 30, tip.y - 76, 170, { squash: [pinch, 1] });
  } else {
    sprites.draw(ctx, 'chopsticks', plate.x + plate.r + 30, plate.y - plate.r * 0.4, 150, { rotate: 0.3 });
  }
  if (state.slipAgo < 0.8) {
    ctx.globalAlpha = 1 - state.slipAgo / 0.8;
    paintLabel(ctx, view, 'Chậm thôi!', arena.width / 2, arena.height * 0.25 + 40, 40, theme.danger);
    ctx.globalAlpha = 1;
  }
}
