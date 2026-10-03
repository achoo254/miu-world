// Bắt trạch's picture: looking down into a big glazed water jar on the yard: its brown rim, dark water with
// ripples, and the loach, a smooth brown curve with a lighter belly line, little whiskers and an eye. While the
// child keeps up, a ring around its head fills in gold; a slip leaves a splash where it dived. A caught loach
// is lifted out with sparkles.
import { paintLabel, paintSky } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { CATCH_SECONDS, type TrachState } from './logic';

export function drawBatTrach(ctx: CanvasRenderingContext2D, state: TrachState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, arena.height, 5);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, HUD_SAFE_TOP, arena.width, arena.height);
  const { jar, radius } = state;
  // Rim and water.
  ctx.fillStyle = theme.woodEdge;
  ctx.beginPath();
  ctx.arc(jar.x, jar.y, radius + 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.wood;
  ctx.beginPath();
  ctx.arc(jar.x, jar.y, radius + 12, 0, Math.PI * 2);
  ctx.fill();
  const water = ctx.createRadialGradient(jar.x, jar.y, radius * 0.1, jar.x, jar.y, radius);
  water.addColorStop(0, theme.water);
  water.addColorStop(1, theme.secondary);
  ctx.fillStyle = water;
  ctx.beginPath();
  ctx.arc(jar.x, jar.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = theme.waterLight;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 3;
  for (let k = 1; k <= 3; k += 1) {
    const r = ((view.time * 30 + k * radius * 0.3) % (radius * 0.9)) + 10;
    ctx.beginPath();
    ctx.arc(jar.x + 20, jar.y - 10, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const l = state.loach;
  if (l.under > 0) {
    // Bubbles where it will come up are not shown: only a splash where it went down.
    ctx.globalAlpha = l.under / 1;
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(l.body[l.body.length - 1]?.x ?? jar.x, l.body[l.body.length - 1]?.y ?? jar.y, 30 + (1 - l.under) * 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else {
    // The body: thick brown curve tapering to the tail.
    const pts = l.body;
    for (let i = pts.length - 1; i > 0; i -= 1) {
      const a = pts[i];
      const b = pts[i - 1];
      if (!a || !b) continue;
      ctx.strokeStyle = theme.woodEdge;
      ctx.lineCap = 'round';
      ctx.lineWidth = 8 + 18 * (1 - i / pts.length);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.strokeStyle = theme.wood;
    ctx.lineWidth = 6;
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.lineCap = 'butt';
    const h = l.head;
    ctx.fillStyle = theme.light;
    ctx.beginPath();
    ctx.arc(h.x + Math.cos(l.heading + 0.5) * 7, h.y + Math.sin(l.heading + 0.5) * 7, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 2;
    for (const side of [-0.6, 0.6]) {
      ctx.beginPath();
      ctx.moveTo(h.x + Math.cos(l.heading) * 12, h.y + Math.sin(l.heading) * 12);
      ctx.lineTo(h.x + Math.cos(l.heading + side) * 26, h.y + Math.sin(l.heading + side) * 26);
      ctx.stroke();
    }
    if (l.held > 0) {
      ctx.strokeStyle = theme.star;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(h.x, h.y, 44, -Math.PI / 2, -Math.PI / 2 + (l.held / CATCH_SECONDS) * Math.PI * 2);
      ctx.stroke();
    }
  }
  if (state.caughtAgo < 0.8) sprites.draw(ctx, 'sparkles', jar.x, jar.y - radius * 0.5 - state.caughtAgo * 60, 70, { alpha: 1 - state.caughtAgo / 0.8 });
  if (state.score === 0 && l.held === 0) paintLabel(ctx, view, 'Đặt ngón tay lên đầu trạch!', arena.width / 2, HUD_SAFE_TOP + 20, 28);
}
