// Ski jump's picture: sky and far snowy peaks, the wooden in-run with its green take-off zone, the landing
// hill with a mark every 10 m (the 60 m line in red), the child on her skis (crouched, flying with the skis
// in a V, landing), a big hint word for what to do now, and the three jumps' metres in boxes.
import { paintHills, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { hillY, INRUN_LENGTH, JUMPS, LIP_X, LIP_Y, TELEMARK_WINDOW, UNITS_PER_METRE, ZONE, type SkiState } from './logic';

export function drawSkiJump(ctx: CanvasRenderingContext2D, state: SkiState, view: DrawView): void {
  const { arena, sprites, theme } = view;
  const cx = state.camX;
  const cy = state.camY;
  paintSky(ctx, view, arena.height, 4);
  paintHills(ctx, view, arena.height * 0.75 - cy * 0.1, cx * 0.1, 220, theme.stone);
  paintHills(ctx, view, arena.height * 0.8 - cy * 0.15, cx * 0.2 + 300, 160, theme.light);

  // The landing hill.
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.waterLight;
  ctx.lineWidth = 6;
  ctx.beginPath();
  const from = Math.max(LIP_X - 40, cx - 20);
  ctx.moveTo(from - cx, arena.height + 20);
  for (let x = from; x <= cx + arena.width + 40; x += 20) ctx.lineTo(x - cx, hillY(x) - cy);
  ctx.lineTo(cx + arena.width + 40 - cx, arena.height + 20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  for (let m = 10; m <= 140; m += 10) {
    const x = LIP_X + m * UNITS_PER_METRE;
    if (x < cx - 40 || x > cx + arena.width + 40) continue;
    const y = hillY(x) - cy;
    ctx.strokeStyle = m === 60 ? theme.danger : theme.secondary;
    ctx.lineWidth = m === 60 ? 8 : 4;
    ctx.beginPath();
    ctx.moveTo(x - cx, y);
    ctx.lineTo(x - cx - 30, y + 26);
    ctx.stroke();
    paintLabel(ctx, view, `${m}`, x - cx - 34, y + 46, 24, m === 60 ? theme.danger : theme.light);
  }

  // The in-run: a wooden ramp on stilts, the green zone at its end.
  const ax = -cx;
  const ay = -cy;
  const bx = LIP_X - cx;
  const by = LIP_Y - cy;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 8;
  for (let k = 1; k <= 6; k += 1) {
    const x = ax + ((bx - ax) * k) / 6;
    const y = ay + ((by - ay) * k) / 6;
    ctx.beginPath();
    ctx.moveTo(x, y + 10);
    ctx.lineTo(x, arena.height + 20);
    ctx.stroke();
  }
  ctx.strokeStyle = theme.wood;
  ctx.lineWidth = 22;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ax, ay + 14);
  ctx.lineTo(bx, by + 14);
  ctx.stroke();
  const zoneFrom = (INRUN_LENGTH - ZONE) / INRUN_LENGTH;
  ctx.strokeStyle = theme.leaf;
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.moveTo(ax + (bx - ax) * zoneFrom, ay + (by - ay) * zoneFrom + 14);
  ctx.lineTo(bx, by + 14);
  ctx.stroke();
  ctx.lineCap = 'butt';

  // The skier.
  const x = state.x - cx;
  const y = state.y - cy;
  const flying = state.phase === 'flight';
  const angle = state.phase === 'inrun' || state.phase === 'ready' ? 0.61 : flying ? Math.atan2(state.vy, state.vx) * 0.6 : 0.4;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = theme.danger;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (flying && !view.reducedMotion) {
    ctx.moveTo(-30, 6);
    ctx.lineTo(60, -6);
    ctx.moveTo(-30, 6);
    ctx.lineTo(60, 18);
  } else {
    ctx.moveTo(-40, 6);
    ctx.lineTo(56, 6);
  }
  ctx.stroke();
  ctx.restore();
  const crouch = state.crouching ? [1.15, 0.75] as const : [1, 1] as const;
  sprites.draw(ctx, view.player, x, y - 34 * crouch[1], 76, { rotate: angle * 0.6, squash: crouch });

  // What to do now.
  const hintY = Math.min(arena.height - 80, 170);
  if (state.phase === 'ready') paintLabel(ctx, view, 'Giữ để lao!', arena.width / 2, hintY, 48, theme.star);
  if (state.phase === 'inrun' && state.along >= INRUN_LENGTH - ZONE * 1.6) paintLabel(ctx, view, 'Thả!', arena.width / 2, hintY, 64, theme.leaf);
  if (flying && hillY(state.x) - state.y < TELEMARK_WINDOW * 1.4) paintLabel(ctx, view, 'Chạm!', arena.width / 2, hintY, 64, theme.star);
  if (state.phase === 'landed') paintLabel(ctx, view, `${state.results.at(-1) ?? 0} m${state.telemark ? ' ✨' : ''}`, arena.width / 2, hintY, 60, theme.star);

  // The three jumps.
  for (let i = 0; i < JUMPS; i += 1) {
    const bx2 = 20 + i * 96;
    ctx.fillStyle = theme.light;
    ctx.strokeStyle = i === state.jump ? theme.primary : theme.ink;
    ctx.lineWidth = 4;
    roundRect(ctx, bx2, arena.height - 70, 84, 50, 12);
    ctx.fill();
    ctx.stroke();
    const r = state.results[i];
    paintLabel(ctx, view, r === undefined ? '–' : `${r}m`, bx2 + 42, arena.height - 45, 26, theme.secondary);
  }
}
