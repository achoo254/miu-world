// Butterfly net's picture: a sunny meadow with flowers, butterflies fluttering over them (a scared one darts,
// with a puff), and the net: a hoop and handle that tilts toward its motion. Its rim turns red while it moves
// fast enough to scare, and it swings down with a whoosh when the finger lifts.
import { bob, paintGround, paintSky } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { STARTLE_SPEED, type NetState } from './logic';

const FLOWERS: readonly SpriteRef[] = ['tulip', 'sunflower', 'tulip', 'lotus'];

export function drawButterflyNet(ctx: CanvasRenderingContext2D, state: NetState, view: DrawView): void {
  const { theme, sprites } = view;
  paintSky(ctx, view, HUD_SAFE_TOP + 20, 6);
  paintGround(ctx, view, HUD_SAFE_TOP + 20);
  state.flowers.forEach((f, i) => sprites.draw(ctx, FLOWERS[i % FLOWERS.length] ?? 'tulip', f.x, f.y + 20, 70));
  for (const b of state.butterflies) {
    const flap = view.reducedMotion ? 1 : 0.75 + 0.25 * Math.abs(Math.sin(b.phase * (b.scared > 0 ? 30 : 14)));
    sprites.draw(ctx, 'butterfly', b.x, b.y + bob(view, 2, 3, b.phase), 64, { squash: [flap, 1], rotate: b.kind * 0.2 - 0.2 });
    if (b.scared > 0.8) sprites.draw(ctx, 'collision', b.x + 30, b.y - 30, 34, { alpha: (b.scared - 0.8) / 0.4 });
  }
  // The net.
  const { net } = state;
  const fast = state.netSpeed > STARTLE_SPEED;
  const swing = state.swingAgo < 0.3 ? Math.sin((state.swingAgo / 0.3) * Math.PI) : 0;
  const r = 56 * (1 - 0.15 * swing);
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(net.x + r * 0.7, net.y + r * 0.7);
  ctx.lineTo(net.x + r * 2.4, net.y + r * 2.6);
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = theme.light;
  ctx.beginPath();
  ctx.arc(net.x, net.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 2;
  for (let k = -2; k <= 2; k += 1) {
    ctx.beginPath();
    ctx.moveTo(net.x + k * r * 0.35, net.y - r);
    ctx.lineTo(net.x + k * r * 0.35, net.y + r);
    ctx.moveTo(net.x - r, net.y + k * r * 0.35);
    ctx.lineTo(net.x + r, net.y + k * r * 0.35);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = fast ? theme.danger : theme.primary;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(net.x, net.y, r, 0, Math.PI * 2);
  ctx.stroke();
  if (state.swingAgo < 0.6 && state.caught) sprites.draw(ctx, 'sparkles', net.x + 30, net.y - 50 - state.swingAgo * 40, 50);
}
