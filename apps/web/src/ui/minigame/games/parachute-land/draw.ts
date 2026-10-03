// Parachute land's picture: a bright sky over the sea, a sandy island with palm trees and a big red X in a ring,
// the parachute with the child hanging under it (tilting as she steers, swaying with the wind), a wind arrow
// up top that grows with the wind, and a word on landing (a splash in the sea, sparkles on the X).
import { bob, paintLabel, paintSky } from '../../draw-kit';
import type { DrawView } from '../../types';
import { BULLSEYE, JUMPS, NEAR, type ParachuteState } from './logic';

const WORDS = { bullseye: 'Đúng chữ X!', near: 'Gần rồi!', far: 'Xa quá', sea: 'Ùm! Rơi xuống biển' } as const;

export function drawParachuteLand(ctx: CanvasRenderingContext2D, state: ParachuteState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const seaY = state.groundY - 20;
  paintSky(ctx, view, seaY, 14);
  ctx.fillStyle = theme.water;
  ctx.fillRect(0, seaY, arena.width, arena.height - seaY);
  ctx.strokeStyle = theme.waterLight;
  ctx.lineWidth = 3;
  for (let x = ((view.time * 30) % 60) - 60; x < arena.width; x += 60) {
    ctx.beginPath();
    ctx.arc(x, seaY + 40, 14, Math.PI, 0);
    ctx.stroke();
  }
  // The island.
  const { x0, x1 } = state.island;
  ctx.fillStyle = theme.ground;
  ctx.beginPath();
  ctx.ellipse((x0 + x1) / 2, seaY + 10, (x1 - x0) / 2, 44, 0, Math.PI, 0);
  ctx.lineTo(x1, seaY + 30);
  ctx.ellipse((x0 + x1) / 2, seaY + 30, (x1 - x0) / 2, 26, 0, 0, Math.PI);
  ctx.fill();
  sprites.draw(ctx, 'palm-tree', x0 + 30, seaY - 50, 110);
  sprites.draw(ctx, 'palm-tree', x1 - 30, seaY - 50, 110, { flipX: true });
  // The X in its ring.
  const tx = state.target;
  const ty = seaY - 4;
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(tx, ty, NEAR, 20, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = theme.danger;
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(tx - BULLSEYE, ty - 12);
  ctx.lineTo(tx + BULLSEYE, ty + 12);
  ctx.moveTo(tx + BULLSEYE, ty - 12);
  ctx.lineTo(tx - BULLSEYE, ty + 12);
  ctx.stroke();
  ctx.lineCap = 'butt';

  // Wind arrow.
  const wy = state.startY - 10;
  const len = Math.min(160, Math.abs(state.wind) * 1.2);
  const dir = Math.sign(state.wind) || 1;
  const wx = arena.width / 2;
  ctx.strokeStyle = theme.light;
  ctx.fillStyle = theme.light;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(wx - (dir * len) / 2, wy);
  ctx.lineTo(wx + (dir * len) / 2, wy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(wx + (dir * len) / 2 + dir * 22, wy);
  ctx.lineTo(wx + (dir * len) / 2 - dir * 4, wy - 18);
  ctx.lineTo(wx + (dir * len) / 2 - dir * 4, wy + 18);
  ctx.closePath();
  ctx.fill();
  paintLabel(ctx, view, 'Gió', wx - dir * (len / 2 + 40), wy, 26, theme.light);

  // The parachute and the child.
  const landed = state.landedAgo >= 0;
  const tilt = landed ? 0 : Math.max(-0.35, Math.min(0.35, (state.steer + state.wind) / 500));
  const sway = landed || view.reducedMotion ? 0 : Math.sin(view.time * 2.4) * 0.06;
  const sink = state.landing === 'sea' ? Math.min(40, state.landedAgo * 60) : 0;
  const canopyAlpha = landed ? Math.max(0, 1 - state.landedAgo * 2) : 1;
  ctx.save();
  ctx.translate(state.x, state.y - 30 + sink);
  ctx.rotate(tilt + sway);
  ctx.globalAlpha = canopyAlpha;
  // The emoji's own little jumper hangs under the canopy; the child is drawn over it.
  sprites.draw(ctx, 'parachute', 0, -62 + bob(view, 3, 3), 150);
  ctx.globalAlpha = 1;
  sprites.draw(ctx, view.player, 0, -14, 76);
  ctx.restore();
  if (state.landing === 'sea') sprites.draw(ctx, 'droplet', state.x + 30, state.y - 40 - state.landedAgo * 40, 40, { alpha: Math.max(0, 1 - state.landedAgo) });
  if (state.landing === 'bullseye') sprites.draw(ctx, 'sparkles', state.x, state.y - 90 - state.landedAgo * 30, 70);

  if (state.landing && state.landedAgo < 1.2) {
    paintLabel(ctx, view, WORDS[state.landing], arena.width / 2, arena.height * 0.42, 40, state.landing === 'bullseye' || state.landing === 'near' ? theme.star : theme.light);
  }
  paintLabel(ctx, view, `Lần nhảy ${Math.min(JUMPS, state.jumps + (landed ? 0 : 1))}/${JUMPS}`, arena.width - 110, arena.height - 30, 24, theme.light);
}
