// Boomerang throw's picture: a sunny orchard, three trees with mangoes and coconuts in their crowns, the child at
// the bottom, the boomerang spinning along its loop with a faint trail, fruit dropping when hit, and a ring at
// her hands that lights up when the boomerang can be caught.
import { paintGround, paintHills, paintShadow, paintSky } from '../../draw-kit';
import type { DrawView } from '../../types';
import { CATCH_FROM, FLIGHT, flightPoint, type BoomerangState } from './logic';

export function drawBoomerang(ctx: CanvasRenderingContext2D, state: BoomerangState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const groundY = state.hand.y - 40;
  paintSky(ctx, view, groundY);
  paintHills(ctx, view, groundY, 20, 80, theme.leaf);
  paintGround(ctx, view, groundY);
  // Tree trunks and crowns behind the fruit.
  const crowns = [0.2, 0.5, 0.8].map((f) => arena.width * f);
  for (const x of crowns) {
    const fruitsHere = state.fruits.filter((fr) => Math.abs(fr.x - x) < 90);
    const cy = fruitsHere.reduce((s, fr) => s + fr.y, 0) / Math.max(1, fruitsHere.length);
    ctx.fillStyle = theme.woodEdge;
    ctx.fillRect(x - 14, cy, 28, groundY - cy);
    ctx.fillStyle = theme.leaf;
    ctx.beginPath();
    ctx.ellipse(x, cy - 10, 110, 80, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const f of state.fruits) {
    const kind = f.kind === 0 ? 'mango' : 'coconut';
    if (f.hit < 0) {
      sprites.draw(ctx, kind, f.x, f.y, 52);
      continue;
    }
    if (f.hit < 0.8) {
      const y = f.y + f.hit * f.hit * 900;
      if (y < groundY) sprites.draw(ctx, kind, f.x, y, 52, { rotate: f.hit * 6 });
    }
  }
  const flight = state.flight;
  const catching = flight && flight.t >= FLIGHT * CATCH_FROM;
  ctx.strokeStyle = catching ? theme.star : theme.light;
  ctx.lineWidth = catching ? 8 : 4;
  ctx.globalAlpha = catching ? 0.9 : 0.4;
  ctx.beginPath();
  ctx.arc(state.hand.x, state.hand.y - 20, 60, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  paintShadow(ctx, view, state.hand.x, state.hand.y + 30, 90);
  sprites.draw(ctx, view.player, state.hand.x, state.hand.y, 100);
  if (flight) {
    ctx.fillStyle = theme.light;
    for (let k = 1; k <= 6; k += 1) {
      const p = flightPoint(state.hand, flight, Math.max(0, flight.t - k * 0.04));
      ctx.globalAlpha = 0.4 - k * 0.06;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const p = flightPoint(state.hand, flight, flight.t);
    sprites.draw(ctx, 'boomerang', p.x, p.y, 64, { rotate: view.reducedMotion ? 0 : flight.t * 20 });
  } else if (state.wait > 0) {
    sprites.draw(ctx, 'boomerang', state.hand.x + 90, groundY + 20, 50, { alpha: 0.6 });
  } else {
    sprites.draw(ctx, 'boomerang', state.hand.x + 46, state.hand.y - 30, 52);
  }
}
