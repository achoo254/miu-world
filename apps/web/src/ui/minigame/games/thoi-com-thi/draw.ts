// Thổi cơm thi's picture: a village yard, three hearth stones under a dark clay pot, the fire (bigger and
// brighter the hotter it is, leaning in a gust), the heat gauge beside it with its green "just right" band and
// a red "too hot" top, a ring round the pot filling as the rice cooks, steam while cooking and grey smoke while
// scorching, the wood pile to tap, and a bowl of rice popping up for each pot done.
import { bob, paintGround, paintHills, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { ThoiComState } from './logic';
import { BAND_HIGH, BAND_LOW, BURN_LIMIT } from './logic';

function paintGauge(ctx: CanvasRenderingContext2D, view: DrawView, state: ThoiComState, x: number, top: number, height: number): void {
  const { theme } = view;
  const w = 44;
  const y = (v: number): number => top + height * (1 - v);
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  roundRect(ctx, x - w / 2, top, w, height, 18);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = theme.danger;
  ctx.fillRect(x - w / 2, top, w, y(BAND_HIGH) - top);
  ctx.fillStyle = theme.leaf;
  ctx.fillRect(x - w / 2, y(BAND_HIGH), w, y(BAND_LOW) - y(BAND_HIGH));
  ctx.restore();
  ctx.stroke();
  // The marker: where the fire is.
  const my = y(state.fire);
  ctx.fillStyle = theme.star;
  ctx.beginPath();
  ctx.moveTo(x + w / 2 + 4, my);
  ctx.lineTo(x + w / 2 + 30, my - 16);
  ctx.lineTo(x + w / 2 + 30, my + 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  view.sprites.draw(ctx, 'fire', x, top - 26, 40);
}

export function drawThoiComThi(ctx: CanvasRenderingContext2D, state: ThoiComState, view: DrawView): void {
  const { theme, sprites } = view;
  const { pot } = state;
  const groundY = pot.y + 150;
  paintSky(ctx, view, groundY, 6);
  paintHills(ctx, view, groundY, 50, 80, theme.leaf);
  paintGround(ctx, view, groundY);

  // Hearth stones and the fire between them.
  const fireY = pot.y + 112;
  const gust = view.reducedMotion ? 0 : Math.max(0, 1 - (state.time - state.gustAt) / 0.8);
  sprites.draw(ctx, 'wood', pot.x, fireY + 26, 120);
  for (const dx of [-95, 95]) sprites.draw(ctx, 'rock', pot.x + dx, fireY + 6, 70);
  paintShadow(ctx, view, pot.x, groundY + 10, 260);

  // The pot.
  ctx.fillStyle = theme.ink;
  ctx.strokeStyle = theme.ink;
  ctx.beginPath();
  ctx.ellipse(pot.x, pot.y + 20, 110, 80, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, pot.x - 90, pot.y - 62, 180, 26, 12);
  ctx.fill();
  const lidHop = state.serving < 0 && state.cooked > 0.05 && state.fire >= BAND_LOW && !view.reducedMotion ? Math.abs(Math.sin(view.time * 11)) * 5 : 0;
  ctx.fillStyle = theme.stoneEdge;
  ctx.beginPath();
  ctx.ellipse(pot.x, pot.y - 66 - lidHop, 84, 20, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(pot.x - 10, pot.y - 98 - lidHop, 20, 14);

  // The fire licks up under the pot.
  if (state.fire > 0.03) {
    const flicker = view.reducedMotion ? 1 : 1 + 0.08 * Math.sin(view.time * 17) + 0.05 * Math.sin(view.time * 29);
    const size = (40 + 90 * state.fire) * flicker;
    sprites.draw(ctx, 'fire', pot.x, fireY + 10 - size * 0.3, size, { rotate: gust * 0.5, alpha: 0.6 + 0.4 * Math.min(1, state.fire * 2) });
  }
  // Cooking ring round the pot.
  if (state.serving < 0) {
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.strokeStyle = theme.light;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(pot.x, pot.y + 10, 128, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = state.burnt >= BURN_LIMIT ? theme.woodEdge : theme.star;
    ctx.beginPath();
    ctx.arc(pot.x, pot.y + 10, 128, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * state.cooked);
    ctx.stroke();
    ctx.lineCap = 'butt';
    // Steam while cooking, smoke while scorching.
    const scorching = state.fire > BAND_HIGH;
    if (state.fire >= BAND_LOW) {
      for (let i = 0; i < 3; i += 1) {
        const t = (view.time * 0.8 + i / 3) % 1;
        sprites.draw(ctx, 'cloud', pot.x - 30 + i * 30 + Math.sin(t * 6 + i) * 10, pot.y - 110 - t * 90, 40 + t * 30, { alpha: (1 - t) * (scorching ? 0.9 : 0.6) });
      }
      if (scorching) {
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = theme.ink;
        ctx.beginPath();
        ctx.arc(pot.x, pot.y - 140, 50 + 10 * Math.sin(view.time * 5), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  } else {
    const t = Math.min(1, state.serving / 0.35);
    const size = 120 * (view.reducedMotion ? 1 : 0.6 + 0.4 * t);
    sprites.draw(ctx, 'cooked-rice', pot.x, pot.y - 120 - 30 * t, size);
    paintLabel(ctx, view, state.lastGood ? 'Cơm ngon!' : 'Hơi khê…', pot.x, pot.y - 200, 40, state.lastGood ? theme.star : theme.light);
    if (state.lastGood) sprites.draw(ctx, 'sparkles', pot.x + 70, pot.y - 160, 56);
  }

  const gaugeTop = Math.max(160, pot.y - 120);
  paintGauge(ctx, view, state, Math.max(50, pot.x - 230), gaugeTop, Math.min(320, groundY - gaugeTop - 10));

  // The wood pile: tap to throw on a stick.
  const since = state.time - state.stickAt;
  const press = since < 0.15 && !view.reducedMotion ? 0.9 : 1;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  ctx.globalAlpha = 0.85;
  roundRect(ctx, state.pile.x - 90 * press, state.pile.y - 50 * press, 180 * press, 100 * press, 28);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.stroke();
  sprites.draw(ctx, 'wood', state.pile.x - 30, state.pile.y + bob(view, 3, 2), 76 * press);
  paintLabel(ctx, view, '+ củi', state.pile.x + 40, state.pile.y, 30, theme.primary);
}
