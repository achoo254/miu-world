// Rock climb's picture: a cliff face (stone with layered ledges and moss, scrolling as she climbs), green holds
// (glowing when in reach) and brown cracked ones (shaking before they crumble), the child on her hold with a
// safety rope, warning marks over a falling rock's column, the rock itself, and a height board on the side.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { reachable, screenY, type ClimbState, type Hold } from './logic';

function paintCliff(ctx: CanvasRenderingContext2D, view: DrawView, state: ClimbState): void {
  const { arena, theme } = view;
  ctx.fillStyle = theme.stone;
  ctx.fillRect(0, 0, arena.width, arena.height);
  // Rock layers every few metres, scrolled with the camera.
  const layer = 160;
  const shift = (state.camera * 1) % layer;
  for (let y = -layer + shift, i = 0; y < arena.height + layer; y += layer, i += 1) {
    ctx.fillStyle = theme.stoneEdge;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= arena.width; x += 60) ctx.lineTo(x, y + Math.sin((x + i * 90) * 0.02) * 14);
    ctx.lineTo(arena.width, y + 14);
    ctx.lineTo(0, y + 14);
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = theme.leaf;
    for (let x = (i * 137) % 300; x < arena.width; x += 300) {
      ctx.beginPath();
      ctx.ellipse(x, y + 6, 34, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function paintHold(ctx: CanvasRenderingContext2D, view: DrawView, hold: Hold, y: number, glow: boolean): void {
  const { theme } = view;
  const shake = hold.crumble >= 0 && !view.reducedMotion ? Math.sin(hold.crumble * 50) * (1 - hold.crumble / 2) * 5 : 0;
  const x = hold.x + shake;
  if (glow) {
    ctx.fillStyle = theme.star;
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(view.time * 6);
    ctx.beginPath();
    ctx.arc(x, y, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = hold.cracked ? theme.wood : theme.leaf;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(x, y, 30, 22, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (hold.cracked) {
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 14, y - 12);
    ctx.lineTo(x - 2, y);
    ctx.lineTo(x - 8, y + 6);
    ctx.lineTo(x + 6, y + 16);
    ctx.stroke();
  } else {
    ctx.fillStyle = theme.light;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(x - 9, y - 7, 9, 5, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export function drawRockClimb(ctx: CanvasRenderingContext2D, state: ClimbState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintCliff(ctx, view, state);
  const current = state.holds.find((x) => x.id === state.on);
  const from = state.holds.find((x) => x.id === state.from) ?? current;
  for (const hold of state.holds) {
    if (hold.fallen) continue;
    const y = screenY(state, hold);
    if (y < -60 || y > arena.height + 60) continue;
    paintHold(ctx, view, hold, y, Boolean(current && state.move >= 1 && hold.id !== current.id && reachable(current, hold)));
  }

  // Warnings and falling rocks.
  for (const rock of state.rocks) {
    if (rock.warn > 0) {
      ctx.fillStyle = theme.danger;
      ctx.globalAlpha = 0.15;
      ctx.fillRect(rock.x - 52, 0, 104, arena.height);
      ctx.globalAlpha = 1;
      paintLabel(ctx, view, '!', rock.x, 150, 64, theme.danger);
    } else sprites.draw(ctx, 'rock', rock.x, screenY(state, rock), 90, { rotate: view.reducedMotion ? 0 : rock.h * 0.02 });
  }

  // The child, moving from hold to hold, with a rope down from her harness.
  if (current && from) {
    const t = state.move;
    const ease = 1 - (1 - t) * (1 - t);
    const x = from.x + (current.x - from.x) * ease;
    const y = screenY(state, from) + (screenY(state, current) - screenY(state, from)) * ease;
    const shake = state.slipAgo < 0.4 && !view.reducedMotion ? Math.sin(state.slipAgo * 50) * 8 : 0;
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, y + 30);
    ctx.quadraticCurveTo(x + 40, (y + arena.height) / 2, arena.width / 2, arena.height + 10);
    ctx.stroke();
    sprites.draw(ctx, view.player, x + shake, y - 10, 88);
  }

  // Height board.
  ctx.fillStyle = theme.wood;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 4;
  roundRect(ctx, arena.width - 130, arena.height - 84, 112, 64, 16);
  ctx.fill();
  ctx.stroke();
  paintLabel(ctx, view, `${state.best} m`, arena.width - 74, arena.height - 52, 34);
  if (state.best === 0 && state.time < 4) paintLabel(ctx, view, 'Chạm mấu xanh đang sáng', arena.width / 2, arena.height - 52, 32);
}
