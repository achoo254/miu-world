// Piano tiles' picture: a stage under the sky with four lanes, keys in four colours sliding down (a note on
// each, long notes are tall keys), a glowing line where keys are played on the beat, played keys flashing
// light and fading, a missed key's lane flashing, and "Đúng nhịp!" for a key played on the line.
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { LANES, type PianoState } from './logic';

export function drawPianoTiles(ctx: CanvasRenderingContext2D, state: PianoState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const colours = [theme.primary, theme.secondary, theme.leaf, theme.star];
  paintSky(ctx, view, arena.height, 5);
  const boardW = state.laneW * LANES;
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = theme.ink;
  ctx.fillRect(state.boardX, 0, boardW, arena.height);
  ctx.globalAlpha = 1;
  // Lane lines, and the lane of the last miss flashing.
  for (let i = 0; i <= LANES; i += 1) {
    ctx.fillStyle = theme.light;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(state.boardX + i * state.laneW - 1.5, 0, 3, arena.height);
  }
  if (state.missAgo < 0.4) {
    ctx.globalAlpha = 0.35 * (1 - state.missAgo / 0.4);
    ctx.fillStyle = theme.danger;
    ctx.fillRect(state.boardX + state.missLane * state.laneW, 0, state.laneW, arena.height);
  }
  ctx.globalAlpha = 1;

  // The line to play on.
  const glow = 0.8 + 0.2 * Math.sin(view.time * 6);
  ctx.globalAlpha = view.reducedMotion ? 0.8 : glow;
  ctx.fillStyle = theme.star;
  roundRect(ctx, state.boardX - 6, state.lineY - 7, boardW + 12, 14, 7);
  ctx.fill();
  ctx.globalAlpha = 1;

  let lastPerfect = -1;
  for (const t of state.tiles) {
    if (t.y > arena.height || t.y + t.h < 0) continue;
    const x = state.boardX + t.lane * state.laneW + 6;
    const w = state.laneW - 12;
    if (t.tapped >= 0) {
      if (t.tapped > 0.35) continue;
      ctx.globalAlpha = 1 - t.tapped / 0.35;
      ctx.fillStyle = theme.light;
      roundRect(ctx, x - 4, t.y - 4, w + 8, t.h + 8, 18);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (t.perfect) lastPerfect = Math.max(lastPerfect, t.tapped);
      continue;
    }
    ctx.fillStyle = colours[t.lane] ?? theme.primary;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4;
    roundRect(ctx, x, t.y, w, t.h, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = theme.light;
    ctx.globalAlpha = 0.35;
    roundRect(ctx, x + 8, t.y + 8, w - 16, Math.min(24, t.h / 4), 10);
    ctx.fill();
    ctx.globalAlpha = 1;
    sprites.draw(ctx, 'musical-note', x + w / 2, t.y + t.h - 42, 46);
  }
  if (lastPerfect >= 0) paintLabel(ctx, view, 'Đúng nhịp!', arena.width / 2, state.lineY - 60, 40, theme.star);
}
