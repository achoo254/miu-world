// Paper route's picture: sky over a row of houses with front lawns, a pavement with a mailbox in front of
// each house (red flag up when it waits for the paper, a glow ring when it is in reach), the road with
// dashes rolling by, the child on her bicycle, newspapers spinning through the air to the boxes, and a
// little burst of sparkles from a box that just got its paper.
import { bob, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { REACH, type Mailbox, type PaperRouteState } from './logic';

function paintMailbox(ctx: CanvasRenderingContext2D, view: DrawView, state: PaperRouteState, box: Mailbox): void {
  const { theme, sprites } = view;
  const y = state.boxY;
  const waiting = box.flagUp && box.x > state.bikeX - 30 && box.x < state.bikeX + REACH;
  if (waiting) {
    ctx.globalAlpha = 0.35 + 0.2 * Math.sin(view.time * 7 + box.id);
    ctx.fillStyle = theme.star;
    ctx.beginPath();
    ctx.arc(box.x, y - 30, 66, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Post, box and flag.
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(box.x - 6, y - 10, 12, 70);
  ctx.fillStyle = theme.secondary;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, box.x - 36, y - 56, 72, 48, 22);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.ink;
  ctx.fillRect(box.x - 30, y - 22, 26, 6);
  ctx.fillStyle = theme.danger;
  ctx.save();
  ctx.translate(box.x + 30, y - 30);
  ctx.rotate(box.flagUp ? 0 : Math.PI / 2);
  ctx.fillRect(-4, -46, 8, 46);
  ctx.fillRect(-4, -46, 30, 20);
  ctx.restore();
  if (box.delivered >= 0 && box.delivered < 0.8) sprites.draw(ctx, 'sparkles', box.x, y - 90 - box.delivered * 40, 60, { alpha: 1 - box.delivered / 0.8 });
}

export function drawPaperRoute(ctx: CanvasRenderingContext2D, state: PaperRouteState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, state.houseY + 20, 6);
  // Lawns, pavement, road.
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, state.houseY, arena.width, arena.height - state.houseY);
  ctx.fillStyle = theme.stone;
  ctx.fillRect(0, state.boxY + 40, arena.width, state.roadY - state.boxY - 60);
  ctx.fillStyle = theme.stoneEdge;
  ctx.fillRect(0, state.roadY - 26, arena.width, arena.height - state.roadY + 26);
  ctx.fillStyle = theme.light;
  const dash = 120;
  for (let x = -(state.scroll % dash); x < arena.width; x += dash) ctx.fillRect(x, state.roadY + 26, 60, 8);

  // Houses behind their boxes.
  for (const box of state.boxes) sprites.draw(ctx, 'house', box.x - 10, state.houseY - 70, 180);
  for (const box of state.boxes) paintMailbox(ctx, view, state, box);

  // The child on her bike.
  const pedal = view.reducedMotion ? 0 : Math.abs(Math.sin(view.time * 10)) * 4;
  sprites.draw(ctx, 'bicycle', state.bikeX, state.roadY - 30, 130);
  sprites.draw(ctx, view.player, state.bikeX - 4, state.roadY - 100 - pedal + bob(view, 3, 1), 92);

  for (const paper of state.papers) {
    const box = state.boxes.find((b) => b.id === paper.box);
    if (!box) continue;
    const p = Math.min(1, paper.t / 0.4);
    if (p < 1) {
      const x = paper.fromX + (box.x - paper.fromX) * p;
      const y = paper.fromY + (state.boxY - 40 - paper.fromY) * p - Math.sin(p * Math.PI) * 120;
      sprites.draw(ctx, 'newspaper', x, y, 56, { rotate: view.reducedMotion ? 0 : paper.t * 18 });
    } else if (!paper.hit) {
      // Bounced off a box that wanted nothing.
      const after = paper.t - 0.4;
      sprites.draw(ctx, 'newspaper', box.x + 20 + after * 120, state.boxY - 40 + after * 260, 50, { alpha: 1 - after / 0.5, rotate: after * 10 });
    }
  }
  if (state.score === 0 && state.time < 6) paintLabel(ctx, view, 'Chạm hộp thư giơ cờ đỏ!', arena.width / 2, Math.max(140, state.houseY - 200), 34);
}
