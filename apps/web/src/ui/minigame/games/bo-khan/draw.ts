// Bỏ khăn's picture: a schoolyard seen from above, the friends sitting in a ring (one peeking over its shoulder
// shows wide eyes), the child's own spot in the ring (a mat), the child running round the outside with the red
// handkerchief, the handkerchief on the ground once dropped, the friend chasing after it (with a "!" as it
// notices), and a cheer or a tumble at the end of a turn.
import { bob, paintLabel, paintShadow } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import type { DrawView, Point } from '../../types';
import { ringPoint, type BoKhanState } from './logic';

export const FRIEND_LOOKS: readonly SpriteRef[] = ['rabbit', 'fox', 'bear', 'panda', 'monkey-face', 'dog-face'];

function paintKhan(ctx: CanvasRenderingContext2D, view: DrawView, at: Point, size: number, wave: number): void {
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(wave);
  ctx.fillStyle = view.theme.danger;
  ctx.strokeStyle = view.theme.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-size / 2, -size / 2);
  ctx.lineTo(size / 2, -size / 2 + 4);
  ctx.lineTo(size / 2 - 4, size / 2);
  ctx.lineTo(-size / 2 + 3, size / 2 - 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function paintEyes(ctx: CanvasRenderingContext2D, view: DrawView, at: Point): void {
  const { theme } = view;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(at.x, at.y, 30, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  for (const dx of [-9, 9]) {
    ctx.fillStyle = theme.ink;
    ctx.beginPath();
    ctx.arc(at.x + dx, at.y + 2, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawBoKhan(ctx: CanvasRenderingContext2D, state: BoKhanState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, arena.width, arena.height);
  // The worn running path round the ring.
  ctx.strokeStyle = theme.groundDeep;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 56;
  ctx.beginPath();
  ctx.arc(state.centre.x, state.centre.y, state.track, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  for (let k = 0; k < 4; k += 1) sprites.draw(ctx, 'deciduous-tree', k % 2 === 0 ? 50 : arena.width - 50, state.centre.y - state.track + k * state.track * 0.66, 90);

  // The child's own spot.
  const home = ringPoint(state, 0, state.ring);
  ctx.fillStyle = theme.star;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.ellipse(home.x, home.y, 44, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const size = Math.min(92, state.ring * 0.62);
  state.friends.forEach((f, k) => {
    const chasing = state.phase === 'chased' && state.dropped === k;
    const at = chasing && state.noticeIn <= 0 ? ringPoint(state, Math.min(state.chaser, state.progress), state.track) : ringPoint(state, f.at, state.ring);
    paintShadow(ctx, view, at.x, at.y + size * 0.4, size * 0.8);
    const turn = f.looking && !chasing && !view.reducedMotion ? Math.sin(view.time * 5 + k) * 0.08 : 0;
    sprites.draw(ctx, FRIEND_LOOKS[k % FRIEND_LOOKS.length] ?? 'rabbit', at.x, at.y + (chasing ? -Math.abs(Math.sin(view.time * 14)) * 8 : 0), size, { rotate: turn });
    if (f.looking && !chasing) paintEyes(ctx, view, { x: at.x, y: at.y - size * 0.62 + bob(view, 6, 2, k) });
    if (chasing && state.noticeIn > 0) paintLabel(ctx, view, '!', at.x + size * 0.4, at.y - size * 0.5, 44, theme.danger);
  });

  // The handkerchief on the ground once dropped.
  const dropped = state.friends[state.dropped];
  if (dropped && state.phase !== 'run') paintKhan(ctx, view, ringPoint(state, dropped.at - 0.12, (state.ring + state.track) / 2), 30, 0.4);

  // The child.
  const me = state.phase === 'safe' ? home : ringPoint(state, state.progress, state.track);
  const runBob = state.running && !view.reducedMotion ? Math.abs(Math.sin(view.time * 16)) * 8 : 0;
  const tumble = state.phase === 'caught' && !view.reducedMotion ? Math.sin(state.phaseAgo * 9) * 0.5 : 0;
  paintShadow(ctx, view, me.x, me.y + 40, 70);
  sprites.draw(ctx, view.player, me.x, me.y - runBob, 92, { rotate: tumble });
  if (state.phase === 'run') paintKhan(ctx, view, { x: me.x + 34, y: me.y - 30 - runBob }, 30, Math.sin(view.time * 10) * 0.3);
  if (state.phase === 'safe') sprites.draw(ctx, 'sparkles', me.x + 40, me.y - 60, 50, { alpha: 1 - state.phaseAgo / 1.1 });
  if (state.phase === 'caught') paintLabel(ctx, view, 'Bị bắt rồi!', state.centre.x, state.centre.y, 40, theme.light);
}
