// Crate push's picture: a storeroom floor of tiles, stone walls, starred spots, cardboard crates (glowing
// when on a spot), the child sliding cell to cell (and four soft arrows around her at the start), and the
// round restart button, pulsing when a crate is stuck.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { isWall, type Cell, type CrateState } from './logic';

export function drawCratePush(ctx: CanvasRenderingContext2D, state: CrateState, view: DrawView): void {
  const { arena, sprites, theme } = view;
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(0, 0, arena.width, arena.height);
  const s = state.cell;
  const at = (c: Cell): { x: number; y: number } => ({ x: state.originX + (c.x + 0.5) * s, y: state.originY + (c.y + 0.5) * s });

  for (let y = 0; y < state.rows; y += 1) {
    for (let x = 0; x < state.cols; x += 1) {
      const px = state.originX + x * s;
      const py = state.originY + y * s;
      if (isWall(state, { x, y })) {
        ctx.fillStyle = theme.stoneEdge;
        roundRect(ctx, px + 1, py + 1, s - 2, s - 2, 8);
        ctx.fill();
        ctx.fillStyle = theme.stone;
        roundRect(ctx, px + 4, py + 4, s - 8, s - 14, 6);
        ctx.fill();
      } else {
        ctx.fillStyle = (x + y) % 2 === 0 ? theme.ground : theme.groundDeep;
        ctx.fillRect(px, py, s, s);
      }
    }
  }
  for (const spot of state.spots) {
    const p = at(spot);
    ctx.strokeStyle = theme.star;
    ctx.lineWidth = 5;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(p.x - s * 0.4, p.y - s * 0.4, s * 0.8, s * 0.8);
    ctx.setLineDash([]);
    sprites.draw(ctx, 'star', p.x, p.y, s * 0.55, { alpha: 0.55 });
  }

  const slide = Math.min(1, state.moved / 0.12);
  state.crates.forEach((crate, i) => {
    let p = at(crate);
    if (i === state.pushed && slide < 1) {
      const back = at({ x: crate.x - (state.player.x - state.from.x), y: crate.y - (state.player.y - state.from.y) });
      p = { x: back.x + (p.x - back.x) * slide, y: back.y + (p.y - back.y) * slide };
    }
    const home = state.spots.some((sp) => sp.x === crate.x && sp.y === crate.y);
    if (home) {
      ctx.globalAlpha = 0.5 + 0.2 * Math.sin(view.time * 5);
      ctx.fillStyle = theme.star;
      roundRect(ctx, p.x - s * 0.48, p.y - s * 0.48, s * 0.96, s * 0.96, 12);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    sprites.draw(ctx, 'package', p.x, p.y, s * 0.92);
  });

  const to = at(state.player);
  const from = at(state.from);
  const px = from.x + (to.x - from.x) * slide;
  const py = from.y + (to.y - from.y) * slide;
  if (state.moves === 0 && state.rooms === 0) {
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(view.time * 4);
    for (const [dx, dy, arrow] of [[1, 0, '→'], [-1, 0, '←'], [0, 1, '↓'], [0, -1, '↑']] as const) {
      if (!isWall(state, { x: state.player.x + dx, y: state.player.y + dy })) paintLabel(ctx, view, arrow, px + dx * s, py + dy * s, s * 0.5);
    }
    ctx.globalAlpha = 1;
  }
  sprites.draw(ctx, view.player, px, py - 4, s * 0.95, { flipX: state.facing === 'left' });

  // Restart.
  const r = state.reset;
  const pulse = state.stuck && !view.reducedMotion ? 1 + 0.12 * Math.sin(view.time * 8) : 1;
  ctx.fillStyle = state.stuck ? theme.star : theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(r.x, r.y, 44 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  paintLabel(ctx, view, '↻', r.x, r.y + 2, 52 * pulse, theme.secondary);
  if (state.solved >= 0) paintLabel(ctx, view, 'Xong kho!', arena.width / 2, state.originY + (state.rows * s) / 2, 60, theme.star);
}
