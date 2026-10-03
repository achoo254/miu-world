// Flag commands' picture: a school yard, the child in the middle with a red flag in one hand and a blue one in
// the other (each up or down, waving when it moves), a faint line splitting the two halves of the screen, and
// the command in a speech bubble at the top: big words plus a little flag with an arrow (crossed out for
// "đừng"), with a bar that runs down as time passes.
import { bob, paintGround, paintHills, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { HUD_SAFE_TOP } from '../../types';
import { commandText, type Command, type FlagColour, type FlagState } from './logic';

function paintFlag(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, size: number, colour: FlagColour, up: boolean, wave: number, side: -1 | 1): void {
  const { theme } = view;
  const tipY = up ? y - size * 1.1 : y + size * 0.25;
  const tipX = x + side * (up ? size * 0.15 : size * 0.7);
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = size * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  ctx.lineCap = 'butt';
  const flap = view.reducedMotion ? 0 : Math.sin(view.time * 8) * size * 0.05 + wave * size * 0.12;
  ctx.fillStyle = colour === 'red' ? theme.danger : theme.secondary;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.quadraticCurveTo(tipX + side * size * 0.35, tipY + flap, tipX + side * size * 0.7, tipY + size * 0.05);
  ctx.lineTo(tipX + side * size * 0.7, tipY + size * 0.5);
  ctx.quadraticCurveTo(tipX + side * size * 0.35, tipY + size * 0.45 + flap, tipX, tipY + size * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function paintCommandIcon(ctx: CanvasRenderingContext2D, view: DrawView, c: Command, x: number, y: number): void {
  const { theme } = view;
  ctx.fillStyle = c.flag === 'red' ? theme.danger : theme.secondary;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  roundRect(ctx, x - 28, y - 22, 40, 30, 4);
  ctx.fill();
  ctx.stroke();
  // The arrow.
  const s = c.move === 'up' ? -1 : 1;
  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.moveTo(x + 30, y + s * 26);
  ctx.lineTo(x + 18, y + s * 6);
  ctx.lineTo(x + 42, y + s * 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x + 26, y - (s < 0 ? -6 : 26) - 0, 8, 20);
  if (c.dont) {
    ctx.strokeStyle = theme.danger;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(x + 8, y, 38, 0, Math.PI * 2);
    ctx.moveTo(x + 8 - 27, y - 27);
    ctx.lineTo(x + 8 + 27, y + 27);
    ctx.stroke();
  }
}

export function drawFlagCommands(ctx: CanvasRenderingContext2D, state: FlagState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const groundY = arena.height - 70;
  paintSky(ctx, view, groundY, 10);
  paintHills(ctx, view, groundY - 10, 50, 60, theme.leaf);
  paintGround(ctx, view, groundY);
  // The two halves.
  ctx.fillStyle = theme.danger;
  ctx.globalAlpha = 0.07;
  ctx.fillRect(0, HUD_SAFE_TOP, arena.width / 2, groundY - HUD_SAFE_TOP);
  ctx.fillStyle = theme.secondary;
  ctx.fillRect(arena.width / 2, HUD_SAFE_TOP, arena.width / 2, groundY - HUD_SAFE_TOP);
  ctx.globalAlpha = 0.3;
  ctx.setLineDash([16, 14]);
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(arena.width / 2, HUD_SAFE_TOP + 150);
  ctx.lineTo(arena.width / 2, groundY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // The child with her two flags.
  const cx = arena.width / 2;
  const cy = groundY - 70;
  const size = Math.min(240, arena.width * 0.36, (cy - HUD_SAFE_TOP - 150) / 1.15);
  const waveOf = (f: FlagColour): number => Math.max(0, 1 - state.movedAgo[f] / 0.5) * Math.sin(state.movedAgo[f] * 20);
  paintFlag(ctx, view, cx - size * 0.45, cy, size, 'red', state.flags.red === 'up', waveOf('red'), -1);
  paintFlag(ctx, view, cx + size * 0.45, cy, size, 'blue', state.flags.blue === 'up', waveOf('blue'), 1);
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.45, cy);
  ctx.lineTo(cx - 30, cy + 10);
  ctx.moveTo(cx + size * 0.45, cy);
  ctx.lineTo(cx + 30, cy + 10);
  ctx.stroke();
  ctx.lineCap = 'butt';
  sprites.draw(ctx, view.player, cx, cy + bob(view, 3, 3), 120);

  // The command bubble.
  const by = HUD_SAFE_TOP + 20;
  const bw = Math.min(arena.width - 40, 520);
  const bx = (arena.width - bw) / 2;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  roundRect(ctx, bx, by, bw, 110, 30);
  ctx.fill();
  ctx.stroke();
  const c = state.command;
  if (c) {
    paintCommandIcon(ctx, view, c, bx + 64, by + 52);
    ctx.font = `800 48px ${theme.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = c.flag === 'red' ? theme.danger : theme.secondary;
    ctx.fillText(commandText(c), bx + bw / 2 + 40, by + 52);
    ctx.fillStyle = theme.star;
    roundRect(ctx, bx + 24, by + 92, (bw - 48) * Math.max(0, 1 - state.shown / state.window), 8, 4);
    ctx.fill();
  } else if (state.result) {
    paintLabel(ctx, view, state.result === 'right' ? 'Đúng rồi!' : 'Ối!', bx + bw / 2, by + 55, 46, state.result === 'right' ? theme.star : theme.light);
  }
  paintLabel(ctx, view, 'Cờ đỏ', arena.width * 0.2, groundY + 34, 26, theme.light);
  paintLabel(ctx, view, 'Cờ xanh', arena.width * 0.8, groundY + 34, 26, theme.light);
}
