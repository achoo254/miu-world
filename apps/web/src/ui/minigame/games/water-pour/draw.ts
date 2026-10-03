// Water pour's picture: a kitchen wall with tiles over a wooden counter, the teapot (its colour and the
// animal beside it tell how fast it pours) tipping over a glass cup, the stream of tea, the tea's level, the
// green band to fill to, and words for each cup: just right, too much, spilt, a little more.
import { paintLabel, paintShadow, roundRect } from '../../draw-kit';
import type { SpriteName } from '../../sprites';
import type { DrawView } from '../../types';
import { flowAt, type PotSpeed, type WaterPourState } from './logic';

const ANIMAL: Record<PotSpeed, SpriteName> = { slow: 'snail', medium: 'turtle', fast: 'rabbit' };
const SPOUT = { x: 92, y: -22 };

function potColour(view: DrawView, speed: PotSpeed): string {
  return speed === 'slow' ? view.theme.leaf : speed === 'medium' ? view.theme.secondary : view.theme.primary;
}

function paintPot(ctx: CanvasRenderingContext2D, view: DrawView, colour: string): void {
  const { theme } = view;
  ctx.lineWidth = 5;
  ctx.strokeStyle = theme.ink;
  ctx.fillStyle = colour;
  // Spout, handle, body, lid and knob, around (0, 0).
  ctx.beginPath();
  ctx.moveTo(40, 10);
  ctx.quadraticCurveTo(80, 0, SPOUT.x, SPOUT.y);
  ctx.lineTo(SPOUT.x + 12, SPOUT.y - 4);
  ctx.quadraticCurveTo(84, 22, 46, 34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-66, 12, 28, Math.PI * 0.5, Math.PI * 1.5);
  ctx.lineWidth = 12;
  ctx.stroke();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.strokeStyle = theme.ink;
  ctx.beginPath();
  ctx.ellipse(0, 14, 64, 52, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.6;
  ctx.fillRect(-60, 6, 120, 12);
  ctx.globalAlpha = 1;
  ctx.fillStyle = colour;
  roundRect(ctx, -36, -46, 72, 16, 8);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -52, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

export function drawWaterPour(ctx: CanvasRenderingContext2D, state: WaterPourState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { cupBottom, cupHeight } = state;
  // Wall tiles and the counter.
  ctx.fillStyle = theme.light;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.strokeStyle = theme.sky[0];
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x < arena.width; x += 60) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, cupBottom);
  }
  for (let y = 0; y < cupBottom; y += 60) {
    ctx.moveTo(0, y);
    ctx.lineTo(arena.width, y);
  }
  ctx.stroke();
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, cupBottom, arena.width, arena.height - cupBottom);
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(0, cupBottom, arena.width, 10);

  // The cup slides away after its result and the next one slides in.
  const slide = state.result ? Math.min(1, state.resultAgo / 0.9) : 0;
  const cupX = state.cupX + (view.reducedMotion ? 0 : slide * slide * arena.width * 0.7);
  const half = Math.min(80, cupHeight * 0.38);
  const top = cupBottom - cupHeight;

  // The pot, tipped about its middle.
  const angle = state.tilt * 0.75;
  ctx.save();
  ctx.translate(state.potX, state.potY);
  ctx.rotate(angle);
  paintPot(ctx, view, potColour(view, state.potSpeed));
  ctx.restore();
  sprites.draw(ctx, ANIMAL[state.potSpeed], state.potX - 120, state.potY - 40, 58);
  // The stream from the spout's tip down to the tea.
  const flow = flowAt(state.tilt);
  if (flow > 0 && !state.result) {
    const tipX = state.potX + Math.cos(angle) * SPOUT.x - Math.sin(angle) * SPOUT.y + 6;
    const tipY = state.potY + Math.sin(angle) * SPOUT.x + Math.cos(angle) * SPOUT.y;
    ctx.strokeStyle = theme.wood;
    ctx.lineWidth = 6 + flow * 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.quadraticCurveTo(cupX, tipY, cupX, cupBottom - cupHeight * state.level);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  paintShadow(ctx, view, cupX, cupBottom + 6, half * 2.3);
  // Tea, then the glass over it.
  const level = state.result === 'spill' ? 1 : state.level;
  ctx.fillStyle = theme.wood;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(cupX - half + 6, cupBottom - cupHeight * level, half * 2 - 12, cupHeight * level - 6);
  ctx.globalAlpha = 1;
  if (state.result === 'spill') {
    ctx.fillStyle = theme.wood;
    ctx.beginPath();
    ctx.ellipse(cupX, cupBottom + 8, half * 1.6, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // The band: green lines with a soft fill, and arrows on both sides.
  const bandTop = cupBottom - cupHeight * state.high;
  const bandBottom = cupBottom - cupHeight * state.low;
  ctx.fillStyle = theme.leaf;
  ctx.globalAlpha = 0.25;
  ctx.fillRect(cupX - half, bandTop, half * 2, bandBottom - bandTop);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = theme.leaf;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cupX - half - 18, bandTop);
  ctx.lineTo(cupX + half + 18, bandTop);
  ctx.moveTo(cupX - half - 18, bandBottom);
  ctx.lineTo(cupX + half + 18, bandBottom);
  ctx.stroke();
  ctx.fillStyle = theme.leaf;
  for (const side of [-1, 1]) {
    const x = cupX + side * (half + 22);
    const y = (bandTop + bandBottom) / 2;
    ctx.beginPath();
    ctx.moveTo(x - side * 4, y);
    ctx.lineTo(x + side * 20, y - 14);
    ctx.lineTo(x + side * 20, y + 14);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  ctx.fillStyle = theme.sky[1];
  ctx.globalAlpha = 0.25;
  roundRect(ctx, cupX - half, top, half * 2, cupHeight, 14);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.stroke();

  const y = Math.min(top - 40, state.potY + 110);
  const textX = arena.width / 2;
  if (state.result === 'right') paintLabel(ctx, view, 'Vừa đẹp!', textX, y, 48, theme.star);
  else if (state.result === 'over') paintLabel(ctx, view, 'Hơi nhiều rồi', textX, y, 40);
  else if (state.result === 'spill') paintLabel(ctx, view, 'Tràn mất rồi!', textX, y, 40);
  else if (state.short) paintLabel(ctx, view, 'Rót thêm chút nữa', textX, y, 36);
  else if (state.cups === 0 && state.level === 0) paintLabel(ctx, view, 'Giữ ngón tay để rót', textX, arena.height - 40, 34);
}
