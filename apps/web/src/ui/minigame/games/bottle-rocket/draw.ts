// Bottle rocket's picture: a school field, the launcher with the bottle rocket tilting on it and a little arc
// whose green part is the good tilt, the pump beside it with a pressure gauge (green band for this pad), a
// splash when it is over-pumped, the rocket flying with a trail, its parachute opening as it comes down, and
// the landing pad with a flag (ringed in gold on a hit).
import { paintGround, paintHills, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { HUD_SAFE_TOP } from '../../types';
import { FLIGHT_SECONDS, GOOD_TILT, neededPressure, ROCKETS, STROKE, type RocketState } from './logic';

export function drawBottleRocket(ctx: CanvasRenderingContext2D, state: RocketState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { groundY, launchX } = state;
  paintSky(ctx, view, groundY, 10);
  paintHills(ctx, view, groundY - 10, 40, 60, theme.leaf);
  paintGround(ctx, view, groundY);

  // Landing pad.
  ctx.fillStyle = state.phase === 'landed' && state.hit ? theme.star : theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(state.padX, groundY + 6, state.padHalf, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.danger;
  ctx.beginPath();
  ctx.ellipse(state.padX, groundY + 6, state.padHalf * 0.4, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = theme.woodEdge;
  ctx.beginPath();
  ctx.moveTo(state.padX + state.padHalf - 6, groundY);
  ctx.lineTo(state.padX + state.padHalf - 6, groundY - 70);
  ctx.stroke();
  ctx.fillStyle = theme.danger;
  ctx.beginPath();
  ctx.moveTo(state.padX + state.padHalf - 6, groundY - 70);
  ctx.lineTo(state.padX + state.padHalf + 30, groundY - 58);
  ctx.lineTo(state.padX + state.padHalf - 6, groundY - 46);
  ctx.closePath();
  ctx.fill();

  // Launcher, tilt arc.
  const pivot = { x: launchX, y: groundY - 20 };
  ctx.lineWidth = 10;
  ctx.strokeStyle = theme.stone;
  ctx.beginPath();
  ctx.arc(pivot.x, pivot.y, 80, -Math.PI / 4 - 0.45, -Math.PI / 4 + 0.45);
  ctx.stroke();
  ctx.strokeStyle = theme.leaf;
  ctx.beginPath();
  ctx.arc(pivot.x, pivot.y, 80, -Math.PI / 4 - GOOD_TILT, -Math.PI / 4 + GOOD_TILT);
  ctx.stroke();
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(pivot.x - 30, groundY);
  ctx.lineTo(pivot.x, pivot.y);
  ctx.lineTo(pivot.x + 30, groundY);
  ctx.stroke();
  if (state.phase === 'pump') {
    sprites.draw(ctx, 'rocket', pivot.x + Math.cos(-state.tilt) * 30, pivot.y + Math.sin(-state.tilt) * 30, 84, { rotate: Math.PI / 4 - state.tilt });
  }
  // Needle on the arc.
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(pivot.x + Math.cos(-state.tilt) * 66, pivot.y + Math.sin(-state.tilt) * 66);
  ctx.lineTo(pivot.x + Math.cos(-state.tilt) * 96, pivot.y + Math.sin(-state.tilt) * 96);
  ctx.stroke();

  // Pump gauge at the left edge.
  const gx = 34;
  const gTop = Math.max(HUD_SAFE_TOP + 30, groundY - 330);
  const gH = groundY - 40 - gTop;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, gx - 18, gTop, 36, gH, 14);
  ctx.fill();
  ctx.stroke();
  const need = neededPressure(state);
  ctx.fillStyle = theme.leaf;
  ctx.globalAlpha = 0.45;
  ctx.fillRect(gx - 15, gTop + gH * (1 - need - STROKE * 0.6), 30, gH * STROKE * 1.2);
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.water;
  roundRect(ctx, gx - 12, gTop + gH * (1 - state.pressure), 24, gH * state.pressure, 8);
  ctx.fill();
  ctx.fillStyle = theme.danger;
  ctx.fillRect(gx - 18, gTop - 4, 36, 6);
  sprites.draw(ctx, 'droplet', gx, gTop - 24, 34);
  if (state.spurtAgo < 0.8) {
    for (let k = 0; k < 5; k += 1) sprites.draw(ctx, 'droplet', launchX + (k - 2) * 24, groundY - 90 - state.spurtAgo * 120 + Math.abs(k - 2) * 10, 30, { alpha: 1 - state.spurtAgo / 0.8 });
    paintLabel(ctx, view, 'Bơm quá rồi! Bơm lại nhé', arena.width / 2, HUD_SAFE_TOP + 50, 30, theme.light);
  }

  // Flight: up and over, then the parachute.
  if (state.phase === 'flight' || (state.phase === 'landed' && state.phaseTime < 0.6)) {
    const t = state.phase === 'flight' ? state.phaseTime / FLIGHT_SECONDS : 1;
    const x = launchX + (state.landX - launchX) * t;
    const top = Math.max(HUD_SAFE_TOP + 40, groundY - (state.landX - launchX) * 0.55);
    const rise = t < 0.6 ? Math.sin((t / 0.6) * (Math.PI / 2)) : 1 - (t - 0.6) / 0.4;
    const y = groundY - 30 - (groundY - 30 - top) * rise;
    if (t < 0.6) {
      sprites.draw(ctx, 'rocket', x, y, 70, { rotate: Math.PI / 4 - state.launchTilt + t * 1.5 });
    } else {
      sprites.draw(ctx, 'parachute', x, y - 60, 100);
      sprites.draw(ctx, 'rocket', x, y, 50, { rotate: -Math.PI / 4 });
    }
  }
  if (state.phase === 'landed') {
    paintLabel(ctx, view, state.hit ? 'Đáp trúng bãi!' : state.landX < state.padX ? 'Gần quá' : 'Xa quá', arena.width / 2, arena.height * 0.35, 38, state.hit ? theme.star : theme.light);
  } else if (state.phase === 'pump' && state.pressure < 0.2) {
    paintLabel(ctx, view, 'Vuốt lên xuống để bơm', arena.width / 2 + 40, arena.height * 0.35, 30, theme.light);
  }
  paintLabel(ctx, view, `Tên lửa ${Math.min(ROCKETS, state.rockets + (state.phase === 'pump' ? 1 : 0))}/${ROCKETS}`, arena.width - 110, arena.height - 26, 24, theme.light);
}
