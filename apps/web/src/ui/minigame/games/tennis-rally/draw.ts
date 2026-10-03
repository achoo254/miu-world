// Table tennis's picture: a hall floor, the blue table with its white lines and net, Khỉ behind the far end
// and the child behind the near end, each with a bat, the ball with its shadow (it arcs over the net and
// bounces), the ring around the child's bat that lights while the ball can be hit, the game's score on a
// little board, and words for a smash, a miss and each point.
import { paintLabel, paintShadow, roundRect } from '../../draw-kit';
import type { DrawView, Point } from '../../types';
import { RING, toScreen, type TennisRallyState } from './logic';

function paintBat(ctx: CanvasRenderingContext2D, view: DrawView, p: Point, swing: number): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(swing);
  ctx.fillStyle = view.theme.wood;
  ctx.fillRect(-6, 14, 12, 30);
  ctx.fillStyle = view.theme.danger;
  ctx.strokeStyle = view.theme.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawTennisRally(ctx: CanvasRenderingContext2D, state: TennisRallyState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.stone;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = theme.stoneEdge;
  for (let x = 0; x < arena.width; x += 70) ctx.fillRect(x, 0, 3, arena.height);
  ctx.globalAlpha = 1;

  const { x, y, w, h } = state.table;
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.25;
  roundRect(ctx, x + 8, y + 12, w, h, 10);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.secondary;
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 6;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  const mid = (a: Point, b: Point) => {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  };
  ctx.lineWidth = 3;
  mid(toScreen(state, 0, 0), toScreen(state, 1, 0));
  // The net across the middle.
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 8;
  mid(toScreen(state, 0.5, -1.12), toScreen(state, 0.5, 1.12));
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 3;
  mid(toScreen(state, 0.5, -1.12), toScreen(state, 0.5, 1.12));

  // The score board first, so the players are never hidden behind it.
  const board = state.wide ? { x: x + w / 2, y: y - 50 } : { x: arena.width / 2, y: y - 70 };
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, board.x - 110, board.y - 30, 220, 60, 18);
  ctx.fill();
  ctx.stroke();
  sprites.draw(ctx, view.player, board.x - 80, board.y, 44);
  sprites.draw(ctx, 'monkey-face', board.x + 80, board.y, 44);
  paintLabel(ctx, view, `${state.mine} – ${state.theirs}`, board.x, board.y + 2, 34, theme.star);

  // Beyond an end of the table by a fixed distance (the table's length differs by screen).
  const beyond = (end: 0 | 1, l: number, units: number): Point => {
    const p = toScreen(state, end, l);
    const out = end === 1 ? 1 : -1;
    return state.wide ? { x: p.x + out * units, y: p.y } : { x: p.x, y: p.y - out * units };
  };
  // Khỉ and its bat.
  const khi = beyond(1, state.khiL, 40);
  const khiBody = beyond(1, state.khiL, 100);
  sprites.draw(ctx, 'monkey-face', khiBody.x, khiBody.y, 90);
  paintBat(ctx, view, khi, 0);

  // The ring and the child.
  const b = state.ball;
  const me = toScreen(state, 0, state.childL);
  const inRing = state.phase === 'play' && b.toward === 'child' && Math.abs(b.d) <= RING;
  const ringR = (RING * (state.wide ? w : h)) / 1;
  ctx.strokeStyle = inRing ? theme.star : theme.light;
  ctx.globalAlpha = inRing ? 1 : 0.6;
  ctx.lineWidth = inRing ? 8 : 4;
  ctx.setLineDash(inRing ? [] : [10, 8]);
  ctx.beginPath();
  ctx.arc(me.x, me.y, ringR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  const body = beyond(0, state.childL, 100);
  sprites.draw(ctx, view.player, body.x, body.y, 96);
  const swing = state.swingAgo < 0.25 && !view.reducedMotion ? Math.sin((state.swingAgo / 0.25) * Math.PI) * 1.1 : 0;
  paintBat(ctx, view, beyond(0, state.childL + 0.18, 34), swing);

  // The ball: up over the net, bouncing once on the far half from the hitter.
  if (state.phase !== 'serve') {
    const p = b.t / b.flight;
    const bounceAt = 0.62;
    const z = p < bounceAt ? Math.sin((p / bounceAt) * Math.PI) * 60 : Math.sin(((p - bounceAt) / (1 - bounceAt)) * Math.PI) * 40;
    const at = toScreen(state, b.d, b.l);
    paintShadow(ctx, view, at.x, at.y + 6, 30, z / 80);
    ctx.fillStyle = theme.light;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(at.x, at.y - z, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  const words =
    state.phase === 'point' ? (state.lastPoint === 'child' ? 'Ghi điểm!' : 'Khỉ được điểm') : state.swingAgo < 0.6 ? (state.swingHit ? (state.smash ? 'Đập mạnh!' : '') : 'Hụt rồi!') : '';
  const wordsAt = toScreen(state, 0.25, 0);
  if (words) paintLabel(ctx, view, words, wordsAt.x, wordsAt.y, 40, state.lastPoint === 'khi' && state.phase === 'point' ? theme.light : theme.star);
}
