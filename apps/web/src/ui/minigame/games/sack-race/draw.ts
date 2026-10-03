// Sack race's picture: a school field with four lanes, the child's lane nearest (at the bottom) and a little
// lighter. Each racer is an animal in a brown sack with a tie at the top, hopping in arcs and squashing on
// landing; a chequered finish line on the right. A trip tips the child's racer over for a moment. A row of
// dots over her lane shows the rhythm built up (up to four), and the place badge shows at the finish.
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { HOP_SECONDS, racerX, type Racer, type SackState } from './logic';

function paintRacer(ctx: CanvasRenderingContext2D, view: DrawView, state: SackState, r: Racer, lane: number, sprite: SpriteRef, size: number, tilt: number): void {
  const { theme, sprites } = view;
  const x = racerX(state, r);
  const groundY = state.laneTop + (lane + 0.85) * state.laneHeight;
  const t = r.hop >= 0 ? Math.min(1, r.hop / HOP_SECONDS) : 1;
  const lift = r.hop >= 0 ? Math.sin(t * Math.PI) * size * 0.6 : 0;
  const squash = r.hop < 0 && !view.reducedMotion ? 0.08 : 0;
  ctx.save();
  ctx.translate(x, groundY - lift);
  ctx.rotate(tilt);
  // Shadow, sack, the animal's head and shoulders out of the top.
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.ellipse(0, lift, size * 0.35, size * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  sprites.draw(ctx, sprite, 0, -size * 0.78, size * 0.62);
  ctx.fillStyle = theme.wood;
  roundRect(ctx, -size * 0.3 * (1 + squash), -size * 0.55 * (1 - squash), size * 0.6 * (1 + squash), size * 0.55 * (1 - squash), size * 0.12);
  ctx.fill();
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(-size * 0.32, -size * 0.52 * (1 - squash), size * 0.64, 6);
  ctx.restore();
}

export function drawSackRace(ctx: CanvasRenderingContext2D, state: SackState, view: DrawView): void {
  const { arena, theme } = view;
  paintSky(ctx, view, state.laneTop, 10);
  for (let lane = 0; lane < 4; lane += 1) {
    ctx.fillStyle = lane === 3 ? theme.ground : lane % 2 === 0 ? theme.groundDeep : theme.ground;
    ctx.globalAlpha = lane === 3 ? 1 : 0.85;
    ctx.fillRect(0, state.laneTop + lane * state.laneHeight, arena.width, state.laneHeight);
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.light;
    ctx.fillRect(0, state.laneTop + lane * state.laneHeight - 2, arena.width, 4);
  }
  const cell = 12;
  const h = state.laneHeight * 4;
  for (let row = 0; row * cell < h; row += 1) {
    for (let col = 0; col < 2; col += 1) {
      ctx.fillStyle = (row + col) % 2 === 0 ? theme.ink : theme.light;
      ctx.fillRect(state.finishX + col * cell, state.laneTop + row * cell, cell, Math.min(cell, h - row * cell));
    }
  }
  const size = Math.min(state.laneHeight * 0.95, 120);
  state.rivals.forEach((r, i) => paintRacer(ctx, view, state, r, i, r.sprite, size * 0.9, 0));
  const fall = state.child.down > 0 && !view.reducedMotion ? Math.sin(Math.min(1, (1 - state.child.down) / 0.3) * Math.PI * 0.5) * 1.2 : 0;
  paintRacer(ctx, view, state, state.child, 3, view.player, size, fall);
  // Rhythm dots.
  const y = state.laneTop + 3 * state.laneHeight + 14;
  for (let i = 0; i < 4; i += 1) {
    ctx.fillStyle = i < state.combo ? theme.star : theme.light;
    ctx.globalAlpha = i < state.combo ? 1 : 0.5;
    ctx.beginPath();
    ctx.arc(24 + i * 26, y, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (state.place > 0) paintLabel(ctx, view, `Về thứ ${state.place}!`, arena.width / 2, HUD_SAFE_TOP + 28, 44, theme.star);
  else if (state.time < 2.5) paintLabel(ctx, view, 'Chạm để nhảy!', arena.width / 2, HUD_SAFE_TOP + 28, 34);
}
