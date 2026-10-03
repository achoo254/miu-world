// Ice bridge's picture: a snowfield with the lake in it (crossed left to right on a wide screen, bottom to top
// on a tall one) with drifting ripples, white ice floes, squares the child froze (pale blue, with a sparkle as
// they set), the snowflakes still to spend, the penguin waiting on the near shore (and walking the bridge once
// it is made) toward a fish on the far shore, and the ice melting back when the snowflakes ran out.
import { bob, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { DrawView, Point } from '../../types';
import { cellCentre, shorePoint, type IceBridgeState } from './logic';

export function drawIceBridge(ctx: CanvasRenderingContext2D, state: IceBridgeState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { cell, cols, rows, left, top, tall } = state;
  const lakeW = (tall ? rows : cols) * cell;
  const lakeH = (tall ? cols : rows) * cell;
  const snowTop = tall ? top - state.bank : top - 30;
  paintSky(ctx, view, snowTop, 6);
  ctx.fillStyle = theme.light;
  ctx.fillRect(0, snowTop, arena.width, arena.height - snowTop);
  // Lake with ripples.
  ctx.fillStyle = theme.water;
  roundRect(ctx, left - 6, top - 6, lakeW + 12, lakeH + 12, 18);
  ctx.fill();
  ctx.strokeStyle = theme.waterLight;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.5;
  const lines = Math.round(lakeH / (cell / 2));
  for (let k = 0; k < lines; k += 1) {
    const y = top + (k + 0.5) * (cell / 2);
    const shift = ((view.time * 18 + k * 37) % cell) - cell / 2;
    for (let x = left + shift; x < left + lakeW - 20; x += cell) {
      if (x < left) continue;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 10, y - 5, x + 20, y);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  const melting = state.phase === 'melt' ? Math.min(1, state.phaseAgo / 0.9) : 0;
  state.cells.forEach((kind, i) => {
    if (kind === 'water') return;
    const centre = cellCentre(state, i);
    const since = state.time - (state.frozenAt[i] ?? -9);
    const grow = kind === 'frozen' ? Math.min(1, since / 0.15) : 1;
    const half = cell / 2 - 4 - (1 - grow) * cell * 0.4;
    ctx.globalAlpha = kind === 'frozen' ? 1 - melting : 1;
    ctx.fillStyle = kind === 'floe' ? theme.light : theme.waterLight;
    ctx.strokeStyle = kind === 'floe' ? theme.stone : theme.light;
    ctx.lineWidth = 4;
    roundRect(ctx, centre.x - half, centre.y - half, half * 2, half * 2, 14);
    ctx.fill();
    ctx.stroke();
    if (kind === 'floe') {
      ctx.strokeStyle = theme.stone;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centre.x - cell * 0.2, centre.y - cell * 0.25);
      ctx.lineTo(centre.x - cell * 0.05, centre.y);
      ctx.lineTo(centre.x - cell * 0.12, centre.y + cell * 0.22);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (kind === 'frozen' && since < 0.5) sprites.draw(ctx, 'snowflake', centre.x, centre.y, cell * 0.7, { alpha: 1 - since / 0.5, rotate: since * 4 });
  });
  // Faint grid over the lake, so the squares read as squares.
  ctx.strokeStyle = theme.light;
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 2;
  for (let x = left + cell; x < left + lakeW - 1; x += cell) {
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, top + lakeH);
    ctx.stroke();
  }
  for (let y = top + cell; y < top + lakeH - 1; y += cell) {
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + lakeW, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Snowflakes left to spend.
  const flakeSize = 40;
  for (let k = 0; k < state.budget; k += 1) {
    const x = arena.width / 2 + (k - (state.budget - 1) / 2) * (flakeSize + 6);
    sprites.draw(ctx, 'snowflake', x, state.flakesY, flakeSize, { alpha: k < state.snowflakes ? 1 : 0.25 });
  }

  // The penguin and its fish.
  const laneOf = (i: number | undefined): number => Math.floor((i ?? 0) / cols);
  const fishLane = state.path.length > 0 ? laneOf(state.path[state.path.length - 1]) : state.penguinRow;
  const fish = shorePoint(state, 'end', fishLane);
  sprites.draw(ctx, 'fish', fish.x, fish.y + bob(view, 3, 4), Math.min(70, cell * 0.8));
  let at: Point = shorePoint(state, 'start', state.penguinRow);
  if (state.phase === 'cross' && state.path.length > 0) {
    const points = [shorePoint(state, 'start', laneOf(state.path[0])), ...state.path.map((i) => cellCentre(state, i)), fish];
    const t = Math.min(1, state.phaseAgo / 1.3) * (points.length - 1);
    const k = Math.min(points.length - 2, Math.floor(t));
    const a = points[k];
    const b = points[k + 1];
    if (a && b) at = { x: a.x + (b.x - a.x) * (t - k), y: a.y + (b.y - a.y) * (t - k) };
  }
  paintShadow(ctx, view, at.x, at.y + cell * 0.35, cell * 0.6);
  const waddle = state.phase === 'cross' && !view.reducedMotion ? Math.sin(view.time * 18) * 0.15 : 0;
  sprites.draw(ctx, 'penguin', at.x, at.y - 6, Math.min(90, cell * 0.95), { rotate: waddle });
  if (state.phase === 'melt') paintLabel(ctx, view, 'Băng tan rồi!', arena.width / 2, top + lakeH / 2, 40, theme.light);
}
