// Hoa đăng's picture: an evening river (dark water, moonlit ripples), the near bank where the child kneels, the
// far bend with willow-green banks, lanes of boats and water hyacinth drifting sideways, and paper lotus
// lanterns with candles: lit ones glow, one that bumps something dims, arrived ones float on at the bend.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { HoaDangState } from './logic';

export function drawHoaDang(ctx: CanvasRenderingContext2D, state: HoaDangState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  // Night sky and river.
  ctx.fillStyle = theme.ink;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = theme.water;
  ctx.fillRect(0, state.bendY - 20, arena.width, state.bankY - state.bendY + 20);
  ctx.globalAlpha = 1;
  sprites.draw(ctx, 'full-moon', arena.width - 70, state.bendY - 40, 70);
  ctx.strokeStyle = theme.waterLight;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 3;
  for (let i = 0; i < 16; i += 1) {
    const y = state.bendY + ((i * 53) % (state.bankY - state.bendY));
    const x = ((i * 191 + view.time * 20) % (arena.width + 80)) - 40;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 40, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // The bend (far bank) and the near bank.
  ctx.fillStyle = theme.leaf;
  roundRect(ctx, -20, state.bendY - 70, arena.width + 40, 50, 20);
  ctx.fill();
  ctx.fillStyle = theme.groundDeep;
  ctx.fillRect(0, state.bankY + 26, arena.width, arena.height - state.bankY);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, state.bankY + 26, arena.width, 14);
  paintLabel(ctx, view, 'Khúc quanh', arena.width / 2, state.bendY - 45, 26, theme.light);

  for (const lane of state.lanes) {
    for (const d of lane.drifters) {
      if (d.kind === 'boat') sprites.draw(ctx, 'canoe', d.x, lane.y, d.w, { flipX: lane.speed < 0 });
      else {
        sprites.draw(ctx, 'herb', d.x - 26, lane.y, 64);
        sprites.draw(ctx, 'leafy-green', d.x + 22, lane.y + 4, 58);
      }
    }
  }
  for (const l of state.lanterns) {
    const dim = l.out >= 0 ? 1 - Math.min(1, l.out) : 1;
    const y = l.arrived >= 0 ? l.y - l.arrived * 20 : l.y;
    ctx.globalAlpha = 0.35 * dim;
    ctx.fillStyle = theme.star;
    ctx.beginPath();
    ctx.arc(l.x, y - 6, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = l.arrived >= 0 ? Math.max(0, 1 - l.arrived / 1.2) : l.out >= 0 ? 0.5 * dim + 0.2 : 1;
    sprites.draw(ctx, 'lotus', l.x, y, 58);
    sprites.draw(ctx, 'candle', l.x, y - 16, 30);
    ctx.globalAlpha = 1;
  }
  // The child on the bank, and the next lantern in her hands.
  sprites.draw(ctx, view.player, 60, state.bankY + 14, 90);
  if (state.ready <= 0) {
    sprites.draw(ctx, 'lotus', 120, state.bankY + 30, 44);
    paintLabel(ctx, view, 'Chạm bờ sông để thả đèn', arena.width / 2, state.bankY + 56, 24, theme.light);
  }
}
