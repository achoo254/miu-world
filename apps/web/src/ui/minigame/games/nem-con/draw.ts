// Ném còn's picture: a festival field (sky, hills, red and yellow flags), the bamboo pole with its ring, the
// child at the throwing spot, the pull shown as a stretched band with a short dotted path of the throw, the
// còn (a round cloth ball with ribbon tails) flying and spinning, and words for each throw's result. Ten
// dots along the bottom count the throws.
import { paintGround, paintHills, paintLabel, paintSky } from '../../draw-kit';
import type { DrawView } from '../../types';
import { BALL_RADIUS, GRAVITY, launch, THROWS, type NemConState, type ThrowResult } from './logic';

const WORDS: Record<ThrowResult, string> = { through: 'Qua vòng!', rim: 'Chạm vòng rồi', pole: 'Trúng cột', short: 'Thiếu một chút', long: 'Xa quá' };

function paintCon(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, spin: number): void {
  const { theme } = view;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (const a of [-0.5, 0, 0.5]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-30 * Math.cos(a), 10 * Math.sin(a) + 10, -46 * Math.cos(a), 30 * Math.sin(a) + 4);
    ctx.stroke();
  }
  ctx.fillStyle = theme.star;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, BALL_RADIUS + 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = theme.danger;
  ctx.beginPath();
  ctx.moveTo(-BALL_RADIUS, 0);
  ctx.lineTo(BALL_RADIUS, 0);
  ctx.stroke();
  ctx.restore();
}

export function drawNemCon(ctx: CanvasRenderingContext2D, state: NemConState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, state.groundY, 8);
  paintHills(ctx, view, state.groundY, 0, 90, theme.leaf);
  paintGround(ctx, view, state.groundY);
  // Bunting.
  for (let x = 20, i = 0; x < arena.width; x += 50, i += 1) {
    ctx.fillStyle = i % 2 ? theme.star : theme.danger;
    ctx.beginPath();
    ctx.moveTo(x - 15, 120);
    ctx.lineTo(x + 15, 120);
    ctx.lineTo(x, 148);
    ctx.fill();
  }
  // The pole and its ring (seen from the side: a tall ellipse).
  ctx.fillStyle = theme.leaf;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  ctx.fillRect(state.poleX - 7, state.ringY + state.ringHalf, 14, state.groundY - state.ringY - state.ringHalf);
  ctx.strokeRect(state.poleX - 7, state.ringY + state.ringHalf, 14, state.groundY - state.ringY - state.ringHalf);
  ctx.strokeStyle = theme.danger;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.ellipse(state.poleX, state.ringY, 16, state.ringHalf, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = theme.star;
  ctx.globalAlpha = 0.25;
  ctx.fill();
  ctx.globalAlpha = 1;

  sprites.draw(ctx, view.player, state.hand.x - 30, state.groundY - 50, 100);
  if (state.phase === 'aim') {
    const pulled = Math.hypot(state.pull.x, state.pull.y) > 5;
    const at = pulled ? { x: state.hand.x + state.pull.x * 0.4, y: state.hand.y + state.pull.y * 0.4 } : state.hand;
    if (pulled) {
      ctx.strokeStyle = theme.woodEdge;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(state.hand.x, state.hand.y);
      ctx.lineTo(at.x, at.y);
      ctx.stroke();
      // The start of the throw, dotted.
      const v = launch(state.pull);
      ctx.fillStyle = theme.light;
      for (let t = 0.05; t < 0.4; t += 0.05) {
        ctx.beginPath();
        ctx.arc(state.hand.x + v.x * t, state.hand.y + v.y * t + (GRAVITY * t * t) / 2, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    paintCon(ctx, view, at.x, at.y, 0);
    if (state.throws === 0 && !pulled) paintLabel(ctx, view, 'Kéo lùi rồi thả!', state.hand.x + 120, state.hand.y - 90, 32, theme.star);
  }
  if (state.ball) paintCon(ctx, view, state.ball.x, state.ball.y, view.reducedMotion ? 0 : state.ball.spin);
  if (state.phase === 'result' && state.result) paintLabel(ctx, view, WORDS[state.result], arena.width / 2, state.ringY - state.ringHalf - 40, 42, state.result === 'through' ? theme.star : theme.light);
  for (let k = 0; k < THROWS; k += 1) {
    ctx.fillStyle = k < state.throws ? theme.star : theme.light;
    ctx.globalAlpha = k < state.throws ? 1 : 0.5;
    ctx.beginPath();
    ctx.arc(arena.width / 2 + (k - (THROWS - 1) / 2) * 30, arena.height - 26, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
