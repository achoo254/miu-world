// Dig tunnel's picture: sky and grass on top, earth squares below (dug squares dark tunnel), gems sparkling
// in the earth, rocks (shaking before they fall), the child digging (sliding from square to square), and a
// bump star where a rock hit her.
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { cellCentreOf, type DigState } from './logic';

export function drawDigTunnel(ctx: CanvasRenderingContext2D, state: DigState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { cellPx, cols, rows, top } = state;
  paintSky(ctx, view, top + cellPx, 6);
  ctx.fillStyle = theme.groundDeep;
  ctx.fillRect(0, top + cellPx, arena.width, arena.height);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, top + cellPx - 14, arena.width, 18);
  for (let cell = cols; cell < cols * rows; cell += 1) {
    const p = cellCentreOf(state, cell);
    const tile = state.tiles[cell];
    if (tile === 'empty' || tile === 'rock') {
      ctx.fillStyle = theme.ink;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(p.x - cellPx / 2, p.y - cellPx / 2, cellPx, cellPx);
      ctx.globalAlpha = 1;
    } else {
      // Earth texture: a few pebbles.
      ctx.fillStyle = theme.wood;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(p.x - cellPx * 0.2, p.y + cellPx * 0.15, cellPx * 0.07, 0, Math.PI * 2);
      ctx.arc(p.x + cellPx * 0.22, p.y - cellPx * 0.2, cellPx * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (tile === 'gem') sprites.draw(ctx, 'gem', p.x, p.y, cellPx * 0.7, { rotate: view.reducedMotion ? 0 : Math.sin(view.time * 3 + cell) * 0.15 });
  }
  for (const rock of state.rocks) {
    const p = cellCentreOf(state, rock.cell);
    const shake = !rock.falling && rock.wobble >= 0 && !view.reducedMotion ? Math.sin(view.time * 50) * 4 : 0;
    sprites.draw(ctx, 'rock', p.x + shake, p.y, cellPx * 0.95);
  }
  // The child, sliding between squares.
  const from = cellCentreOf(state, state.from);
  const to = cellCentreOf(state, state.player);
  const x = from.x + (to.x - from.x) * state.moving;
  const y = from.y + (to.y - from.y) * state.moving;
  const blink = state.invulnerable > 0 && Math.floor(state.invulnerable * 10) % 2 === 0;
  sprites.draw(ctx, view.player, x, y, cellPx * 0.9, { alpha: blink ? 0.4 : 1 });
  if (state.target !== null && state.target !== state.player) {
    const t = cellCentreOf(state, state.target);
    ctx.strokeStyle = theme.star;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.7;
    roundRect(ctx, t.x - cellPx / 2 + 4, t.y - cellPx / 2 + 4, cellPx - 8, cellPx - 8, 10);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (state.bumpAgo < 0.6) sprites.draw(ctx, 'collision', arena.width / 2, top + cellPx / 2, 80, { alpha: 1 - state.bumpAgo / 0.6 });
  if (state.time < 4 && state.score === 0) paintLabel(ctx, view, 'Chạm vào đất để đào', arena.width / 2, top + cellPx * 2.5, 32);
}
