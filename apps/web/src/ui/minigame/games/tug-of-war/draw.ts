// Tug of war's picture: a school field with a chalk middle line and the two winning lines, the rope with its
// red ribbon, the child's team leaning back on the left and the animal team on the right (bigger as the bouts
// go on), the shout "DÔ!" / "TA!" bursting on every beat, a star on a tap right on the beat, and the result.
import { bob, paintGround, paintHills, paintLabel, paintShadow, paintSky } from '../../draw-kit';
import type { SpriteName } from '../../sprites';
import type { DrawView } from '../../types';
import { BEAT, BEAT_WINDOW, type TugState } from './logic';

const RIVALS: readonly SpriteName[] = ['fox', 'dog-face', 'panda', 'bear', 'monkey-face', 'penguin'];
const FRIENDS: readonly SpriteName[] = ['rabbit', 'duck'];
export const TUG_SPRITES: readonly SpriteName[] = [...RIVALS, ...FRIENDS, 'star'];

export function drawTugOfWar(ctx: CanvasRenderingContext2D, state: TugState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const groundY = arena.height * 0.5;
  paintSky(ctx, view, groundY, 8);
  paintHills(ctx, view, groundY, 100, 70, theme.leaf);
  paintGround(ctx, view, groundY);
  const span = arena.width * 0.3;
  const mid = arena.width / 2;
  const ropeY = groundY + Math.min(120, (arena.height - groundY) * 0.45);
  // Chalk lines: the middle and the two winning lines.
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 6;
  for (const [x, dash] of [
    [mid, true],
    [mid - span, false],
    [mid + span, false],
  ] as const) {
    ctx.setLineDash(dash ? [14, 12] : []);
    ctx.beginPath();
    ctx.moveTo(x, groundY + 30);
    ctx.lineTo(x, arena.height - 20);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // The ribbon moves the whole way; the teams lean along only half of it, so both stay on screen.
  const ribbonX = mid + state.ribbon * span;
  const scale = Math.min(1, arena.width / 863);
  const centre = mid + state.ribbon * span * 0.5;
  // The rope.
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(centre - 420 * scale, ropeY + 10);
  ctx.quadraticCurveTo(centre, ropeY + (view.reducedMotion ? 0 : Math.sin(view.time * 20) * 2), centre + 420 * scale, ropeY + 10);
  ctx.stroke();
  ctx.strokeStyle = theme.wood;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.fillStyle = theme.danger;
  ctx.beginPath();
  ctx.moveTo(ribbonX, ropeY - 4);
  ctx.lineTo(ribbonX - 14, ropeY + 34);
  ctx.lineTo(ribbonX + 14, ropeY + 34);
  ctx.closePath();
  ctx.fill();

  // Teams lean back as they pull; the pullers bob on each tap.
  const lean = view.reducedMotion ? 0 : -0.25;
  const tapBob = state.tapAgo < 0.15 ? 8 : 0;
  const team: Array<{ sprite: SpriteName | typeof view.player; dx: number }> = [
    { sprite: view.player, dx: -150 },
    { sprite: FRIENDS[0] ?? 'rabbit', dx: -225 },
    { sprite: FRIENDS[1] ?? 'duck', dx: -295 },
  ];
  for (const member of team) {
    const x = centre + member.dx * scale;
    paintShadow(ctx, view, x, ropeY + 44, 70);
    sprites.draw(ctx, member.sprite, x, ropeY - 10 - tapBob, member.sprite === view.player ? 96 : 80, { rotate: lean });
  }
  const rivals = RIVALS.filter((r) => r !== view.player);
  const rival = rivals[Math.min(rivals.length - 1, state.level)] ?? 'panda';
  const size = 84 + Math.min(5, state.level) * 8;
  for (const dx of [150, 225]) {
    const x = centre + dx * scale;
    paintShadow(ctx, view, x, ropeY + 44, 70);
    sprites.draw(ctx, rival, x, ropeY - 10 + bob(view, 6, 3, dx), dx === 150 ? size : size * 0.85, { rotate: -lean, flipX: true });
  }

  // The shout on every beat.
  const near = Math.min(state.beat, BEAT - state.beat);
  const word = Math.floor(state.time / BEAT + 0.5) % 2 === 1 ? 'DÔ!' : 'TA!';
  const pop = near < BEAT_WINDOW ? 1 - near / BEAT_WINDOW : 0;
  paintLabel(ctx, view, word, mid, Math.max(150, groundY - 70), 46 + pop * 26, pop > 0 ? theme.star : theme.light);
  if (state.tapAgo < 0.3 && state.onBeat) sprites.draw(ctx, 'star', centre - 150 * scale, ropeY - 90, 44);

  if (state.result) {
    paintLabel(ctx, view, state.result === 'won' ? 'Thắng hiệp này!' : 'Hiệp sau cố lên!', mid, groundY + 40, 42, state.result === 'won' ? theme.star : theme.light);
  } else if (state.bouts === 0 && state.time < 3) paintLabel(ctx, view, 'Chạm thật nhanh, đúng tiếng hô!', mid, arena.height - 40, 30);
}
