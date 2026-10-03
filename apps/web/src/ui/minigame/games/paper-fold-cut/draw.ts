// Paper fold and cut's picture: a craft table; the picture of the opened paper on a card ("Mẫu"); the folded
// paper with fold edges marked and three dashed cut lines; after a cut, the paper opening: the right shape
// sparkles, a wrong one shows beside the picture with "Khác mẫu".
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView, Point } from '../../types';
import type { Fold, FoldState } from './logic';

/** Draws the opened paper: the folded piece copied round by the folds (rotations and mirrors). */
function paintOpened(ctx: CanvasRenderingContext2D, kept: readonly Point[], fold: Fold, at: Point, scale: number, colour: string): void {
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.scale(scale, scale);
  for (let k = 0; k < fold; k += 1) {
    for (const mirror of [1, -1]) {
      ctx.save();
      ctx.rotate((k * Math.PI * 2) / fold);
      ctx.scale(1, mirror);
      ctx.beginPath();
      kept.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.fillStyle = colour;
      ctx.fill();
      // Seal the seams between copies.
      ctx.lineWidth = 2 / scale;
      ctx.strokeStyle = colour;
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
}

export function drawPaperFoldCut(ctx: CanvasRenderingContext2D, state: FoldState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.fillStyle = theme.secondary;
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 6; i += 1) sprites.draw(ctx, 'snowflake', (i * 173) % arena.width, 130 + ((i * 251) % (arena.height - 140)), 50, { alpha: 0.25 });
  ctx.globalAlpha = 1;

  const s = state.scale;
  // The picture card.
  const { picture } = state;
  ctx.fillStyle = theme.ink;
  roundRect(ctx, picture.x - s * 1.15, picture.y - s * 1.15, s * 2.3, s * 2.3, 20);
  ctx.fill();
  const answer = state.cuts[state.answer];
  if (answer) paintOpened(ctx, answer.kept, state.fold, picture, s, theme.light);
  paintLabel(ctx, view, 'Mẫu', picture.x, picture.y - s * 1.15 - 4, 28, theme.star);

  const tried = state.tried;
  if (tried) {
    const cut = state.cuts[tried.cut];
    if (cut) {
      ctx.fillStyle = theme.groundDeep;
      roundRect(ctx, state.paper.x - s * 1.15, state.paper.y - s * 1.15, s * 2.3, s * 2.3, 20);
      ctx.fill();
      const open = Math.min(1, tried.ago / 0.4);
      paintOpened(ctx, cut.kept, state.fold, state.paper, s * open, tried.right ? theme.star : theme.light);
    }
    paintLabel(ctx, view, tried.right ? 'Giống mẫu!' : 'Khác mẫu, thử lại', state.paper.x, state.paper.y + s * 1.15 + 26, 32, tried.right ? theme.star : theme.light);
    if (tried.right) sprites.draw(ctx, 'sparkles', state.paper.x, state.paper.y, s * 1.6, { alpha: Math.max(0, 1 - tried.ago / 1.3) });
    return;
  }

  // The folded paper.
  const xs = state.piece.map((q) => q.x);
  const ys = state.piece.map((q) => q.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const k = state.paperK;
  const at = (p: Point): Point => ({ x: state.paper.x + (p.x - cx) * k, y: state.paper.y + (p.y - cy) * k });
  ctx.beginPath();
  state.piece.forEach((p, i) => {
    const q = at(p);
    if (i === 0) ctx.moveTo(q.x, q.y);
    else ctx.lineTo(q.x, q.y);
  });
  ctx.closePath();
  ctx.fillStyle = theme.light;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.stoneEdge;
  ctx.stroke();
  // Fold edges (the ones through the paper's middle), drawn thicker.
  ctx.lineWidth = 8;
  ctx.strokeStyle = theme.secondary;
  const o = at({ x: 0, y: 0 });
  if (state.fold === 1) {
    const a = at({ x: -1, y: 0 });
    const b = at({ x: 1, y: 0 });
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  } else {
    const p1 = at(state.piece[1] ?? { x: 1, y: 0 });
    const p2 = at(state.piece[state.piece.length - 1] ?? { x: 0, y: 1 });
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(o.x, o.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
  // Cut lines.
  state.cuts.forEach((c) => {
    const a = at(c.a);
    const b = at(c.b);
    ctx.setLineDash([12, 10]);
    ctx.lineWidth = 6;
    ctx.strokeStyle = theme.primary;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = theme.primary;
    for (const p of [a, b]) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  const label = { 1: 'Gấp đôi', 2: 'Gấp tư', 4: 'Gấp tám', 6: 'Gấp mười hai' }[state.fold];
  paintLabel(ctx, view, `${label}: vuốt theo một đường cắt`, state.paper.x, Math.max(130, state.paper.y - s * 1.35), Math.min(28, arena.width / 24));
}
