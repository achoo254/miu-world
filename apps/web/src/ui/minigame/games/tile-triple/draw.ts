// Triple tiles' picture: a market table under an awning, the picture tiles in two layers (tiles with something
// on top are shaded and can't be taken), the wooden tray of seven places along the bottom with its pictures
// grouped by kind, a burst when three vanish, the tray shaking when it is full, and sparkles over a cleared
// table.
import { paintLabel, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { isFree, TRAY, type TripleState } from './logic';

/** Pictures by kind: fruit and vegetables of the market. */
export const KIND_PICTURES: readonly SpriteRef[] = ['red-apple', 'banana', 'grapes', 'carrot', 'watermelon', 'lemon'];

function paintTile(ctx: CanvasRenderingContext2D, view: DrawView, kind: number, x: number, y: number, size: number, shaded: boolean): void {
  const { theme, sprites } = view;
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.25;
  roundRect(ctx, x - size / 2 + 3, y - size / 2 + 6, size, size, size * 0.18);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 4;
  roundRect(ctx, x - size / 2, y - size / 2, size, size, size * 0.18);
  ctx.fill();
  ctx.stroke();
  sprites.draw(ctx, KIND_PICTURES[kind] ?? 'star', x, y, size * 0.68);
  if (shaded) {
    ctx.fillStyle = theme.ink;
    ctx.globalAlpha = 0.45;
    roundRect(ctx, x - size / 2, y - size / 2, size, size, size * 0.18);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export function drawTileTriple(ctx: CanvasRenderingContext2D, state: TripleState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 0, arena.width, arena.height);
  // Striped awning along the top.
  for (let x = 0, k = 0; x < arena.width; x += 60, k += 1) {
    ctx.fillStyle = k % 2 === 0 ? theme.danger : theme.light;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 60, 0);
    ctx.lineTo(x + 60, HUD_SAFE_TOP - 20);
    ctx.arc(x + 30, HUD_SAFE_TOP - 20, 30, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
  }

  const size = state.tile * 0.94;
  const shrink = state.phase === 'full' ? Math.min(1, state.phaseAgo / 0.5) : 0;
  for (const layer of [0, 1]) {
    for (const t of state.tiles) {
      if (t.taken || t.layer !== layer) continue;
      paintTile(ctx, view, t.kind, state.left + t.gx * state.tile, state.top + t.gy * state.tile - layer * 6, size, !isFree(state.tiles, t));
    }
  }
  if (state.phase === 'cleared') {
    paintLabel(ctx, view, 'Sạch bàn!', arena.width / 2, state.top + state.tile * 2, 54, theme.star);
    sprites.draw(ctx, 'sparkles', arena.width / 2 - 120, state.top + state.tile * 1.4, 60, { alpha: 1 - state.phaseAgo });
    sprites.draw(ctx, 'sparkles', arena.width / 2 + 120, state.top + state.tile * 2.6, 60, { alpha: 1 - state.phaseAgo });
  }

  // The tray.
  const { slot, trayY } = state;
  const trayW = slot * TRAY + 16;
  const shake = state.phase === 'full' && !view.reducedMotion ? Math.sin(state.phaseAgo * 50) * 8 * (1 - shrink) : 0;
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, arena.width / 2 - trayW / 2 + shake, trayY - slot / 2 - 8, trayW, slot + 16, 18);
  ctx.fill();
  for (let i = 0; i < TRAY; i += 1) {
    const x = arena.width / 2 - trayW / 2 + 8 + slot * (i + 0.5) + shake;
    ctx.fillStyle = i >= TRAY - 2 && state.tray.length >= TRAY - 2 ? theme.danger : theme.wood;
    ctx.globalAlpha = 0.6;
    roundRect(ctx, x - slot / 2 + 3, trayY - slot / 2 + 3, slot - 6, slot - 6, 12);
    ctx.fill();
    ctx.globalAlpha = 1;
    const kind = state.tray[i];
    if (kind !== undefined) paintTile(ctx, view, kind, x, trayY, (slot - 10) * (1 - shrink * 0.3), false);
  }
  const since = state.time - state.matchedAt;
  if (since < 0.5) sprites.draw(ctx, 'sparkles', arena.width / 2, trayY - slot * (0.6 + since), slot * 1.2, { alpha: 1 - since / 0.5 });
}
