// Dodge fall's picture: sky and hills, a big tree crown across the top, nuts dropping from it (each with a
// shadow on the ground that grows and darkens as it comes), stars twinkling where they landed, and the child
// running (dizzy stars over her head when dazed).
import { bob, paintGround, paintHills, paintShadow, paintSky } from '../../draw-kit';
import type { DrawView } from '../../types';
import { nutSprite, type DodgeState } from './logic';

function paintCrown(ctx: CanvasRenderingContext2D, view: DrawView, y: number): void {
  const { arena, theme } = view;
  ctx.fillStyle = theme.leaf;
  for (let x = -60; x < arena.width + 80; x += 80) {
    ctx.beginPath();
    ctx.arc(x, y - 30 + ((x / 80) % 2 === 0 ? 14 : 0), 74, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = theme.ink;
  ctx.fillRect(0, y + 30, arena.width, 10);
  ctx.globalAlpha = 1;
}

export function drawDodgeFall(ctx: CanvasRenderingContext2D, state: DodgeState, view: DrawView): void {
  const { arena, sprites, theme } = view;
  const nut = nutSprite(theme.id);
  paintSky(ctx, view, state.groundY, 6);
  paintHills(ctx, view, state.groundY - 20, 80, 120, theme.leaf);
  paintGround(ctx, view, state.groundY);
  // Trunks at both sides holding the crown up.
  ctx.fillStyle = theme.wood;
  ctx.fillRect(10, state.branchY, 46, state.groundY - state.branchY);
  ctx.fillRect(arena.width - 56, state.branchY, 46, state.groundY - state.branchY);

  // Shadows first, under everything.
  for (const f of state.fallers) {
    if (f.landed >= 0) continue;
    const near = Math.min(1, f.t / f.fall);
    if (f.kind === 'nut') {
      ctx.globalAlpha = 0.15 + 0.45 * near;
      ctx.fillStyle = theme.danger;
      ctx.beginPath();
      ctx.ellipse(f.x, state.groundY + 8, 26 + 34 * near, 8 + 8 * near, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else paintShadow(ctx, view, f.x, state.groundY + 8, 40 + 40 * near, 1 - near);
  }

  for (const f of state.fallers) {
    const y = f.landed >= 0 ? state.groundY - 24 : state.branchY + 30 + (state.groundY - 24 - state.branchY - 30) * Math.min(1, f.t / f.fall) ** 2;
    if (f.kind === 'star') {
      if (f.done) continue;
      const blink = f.landed > 1.5 && Math.floor(f.landed * 8) % 2 === 0;
      sprites.draw(ctx, 'star', f.x, y + (f.landed >= 0 ? bob(view, 6, 4, f.x) : 0), 62, { alpha: blink ? 0.4 : 1, rotate: view.reducedMotion ? 0 : view.time * 2 });
      continue;
    }
    if (f.landed >= 0) {
      // A nut that landed bounces a little and fades.
      sprites.draw(ctx, nut, f.x, y, 54, { alpha: 1 - f.landed / 0.6, squash: [1.2, 0.8] });
      continue;
    }
    sprites.draw(ctx, nut, f.x, y, 64, { rotate: view.reducedMotion ? 0 : f.t * 6 });
  }
  paintCrown(ctx, view, state.branchY);

  const blink = state.hitAgo < 1.6 && Math.floor(state.hitAgo * 10) % 2 === 0;
  const run = view.reducedMotion || state.dazed > 0 ? 0 : Math.abs(Math.sin(view.time * 14)) * 5;
  paintShadow(ctx, view, state.playerX, state.groundY + 6, 70);
  sprites.draw(ctx, view.player, state.playerX, state.groundY - 48 - run, 96, { flipX: state.facing < 0, alpha: blink ? 0.45 : 1 });
  if (state.dazed > 0) {
    for (let i = 0; i < 3; i += 1) {
      const a = view.time * 6 + (i * Math.PI * 2) / 3;
      sprites.draw(ctx, 'star', state.playerX + Math.cos(a) * 36, state.groundY - 108 + Math.sin(a) * 10, 26);
    }
  }
}
