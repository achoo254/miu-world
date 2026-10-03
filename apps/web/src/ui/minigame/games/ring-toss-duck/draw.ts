// Ring toss's picture: a fairground pond on the map's ground, three ducks bobbing on it (far ones smaller),
// the rings they already wear, the child at the edge holding the next ring, the power meter beside her and a
// soft marker on the water where the ring would land. A thrown ring arcs and spins; a missed one splashes.
import { bob, paintGround, paintHills, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { landingFor, meterAt, needleAt, RINGS, scaleFor, type RingTossState } from './logic';

const FLIGHT = 0.7;

function ringColour(view: DrawView, n: number): string {
  const { theme } = view;
  return [theme.danger, theme.primary, theme.star, theme.secondary][n % 4] ?? theme.danger;
}

/** A ring seen from the side: an outlined ellipse band. */
function paintRing(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, r: number, colour: string, tilt = 0.38): void {
  ctx.lineWidth = r * 0.42;
  ctx.strokeStyle = view.theme.ink;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * tilt, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = r * 0.28;
  ctx.strokeStyle = colour;
  ctx.stroke();
  ctx.lineWidth = r * 0.08;
  ctx.strokeStyle = view.theme.light;
  ctx.globalAlpha *= 0.7;
  ctx.beginPath();
  ctx.ellipse(x, y - r * tilt * 0.15, r * 0.95, r * tilt * 0.85, 0, Math.PI * 1.1, Math.PI * 1.6);
  ctx.stroke();
  ctx.globalAlpha /= 0.7;
}

function paintPond(ctx: CanvasRenderingContext2D, view: DrawView, state: RingTossState): void {
  const { arena, theme } = view;
  const top = state.pondTop - 45;
  const bottom = state.pondBottom + 50;
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, 14, top - 8, arena.width - 28, bottom - top + 16, 60);
  ctx.fill();
  ctx.fillStyle = theme.water;
  roundRect(ctx, 24, top, arena.width - 48, bottom - top, 52);
  ctx.fill();
  // Ripples drifting across.
  ctx.strokeStyle = theme.waterLight;
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 9; i += 1) {
    const y = top + 30 + ((i * 97) % (bottom - top - 50));
    const x = ((i * 233 + view.time * (14 + i * 3)) % (arena.width - 120)) + 50;
    ctx.beginPath();
    ctx.ellipse(x, y, 34, 7, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function drawRingToss(ctx: CanvasRenderingContext2D, state: RingTossState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const horizon = state.pondTop - 40;
  paintSky(ctx, view, horizon, 8);
  paintHills(ctx, view, horizon, 60, 70, theme.leaf);
  paintGround(ctx, view, horizon);
  paintPond(ctx, view, state);

  // Where the ring would land right now.
  let marker: { x: number; y: number } | null = null;
  if (state.phase === 'power') marker = landingFor(state, meterAt(state.phaseTime), 0);
  if (state.phase === 'aim') marker = landingFor(state, state.power, needleAt(state.phaseTime));
  if (marker) {
    const s = scaleFor((marker.y - state.pondTop) / (state.pondBottom - state.pondTop));
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(state.throwX, state.throwY - 60);
    ctx.lineTo(marker.x, marker.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = theme.star;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(marker.x, marker.y, 46 * s, 18 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  if (state.splash && state.splash.ago < 0.8) {
    const t = state.splash.ago / 0.8;
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 1 - t;
    for (const k of [1, 0.6]) {
      ctx.beginPath();
      ctx.ellipse(state.splash.x, state.splash.y, 60 * t * k + 10, (60 * t * k + 10) * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    sprites.draw(ctx, 'droplet', state.splash.x, state.splash.y - 30 - t * 30, 34, { alpha: 1 - t });
    ctx.globalAlpha = 1;
  }

  // Ducks far to near; rings stacked on their necks.
  const ducks = [...state.ducks].sort((a, b) => a.depth - b.depth);
  for (const d of ducks) {
    const s = scaleFor(d.depth);
    const size = 120 * s;
    const wiggle = d.ringedAgo < 0.5 && !view.reducedMotion ? Math.sin(d.ringedAgo * 30) * 0.15 : 0;
    const y = d.y + bob(view, 3, 4, d.x * 0.02);
    ctx.fillStyle = theme.waterLight;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.ellipse(d.x, d.y + size * 0.36, size * 0.5, size * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    sprites.draw(ctx, 'duck', d.x, y, size, { flipX: d.vx > 0, rotate: wiggle });
    // Rings slide down the neck, on the side the duck is swimming toward.
    const head = d.vx > 0 ? 1 : -1;
    for (let r = 0; r < Math.min(d.rings, 4); r += 1) {
      paintRing(ctx, view, d.x + head * size * 0.2, y + size * (0.02 - r * 0.06), 26 * s, ringColour(view, r + Math.round(d.depth * 3)));
    }
  }

  // The ring in the air: an arc, shrinking with distance, turning.
  const ring = state.ring;
  if (ring) {
    const p = Math.min(1, ring.t / FLIGHT);
    const x = ring.fromX + (ring.toX - ring.fromX) * p;
    const y = ring.fromY + (ring.toY - ring.fromY) * p - Math.sin(p * Math.PI) * 140;
    const depth = (ring.toY - state.pondTop) / (state.pondBottom - state.pondTop);
    const s = 1 + (scaleFor(depth) - 1) * p;
    const turn = view.reducedMotion ? 0.38 : 0.2 + 0.25 * Math.abs(Math.sin(ring.t * 9));
    paintShadow(ctx, view, ring.toX, ring.toY + 4, 70 * s, 1 - p);
    paintRing(ctx, view, x, y, 40 * s, ringColour(view, RINGS - state.ringsLeft), turn);
  }

  // The child at the pond's edge with the next ring.
  const px = state.throwX;
  const py = state.throwY;
  paintShadow(ctx, view, px, py + 46, 90);
  const throwing = state.phase === 'flying' && !view.reducedMotion ? Math.max(0, 1 - (state.ring?.t ?? 1) / 0.25) : 0;
  sprites.draw(ctx, view.player, px, py, 110, { squash: [1 + 0.1 * throwing, 1 - 0.1 * throwing] });
  if (state.phase === 'power' || state.phase === 'aim') paintRing(ctx, view, px + 46, py - 46 + bob(view, 5, 3), 30, ringColour(view, RINGS - state.ringsLeft));

  // Power meter next to the child: fills near → far; locked once tapped.
  const level = state.phase === 'power' ? meterAt(state.phaseTime) : state.phase === 'aim' ? state.power : 0;
  const mx = Math.min(arena.width - 50, px + 120);
  const mh = 150;
  const my = py + 50 - mh;
  ctx.fillStyle = theme.ink;
  roundRect(ctx, mx - 22, my - 6, 44, mh + 12, 18);
  ctx.fill();
  ctx.fillStyle = theme.light;
  roundRect(ctx, mx - 15, my, 30, mh, 12);
  ctx.fill();
  ctx.fillStyle = state.phase === 'power' ? theme.star : theme.primary;
  roundRect(ctx, mx - 15, my + mh * (1 - level), 30, mh * level, 12);
  ctx.fill();

  // Rings still to throw, bottom left.
  for (let i = 0; i < state.ringsLeft; i += 1) {
    paintRing(ctx, view, 46 + (i % 5) * 40, arena.height - 70 + Math.floor(i / 5) * 30, 15, ringColour(view, RINGS - state.ringsLeft + i));
  }
  if (state.phase === 'power' && state.ringsLeft === RINGS && state.phaseTime < 3) paintLabel(ctx, view, 'Chạm!', px, py - 120, 40);
}
