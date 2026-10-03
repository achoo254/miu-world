// Trampoline rescue's picture: a tall building on the left with smoke and flames in some windows, the open
// window friends leap from, the street with three chalk circles where they bounce, a shadow growing where
// each one will come down, the trampoline held by two firefighters, and the fire engine on the right.
import { bob, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { NET_HALF, type TrampolineState } from './logic';

function paintBuilding(ctx: CanvasRenderingContext2D, view: DrawView, state: TrampolineState): void {
  const { theme, sprites } = view;
  const top = state.windowY - 150;
  const w = state.buildingRight;
  ctx.fillStyle = theme.stone;
  ctx.strokeStyle = theme.stoneEdge;
  ctx.lineWidth = 6;
  roundRect(ctx, -10, top, w + 10, state.groundY - top + 10, 10);
  ctx.fill();
  ctx.stroke();
  const cols = Math.max(1, Math.floor((w - 20) / 44));
  for (let row = 0; top + 30 + row * 70 < state.groundY - 60; row += 1) {
    for (let c = 0; c < cols; c += 1) {
      const x = 14 + c * 44;
      const y = top + 30 + row * 70;
      ctx.fillStyle = (row + c) % 3 === 0 ? theme.star : theme.waterLight;
      roundRect(ctx, x, y, 30, 40, 5);
      ctx.fill();
      if ((row * 7 + c) % 5 === 1) sprites.draw(ctx, 'fire', x + 15, y + 14, 38, { alpha: 0.9 });
    }
  }
  // The open window at the jump-off point.
  ctx.fillStyle = theme.ink;
  roundRect(ctx, w - 56, state.windowY - 60, 50, 64, 6);
  ctx.fill();
  // Smoke puffs drifting up from the roof.
  for (let i = 0; i < 3; i += 1) {
    const t = view.reducedMotion ? 0.3 : (view.time * 0.25 + i / 3) % 1;
    ctx.globalAlpha = 0.45 * (1 - t);
    ctx.fillStyle = theme.stoneEdge;
    ctx.beginPath();
    ctx.arc(w * 0.4 + t * 40, top - 20 - t * 120, 26 + t * 30, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawTrampolineRescue(ctx: CanvasRenderingContext2D, state: TrampolineState, view: DrawView): void {
  const { arena, sprites, theme } = view;
  paintSky(ctx, view, state.groundY, 8);
  // Street and pavement.
  ctx.fillStyle = theme.stoneEdge;
  ctx.fillRect(0, state.groundY, arena.width, arena.height - state.groundY);
  ctx.fillStyle = theme.stone;
  ctx.fillRect(0, state.groundY, arena.width, 18);
  // The air cushion along the street.
  ctx.fillStyle = theme.star;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  roundRect(ctx, state.buildingRight + 6, state.groundY - 22, state.truckX - state.buildingRight - 80, 26, 12);
  ctx.fill();
  ctx.stroke();
  paintBuilding(ctx, view, state);
  sprites.draw(ctx, 'fire-engine', state.truckX, state.groundY - 56, 190, { flipX: true });

  // Chalk circles at the three bounce spots.
  for (const x of state.spots) {
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.ellipse(x, state.groundY + 30, 50, 14, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.globalAlpha = 1;

  // Shadows where each friend in the air comes down next, darker as it gets close.
  for (const j of state.jumpers) {
    if (j.ended >= 0 || j.hop > 2) continue;
    const x = state.spots[j.hop] ?? 0;
    const near = Math.min(1, j.t / j.hopTime);
    paintShadow(ctx, view, x, state.groundY + 30, 60 + 50 * near, 0.6 - 0.6 * near);
  }

  // Firefighters and the trampoline between them.
  const dip = view.reducedMotion ? 0 : Math.max(0, 1 - state.bounced / 0.2) * 14;
  for (const side of [-1, 1]) sprites.draw(ctx, 'firefighter', state.netX + side * (NET_HALF + 26), state.groundY - 44, 86, { flipX: side > 0 });
  ctx.fillStyle = theme.danger;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(state.netX, state.netY + 10 + dip * 0.5, NET_HALF, 16 + dip, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.light;
  ctx.beginPath();
  ctx.ellipse(state.netX, state.netY + 8 + dip * 0.5, NET_HALF * 0.55, 8 + dip * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  for (const j of state.jumpers) {
    if (j.ended >= 0) {
      const alpha = Math.max(0, 1 - j.ended / 0.8);
      if (j.saved) sprites.draw(ctx, j.sprite, state.truckX - 20, state.truckY - 40 - j.ended * 40, 64, { alpha });
      else sprites.draw(ctx, j.sprite, j.x, j.y, 70, { alpha, squash: [1.25, 0.75] });
      continue;
    }
    const spin = view.reducedMotion ? 0 : j.t * 5 + j.hop;
    sprites.draw(ctx, j.sprite, j.x, j.y - 20 + bob(view, 8, 2, j.hop), 76, { rotate: spin });
  }
}
