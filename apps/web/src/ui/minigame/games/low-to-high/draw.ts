// Low to high's picture: a wooden study table under the sky, number cards on it. Face up a card is paper with
// a big number; face down it is the theme's colour with a star. Cards turn by narrowing and widening. While the
// numbers show, a bar runs out; a card in place wears its rank as a small badge; a slip shakes.
import { paintGround, paintLabel, paintSky, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { LowToHighState, Tile } from './logic';

const FLIP_SECONDS = 0.25;

function paintTile(ctx: CanvasRenderingContext2D, state: LowToHighState, view: DrawView, tile: Tile): void {
  const { theme, sprites } = view;
  // 1 = face up, 0 = face down; turns ease over FLIP_SECONDS.
  let up: number;
  if (state.phase === 'show') up = 1;
  else if (tile.done) up = Math.min(1, tile.since / FLIP_SECONDS);
  else if (tile.peek > 0) up = 1;
  else if (state.phase === 'play' && state.phaseTime < FLIP_SECONDS) up = 1 - state.phaseTime / FLIP_SECONDS;
  else up = 0;
  if (view.reducedMotion) up = up >= 0.5 ? 1 : 0;
  const showing = up >= 0.5;
  const scaleX = Math.max(0.05, Math.abs(Math.cos(up * Math.PI)));
  const shake = tile.peek > 0 && !view.reducedMotion ? Math.sin(tile.peek * 50) * 6 : 0;
  const s = tile.size;
  ctx.save();
  ctx.translate(tile.x + shake, tile.y);
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = theme.ink;
  roundRect(ctx, -s / 2 + 5, -s / 2 + 9, s, s, 22);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.scale(scaleX, 1);
  ctx.fillStyle = showing ? (tile.peek > 0 ? theme.stone : theme.light) : theme.primary;
  roundRect(ctx, -s / 2, -s / 2, s, s, 22);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = tile.done ? theme.leaf : theme.ink;
  ctx.stroke();
  if (showing) {
    ctx.font = `800 ${Math.round(s * 0.5)}px ${theme.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = theme.ink;
    ctx.fillText(String(tile.value), 0, s * 0.04);
  } else {
    sprites.draw(ctx, 'star', 0, 0, s * 0.5, { alpha: 0.9 });
  }
  ctx.restore();
  if (tile.done) {
    const rank = state.order.indexOf(tile.value) + 1;
    ctx.fillStyle = theme.leaf;
    ctx.beginPath();
    ctx.arc(tile.x + s / 2 - 6, tile.y - s / 2 + 6, 22, 0, Math.PI * 2);
    ctx.fill();
    paintLabel(ctx, view, String(rank), tile.x + s / 2 - 6, tile.y - s / 2 + 7, 26);
    if (tile.since < 0.6) sprites.draw(ctx, 'sparkles', tile.x, tile.y - s / 2 - tile.since * 50, 46, { alpha: 1 - tile.since / 0.6 });
  }
}

export function drawLowToHigh(ctx: CanvasRenderingContext2D, state: LowToHighState, view: DrawView): void {
  const { arena, theme } = view;
  paintSky(ctx, view, HUD_SAFE_TOP + 40, 5);
  paintGround(ctx, view, HUD_SAFE_TOP + 40);
  // The table.
  const pad = 14;
  ctx.fillStyle = theme.wood;
  roundRect(ctx, pad, HUD_SAFE_TOP + 4, arena.width - pad * 2, arena.height - HUD_SAFE_TOP - pad, 28);
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = theme.woodEdge;
  ctx.stroke();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = theme.ink;
  for (let y = HUD_SAFE_TOP + 50; y < arena.height - 20; y += 70) ctx.fillRect(pad + 10, y, arena.width - pad * 2 - 20, 4);
  ctx.globalAlpha = 1;

  for (const tile of state.tiles) paintTile(ctx, state, view, tile);

  if (state.phase === 'show') {
    const left = Math.max(0, 1 - state.phaseTime / state.showTime);
    const w = Math.min(arena.width - 80, 360);
    const x = (arena.width - w) / 2;
    const y = HUD_SAFE_TOP + 12;
    ctx.fillStyle = theme.ink;
    ctx.globalAlpha = 0.3;
    roundRect(ctx, x, y, w, 14, 7);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.star;
    roundRect(ctx, x, y, Math.max(14, w * left), 14, 7);
    ctx.fill();
  }
  if (state.phase === 'result') {
    const clean = state.slips === 0;
    paintLabel(ctx, view, clean ? 'Đúng hết!' : 'Lần sau nhé!', arena.width / 2, arena.height / 2, 54, clean ? theme.star : theme.light);
  }
}
