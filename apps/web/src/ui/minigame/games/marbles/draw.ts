// Marbles' picture: a dusty yard with a chalk ring, glassy marbles (a colour each, with a shine), the bigger
// shooter, a dotted line showing where a pull will send it (longer for a harder shot), marbles knocked out
// fading away, and the shots left as little marbles along the bottom.
import { paintLabel, paintShadow } from '../../draw-kit';
import type { DrawView } from '../../types';
import { MAX_SPEED, shotOf, SHOTS, type Marble, type MarblesState } from './logic';

function paintMarble(ctx: CanvasRenderingContext2D, view: DrawView, m: Marble, colour: string, alpha = 1): void {
  const { theme } = view;
  ctx.globalAlpha = alpha;
  paintShadow(ctx, view, m.x + 4, m.y + m.r * 0.8, m.r * 2.2);
  ctx.globalAlpha = alpha;
  const glass = ctx.createRadialGradient(m.x - m.r * 0.35, m.y - m.r * 0.35, m.r * 0.1, m.x, m.y, m.r);
  glass.addColorStop(0, theme.light);
  glass.addColorStop(0.35, colour);
  glass.addColorStop(1, colour);
  ctx.fillStyle = glass;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // A swirl inside the glass.
  ctx.strokeStyle = theme.light;
  ctx.globalAlpha = alpha * 0.6;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(m.x + m.r * 0.15, m.y + m.r * 0.1, m.r * 0.45, 0.3, 2.2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function drawMarbles(ctx: CanvasRenderingContext2D, state: MarblesState, view: DrawView): void {
  const { arena, theme } = view;
  const colours = [theme.primary, theme.secondary, theme.leaf, theme.star];
  ctx.fillStyle = theme.groundDeep;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.fillStyle = theme.ground;
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 40; i += 1) {
    ctx.beginPath();
    ctx.ellipse((i * 211) % arena.width, (i * 149) % arena.height, 26, 9, i, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // The chalk ring.
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 8;
  ctx.setLineDash([22, 10]);
  ctx.beginPath();
  ctx.arc(state.centre.x, state.centre.y, state.ring, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  for (const m of state.marbles) {
    if (m.out && m.outAgo > 0.8) continue;
    paintMarble(ctx, view, m, colours[m.colour] ?? theme.primary, m.out ? Math.max(0, 1 - m.outAgo / 0.8) : 1);
  }
  const s = state.shooter;
  // The pull: a band back to the finger, and dots where the shot will go.
  const pull = state.pull;
  if (pull && !state.rolling) {
    const shot = shotOf(pull.to.x - pull.from.x, pull.to.y - pull.from.y);
    if (shot) {
      const speed = Math.hypot(shot.vx, shot.vy);
      const reach = 60 + (speed / MAX_SPEED) * 260;
      ctx.fillStyle = theme.star;
      for (let i = 1; i <= 8; i += 1) {
        const t = (i / 8) * reach;
        ctx.beginPath();
        ctx.arc(s.x + (shot.vx / speed) * t, s.y + (shot.vy / speed) * t, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = theme.danger;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + (pull.to.x - pull.from.x) * 0.6, s.y + (pull.to.y - pull.from.y) * 0.6);
      ctx.stroke();
    }
  }
  paintMarble(ctx, view, s, theme.waterLight);
  if (!state.rolling && state.shotsLeft === SHOTS && !pull) paintLabel(ctx, view, 'Kéo ngược rồi thả tay', arena.width / 2, Math.min(arena.height - 90, s.y + 60), 32);

  // Shots left.
  for (let i = 0; i < state.shotsLeft; i += 1) {
    ctx.fillStyle = theme.waterLight;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(28 + i * 30, arena.height - 26, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
