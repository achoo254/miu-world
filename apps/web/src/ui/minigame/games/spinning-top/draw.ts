// Spinning top's picture: a packed-earth yard with a chalk ring, the wooden top (a cone drawn in wood colours,
// striped, with a spinning highlight) that leans and circles when it wobbles, the child's hand spot at the
// bottom, a spin bar (green while it may be whipped) and the string flicking on a whip.
import { paintGround, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { WOBBLE, type TopState } from './logic';

function paintTop(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, tilt: number, turn: number): void {
  const { theme } = view;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.fillStyle = theme.wood;
  ctx.beginPath();
  ctx.moveTo(-42, -40);
  ctx.quadraticCurveTo(0, -70, 42, -40);
  ctx.lineTo(4, 22);
  ctx.lineTo(-4, 22);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.woodEdge;
  ctx.stroke();
  // Stripes slide round as it turns.
  ctx.strokeStyle = theme.danger;
  ctx.lineWidth = 6;
  for (let i = 0; i < 3; i += 1) {
    const s = Math.sin(turn + i * 2.1) * 30;
    ctx.beginPath();
    ctx.moveTo(s, -50);
    ctx.lineTo(s * 0.3, 0);
    ctx.stroke();
  }
  ctx.fillStyle = theme.ink;
  ctx.fillRect(-3, 18, 6, 12);
  ctx.restore();
}

export function drawSpinningTop(ctx: CanvasRenderingContext2D, state: TopState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, HUD_TOP(state), 5);
  paintGround(ctx, view, HUD_TOP(state));
  const { ring, hand } = state;
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 8;
  ctx.setLineDash([18, 10]);
  ctx.beginPath();
  ctx.ellipse(ring.x, ring.y, ring.r, ring.r * 0.75, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.arc(hand.x, hand.y, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const { top } = state;
  const wobbling = state.phase === 'spinning' && state.spin < WOBBLE;
  let tilt = 0;
  let dx = 0;
  if (wobbling && !view.reducedMotion) {
    const amount = (1 - state.spin / WOBBLE) * 0.5;
    tilt = Math.sin(state.time * 9) * amount;
    dx = Math.cos(state.time * 9) * amount * 30;
  }
  if (state.phase === 'fallen') tilt = Math.min(1.5, state.phaseTime * 6);
  const turn = state.phase === 'spinning' ? state.time * (state.spin / 4) : 0;
  const lift = state.phase === 'flying' && !view.reducedMotion ? Math.sin(Math.min(1, state.phaseTime / 0.45) * Math.PI) * 80 : 0;
  paintShadow(ctx, view, top.x + dx, top.y + 28, 70, lift / 120);
  paintTop(ctx, view, top.x + dx, top.y - lift, tilt, turn);
  if (state.phase === 'ready') sprites.draw(ctx, view.player, hand.x + 90, hand.y - 20, 100);
  if (state.time - state.whippedAt < 0.3) sprites.draw(ctx, 'high-voltage', top.x + 50, top.y - 50, 56);

  if (state.phase === 'spinning') {
    const w = 200;
    const x = ring.x - w / 2;
    const y = ring.y + ring.r * 0.75 + 30;
    ctx.fillStyle = theme.light;
    roundRect(ctx, x, y, w, 20, 10);
    ctx.fill();
    ctx.fillStyle = wobbling ? theme.leaf : theme.secondary;
    roundRect(ctx, x, y, Math.max(20, (w * state.spin) / 100), 20, 10);
    ctx.fill();
    if (wobbling) paintLabel(ctx, view, 'Quất!', ring.x, ring.y - ring.r - 10, 44, theme.star);
  }
  if (state.phase === 'missed') paintLabel(ctx, view, 'Ném vào vòng nhé!', arena.width / 2, ring.y - ring.r - 10, 36);
}

const HUD_TOP = (state: TopState): number => state.ring.y - state.ring.r - 60;
