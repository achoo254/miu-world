// Tile flood's picture: a wooden frame on the grass holding the coloured tiles; every colour also has its own
// picture (heart, clover, star, droplet), so the board reads without colour. The child's patch starts under
// her character in the corner; newly swallowed tiles pop. The palette buttons sit beside or under the board;
// a badge on the frame counts the steps left.
import { paintGround, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { patchOf, type TileFloodState } from './logic';

export const SYMBOLS: readonly SpriteRef[] = ['heart', 'clover', 'star', 'droplet'];

export function colourFill(view: DrawView, colour: number): string {
  const { theme } = view;
  return [theme.primary, theme.leaf, theme.star, theme.water][colour] ?? theme.stone;
}

export function drawTileFlood(ctx: CanvasRenderingContext2D, state: TileFloodState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, HUD_SAFE_TOP + 60, 6);
  paintGround(ctx, view, HUD_SAFE_TOP + 60);
  const { x, y, cell } = state.board;
  const side = cell * state.n;
  ctx.fillStyle = theme.wood;
  roundRect(ctx, x - 14, y - 14, side + 28, side + 28, 22);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = theme.woodEdge;
  ctx.stroke();

  const patch = patchOf(state.cells, state.n);
  for (let i = 0; i < state.cells.length; i += 1) {
    const colour = state.cells[i] ?? 0;
    const cx = x + (i % state.n) * cell;
    const cy = y + Math.floor(i / state.n) * cell;
    const joined = state.joinedAt[i] ?? -1;
    const age = joined > 0 ? state.time - joined : 9;
    // A new tile of the patch pops in a ripple from the corner.
    const pop = !view.reducedMotion && age < 0.35 ? 1 - 0.25 * Math.sin((age / 0.35) * Math.PI) : 1;
    const inset = 2 + (cell / 2 - 2) * (1 - pop);
    ctx.fillStyle = colourFill(view, colour);
    roundRect(ctx, cx + inset, cy + inset, cell - inset * 2, cell - inset * 2, cell * 0.18);
    ctx.fill();
    if (patch.has(i)) {
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = theme.light;
      roundRect(ctx, cx + inset, cy + inset, cell - inset * 2, cell - inset * 2, cell * 0.18);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    sprites.draw(ctx, SYMBOLS[colour] ?? 'star', cx + cell / 2, cy + cell / 2, cell * 0.42 * pop, { alpha: 0.85 });
  }
  // The child's corner.
  sprites.draw(ctx, view.player, x + cell * 0.5, y + cell * 0.45, cell * 0.8);

  // Steps left.
  const bx = x + side + 6;
  const by = y - 6;
  ctx.fillStyle = state.stepsLeft <= 2 ? theme.danger : theme.secondary;
  ctx.beginPath();
  ctx.arc(bx, by, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = theme.ink;
  ctx.stroke();
  paintLabel(ctx, view, String(state.stepsLeft), bx, by + 2, 34);

  for (const b of state.palette) {
    const current = b.colour === state.cells[0];
    paintShadow(ctx, view, b.x, b.y + b.r - 2, b.r * 1.7);
    ctx.globalAlpha = current ? 0.45 : 1;
    ctx.fillStyle = colourFill(view, b.colour);
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = theme.ink;
    ctx.stroke();
    sprites.draw(ctx, SYMBOLS[b.colour] ?? 'star', b.x, b.y, b.r * 1.05);
    ctx.globalAlpha = 1;
  }

  if (state.phase !== 'play') {
    const won = state.phase === 'won';
    paintLabel(ctx, view, won ? 'Phủ kín rồi!' : 'Bàn mới nhé!', x + side / 2, y + side / 2, Math.min(60, arena.width / 10), won ? theme.star : theme.light);
    if (won) for (let k = 0; k < 4; k += 1) sprites.draw(ctx, 'sparkles', x + side * (0.2 + 0.2 * k), y + side * 0.3 - state.phaseTime * 60, 50, { alpha: 1 - state.phaseTime });
  }
}
