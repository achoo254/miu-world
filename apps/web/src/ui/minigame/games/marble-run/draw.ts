// Marble run's picture: a pegboard wall, the hopper with the next marble, three wooden chutes (tipping with a
// wobble, an arrow showing the low end), four cups at the bottom each with its colour and its own picture
// (heart, star, clover, drop: the shape is enough even without colour), and the marbles rolling, each with
// the same picture.
import { paintLabel, roundRect } from '../../draw-kit';
import type { SpriteName } from '../../sprites';
import type { DrawView } from '../../types';
import { HUD_SAFE_TOP } from '../../types';
import type { Chute, MarbleRunState } from './logic';

export const MARKS: readonly SpriteName[] = ['heart', 'star', 'clover', 'droplet'];

function colourOf(view: DrawView, c: number): string {
  const { theme } = view;
  return [theme.danger, theme.star, theme.leaf, theme.water][c] ?? theme.primary;
}

function paintChute(ctx: CanvasRenderingContext2D, view: DrawView, chute: Chute): void {
  const { theme } = view;
  const wobble = !view.reducedMotion && chute.tippedAgo < 0.3 ? Math.sin(chute.tippedAgo * 40) * 0.04 * (1 - chute.tippedAgo / 0.3) : 0;
  const angle = Math.atan2(chute.half * 0.18, chute.half) * chute.tilt + wobble;
  ctx.save();
  ctx.translate(chute.x, chute.y);
  ctx.rotate(angle);
  ctx.fillStyle = theme.wood;
  roundRect(ctx, -chute.half, -8, chute.half * 2, 22, 8);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.woodEdge;
  ctx.stroke();
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(-chute.half, -16, chute.half * 2, 8);
  ctx.restore();
  // The pivot and an arrow to the low end.
  ctx.fillStyle = theme.stone;
  ctx.beginPath();
  ctx.arc(chute.x, chute.y + 4, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.light;
  const ax = chute.x + chute.tilt * 34;
  ctx.beginPath();
  ctx.moveTo(ax + chute.tilt * 16, chute.y + 36);
  ctx.lineTo(ax - chute.tilt * 8, chute.y + 24);
  ctx.lineTo(ax - chute.tilt * 8, chute.y + 48);
  ctx.closePath();
  ctx.fill();
}

export function drawMarbleRun(ctx: CanvasRenderingContext2D, state: MarbleRunState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.sky[2];
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.fillStyle = theme.woodEdge;
  ctx.globalAlpha = 0.25;
  for (let x = 30; x < arena.width; x += 50) for (let y = HUD_SAFE_TOP; y < arena.height; y += 50) {
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Hopper with the next marble.
  const { hopper } = state;
  ctx.fillStyle = theme.stone;
  ctx.beginPath();
  ctx.moveTo(hopper.x - 50, hopper.y - 40);
  ctx.lineTo(hopper.x + 50, hopper.y - 40);
  ctx.lineTo(hopper.x + 16, hopper.y + 6);
  ctx.lineTo(hopper.x - 16, hopper.y + 6);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.stoneEdge;
  ctx.stroke();
  paintMarble(ctx, view, hopper.x, hopper.y - 26, state.next, 0.8);

  for (const chute of state.chutes) paintChute(ctx, view, chute);

  // Cups.
  state.cups.forEach((cup, i) => {
    const colour = state.cupColour[i] ?? 0;
    ctx.fillStyle = colourOf(view, colour);
    ctx.beginPath();
    ctx.moveTo(cup.x - 56, cup.y - 50);
    ctx.lineTo(cup.x + 56, cup.y - 50);
    ctx.lineTo(cup.x + 42, cup.y + 40);
    ctx.lineTo(cup.x - 42, cup.y + 40);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = theme.ink;
    ctx.stroke();
    sprites.draw(ctx, MARKS[colour] ?? 'star', cup.x, cup.y, 44);
  });

  for (const m of state.marbles) {
    const sink = m.inAgo >= 0 ? m.inAgo * 40 : 0;
    paintMarble(ctx, view, m.x, m.y + sink, m.colour, m.inAgo >= 0 ? 1 - m.inAgo / 0.6 : 1);
  }
  if (state.time < 3) paintLabel(ctx, view, 'Chạm máng để đổi hướng', arena.width / 2, (state.chutes[0]?.y ?? 200) - 60, 30);
}

function paintMarble(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, colour: number, alpha: number): void {
  const { theme, sprites } = view;
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.fillStyle = colourOf(view, colour);
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = theme.ink;
  ctx.stroke();
  ctx.globalAlpha = 1;
  sprites.draw(ctx, MARKS[colour] ?? 'star', x, y, 24, { alpha: Math.max(0, alpha) });
}
