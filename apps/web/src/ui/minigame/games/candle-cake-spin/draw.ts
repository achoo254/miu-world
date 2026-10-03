// Candle cake spin's picture: a party table, the round cake seen from above on its turning stand (pink
// icing rim, sprinkles), candles standing out from its edge with little flames (the ones that came with the
// cake are grey-striped), the next candle waiting below with a dotted line up to the strike point, candles
// still needed as a row of icons, "Ối!" and a bounced candle when two collide, and a lit-up cake when done.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { FLIGHT, STRIKE, type CandleCakeState } from './logic';

const CANDLE_LENGTH = 70;

function paintCandle(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, angle: number, old: boolean, lit: boolean): void {
  const { theme, sprites } = view;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // Drawn pointing along +x from (0, 0).
  ctx.fillStyle = old ? theme.stone : theme.secondary;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  roundRect(ctx, 0, -12, CANDLE_LENGTH, 24, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.light;
  for (let s = 12; s < CANDLE_LENGTH - 6; s += 18) ctx.fillRect(s, -11, 6, 22);
  ctx.restore();
  if (lit) sprites.draw(ctx, 'fire', x + Math.cos(angle) * (CANDLE_LENGTH + 14), y + Math.sin(angle) * (CANDLE_LENGTH + 14), 34, { rotate: angle + Math.PI / 2 });
}

export function drawCandleCakeSpin(ctx: CanvasRenderingContext2D, state: CandleCakeState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 0, arena.width, arena.height);
  // A tablecloth with stripes.
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.18;
  for (let x = -arena.height; x < arena.width; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, arena.height);
    ctx.lineTo(x + 40, arena.height);
    ctx.lineTo(x + 40 + arena.height, 0);
    ctx.lineTo(x + arena.height, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const { cx, cy, radius } = state;
  // Candles behind the cake first would be hidden: draw them after, from the rim outward.
  ctx.fillStyle = theme.stone;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.primary;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.light;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.8, 0, Math.PI * 2);
  ctx.fill();
  // Sprinkles turning with the cake.
  const colours = [theme.secondary, theme.star, theme.leaf, theme.danger];
  for (let i = 0; i < 14; i += 1) {
    const a = state.angle + i * 2.4;
    const r = radius * (0.2 + ((i * 37) % 55) / 100);
    ctx.save();
    ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.rotate(a * 2);
    ctx.fillStyle = colours[i % colours.length] ?? theme.star;
    roundRect(ctx, -8, -3, 16, 6, 3);
    ctx.fill();
    ctx.restore();
  }
  sprites.draw(ctx, 'strawberry', cx, cy, radius * 0.5, { rotate: state.angle });

  const lit = state.doneAgo >= 0;
  for (const candle of state.candles) {
    const a = candle.at + state.angle;
    paintCandle(ctx, view, cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, a, candle.old, lit || candle.old);
  }

  // The candle in flight, or the next one waiting.
  // Candles fly base first, pointing down as they will stand at the bottom of the cake.
  const strikeY = cy + radius;
  const restY = state.launchY - CANDLE_LENGTH;
  const flying = state.flying;
  if (flying && flying.bounced >= 0) {
    const t = flying.bounced;
    if (t < 0.5) paintCandle(ctx, view, cx + t * 300, strikeY + t * 500, STRIKE + t * 12, false, false);
  } else if (flying) {
    const p = Math.min(1, flying.t / FLIGHT);
    paintCandle(ctx, view, cx, restY + (strikeY - restY) * p, STRIKE, false, false);
  } else if (!lit) {
    ctx.setLineDash([10, 14]);
    ctx.strokeStyle = theme.light;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, restY - 10);
    ctx.lineTo(cx, strikeY + 10);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    paintCandle(ctx, view, cx, restY, STRIKE, false, false);
  }

  // Candles still needed for this cake.
  const left = state.need - state.candles.filter((c) => !c.old).length;
  for (let i = 0; i < left; i += 1) {
    const x = cx - ((left - 1) * 30) / 2 + i * 30;
    ctx.fillStyle = theme.secondary;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 2;
    roundRect(ctx, x - 6, arena.height - 52, 12, 34, 4);
    ctx.fill();
    ctx.stroke();
  }
  if (state.spoiltAgo < 1) paintLabel(ctx, view, 'Ối! Làm lại bánh này', cx, cy - radius - 50, 38, theme.light);
  if (lit) {
    paintLabel(ctx, view, 'Chúc mừng sinh nhật!', cx, cy - radius - 50, 40, theme.star);
    sprites.draw(ctx, 'party-popper', cx + radius + 60, cy - radius, 80);
  }
}
