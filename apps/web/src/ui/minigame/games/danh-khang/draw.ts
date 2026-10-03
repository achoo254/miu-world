// Đánh khăng's picture: a village yard with a measuring tape along the ground (a tick every 5 m). At its start
// two bricks with the short stick across them, and the child's character holding the long stick. A flick sends
// the short stick up spinning; a swing turns the long stick and the short one flies along an arc to where it
// lands; every landing leaves a little flag with its metres (the best one a star). "Lượt 3/6" counts the turns.
import { paintGround, paintHills, paintLabel, paintSky } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { FLIGHT_SECONDS, MAX_METRES, type KhangState } from './logic';

function stick(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, length: number, angle: number, width: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = view.theme.woodEdge;
  ctx.lineWidth = width + 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-length / 2, 0);
  ctx.lineTo(length / 2, 0);
  ctx.stroke();
  ctx.strokeStyle = view.theme.wood;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.restore();
}

export function drawDanhKhang(ctx: CanvasRenderingContext2D, state: KhangState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const ground = state.base.y;
  paintSky(ctx, view, ground, 8);
  paintHills(ctx, view, ground - 20, 20, 100, theme.leaf);
  paintGround(ctx, view, ground);

  // The measuring tape.
  const x0 = state.base.x;
  ctx.fillStyle = theme.light;
  ctx.fillRect(x0, ground + 8, MAX_METRES * state.perMetre, 6);
  for (let m = 0; m <= MAX_METRES; m += 5) {
    const x = x0 + m * state.perMetre;
    ctx.fillRect(x - 2, ground + 2, 4, 18);
    paintLabel(ctx, view, m === MAX_METRES ? `${m} m` : `${m}`, x, ground + 40, 22);
  }

  // Flags where earlier turns landed.
  const best = Math.max(0, ...state.hits.map((h) => h.metres));
  state.hits.forEach((h, i) => {
    const flying = i === state.hits.length - 1 && state.phase === 'flight';
    if (flying || h.metres === 0) return;
    const x = x0 + h.metres * state.perMetre;
    ctx.fillStyle = theme.woodEdge;
    ctx.fillRect(x - 2, ground - 44, 4, 44);
    ctx.fillStyle = h.metres === best ? theme.star : theme.primary;
    ctx.beginPath();
    ctx.moveTo(x + 2, ground - 44);
    ctx.lineTo(x + 30, ground - 36);
    ctx.lineTo(x + 2, ground - 28);
    ctx.fill();
    paintLabel(ctx, view, `${h.metres}`, x + 16, ground - 58, 20);
  });

  // Bricks.
  ctx.fillStyle = theme.danger;
  ctx.fillRect(x0 - 34, ground - 18, 22, 18);
  ctx.fillRect(x0 + 12, ground - 18, 22, 18);

  // The short stick: resting, in the air, or flying away.
  const short = 46;
  if (state.phase === 'ready' || state.phase === 'over') stick(ctx, view, x0, ground - 22, short, 0, 9);
  else if (state.phase === 'air') stick(ctx, view, x0, ground - 22 - state.height, short, view.reducedMotion ? 0.3 : state.inPhase * 14, 9);
  else {
    const hit = state.hits[state.hits.length - 1];
    const t = Math.min(1, state.inPhase / (FLIGHT_SECONDS * 0.8));
    if (hit && hit.metres > 0) {
      const toX = x0 + hit.metres * state.perMetre;
      const peak = 120 + hit.metres * 6;
      const y = ground - 22 - state.height * (1 - t) - Math.sin(t * Math.PI) * peak;
      stick(ctx, view, x0 + (toX - x0) * t, y, short, view.reducedMotion ? 0 : state.inPhase * 16, 9);
    } else {
      stick(ctx, view, x0 + 20, ground - 10, short, 0.4, 9);
    }
  }

  // The child with the long stick (it swings at the start of a flight).
  const kidX = x0 - 76;
  sprites.draw(ctx, view.player, kidX, ground - 46, 92);
  const swing = state.phase === 'flight' && state.inPhase < 0.25 ? -1.2 + (state.inPhase / 0.25) * 2.2 : state.phase === 'air' ? -1.2 : 0.6;
  stick(ctx, view, kidX + 30 + Math.cos(swing) * 40, ground - 60 + Math.sin(swing) * 40, 96, swing, 8);

  const turn = Math.min(state.turns, state.hits.length + (state.phase === 'ready' || state.phase === 'air' ? 1 : 0));
  paintLabel(ctx, view, `Lượt ${turn}/${state.turns}`, arena.width / 2, HUD_SAFE_TOP + 24, 30);
  if (state.phase === 'ready') paintLabel(ctx, view, 'Chạm để hất que!', arena.width / 2, HUD_SAFE_TOP + 70, 30, theme.star);
  if (state.phase === 'air') paintLabel(ctx, view, 'Chạm khi que cao nhất!', arena.width / 2, HUD_SAFE_TOP + 70, 30, theme.star);
  const last = state.hits[state.hits.length - 1];
  if (state.phase === 'flight' && last) paintLabel(ctx, view, last.metres > 0 ? `+${last.metres} m` : 'Hụt rồi!', arena.width / 2, HUD_SAFE_TOP + 70, 40, last.metres > 0 ? theme.star : theme.light);
}
