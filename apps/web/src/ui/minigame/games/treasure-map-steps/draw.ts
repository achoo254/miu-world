// Treasure map's picture: the sea with an island of sand tiles, a few palms on its shore, the child walking from
// tile to tile (counting each step above her head), and the map scroll with the moves as big numbers and
// arrows (the move to do now glows, done moves get a tick). At the end a hole and a gift popping out.
import { bob, paintLabel, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView, type Point } from '../../types';
import { STEP_SECONDS, targetCell, type Cell, type Dir, type TreasureState } from './logic';

const ANGLE: Readonly<Record<Dir, number>> = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
const WORD: Readonly<Record<Dir, string>> = { up: 'lên', down: 'xuống', left: 'trái', right: 'phải' };

export function paintArrow(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, dir: Dir, fill: string, edge: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ANGLE[dir]);
  ctx.beginPath();
  ctx.moveTo(size / 2, 0);
  ctx.lineTo(0, -size / 2);
  ctx.lineTo(0, -size / 5);
  ctx.lineTo(-size / 2, -size / 5);
  ctx.lineTo(-size / 2, size / 5);
  ctx.lineTo(0, size / 5);
  ctx.lineTo(0, size / 2);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = edge;
  ctx.stroke();
  ctx.restore();
}

function paintTick(ctx: CanvasRenderingContext2D, x: number, y: number, view: DrawView): void {
  ctx.fillStyle = view.theme.leaf;
  ctx.beginPath();
  ctx.arc(x, y, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = view.theme.light;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 8, y);
  ctx.lineTo(x - 2, y + 7);
  ctx.lineTo(x + 9, y - 7);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

function paintScroll(ctx: CanvasRenderingContext2D, state: TreasureState, view: DrawView): void {
  const { theme } = view;
  const { x, y, w, h, vertical } = state.scroll;
  ctx.fillStyle = theme.light;
  roundRect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = theme.woodEdge;
  ctx.stroke();
  ctx.fillStyle = theme.wood;
  if (vertical) {
    roundRect(ctx, x - 6, y - 8, w + 12, 16, 8);
    ctx.fill();
    roundRect(ctx, x - 6, y + h - 8, w + 12, 16, 8);
    ctx.fill();
  } else {
    roundRect(ctx, x - 8, y - 6, 16, h + 12, 8);
    ctx.fill();
    roundRect(ctx, x + w - 8, y - 6, 16, h + 12, 8);
    ctx.fill();
  }
  const n = state.moves.length;
  state.moves.forEach((move, i) => {
    const slot = vertical ? { x: x + w / 2, y: y + (h / n) * (i + 0.5), w: w - 20, h: Math.min(130, h / n - 12) } : { x: x + (w / n) * (i + 0.5), y: y + h / 2, w: Math.min(220, w / n - 14), h: h - 20 };
    const current = i === state.moveIndex && state.phase !== 'dig';
    const done = i < state.moveIndex;
    if (current) {
      ctx.fillStyle = theme.star;
      roundRect(ctx, slot.x - slot.w / 2, slot.y - slot.h / 2, slot.w, slot.h, 14);
      ctx.fill();
    }
    ctx.globalAlpha = done ? 0.45 : 1;
    const big = Math.min(slot.h * 0.55, 56);
    ctx.font = `800 ${Math.round(big)}px ${theme.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = theme.ink;
    ctx.fillText(String(move.count), slot.x - big * 0.75, slot.y - slot.h * 0.12);
    paintArrow(ctx, slot.x + big * 0.55, slot.y - slot.h * 0.12, big * 1.05, move.dir, theme.primary, theme.ink);
    ctx.font = `700 ${Math.round(big * 0.38)}px ${theme.font}`;
    ctx.fillText(`bước ${WORD[move.dir]}`, slot.x, slot.y + slot.h * 0.3);
    ctx.globalAlpha = 1;
    if (done) paintTick(ctx, slot.x + slot.w / 2 - 22, slot.y - slot.h / 2 + 20, view);
  });
}

function cellCentre(state: TreasureState, c: Cell): Point {
  return { x: state.grid.x + (c.cx + 0.5) * state.cell, y: state.grid.y + (c.cy + 0.5) * state.cell };
}

export function drawTreasureMap(ctx: CanvasRenderingContext2D, state: TreasureState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  // The sea, with slow waves.
  ctx.fillStyle = theme.water;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.strokeStyle = theme.waterLight;
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.5;
  for (let y = HUD_SAFE_TOP - 40; y < arena.height; y += 46) {
    ctx.beginPath();
    for (let x = 0; x <= arena.width; x += 20) {
      const wy = y + Math.sin(x / 40 + view.time * (view.reducedMotion ? 0 : 1.5) + y) * 5;
      if (x === 0) ctx.moveTo(x, wy);
      else ctx.lineTo(x, wy);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const { grid, cell, cols, rows } = state;
  // Shore and tiles.
  ctx.fillStyle = theme.groundDeep;
  roundRect(ctx, grid.x - 16, grid.y - 10, cols * cell + 32, rows * cell + 30, 40);
  ctx.fill();
  ctx.fillStyle = theme.ground;
  roundRect(ctx, grid.x - 16, grid.y - 16, cols * cell + 32, rows * cell + 30, 40);
  ctx.fill();
  const hint = state.misses >= 2 && state.phase === 'play' ? targetCell(state) : null;
  for (let cy = 0; cy < rows; cy += 1) {
    for (let cx = 0; cx < cols; cx += 1) {
      const x = grid.x + cx * cell;
      const y = grid.y + cy * cell;
      const shaking = state.wrong && state.wrong.cx === cx && state.wrong.cy === cy && state.wrongAgo < 0.4;
      const dx = shaking && !view.reducedMotion ? Math.sin(state.wrongAgo * 60) * 5 : 0;
      ctx.fillStyle = (cx + cy) % 2 === 0 ? theme.light : theme.ground;
      ctx.globalAlpha = 0.7;
      roundRect(ctx, x + 3 + dx, y + 3, cell - 6, cell - 6, 12);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (shaking) {
        ctx.strokeStyle = theme.danger;
        ctx.lineWidth = 5;
        ctx.stroke();
      }
      if (hint && hint.cx === cx && hint.cy === cy) {
        ctx.globalAlpha = 0.5 + (view.reducedMotion ? 0 : 0.3 * Math.sin(view.time * 8));
        ctx.strokeStyle = theme.star;
        ctx.lineWidth = 8;
        roundRect(ctx, x + 6, y + 6, cell - 12, cell - 12, 12);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }
  // Palms at the island's corners.
  sprites.draw(ctx, 'palm-tree', grid.x - 4, grid.y + rows * cell - 30, cell * 0.9);
  sprites.draw(ctx, 'palm-tree', grid.x + cols * cell + 4, grid.y + 20, cell * 0.9);

  // The child, gliding between tiles while walking.
  let pos = cellCentre(state, state.at);
  const next = state.path[0];
  if (state.phase === 'walk' && next) {
    const t = Math.min(1, state.stepTime / STEP_SECONDS);
    const to = cellCentre(state, next);
    pos = { x: pos.x + (to.x - pos.x) * t, y: pos.y + (to.y - pos.y) * t - (view.reducedMotion ? 0 : Math.sin(t * Math.PI) * 14) };
  }
  if (state.phase === 'dig') {
    const t = state.phaseTime;
    const at = cellCentre(state, state.at);
    sprites.draw(ctx, 'hole', at.x, at.y + cell * 0.12, cell * 0.8);
    if (t > 0.5) sprites.draw(ctx, 'gift', at.x, at.y - Math.min(1, (t - 0.5) / 0.4) * cell * 0.6, cell * 0.75);
    if (t > 0.8) sprites.draw(ctx, 'sparkles', at.x + cell * 0.4, at.y - cell * 0.8, cell * 0.5);
    pos = { x: at.x - cell * 0.55, y: at.y };
  }
  sprites.draw(ctx, view.player, pos.x, pos.y - cell * 0.1 + (state.phase === 'play' ? bob(view, 3, 3) : 0), cell * 0.82);
  if (state.phase === 'walk' && state.counted > 0) paintLabel(ctx, view, String(state.counted), pos.x, pos.y - cell * 0.75, 40, theme.star);
  paintScroll(ctx, state, view);
}
