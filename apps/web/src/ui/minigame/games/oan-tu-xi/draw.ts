// Oẳn tù tì's picture: the school yard, a friend's face with its hand (a fist shaking during the chant, then
// the hand it shows popping up), the banner with the rule (a trophy for THẮNG, a heart for THUA), a time bar,
// and the three big hands to tap. After an answer the right hand glows; a wrong pick wobbles.
import { bob, paintGround, paintHills, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import type { DrawView } from '../../types';
import { answerFor, type Hand, type OanTuXiState } from './logic';

export const HAND_PICTURE: Readonly<Record<Hand, SpriteRef>> = { bua: 'raised-fist', keo: 'victory-hand', bao: 'raised-hand' };
const HAND_NAME: Readonly<Record<Hand, string>> = { bua: 'Búa', keo: 'Kéo', bao: 'Bao' };
export const FRIENDS: readonly SpriteRef[] = ['monkey-face', 'fox', 'bear', 'rabbit'];

function paintBanner(ctx: CanvasRenderingContext2D, state: OanTuXiState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const w = Math.min(arena.width - 40, 520);
  const x = (arena.width - w) / 2;
  const y = state.bannerY - 38;
  const chanting = state.phase === 'chant';
  ctx.fillStyle = chanting ? theme.light : state.rule === 'win' ? theme.star : theme.secondary;
  roundRect(ctx, x, y, w, 76, 24);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = theme.ink;
  ctx.stroke();
  if (chanting) {
    paintLabel(ctx, view, 'Oẳn tù tì!', arena.width / 2, state.bannerY, 40, theme.primary);
    return;
  }
  const text = state.rule === 'win' ? 'THẮNG bạn!' : 'THUA bạn!';
  paintLabel(ctx, view, text, arena.width / 2 + 26, state.bannerY, 44);
  sprites.draw(ctx, state.rule === 'win' ? 'trophy' : 'heart', x + 50, state.bannerY, 58);
}

function paintFriend(ctx: CanvasRenderingContext2D, state: OanTuXiState, view: DrawView): void {
  const { sprites, theme } = view;
  const { x, y } = state.friendAt;
  const face = FRIENDS[state.friendIndex % FRIENDS.length] ?? 'fox';
  paintShadow(ctx, view, x, y + 90, 260);
  sprites.draw(ctx, face, x - 80, y + bob(view, 3, 4), 130);
  if (state.phase === 'chant') {
    // The fist pumps three times with the chant.
    const pump = view.reducedMotion ? 0 : Math.abs(Math.sin(state.phaseTime * Math.PI * 3)) * 26;
    sprites.draw(ctx, 'raised-fist', x + 80, y - pump, 120, { rotate: -0.2 });
    return;
  }
  const pop = view.reducedMotion ? 1 : Math.min(1, 0.6 + state.phaseTime * 4);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = theme.light;
  ctx.beginPath();
  ctx.arc(x + 80, y, 82, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  sprites.draw(ctx, HAND_PICTURE[state.friend], x + 80, y, 140 * pop, { flipX: true });
  paintLabel(ctx, view, HAND_NAME[state.friend], x + 80, y + 92, 30);
}

function paintTimeBar(ctx: CanvasRenderingContext2D, state: OanTuXiState, view: DrawView): void {
  if (state.phase !== 'answer') return;
  const { theme, arena } = view;
  const w = Math.min(arena.width - 80, 420);
  const x = (arena.width - w) / 2;
  const y = state.friendAt.y + 130;
  const left = Math.max(0, 1 - state.phaseTime / state.answerTime);
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.25;
  roundRect(ctx, x, y, w, 18, 9);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = left > 0.3 ? theme.leaf : theme.danger;
  roundRect(ctx, x, y, Math.max(18, w * left), 18, 9);
  ctx.fill();
}

export function drawOanTuXi(ctx: CanvasRenderingContext2D, state: OanTuXiState, view: DrawView): void {
  const { theme, sprites } = view;
  const groundY = state.friendAt.y + 70;
  paintSky(ctx, view, groundY, 6);
  paintHills(ctx, view, groundY, 40, 70, theme.leaf);
  paintGround(ctx, view, groundY);
  paintBanner(ctx, state, view);
  paintFriend(ctx, state, view);
  paintTimeBar(ctx, state, view);

  const answer = answerFor(state.friend, state.rule);
  for (const b of state.buttons) {
    const result = state.phase === 'result';
    const isAnswer = result && b.hand === answer;
    const wrongPick = result && !state.right && b.hand === state.picked;
    const shake = wrongPick && !view.reducedMotion ? Math.sin(state.phaseTime * 40) * 8 * Math.max(0, 1 - state.phaseTime / 0.5) : 0;
    const cx = b.x + shake;
    paintShadow(ctx, view, cx, b.y + b.r - 4, b.r * 1.8);
    if (isAnswer) {
      ctx.globalAlpha = 0.6 + (view.reducedMotion ? 0 : 0.3 * Math.sin(view.time * 10));
      ctx.fillStyle = state.right ? theme.leaf : theme.star;
      ctx.beginPath();
      ctx.arc(cx, b.y, b.r + 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = wrongPick ? theme.stone : theme.light;
    ctx.beginPath();
    ctx.arc(cx, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = theme.ink;
    ctx.stroke();
    const press = isAnswer && state.right && !view.reducedMotion ? 1 + 0.15 * Math.max(0, 1 - state.phaseTime / 0.3) : 1;
    sprites.draw(ctx, HAND_PICTURE[b.hand], cx, b.y - b.r * 0.14, b.r * 1.15 * press);
    paintLabel(ctx, view, HAND_NAME[b.hand], cx, b.y + b.r * 0.62, Math.round(b.r * 0.34), theme.light);
    if (isAnswer && state.right) sprites.draw(ctx, 'sparkles', cx + b.r * 0.7, b.y - b.r * 0.8 - state.phaseTime * 40, 44);
  }
  ctx.globalAlpha = 1;
}
