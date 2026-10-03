// Word maze's picture: the verse on a paper strip at the top with its picture, the syllables already walked
// in the leaf colour and the next one in gold; under it a grid of wooden tiles with one syllable each. The
// walked tiles turn blue and a thick ribbon joins them; the last one glows to show where to go on from. A
// wrong tile shakes, and the grid dims while it rests. A finished verse makes the ribbon shine.
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { cellCentre, syllables, VERSES, type MazeState } from './logic';

function paintVerse(ctx: CanvasRenderingContext2D, view: DrawView, state: MazeState): void {
  const { arena, theme, sprites } = view;
  const verse = VERSES[state.verse];
  if (!verse) return;
  const words = syllables(verse);
  const y = HUD_SAFE_TOP + 52;
  const stripW = arena.width - 30;
  ctx.fillStyle = theme.light;
  roundRect(ctx, 15, y - 44, stripW, 88, 20);
  ctx.fill();
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 4;
  ctx.stroke();
  sprites.draw(ctx, verse.picture, 62, y, 70);
  // Words one by one so each can take its own colour; shrink the font until the verse fits.
  let font = 38;
  const measure = (): number => {
    ctx.font = `800 ${font}px ${theme.font}`;
    return words.reduce((sum, w) => sum + ctx.measureText(`${w} `).width, 0);
  };
  const room = stripW - 120;
  while (measure() > room && font > 20) font -= 2;
  let x = 110 + Math.max(0, (room - measure()) / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  words.forEach((w, i) => {
    const colour = i < state.walked.length ? theme.leaf : i === state.walked.length ? theme.primary : theme.ink;
    ctx.fillStyle = colour;
    ctx.fillText(w, x, y + 2);
    const wWidth = ctx.measureText(w).width;
    if (i === state.walked.length && state.finished < 0) ctx.fillRect(x, y + font * 0.55, wWidth, 4);
    x += ctx.measureText(`${w} `).width;
  });
}

export function drawWordMaze(ctx: CanvasRenderingContext2D, state: MazeState, view: DrawView): void {
  const { arena, theme } = view;
  paintSky(ctx, view, arena.height, 5);
  paintVerse(ctx, view, state);
  const s = state.size;
  const resting = state.sulk > 0;

  // The ribbon through the walked tiles (under them).
  if (state.walked.length > 1) {
    ctx.strokeStyle = state.finished >= 0 ? theme.star : theme.secondary;
    ctx.lineWidth = s * 0.3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    state.walked.forEach((i, k) => {
      const p = cellCentre(state, i);
      if (k === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  state.cells.forEach((cell, i) => {
    const p = cellCentre(state, i);
    const walkedAt = state.walked.indexOf(i);
    const last = walkedAt === state.walked.length - 1 && state.finished < 0;
    const shake = cell.shook < 0.4 && !view.reducedMotion ? Math.sin(cell.shook * 50) * 8 * (1 - cell.shook / 0.4) : 0;
    const tile = s * 0.86;
    ctx.globalAlpha = resting && walkedAt < 0 ? 0.6 : 1;
    if (last) {
      ctx.fillStyle = theme.star;
      ctx.globalAlpha = 0.5 + (view.reducedMotion ? 0 : 0.3 * Math.sin(view.time * 6));
      roundRect(ctx, p.x - tile / 2 - 8, p.y - tile / 2 - 8, tile + 16, tile + 16, 20);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = walkedAt >= 0 ? theme.secondary : theme.wood;
    roundRect(ctx, p.x - tile / 2 + shake, p.y - tile / 2, tile, tile, 16);
    ctx.fill();
    ctx.strokeStyle = walkedAt >= 0 ? theme.ink : theme.woodEdge;
    ctx.lineWidth = 4;
    ctx.stroke();
    paintLabel(ctx, view, cell.text, p.x + shake, p.y + 2, Math.min(40, s * 0.3));
    ctx.globalAlpha = 1;
  });
}
