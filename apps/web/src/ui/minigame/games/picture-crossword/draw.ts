// Picture crossword's picture: a notebook page with the crossword: white cells with a thick outline, the given
// first letters in ink, letters the child put in in the theme's colour, empty cells softly dashed. Each word's
// picture sits on a card beside its first cell with a small arrow (→ across, ↓ down). The letters wait in the
// tray as round wooden tokens; a chosen one is ringed in gold, a dragged one follows the finger, a wrong one
// shakes; while the tray rests the tokens are dimmed. A finished crossword shines.
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { cellCentre, type CrosswordState, type Tile } from './logic';

function paintTile(ctx: CanvasRenderingContext2D, view: DrawView, tile: Tile, x: number, y: number, r: number, chosen: boolean, alpha: number): void {
  const { theme } = view;
  ctx.globalAlpha = alpha * 0.25;
  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.arc(x + 3, y + 6, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = theme.wood;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = chosen ? 8 : 5;
  ctx.strokeStyle = chosen ? theme.star : theme.woodEdge;
  ctx.stroke();
  paintLabel(ctx, view, tile.letter, x, y + 3, r * 0.95);
  ctx.globalAlpha = 1;
}

export function drawPictureCrossword(ctx: CanvasRenderingContext2D, state: CrosswordState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, arena.height, 4);
  const s = state.size;
  const shine = state.finished >= 0 && !view.reducedMotion ? 0.5 + 0.5 * Math.sin(state.finished * 12) : 0;

  for (const badge of state.badges) {
    const c = cellCentre(state, badge.row, badge.col);
    ctx.fillStyle = theme.light;
    ctx.globalAlpha = 0.85;
    roundRect(ctx, c.x - s * 0.46, c.y - s * 0.46, s * 0.92, s * 0.92, 14);
    ctx.fill();
    ctx.globalAlpha = 1;
    sprites.draw(ctx, badge.word.picture, c.x, c.y - s * 0.04, s * 0.7);
    const across = badge.word.dir === 'across';
    const toRight = across && badge.col < badge.word.col;
    const toDown = !across && badge.row < badge.word.row;
    const arrow = across ? (toRight ? '→' : '←') : toDown ? '↓' : '↑';
    paintLabel(ctx, view, arrow, c.x + (across ? (toRight ? s * 0.36 : -s * 0.36) : s * 0.32), c.y + (across ? s * 0.3 : toDown ? s * 0.36 : -s * 0.36), s * 0.3, theme.primary);
  }

  for (const cell of state.cells) {
    const c = cellCentre(state, cell.row, cell.col);
    const x = c.x - s / 2;
    const y = c.y - s / 2;
    ctx.fillStyle = state.finished >= 0 ? theme.star : theme.light;
    ctx.globalAlpha = state.finished >= 0 ? 0.6 + 0.4 * shine : 1;
    ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 2, y + 2, s - 4, s - 4);
    if (cell.filled) {
      paintLabel(ctx, view, cell.letter, c.x, c.y + 3, s * 0.55, cell.given ? theme.light : theme.secondary);
    } else {
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = theme.stone;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 10, y + 10, s - 20, s - 20);
      ctx.setLineDash([]);
    }
  }

  const resting = state.sulk > 0 ? 0.55 : 1;
  state.tiles.forEach((tile, i) => {
    if (tile.used || (state.pick.dragging && state.pick.held === i)) return;
    const shake = tile.bounced < 0.45 && !view.reducedMotion ? Math.sin(tile.bounced * 45) * 10 * (1 - tile.bounced / 0.45) : 0;
    paintTile(ctx, view, tile, tile.home.x + shake, tile.home.y, state.tileRadius, state.pick.selected === i, resting);
  });
  const dragged = state.pick.dragging ? state.tiles[state.pick.held] : undefined;
  if (dragged && state.pick.at) paintTile(ctx, view, dragged, state.pick.at.x, state.pick.at.y - 20, state.tileRadius * 1.08, true, 1);
}
