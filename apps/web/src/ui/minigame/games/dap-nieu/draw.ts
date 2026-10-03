// Đập niêu's picture: a village yard with a bamboo pole across the top, the clay pot hanging on its rope and
// swaying (drawn: round belly, rim, a red ribbon), the countdown while she looks, then the blindfold: the
// yard goes dark but the coloured stakes and the child (a red band over her eyes, stick raised) still show.
// A miss shows the pot faintly for a moment; a hit bursts it and a gift drops. Pots left in a row below.
import { paintLabel, paintShadow, paintSky } from '../../draw-kit';
import type { DrawView } from '../../types';
import { POTS, potAt, type DapNieuState } from './logic';

function paintPot(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, scale: number, alpha: number): void {
  const { theme } = view;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = theme.woodEdge;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(x, y + 34 * scale, 46 * scale, 40 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.wood;
  ctx.fillRect(x - 28 * scale, y - 4 * scale, 56 * scale, 14 * scale);
  ctx.strokeRect(x - 28 * scale, y - 4 * scale, 56 * scale, 14 * scale);
  ctx.fillStyle = theme.danger;
  ctx.fillRect(x - 44 * scale, y + 24 * scale, 88 * scale, 8 * scale);
  ctx.globalAlpha = 1;
}

export function drawDapNieu(ctx: CanvasRenderingContext2D, state: DapNieuState, view: DrawView): void {
  const { arena, sprites, theme } = view;
  paintSky(ctx, view, state.groundY, 5);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, state.groundY, arena.width, arena.height - state.groundY);
  ctx.fillStyle = theme.groundDeep;
  ctx.fillRect(0, state.groundY + 30, arena.width, arena.height - state.groundY - 30);
  // Bamboo pole on two posts.
  ctx.fillStyle = theme.leaf;
  ctx.fillRect(20, state.poleY - 8, arena.width - 40, 16);
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(20, state.poleY, 14, state.groundY - state.poleY);
  ctx.fillRect(arena.width - 34, state.poleY, 14, state.groundY - state.poleY);

  const x = potAt(state);
  const potY = state.poleY + 120;
  const visible = state.phase === 'look' || state.phase === 'peek' || state.phase === 'gone';
  if (state.phase === 'broken') {
    const t = state.phaseTime;
    for (let k = 0; k < 6; k += 1) {
      const a = (k / 6) * Math.PI * 2;
      ctx.fillStyle = theme.woodEdge;
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * t * 160, potY + 30 + Math.sin(a) * t * 120 + t * t * 200, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    sprites.draw(ctx, 'gift', x, Math.min(state.groundY - 40, potY + 40 + t * 300), 80);
  } else if (state.pot < POTS) {
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(state.potX, state.poleY);
    ctx.lineTo(x, potY);
    ctx.stroke();
    paintPot(ctx, view, x, potY, 1, visible ? (state.phase === 'peek' ? 0.7 : 1) : 1);
  }

  // The blindfold: darkness over the yard (and the pot).
  const dark = state.phase === 'blind' || state.phase === 'peek';
  if (dark) {
    ctx.globalAlpha = state.phase === 'peek' ? 0.55 : 0.9;
    ctx.fillStyle = theme.ink;
    ctx.fillRect(0, 0, arena.width, arena.height);
    ctx.globalAlpha = 1;
    if (state.phase === 'peek') paintPot(ctx, view, x, potY, 1, 0.6);
  }

  // Stakes along the ground: they show even blindfolded.
  const colours = [theme.primary, theme.star, theme.secondary, theme.leaf, theme.danger];
  state.stakes.forEach((sx, i) => {
    ctx.fillStyle = colours[i % colours.length] ?? theme.star;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx - 10, state.groundY + 40);
    ctx.lineTo(sx + 10, state.groundY + 40);
    ctx.lineTo(sx + 10, state.groundY - 10);
    ctx.lineTo(sx, state.groundY - 26);
    ctx.lineTo(sx - 10, state.groundY - 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  // The child, stick and blindfold.
  const px = state.playerX;
  const py = state.groundY - 50;
  paintShadow(ctx, view, px, state.groundY + 6, 80);
  sprites.draw(ctx, view.player, px, py, 100);
  const swing = state.swung < 0.3 && !view.reducedMotion ? state.swung / 0.3 : 1;
  ctx.save();
  ctx.translate(px + 30, py - 10);
  ctx.rotate(-1.3 + swing * 0.9);
  ctx.fillStyle = theme.wood;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  ctx.fillRect(-5, -120, 10, 120);
  ctx.strokeRect(-5, -120, 10, 120);
  ctx.restore();
  if (dark || state.phase === 'gone') {
    ctx.fillStyle = theme.danger;
    ctx.fillRect(px - 42, py - 22, 84, 16);
  }

  if (state.phase === 'look') paintLabel(ctx, view, String(Math.ceil(state.lookTime - state.phaseTime)), arena.width / 2, potY + 160, 70, theme.star);
  if (state.phase === 'broken') paintLabel(ctx, view, 'Vỡ rồi!', arena.width / 2, potY + 160, 60, theme.star);
  for (let i = 0; i < POTS; i += 1) paintPot(ctx, view, 34 + i * 40, arena.height - 52, 0.35, i >= state.pot ? 1 : 0.25);
}
