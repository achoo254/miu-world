// Tidy room's picture: a child's room (wallpaper, a window with the sky, wall shelves, a bed, a table, a chair
// and a toy box drawn as simple furniture), the toys on their places while the room is shown, the chick
// dashing through, the toys in a heap, faint rings on the empty places while tidying, and a snap sparkle for
// each toy back home.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { HUD_SAFE_TOP } from '../../types';
import type { Spot, TidyState } from './logic';

function paintFurniture(ctx: CanvasRenderingContext2D, view: DrawView, spot: Spot): void {
  const { theme } = view;
  const { x, y } = spot;
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.woodEdge;
  switch (spot.furniture) {
    case 'shelf':
      ctx.fillStyle = theme.wood;
      roundRect(ctx, x - 62, y + 30, 124, 16, 6);
      ctx.fill();
      ctx.stroke();
      break;
    case 'window':
      ctx.fillStyle = theme.sky[1];
      roundRect(ctx, x - 80, y - 90, 160, 120, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = theme.wood;
      roundRect(ctx, x - 92, y + 28, 184, 18, 6);
      ctx.fill();
      ctx.stroke();
      break;
    case 'bed':
      ctx.fillStyle = theme.primary;
      roundRect(ctx, x - 90, y - 10, 180, 70, 16);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = theme.light;
      roundRect(ctx, x - 80, y - 30, 70, 34, 12);
      ctx.fill();
      ctx.stroke();
      break;
    case 'table':
      ctx.fillStyle = theme.wood;
      roundRect(ctx, x - 80, y + 26, 160, 18, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(x - 70, y + 44, 12, 60);
      ctx.fillRect(x + 58, y + 44, 12, 60);
      break;
    case 'chair':
      ctx.fillStyle = theme.secondary;
      roundRect(ctx, x - 48, y + 24, 96, 18, 6);
      ctx.fill();
      ctx.stroke();
      roundRect(ctx, x + 34, y - 50, 14, 76, 6);
      ctx.fill();
      ctx.stroke();
      break;
    case 'box':
      ctx.fillStyle = theme.danger;
      roundRect(ctx, x - 64, y - 4, 128, 60, 10);
      ctx.fill();
      ctx.stroke();
      break;
  }
}

export function drawTidyRoom(ctx: CanvasRenderingContext2D, state: TidyState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  // Wallpaper with dots, and the floor.
  ctx.fillStyle = theme.sky[2];
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.4;
  for (let x = 20; x < arena.width; x += 60) for (let y = HUD_SAFE_TOP; y < state.floorY; y += 60) ctx.fillRect(x + ((y / 60) % 2) * 30, y, 6, 6);
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, state.floorY, arena.width, arena.height - state.floorY);
  ctx.strokeStyle = theme.woodEdge;
  ctx.globalAlpha = 0.35;
  for (let y = state.floorY + 40; y < arena.height; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(arena.width, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // A rug under the heap.
  ctx.fillStyle = theme.secondary;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.ellipse(arena.width / 2, (state.toys[0]?.heap.y ?? arena.height / 2) + 10, 190, 110, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  for (const spot of state.spots) paintFurniture(ctx, view, spot);
  if (state.phase === 'play') {
    // Empty places glow faintly.
    const taken = new Set(state.toys.filter((t) => t.placed).map((t) => t.home));
    const used = new Set(state.toys.map((t) => t.home));
    state.spots.forEach((s, i) => {
      if (!used.has(i) || taken.has(i)) return;
      ctx.setLineDash([10, 8]);
      ctx.lineWidth = 4;
      ctx.strokeStyle = theme.light;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 46, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  const mess = state.phase === 'mess' ? 1 - state.timer / 1.1 : -1;
  state.toys.forEach((t, i) => {
    let x = t.x;
    let y = t.y;
    if (mess >= 0) {
      const home = state.spots[t.home] ?? t;
      x = home.x + (t.heap.x - home.x) * mess;
      y = home.y + (t.heap.y - home.y) * mess - Math.sin(mess * Math.PI) * 120;
    }
    const held = state.held === i;
    const pop = t.snappedAgo >= 0 && t.snappedAgo < 0.3 && !view.reducedMotion ? 1 + 0.3 * Math.sin((t.snappedAgo / 0.3) * Math.PI) : 1;
    const hop = t.hoppedAgo >= 0 && t.hoppedAgo < 0.3 && !view.reducedMotion ? Math.sin((t.hoppedAgo / 0.3) * Math.PI) * 30 : 0;
    sprites.draw(ctx, t.picture, x, y - hop, (held ? 96 : 80) * pop, { rotate: mess >= 0 ? mess * 6 : 0 });
    if (t.snappedAgo >= 0 && t.snappedAgo < 0.7) sprites.draw(ctx, 'sparkles', x + 30, y - 30, 44, { alpha: 1 - t.snappedAgo / 0.7 });
  });

  if (state.phase === 'mess') sprites.draw(ctx, 'baby-chick', -60 + (arena.width + 120) * mess, (state.toys[0]?.heap.y ?? arena.height / 2) + 60, 90);
  if (state.phase === 'look') {
    const left = state.timer / state.lookSeconds;
    paintLabel(ctx, view, 'Nhớ chỗ từng món đồ nhé!', arena.width / 2, HUD_SAFE_TOP + 10, 34, theme.light);
    ctx.lineWidth = 10;
    ctx.strokeStyle = theme.star;
    ctx.beginPath();
    ctx.arc(arena.width / 2, (state.toys[0]?.heap.y ?? arena.height / 2), 50, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2);
    ctx.stroke();
    paintLabel(ctx, view, String(Math.ceil(state.timer)), arena.width / 2, (state.toys[0]?.heap.y ?? arena.height / 2) + 2, 44);
  }
  if (state.phase === 'tidy') paintLabel(ctx, view, 'Phòng gọn gàng rồi!', arena.width / 2, arena.height / 2, 46, theme.star);
}
