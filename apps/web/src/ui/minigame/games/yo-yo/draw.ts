// Yo-yo's picture: a sunny yard, the child at the top holding the string, the spinning yo-yo, and a glowing ring
// where the string ends (the moment to tap). The string goes wavy when it is slack; the trick's name floats up
// after a quick catch, a short word tells how the last catch went, and an arrow says "swipe down" in the hand.
import { bob, paintGround, paintHills, paintLabel, paintSky } from '../../draw-kit';
import type { DrawView } from '../../types';
import { SLEEP_SECONDS, type YoyoState } from './logic';

const WORDS = { perfect: 'Tuyệt!', good: 'Được!', early: 'Sớm quá', late: 'Chậm rồi' } as const;

export function drawYoyo(ctx: CanvasRenderingContext2D, state: YoyoState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const groundY = arena.height - 60;
  paintSky(ctx, view, groundY, 10);
  paintHills(ctx, view, groundY - 20, 60, 90, theme.leaf);
  paintGround(ctx, view, groundY);

  const { handX, handY } = state;
  const yoyoY = handY + state.drop;
  const bottom = handY + state.length;

  // Where the string ends: a ring that glows while the yo-yo sleeps there.
  if (state.phase === 'down' || state.phase === 'sleep') {
    const glow = state.phase === 'sleep' ? 1 - state.phaseTime / SLEEP_SECONDS : 0.35 + 0.65 * (state.drop / state.length);
    ctx.globalAlpha = 0.25 + 0.55 * glow;
    ctx.lineWidth = 8;
    ctx.strokeStyle = theme.star;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.arc(handX, bottom, 62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  // The string: straight when tight, a lazy wave when slack.
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(handX, handY + 20);
  if (state.phase === 'slack') {
    for (let y = handY + 20; y <= yoyoY; y += 10) ctx.lineTo(handX + Math.sin(y * 0.08 + view.time * 4) * 12, y);
  } else {
    ctx.lineTo(handX, yoyoY);
  }
  ctx.stroke();

  // The child holds the string.
  sprites.draw(ctx, view.player, handX, handY - 18 + bob(view, 3, 3), 110);

  const wobble = state.phase === 'slack' ? Math.sin(state.phaseTime * 18) * 0.3 * (1 - state.phaseTime) : 0;
  sprites.draw(ctx, 'yo-yo', handX + (state.phase === 'slack' ? wobble * 30 : 0), yoyoY, 92, { rotate: view.reducedMotion ? 0 : state.spin });
  if (state.phase === 'sleep' && !view.reducedMotion) {
    // Speed lines while it spins.
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i += 1) {
      const a = state.spin * 1.3 + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(handX, yoyoY, 58, a, a + 0.7);
      ctx.stroke();
    }
  }

  if (state.phase === 'hand') {
    const y = handY + 120 + bob(view, 5, 10);
    paintLabel(ctx, view, 'Vuốt xuống!', handX, y + 60, 34, theme.light);
    ctx.fillStyle = theme.star;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(handX - 26, y - 10);
    ctx.lineTo(handX + 26, y - 10);
    ctx.lineTo(handX, y + 24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  const since = state.time - state.lastAt;
  if (state.last && since < 0.9) {
    const colour = state.last === 'perfect' || state.last === 'good' ? theme.star : theme.light;
    ctx.globalAlpha = Math.min(1, (0.9 - since) * 3);
    paintLabel(ctx, view, WORDS[state.last], handX + Math.min(220, arena.width * 0.3), handY + 40 - since * 30, 38, colour);
    ctx.globalAlpha = 1;
  }
  const trickSince = state.time - state.trickAt;
  if (trickSince < 1.2) {
    ctx.globalAlpha = Math.min(1, (1.2 - trickSince) * 2);
    paintLabel(ctx, view, state.trick, handX, bottom - 90 - trickSince * 50, 34, theme.star);
    sprites.draw(ctx, 'sparkles', handX + 120, bottom - 100 - trickSince * 50, 50);
    ctx.globalAlpha = 1;
  }
  paintLabel(ctx, view, `Cuộn lên: ${state.rolls}`, 110, arena.height - 30, 26, theme.light);
}
