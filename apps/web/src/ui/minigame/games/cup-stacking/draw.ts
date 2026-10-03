// Cup stacking's picture: a long table, three stations, cups drawn as bright plastic cups upside down. Nested
// cups stand in one column; placed ones in the pyramid; empty places of the station being built show dashed
// outlines (the top one too: tapping it first topples the tower). An arrow points at the station to work on,
// a toppled tower tumbles, and a stopwatch counts the round with the best round beside it.
import { bob, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { HUD_SAFE_TOP } from '../../types';
import { nestX as nestAt, SLOTS, slotCentre, type CupState, type Station } from './logic';

function paintCup(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, w: number, h: number, colour: string, angle = 0, alpha = 1): void {
  const { theme } = view;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;
  // Upside down: narrow top (the base), wide bottom (the mouth).
  ctx.beginPath();
  ctx.moveTo(-w * 0.32, -h / 2);
  ctx.lineTo(w * 0.32, -h / 2);
  ctx.lineTo(w / 2, h / 2);
  ctx.lineTo(-w / 2, h / 2);
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.ink;
  ctx.stroke();
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = alpha * 0.35;
  ctx.fillRect(-w * 0.2, -h / 2 + 8, w * 0.1, h - 16);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = alpha * 0.2;
  ctx.fillRect(-w / 2 + 2, h / 2 - 10, w - 4, 8);
  ctx.restore();
  ctx.globalAlpha = 1;
}

function paintStation(ctx: CanvasRenderingContext2D, view: DrawView, state: CupState, station: Station, index: number): void {
  const { theme } = view;
  const { cupW, cupH, tableY } = state;
  const colour = [theme.danger, theme.secondary, theme.leaf][index] ?? theme.primary;
  if (station.toppledAgo < 0.8) {
    // Tumbling cups.
    const t = station.toppledAgo / 0.8;
    SLOTS.forEach((slot, k) => {
      const c = slotCentre(state, station, slot);
      const dir = k === 0 ? -1 : 1;
      paintCup(ctx, view, c.x + dir * t * 70 * (k + 1) * 0.6, Math.min(tableY - cupH / 4, c.y + t * t * 200), cupW, cupH, colour, dir * t * 1.8, 1 - t * 0.3);
    });
    return;
  }
  const nested = SLOTS.length - station.placed.size;
  const working = state.stations[state.current] === station;
  // Empty places to build into, while this station is built.
  if (working && state.phase === 'up') {
    for (const slot of SLOTS) {
      if (station.placed.has(slot)) continue;
      const c = slotCentre(state, station, slot);
      ctx.setLineDash([10, 8]);
      ctx.lineWidth = 4;
      ctx.strokeStyle = theme.light;
      roundRect(ctx, c.x - cupW / 2, c.y - cupH / 2, cupW, cupH, 10);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  // The nest: a column of the cups not in the pyramid, standing beside it while building.
  const nestX = nestAt(state, station);
  for (let k = 0; k < nested; k += 1) paintCup(ctx, view, nestX, tableY - cupH / 2 - k * 16, cupW * 0.92, cupH, colour);
  for (const slot of SLOTS) {
    if (!station.placed.has(slot)) continue;
    const c = slotCentre(state, station, slot);
    const slide = Math.min(1, station.moved[slot] / 0.12);
    paintCup(ctx, view, nestX + (c.x - nestX) * slide, tableY - cupH / 2 + (c.y - tableY + cupH / 2) * slide, cupW, cupH, colour);
  }
}

export function drawCupStacking(ctx: CanvasRenderingContext2D, state: CupState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, state.tableY, 6);
  // Gym wall stripe and the table.
  ctx.fillStyle = theme.secondary;
  ctx.globalAlpha = 0.25;
  ctx.fillRect(0, state.tableY - state.cupH * 3, arena.width, 30);
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, state.tableY, arena.width, arena.height - state.tableY);
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(0, state.tableY, arena.width, 10);

  state.stations.forEach((s, i) => paintStation(ctx, view, state, s, i));

  const current = state.stations[state.current];
  if (current) {
    const y = state.tableY - state.cupH * 2.4 + bob(view, 5, 8);
    ctx.fillStyle = theme.star;
    ctx.beginPath();
    ctx.moveTo(current.x - 26, y - 30);
    ctx.lineTo(current.x + 26, y - 30);
    ctx.lineTo(current.x, y);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = theme.ink;
    ctx.stroke();
    paintLabel(ctx, view, state.phase === 'up' ? 'Dựng lên' : 'Gỡ xuống', current.x, y - 56, 28);
  }

  // The stopwatch.
  const sx = arena.width / 2;
  const sy = Math.min(HUD_SAFE_TOP + 60, state.tableY - state.cupH * 3 - 70);
  sprites.draw(ctx, 'stopwatch', sx - 90, sy, 64);
  paintLabel(ctx, view, `${state.roundTime.toFixed(1)} giây`, sx + 10, sy, 34);
  if (state.best !== null) paintLabel(ctx, view, `Nhanh nhất: ${state.best.toFixed(1)}`, sx, sy + 44, 24, theme.star);
}
