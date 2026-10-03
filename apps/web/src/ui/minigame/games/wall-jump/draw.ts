// Wall jump's picture: a canyon of two stone walls scrolling down as the child climbs, ice spikes (pale
// triangles) jutting from them, stars to grab, the child clinging to a wall or flying across in an arc, and
// the height in metres. A knock shows a shake and snow puffs.
import { paintLabel, paintSky } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { WallJumpState } from './logic';
import { SPIKE_LENGTH } from './logic';

/** Arena units per metre. */
const UNIT = 46;

export function drawWallJump(ctx: CanvasRenderingContext2D, state: WallJumpState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const childY = arena.height * 0.62;
  const yOf = (metres: number): number => childY - (metres - state.height) * UNIT;
  paintSky(ctx, view, arena.height, 4);
  // Walls with stone bands scrolling.
  for (const [x0, x1] of [
    [0, state.left],
    [state.right, arena.width],
  ] as const) {
    ctx.fillStyle = theme.stone;
    ctx.fillRect(x0, 0, x1 - x0, arena.height);
    ctx.fillStyle = theme.stoneEdge;
    const off = (state.height * UNIT) % 90;
    for (let y = off - 90; y < arena.height; y += 90) ctx.fillRect(x0, y, x1 - x0, 8);
  }
  // Spikes.
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  for (const spike of state.spikes) {
    const y0 = yOf(spike.at);
    const y1 = yOf(spike.at + SPIKE_LENGTH);
    if (y0 < -20 || y1 > arena.height + 20) continue;
    const base = spike.side < 0 ? state.left : state.right;
    const tip = base - spike.side * 70;
    ctx.fillStyle = theme.waterLight;
    ctx.beginPath();
    ctx.moveTo(base, y0);
    ctx.lineTo(tip, (y0 + y1) / 2);
    ctx.lineTo(base, y1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  for (const star of state.stars) {
    if (star.taken) continue;
    const y = yOf(star.at);
    if (y < -30 || y > arena.height + 30) continue;
    sprites.draw(ctx, 'star', star.side < 0 ? state.left + 34 : state.right - 34, y, 50, { rotate: view.reducedMotion ? 0 : Math.sin(view.time * 3) * 0.2 });
  }
  // The child: on a wall, or flying across.
  const from = state.side < 0 ? state.right - 40 : state.left + 40;
  const to = state.side < 0 ? state.left + 40 : state.right - 40;
  const t = state.leap;
  const x = from + (to - from) * t;
  const arc = Math.sin(t * Math.PI) * 50;
  const shake = state.stunned > 0 && !view.reducedMotion ? Math.sin(state.time * 50) * 6 : 0;
  sprites.draw(ctx, view.player, x + shake, childY - 30 - arc, 80, { rotate: t < 1 ? (to > from ? 1 : -1) * t * Math.PI * 2 : state.side * 0.25, flipX: state.side > 0 });
  if (state.time - state.hitAt < 0.6) sprites.draw(ctx, 'snowflake', x, childY - 70, 60, { alpha: 1 - (state.time - state.hitAt) / 0.6 });
  paintLabel(ctx, view, `${state.score} m`, arena.width / 2, HUD_SAFE_TOP + 30, 40, theme.light);
}
