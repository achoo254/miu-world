// Pick-up sticks' picture: a wooden table (a woven mat on it), each stick a long round rod with coloured
// bands and a shadow on what lies below, a lifted stick rising off the table and fading, the pile wobbling
// after a wrong pick with the sticks that were in the way blinking red, and a new pile dropping in.
import { paintLabel, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { ends, THICKNESS, type PickSticksState, type Stick } from './logic';

function paintStick(ctx: CanvasRenderingContext2D, view: DrawView, s: Stick, dx: number, dy: number, blink: boolean): void {
  const { theme } = view;
  const [a, b] = ends(s);
  const bands = [theme.primary, theme.secondary, theme.star, theme.leaf];
  ctx.lineCap = 'round';
  // Shadow.
  ctx.globalAlpha *= 0.25;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = THICKNESS;
  ctx.beginPath();
  ctx.moveTo(a.x + dx + 5, a.y + dy + 7);
  ctx.lineTo(b.x + dx + 5, b.y + dy + 7);
  ctx.stroke();
  ctx.globalAlpha /= 0.25;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = THICKNESS + 5;
  ctx.beginPath();
  ctx.moveTo(a.x + dx, a.y + dy);
  ctx.lineTo(b.x + dx, b.y + dy);
  ctx.stroke();
  ctx.strokeStyle = blink ? theme.danger : theme.light;
  ctx.lineWidth = THICKNESS - 1;
  ctx.stroke();
  // Coloured bands near both ends and in the middle.
  ctx.strokeStyle = bands[s.colour] ?? theme.primary;
  ctx.lineCap = 'butt';
  for (const [from, to] of [
    [0.04, 0.16],
    [0.45, 0.55],
    [0.84, 0.96],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(a.x + dx + (b.x - a.x) * from, a.y + dy + (b.y - a.y) * from);
    ctx.lineTo(a.x + dx + (b.x - a.x) * to, a.y + dy + (b.y - a.y) * to);
    ctx.stroke();
  }
}

export function drawPickSticks(ctx: CanvasRenderingContext2D, state: PickSticksState, view: DrawView): void {
  const { arena, theme } = view;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = theme.woodEdge;
  for (let y = 0; y < arena.height; y += 90) ctx.fillRect(0, y, arena.width, 5);
  ctx.globalAlpha = 1;
  const top = HUD_SAFE_TOP + 16;
  ctx.fillStyle = theme.groundDeep;
  ctx.globalAlpha = 0.35;
  roundRect(ctx, 16, top, arena.width - 32, arena.height - top - 16, 30);
  ctx.fill();
  ctx.globalAlpha = 1;

  const shaking = state.shakeAgo < 0.45 && !view.reducedMotion;
  state.sticks.forEach((s, i) => {
    if (s.lifted >= 0) {
      if (s.lifted > 0.6) return;
      ctx.globalAlpha = 1 - s.lifted / 0.6;
      paintStick(ctx, view, s, 0, -s.lifted * 160, false);
      ctx.globalAlpha = 1;
      return;
    }
    const jiggle = shaking ? Math.sin(state.shakeAgo * 60 + i) * 6 * (1 - state.shakeAgo / 0.45) : 0;
    const blink = state.shakeAgo < 0.9 && state.blocking.includes(i) && Math.floor(state.shakeAgo * 8) % 2 === 0;
    paintStick(ctx, view, s, jiggle, 0, blink);
  });
  if (state.time < 4) paintLabel(ctx, view, 'Rút que nằm trên cùng!', arena.width / 2, HUD_SAFE_TOP + 50, 38, theme.star);
}
