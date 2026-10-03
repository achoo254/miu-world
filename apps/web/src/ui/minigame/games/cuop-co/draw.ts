// Cướp cờ's picture: a schoolyard seen from above (grass, the two team lines with their colours), the flag on
// its pole in the middle (or in a runner's hand), the caller's card showing whose turn it is, the child's
// team at the bottom, the rival runner at the top, the guard pacing in between, and a word for each round.
import { bob, paintLabel, paintShadow, roundRect } from '../../draw-kit';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, type DrawView, type Point } from '../../types';
import type { FlagResult, FlagState } from './logic';

const TEAMMATES: readonly SpriteName[] = ['rabbit', 'duck', 'panda'];
/** The other team's runner: never the child's own animal. */
const RIVALS: readonly SpriteName[] = ['fox', 'bear'];
export const FLAG_SPRITES: readonly SpriteName[] = [...TEAMMATES, ...RIVALS, 'dog-face'];
const WORDS: Record<FlagResult, string> = { scored: 'Mang cờ về rồi!', tagged: 'Bị chạm mất rồi!', beaten: 'Bạn kia nhanh hơn!', teammate: '' };

function paintFlag(ctx: CanvasRenderingContext2D, view: DrawView, at: Point, wave: number): void {
  const { theme } = view;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(at.x, at.y + 40);
  ctx.lineTo(at.x, at.y - 40);
  ctx.stroke();
  ctx.fillStyle = theme.danger;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(at.x + 2, at.y - 40);
  ctx.quadraticCurveTo(at.x + 26, at.y - 34 + wave, at.x + 50, at.y - 24);
  ctx.lineTo(at.x + 2, at.y - 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

export function drawCuopCo(ctx: CanvasRenderingContext2D, state: FlagState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = theme.ink;
  for (let y = 0; y < arena.height; y += 80) ctx.fillRect(0, y, arena.width, 40);
  ctx.globalAlpha = 1;
  // Team lines and the flag's circle.
  ctx.lineWidth = 8;
  ctx.strokeStyle = theme.danger;
  ctx.beginPath();
  ctx.moveTo(0, state.baseY + 30);
  ctx.lineTo(arena.width, state.baseY + 30);
  ctx.stroke();
  ctx.strokeStyle = theme.secondary;
  ctx.beginPath();
  ctx.moveTo(0, state.homeY - 30);
  ctx.lineTo(arena.width, state.homeY - 30);
  ctx.stroke();
  const middleY = state.baseY + (state.homeY - state.baseY) * 0.38;
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(arena.width / 2, middleY, 60, 0, Math.PI * 2);
  ctx.stroke();

  const wave = view.reducedMotion ? 0 : Math.sin(view.time * 8) * 6;
  // The guard and its line.
  ctx.setLineDash([10, 12]);
  ctx.strokeStyle = theme.light;
  ctx.beginPath();
  ctx.moveTo(0, state.guard.y);
  ctx.lineTo(arena.width, state.guard.y);
  ctx.stroke();
  ctx.setLineDash([]);
  paintShadow(ctx, view, state.guard.x, state.guard.y + 34, 70);
  sprites.draw(ctx, 'dog-face', state.guard.x, state.guard.y + bob(view, 8, 3), 78);

  if (state.carrier === null) paintFlag(ctx, view, state.flag, wave);
  const teammate = TEAMMATES.filter((t) => t !== view.player)[Math.max(0, state.called - 1)] ?? 'rabbit';
  paintShadow(ctx, view, state.teammate.x, state.teammate.y + 34, 64);
  sprites.draw(ctx, teammate, state.teammate.x, state.teammate.y + (state.teammate.running ? bob(view, 14, 5) : 0), 70);
  paintShadow(ctx, view, state.rival.x, state.rival.y + 34, 64);
  sprites.draw(ctx, RIVALS.find((r) => r !== view.player) ?? 'bear', state.rival.x, state.rival.y + (state.rival.running ? bob(view, 14, 5) : 0), 78);
  if (state.carrier === 'rival') paintFlag(ctx, view, state.flag, wave);
  const c = state.child;
  const stumble = state.stumble > 0 && !view.reducedMotion ? Math.sin(state.stumble * 30) * 0.3 : 0;
  paintShadow(ctx, view, c.x, c.y + 38, 72);
  sprites.draw(ctx, view.player, c.x, c.y + (c.running ? bob(view, 14, 6) : 0), 88, { rotate: stumble });
  if (state.carrier === 'child') paintFlag(ctx, view, state.flag, wave);

  // The caller's card: whose picture is up.
  const cardX = 20;
  const cardY = HUD_SAFE_TOP + 10;
  const mine = state.phase === 'call' && state.called === 0;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = mine ? theme.star : theme.ink;
  ctx.lineWidth = mine ? 8 : 4;
  roundRect(ctx, cardX, cardY, 110, 120, 18);
  ctx.fill();
  ctx.stroke();
  if (state.phase !== 'call') paintLabel(ctx, view, '?', cardX + 55, cardY + 60, 60, theme.stoneEdge);
  else {
    sprites.draw(ctx, state.called === 0 ? view.player : teammate, cardX + 55, cardY + 60, 84);
    if (mine) paintLabel(ctx, view, 'Chạy!', cardX + 55 + 110, cardY + 60, 44, theme.star);
  }
  if (state.stumble > 0) paintLabel(ctx, view, 'Chưa gọi mình mà!', arena.width / 2, middleY + 100, 34);
  if (state.phase === 'home' && c.y < state.guard.y) paintLabel(ctx, view, 'Kéo sang bên để né!', arena.width / 2, state.homeY - 70, 30);
  if (state.result && state.phase === 'result' && WORDS[state.result]) paintLabel(ctx, view, WORDS[state.result], arena.width / 2, middleY - 90, 40, state.result === 'scored' ? theme.star : theme.light);
}
