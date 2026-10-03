// Chi chi's picture: a cosy yard; the friend (a bear) above a big open hand drawn with a palm and fingers; the
// child's fingertip as a glowing dot in the palm; the rhyme's words in a line above, the word being said big
// and bouncing, the snap "ập!" in red; the hand curling shut on the snap; and a row of ten dots for the
// rounds (gold escaped, grey out).
import { bob, paintGround, paintLabel, paintSky } from '../../draw-kit';
import type { DrawView } from '../../types';
import { HUD_SAFE_TOP } from '../../types';
import { ROUNDS, SNAP, type ChiChiState } from './logic';

function paintHand(ctx: CanvasRenderingContext2D, view: DrawView, state: ChiChiState, closed: number): void {
  const { theme } = view;
  const { x, y, r } = state.palm;
  ctx.fillStyle = theme.star;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  // Fingers: long rounded bars above the palm that fold down as the hand closes.
  const fingers = [-0.55, -0.18, 0.18, 0.55];
  fingers.forEach((f, i) => {
    const len = r * (i === 1 || i === 2 ? 0.95 : 0.8) * (1 - closed * 0.75);
    const fx = x + f * r;
    const fy = y - r * 0.7 + closed * r * 0.5;
    ctx.beginPath();
    ctx.ellipse(fx, fy - len / 2, r * 0.16, len / 2 + r * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  // Thumb.
  ctx.beginPath();
  ctx.ellipse(x - r * 0.95 + closed * r * 0.4, y - r * 0.05, r * 0.16, r * 0.42, -0.9 + closed * 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Palm.
  ctx.beginPath();
  ctx.ellipse(x, y, r * (0.85 - closed * 0.1), r * (0.78 - closed * 0.15), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(x - r * 0.1, y + r * 0.2, r * 0.45, Math.PI * 1.1, Math.PI * 1.7);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function drawChiChi(ctx: CanvasRenderingContext2D, state: ChiChiState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { palm } = state;
  const groundY = palm.y - palm.r * 0.3;
  paintSky(ctx, view, groundY, 6);
  paintGround(ctx, view, groundY);
  sprites.draw(ctx, 'bear', palm.x + palm.r * 1.25, palm.y - palm.r * 1.15 + bob(view, 2, 4), Math.min(150, palm.r * 1.1));

  const closed = state.phase === 'snap' ? Math.min(1, (state.snapSeconds - state.timer) / state.snapSeconds) * 0.25 : state.phase === 'result' && state.outcome === 'caught' ? 1 : state.phase === 'result' ? 0.9 : 0;
  paintHand(ctx, view, state, closed);

  const finger = state.finger;
  if (finger && state.outcome !== 'caught') {
    ctx.fillStyle = theme.light;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(finger.x, finger.y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 4;
    ctx.strokeStyle = theme.primary;
    ctx.stroke();
  }

  // The words.
  const wordY = Math.max(HUD_SAFE_TOP + 120, palm.y - palm.r * 1.6 - 90);
  if (state.phase === 'wait') {
    paintLabel(ctx, view, 'Đặt ngón tay vào lòng bàn tay bạn', arena.width / 2, wordY, Math.min(34, arena.width / 20));
    if (!view.reducedMotion) {
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(view.time * 6);
      ctx.strokeStyle = theme.light;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(palm.x, palm.y, 34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  } else if (state.phase === 'chant' || state.phase === 'snap') {
    const word = state.words[state.index] ?? '';
    const snap = state.phase === 'snap';
    const pop = view.reducedMotion ? 1 : 1 + 0.15 * Math.max(0, state.timer / Math.max(0.01, snap ? state.snapSeconds : state.wordSeconds));
    paintLabel(ctx, view, snap ? `${SNAP}!` : word, arena.width / 2, wordY, (snap ? 110 : 80) * pop, snap ? theme.danger : theme.light);
    // The words before it, small.
    const before = state.words.slice(Math.max(0, state.index - 4), state.index).join(' ');
    if (before) paintLabel(ctx, view, before, arena.width / 2, wordY - 80, 28, theme.light);
  } else if (state.outcome) {
    const words = { escaped: 'Thoát rồi!', early: 'Nhấc sớm quá!', caught: 'Bị nắm rồi!' } as const;
    paintLabel(ctx, view, words[state.outcome], arena.width / 2, wordY, 56, state.outcome === 'escaped' ? theme.star : theme.light);
    if (state.outcome === 'escaped') sprites.draw(ctx, 'sparkles', palm.x, palm.y - palm.r, 110, { alpha: Math.max(0, state.timer / 1.1) });
  }

  // Rounds.
  const dotsY = HUD_SAFE_TOP + 30;
  for (let i = 0; i < ROUNDS; i += 1) {
    const result = state.results[i];
    const x = arena.width / 2 + (i - (ROUNDS - 1) / 2) * 40;
    ctx.fillStyle = result === 'escaped' ? theme.star : result ? theme.stone : theme.light;
    ctx.globalAlpha = result ? 1 : 0.5;
    ctx.beginPath();
    ctx.arc(x, dotsY, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 3;
    ctx.strokeStyle = theme.ink;
    ctx.stroke();
  }
}
