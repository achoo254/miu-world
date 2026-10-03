// Call and response's picture: Vẹt on a branch with its row of eight beat dots (claps are big dots that
// flash as it claps), the child's row underneath (rings to fill, a star when hit), a playhead running along
// whichever bar is playing, a big drum that bounces on every tap, and ten little marks for the calls so far.
import { bob, paintGround, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { CALLS, position, SLOTS, type CallState } from './logic';

export function drawCallResponse(ctx: CanvasRenderingContext2D, state: CallState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const groundY = Math.min(arena.height - 120, state.drumY + 20);
  paintSky(ctx, view, groundY, 5);
  paintGround(ctx, view, groundY);
  const { left, step, callY, responseY } = state;
  const pos = position(state);
  const call = state.calls[pos.call];
  const shown = call ?? state.calls[CALLS - 1];

  // Who is playing.
  const parrotHop = !view.reducedMotion && state.clapAgo < 0.15 ? -12 : 0;
  sprites.draw(ctx, 'parrot', left - 110, callY - 10 + parrotHop + bob(view, 4, 3), 96);
  sprites.draw(ctx, view.player, left - 110, responseY - 10 + bob(view, 4, 3, 1), 96);
  if (pos.bar === 'call') paintLabel(ctx, view, 'Nghe Vẹt vỗ…', arena.width / 2, callY - 70, 34);
  if (pos.bar === 'response') paintLabel(ctx, view, 'Đến lượt bạn!', arena.width / 2, responseY + 80, 36, theme.star);
  if (pos.bar === 'before') paintLabel(ctx, view, 'Sẵn sàng…', arena.width / 2, callY - 70, 34);

  // The bar being played: a band behind its row and a playhead.
  const activeY = pos.bar === 'call' ? callY : pos.bar === 'response' ? responseY : null;
  if (activeY !== null) {
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = theme.light;
    roundRect(ctx, left - 40, activeY - 44, step * (SLOTS - 1) + 80, 88, 44);
    ctx.fill();
    ctx.globalAlpha = 1;
    const x = left + Math.min(SLOTS - 1, pos.at) * step;
    ctx.fillStyle = theme.ink;
    ctx.globalAlpha = 0.5;
    roundRect(ctx, x - 4, activeY - 46, 8, 92, 4);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (shown) {
    for (let s = 0; s < SLOTS; s += 1) {
      const x = left + s * step;
      const clap = shown.pattern.includes(s);
      const passed = pos.bar !== 'call' || pos.at >= s;
      // Parrot's row: claps are big dots, lit once played.
      ctx.fillStyle = clap ? (passed ? theme.secondary : theme.light) : theme.light;
      ctx.globalAlpha = clap ? 1 : 0.4;
      ctx.beginPath();
      ctx.arc(x, callY, clap ? 26 : 9, 0, Math.PI * 2);
      ctx.fill();
      if (clap) {
        ctx.strokeStyle = theme.ink;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Child's row: rings for the claps to tap, a star in each one hit.
      const index = shown.pattern.indexOf(s);
      if (index >= 0) {
        ctx.strokeStyle = theme.ink;
        ctx.fillStyle = theme.light;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, responseY, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (shown.hit[index]) sprites.draw(ctx, 'star', x, responseY, 50);
      } else {
        ctx.fillStyle = theme.light;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(x, responseY, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }

  // The drum to tap, bouncing.
  const squash = !view.reducedMotion && state.tapAgo < 0.12 ? 1 - state.tapAgo / 0.12 : 0;
  sprites.draw(ctx, 'drum', state.drumX, state.drumY, 120, { squash: [1 + 0.12 * squash, 1 - 0.12 * squash] });

  // Calls so far: a star for each one answered right.
  const markStep = Math.min(48, (arena.width - 360) / CALLS);
  const markLeft = arena.width / 2 - (markStep * (CALLS - 1)) / 2;
  state.calls.forEach((c, i) => {
    const x = markLeft + i * markStep;
    const y = 135;
    if (c.result === 'right') sprites.draw(ctx, 'star', x, y, 40);
    else {
      ctx.fillStyle = c.result === 'wrong' ? theme.stone : theme.light;
      ctx.globalAlpha = c.result === 'wrong' ? 0.8 : 0.5;
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  });
  let last: (typeof state.calls)[number] | undefined;
  for (let i = state.calls.length - 1; i >= 0 && !last; i -= 1) if (state.calls[i]?.result !== null) last = state.calls[i];
  if (last && pos.bar === 'call' && pos.at < 2.5) paintLabel(ctx, view, last.result === 'right' ? 'Giỏi quá!' : 'Thử lại câu sau nhé', arena.width / 2, callY - 70, 36, last.result === 'right' ? theme.star : theme.light);
}
