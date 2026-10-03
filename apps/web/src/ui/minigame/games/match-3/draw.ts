// Match three's picture: a market stall (striped awning, wooden counter) holding a checked tray of fruit;
// swapped fruit slide past each other, popping fruit swell and fade, new fruit falls in from the top, a
// picked fruit is ringed, a fruit that can move wiggles as a hint, and a chain of pops cheers.
import { paintLabel, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { FRUIT, type Match3State } from './logic';

const SWAP_SECONDS = 0.16;
const FALL_SECONDS = 0.22;

export function drawMatch3(ctx: CanvasRenderingContext2D, state: Match3State, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = theme.woodEdge;
  for (let y = HUD_SAFE_TOP; y < arena.height; y += 48) ctx.fillRect(0, y, arena.width, 3);
  ctx.globalAlpha = 1;
  // The awning.
  for (let x = 0, i = 0; x < arena.width; x += 60, i += 1) {
    ctx.fillStyle = i % 2 ? theme.light : theme.primary;
    ctx.fillRect(x, 0, 60, HUD_SAFE_TOP - 20);
    ctx.beginPath();
    ctx.arc(x + 30, HUD_SAFE_TOP - 20, 30, 0, Math.PI);
    ctx.fill();
  }

  const { cell, cols, rows } = state;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 6;
  roundRect(ctx, state.left - 10, state.top - 10, cols * cell + 20, rows * cell + 20, 20);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.waterLight;
  for (let i = 0; i < cols * rows; i += 1) {
    if ((i % cols) % 2 === Math.floor(i / cols) % 2) continue;
    ctx.fillRect(state.left + (i % cols) * cell, state.top + Math.floor(i / cols) * cell, cell, cell);
  }

  const centre = (i: number) => ({ x: state.left + ((i % cols) + 0.5) * cell, y: state.top + (Math.floor(i / cols) + 0.5) * cell });
  const swapT = Math.min(1, state.phaseAgo / SWAP_SECONDS);
  const fallT = state.phase === 'fall' ? Math.min(1, state.phaseAgo / FALL_SECONDS) : 1;
  const popT = state.phase === 'pop' ? Math.min(1, state.phaseAgo / 0.24) : 0;
  ctx.save();
  ctx.beginPath();
  ctx.rect(state.left, state.top, cols * cell, rows * cell);
  ctx.clip();
  state.grid.forEach((fruit, i) => {
    if (fruit < 0) return;
    let { x, y } = centre(i);
    const pair = state.swapping;
    if (pair && (state.phase === 'swap' || state.phase === 'unswap') && (pair[0] === i || pair[1] === i)) {
      const other = centre(pair[0] === i ? pair[1] : pair[0]);
      x = other.x + (x - other.x) * swapT;
      y = other.y + (y - other.y) * swapT;
    }
    y -= (state.drop[i] ?? 0) * cell * (1 - fallT * fallT);
    let size = cell * 0.78;
    let alpha = 1;
    if (state.popping.includes(i)) {
      size *= 1 + popT * 0.5;
      alpha = 1 - popT;
    }
    const wiggle = state.hint === i && !view.reducedMotion ? Math.sin(view.time * 14) * 0.25 : 0;
    if (state.selected === i) {
      ctx.strokeStyle = theme.primary;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(x, y, cell * 0.46, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = alpha;
    sprites.draw(ctx, FRUIT[fruit] ?? 'cherries', x, y, size, { rotate: wiggle });
    ctx.globalAlpha = 1;
  });
  ctx.restore();
  if (state.phase === 'pop' && state.chain >= 2) paintLabel(ctx, view, `Liên hoàn ×${state.chain}!`, arena.width / 2, state.top + (rows * cell) / 2, 50, theme.star);
  if (state.shuffledAgo < 1.2) paintLabel(ctx, view, 'Xáo lại!', arena.width / 2, state.top + (rows * cell) / 2, 56, theme.star);
}
