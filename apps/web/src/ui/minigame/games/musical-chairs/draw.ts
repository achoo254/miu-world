// Musical chairs' picture: a party floor with a round rug, a dashed walking ring, four chairs with coloured
// cushions, the child and her friends walking round (bobbing to the tune) or sitting, musical notes floating
// up while the music plays, a big "DỪNG!" when it stops, and the round's result in words.
import { bob, paintLabel, paintShadow, roundRect } from '../../draw-kit';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { ChairsState } from './logic';

const FRIENDS: readonly SpriteName[] = ['rabbit', 'fox', 'bear', 'panda', 'dog-face', 'frog'];

function paintChair(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, cushion: string, glow: boolean): void {
  const { theme } = view;
  if (glow) {
    ctx.globalAlpha = 0.35 + 0.2 * Math.sin(view.time * 10);
    ctx.fillStyle = theme.star;
    ctx.beginPath();
    ctx.arc(x, y, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  paintShadow(ctx, view, x, y + 40, 80);
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 4;
  ctx.fillStyle = theme.wood;
  // Back, legs, seat.
  roundRect(ctx, x - 30, y - 50, 60, 44, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(x - 30, y + 6, 9, 34);
  ctx.fillRect(x + 21, y + 6, 9, 34);
  ctx.strokeRect(x - 30, y + 6, 9, 34);
  ctx.strokeRect(x + 21, y + 6, 9, 34);
  ctx.fillStyle = cushion;
  roundRect(ctx, x - 38, y - 8, 76, 18, 8);
  ctx.fill();
  ctx.stroke();
}

export function drawMusicalChairs(ctx: CanvasRenderingContext2D, state: ChairsState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { centre, walkRadius } = state;
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, arena.width, arena.height);
  // Floor boards.
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = theme.ink;
  for (let y = 0; y < arena.height; y += 70) ctx.fillRect(0, y, arena.width, 4);
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = theme.light;
  ctx.beginPath();
  ctx.ellipse(centre.x, centre.y, walkRadius + 70, walkRadius + 60, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 6;
  ctx.setLineDash([18, 16]);
  ctx.beginPath();
  ctx.arc(centre.x, centre.y, walkRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  // Party balloons in the corners.
  sprites.draw(ctx, 'balloon', 50, HUD_SAFE_TOP + 40 + bob(view, 2, 8), 70, { rotate: -0.15 });
  sprites.draw(ctx, 'balloon', arena.width - 50, HUD_SAFE_TOP + 50 + bob(view, 2, 8, 1), 70, { rotate: 0.15 });

  const cushions = [theme.primary, theme.secondary, theme.star, theme.leaf];
  const scramble = state.phase === 'scramble';
  state.chairs.forEach((c, i) => paintChair(ctx, view, c.x, c.y, cushions[i % cushions.length] ?? theme.primary, scramble && state.occupant[i] === -1));

  const friends = FRIENDS.filter((f) => f !== view.player);
  const order = state.walkers.map((w, who) => ({ w, who })).sort((a, b) => a.w.y - b.w.y);
  for (const { w, who } of order) {
    const sprite = who === 0 ? view.player : (friends[(who - 1) % friends.length] ?? 'rabbit');
    const walking = state.phase === 'music' ? bob(view, 10, 7, who) : 0;
    const sitting = w.seated ? -28 : 0;
    const stumble = who === 0 && state.stumble > 0 && !view.reducedMotion ? Math.sin(state.stumble * 30) * 0.25 : 0;
    if (!w.seated) paintShadow(ctx, view, w.x, w.y + 38, 66);
    sprites.draw(ctx, sprite, w.x, w.y + sitting + walking, who === 0 ? 86 : 76, { rotate: stumble });
    if (who === 0 && !w.seated) {
      // A ring under the child, so she finds herself among the friends.
      ctx.strokeStyle = theme.primary;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(w.x, w.y + 40, 40, 13, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  const labelY = HUD_SAFE_TOP + 34;
  if (state.phase === 'music') {
    for (let i = 0; i < 4; i += 1) {
      const t = (view.time * 0.6 + i / 4) % 1;
      const x = centre.x + Math.sin(i * 2.1 + view.time) * 60;
      sprites.draw(ctx, 'musical-note', x, centre.y - t * 110, 44, { alpha: 1 - t });
    }
    if (state.stumble > 0) paintLabel(ctx, view, 'Nhạc chưa dừng mà!', centre.x, labelY, 36);
  } else if (scramble) {
    const grow = view.reducedMotion ? 1 : Math.min(1, state.phaseTime / 0.12);
    paintLabel(ctx, view, 'DỪNG! Ngồi xuống!', centre.x, labelY, 52 * grow, theme.star);
  } else {
    paintLabel(ctx, view, state.won ? 'Có ghế rồi!' : 'Hụt mất rồi, vòng sau nhé!', centre.x, labelY, state.won ? 50 : 38, state.won ? theme.star : theme.light);
  }
}
