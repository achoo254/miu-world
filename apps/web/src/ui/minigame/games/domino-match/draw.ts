// Domino match's picture: a green felt table, the friend (a panda) with her dominoes face down at the top, the
// line of dominoes in the middle (the far middle squeezed into "…" when it grows long), glowing rings on the
// ends when a domino fits both, the child's dominoes standing at the bottom (the playable ones lifted a little),
// the draw pile with its count, and whose turn it is.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { HUD_SAFE_TOP } from '../../types';
import { fits, type DominoState, type Tile } from './logic';

const PIP_SPOTS: Record<number, Array<[number, number]>> = {
  0: [],
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

function paintPips(ctx: CanvasRenderingContext2D, view: DrawView, n: number, cx: number, cy: number, size: number): void {
  ctx.fillStyle = view.theme.ink;
  for (const [dx, dy] of PIP_SPOTS[n] ?? []) {
    ctx.beginPath();
    ctx.arc(cx + dx * size * 0.28, cy + dy * size * 0.28, size * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A domino centred at (x, y): across (halves left and right) or standing (halves top and bottom). */
function paintTile(ctx: CanvasRenderingContext2D, view: DrawView, tile: Tile, x: number, y: number, half: number, across: boolean, faceDown = false): void {
  const { theme } = view;
  const w = across ? half * 2 : half;
  const h = across ? half : half * 2;
  ctx.fillStyle = faceDown ? theme.secondary : theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  roundRect(ctx, x - w / 2, y - h / 2, w, h, half * 0.18);
  ctx.fill();
  ctx.stroke();
  if (faceDown) return;
  ctx.beginPath();
  if (across) {
    ctx.moveTo(x, y - h / 2 + 5);
    ctx.lineTo(x, y + h / 2 - 5);
  } else {
    ctx.moveTo(x - w / 2 + 5, y);
    ctx.lineTo(x + w / 2 - 5, y);
  }
  ctx.stroke();
  if (across) {
    paintPips(ctx, view, tile[0], x - half / 2, y, half);
    paintPips(ctx, view, tile[1], x + half / 2, y, half);
  } else {
    paintPips(ctx, view, tile[0], x, y - half / 2, half);
    paintPips(ctx, view, tile[1], x, y + half / 2, half);
  }
}

export function drawDominoMatch(ctx: CanvasRenderingContext2D, state: DominoState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.leaf;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 16;
  ctx.strokeRect(8, HUD_SAFE_TOP - 30, arena.width - 16, arena.height - HUD_SAFE_TOP + 22);

  // The friend and her hidden dominoes.
  const fy = HUD_SAFE_TOP + 30;
  sprites.draw(ctx, 'panda', 60, fy, 70);
  state.friend.forEach((t, i) => paintTile(ctx, view, t, 120 + i * 40, fy, 34, false, true));
  if (state.turn === 'friend') paintLabel(ctx, view, 'Bạn đang nghĩ…', arena.width / 2 + 80, fy, 26, theme.light);

  // The line: the last three tiles at each end, the middle squeezed.
  const y = state.ends.left.y;
  const chain = state.chain;
  const shown = chain.length <= 7 ? chain : [...chain.slice(0, 3), null, ...chain.slice(-3)];
  const tileW = 76;
  const x0 = arena.width / 2 - (shown.length * tileW) / 2 + tileW / 2;
  shown.forEach((t, k) => {
    const x = x0 + k * tileW;
    if (!t) {
      paintLabel(ctx, view, '…', x, y, 34, theme.light);
      return;
    }
    const isNew = (state.laidSide === 'left' ? k === 0 : k === shown.length - 1) && state.laidAgo < 0.25;
    paintTile(ctx, view, t, x, y - (isNew ? (1 - state.laidAgo / 0.25) * 20 : 0), 36, true);
  });
  if (state.choosing >= 0) {
    for (const side of ['left', 'right'] as const) {
      const e = state.ends[side];
      ctx.strokeStyle = theme.star;
      ctx.lineWidth = 6;
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(view.time * 8);
      ctx.beginPath();
      ctx.arc(e.x, e.y, 42, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    paintLabel(ctx, view, 'Đặt vào đầu nào?', arena.width / 2, y - 70, 28, theme.star);
  }

  // Draw pile.
  const { pileButton: pb } = state;
  if (state.pile.length > 0) {
    paintTile(ctx, view, [0, 0], pb.x, pb.y, 40, false, true);
    paintLabel(ctx, view, `Bốc (${state.pile.length})`, pb.x, pb.y + 62, 22, theme.light);
  }

  // The child's hand.
  const ends = { left: chain[0]?.[0] ?? -1, right: chain.at(-1)?.[1] ?? -1 };
  state.hand.forEach((t, i) => {
    const s = state.slots[i];
    if (!s) return;
    const can = state.turn === 'child' && (fits(t, ends.left) || fits(t, ends.right));
    const shake = state.wrongTile === i && state.wrongAgo < 0.3 ? Math.sin(state.wrongAgo * 60) * 5 : 0;
    const lift = can ? 10 : 0;
    if (state.choosing === i) {
      ctx.fillStyle = theme.star;
      roundRect(ctx, s.x - 6, s.y - 6 - lift, s.w + 12, s.h + 12, 12);
      ctx.fill();
    }
    paintTile(ctx, view, t, s.x + s.w / 2 + shake, s.y + s.h / 2 - lift, s.w, false);
  });
  if (state.turn === 'over') {
    paintLabel(ctx, view, state.winner === 'child' ? 'Bé thắng rồi!' : 'Bạn thắng. Ván mới nhé!', arena.width / 2, y + 90, 40, state.winner === 'child' ? theme.star : theme.light);
  } else if (state.turn === 'child' && state.choosing < 0) {
    paintLabel(ctx, view, 'Lượt của bé', arena.width / 2, y + 80, 28, theme.light);
  }
}
