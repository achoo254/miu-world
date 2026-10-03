// Claw machine's picture: a bright cabinet with a glass front, toys on a floor seen a little from above (back
// rows higher and smaller), the rail with the claw's carriage, the cable and the claw (opening as it drops,
// closing on a toy), a target ring on the floor under it so the child sees where it will land, the chute,
// a hint word for the hold, and six coins for the tries.
import { bob, paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { TRIES, type ClawState } from './logic';

const ROW_RISE = 170;

export function drawClawMachine(ctx: CanvasRenderingContext2D, state: ClawState, view: DrawView): void {
  const { arena, sprites, theme } = view;
  const floorY = (depth: number): number => state.frontY - depth * ROW_RISE;
  const scaleAt = (depth: number): number => 1 - depth * 0.28;
  ctx.fillStyle = theme.secondary;
  ctx.fillRect(0, 0, arena.width, arena.height);
  // Cabinet.
  ctx.fillStyle = theme.primary;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 6;
  roundRect(ctx, state.left - 24, state.top - 30, state.right - state.left + 48, arena.height - state.top + 10, 26);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.waterLight;
  roundRect(ctx, state.left, state.top, state.right - state.left, state.frontY + 60 - state.top, 16);
  ctx.fill();
  // Floor in perspective.
  ctx.fillStyle = theme.star;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(state.left, state.frontY + 50);
  ctx.lineTo(state.right, state.frontY + 50);
  ctx.lineTo(state.right - 30, floorY(1) - 30);
  ctx.lineTo(state.left + 30, floorY(1) - 30);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Target ring under the claw.
  if (state.phase === 'across' || state.phase === 'deep' || state.phase === 'drop') {
    const s = scaleAt(state.depth);
    ctx.strokeStyle = theme.danger;
    ctx.lineWidth = 5;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.ellipse(state.x, floorY(state.depth) + 20, 50 * s, 16 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Toys, back rows first.
  const sorted = state.toys.map((t, i) => ({ t, i })).filter(({ t, i }) => !t.won && i !== state.held).sort((a, b) => b.t.depth - a.t.depth);
  for (const { t } of sorted) {
    const s = scaleAt(t.depth);
    sprites.draw(ctx, t.sprite, t.x, floorY(t.depth) - 10 * s, 92 * s);
  }

  // Chute.
  ctx.fillStyle = theme.ink;
  roundRect(ctx, state.chuteX - 55, state.frontY - 10, 110, 70, 12);
  ctx.fill();
  sprites.draw(ctx, 'gift', state.chuteX, state.frontY + 100, 56);

  // Rail, carriage, cable and claw.
  const s = scaleAt(state.depth);
  const railY = state.top + 16 + state.depth * 30;
  ctx.fillStyle = theme.stoneEdge;
  ctx.fillRect(state.left, railY - 6, state.right - state.left, 12);
  ctx.fillStyle = theme.stone;
  roundRect(ctx, state.x - 30 * s, railY - 16, 60 * s, 32, 8);
  ctx.fill();
  const clawY = railY + 30 + state.down * (floorY(state.depth) - railY - 90 * s);
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(state.x, railY);
  ctx.lineTo(state.x, clawY);
  ctx.stroke();
  const open = state.phase === 'drop' ? 0.9 : state.held >= 0 ? 0.25 : 0.4;
  ctx.lineWidth = 7 * s;
  ctx.strokeStyle = theme.stoneEdge;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(state.x, clawY);
    ctx.lineTo(state.x + side * 34 * s * open, clawY + 30 * s);
    ctx.lineTo(state.x + side * 14 * s, clawY + 56 * s);
    ctx.stroke();
  }
  const held = state.toys[state.held];
  if (held) sprites.draw(ctx, held.sprite, state.x, clawY + 60 * s, 84 * s);

  // Hint and tries.
  const hint = state.phase === 'across' && state.tries < TRIES ? 'Giữ: sang phải →' : state.phase === 'deep' ? 'Giữ: vào sâu ↑' : '';
  if (hint) paintLabel(ctx, view, hint, arena.width / 2, arena.height - 70 + bob(view, 3, 3), 36, theme.star);
  if (state.lastWon && state.rest < 1.2) paintLabel(ctx, view, 'Gắp được rồi!', arena.width / 2, state.top + 80, 50, theme.star);
  for (let i = 0; i < TRIES; i += 1) sprites.draw(ctx, 'coin', 30 + i * 34, arena.height - 26, 30, { alpha: i < TRIES - state.tries ? 1 : 0.25 });
}
