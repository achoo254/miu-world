// Quick draw's picture: a dusky sky, the lantern hanging on its string between the child and the cat (dim
// while they wait, glowing with rays once lit), a decoy bulb glint or butterfly, big words for what to do and
// what happened, and a row of round markers (a star for each round won).
import { bob, paintGround, paintHills, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { decoyShowing, ROUNDS, type QuickDrawState } from './logic';

const WORDS = { win: 'Nhanh quá!', lose: 'Mèo nhanh hơn!', foul: 'Sớm quá!' } as const;

function paintLantern(ctx: CanvasRenderingContext2D, view: DrawView, state: QuickDrawState): void {
  const { theme, sprites } = view;
  const { lanternX: x, lanternY: y } = state;
  const lit = state.phase === 'lit' || (state.phase === 'result' && state.results.at(-1) !== 'foul');
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, y - 60);
  ctx.stroke();
  if (lit) {
    const pulse = view.reducedMotion ? 1 : 1 + 0.08 * Math.sin(view.time * 12);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = theme.star;
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2 + (view.reducedMotion ? 0 : view.time * 0.8);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, 190 * pulse, a, a + 0.12);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = theme.danger;
    ctx.beginPath();
    ctx.arc(x, y, 92 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    sprites.draw(ctx, 'red-paper-lantern', x, y, 140 * pulse);
  } else {
    // Unlit: swaying a little, faded.
    const sway = view.reducedMotion ? 0 : Math.sin(view.time * 1.6) * 0.06;
    sprites.draw(ctx, 'red-paper-lantern', x, y, 130, { alpha: 0.45, rotate: sway });
  }
}

function paintDecoy(ctx: CanvasRenderingContext2D, view: DrawView, state: QuickDrawState): void {
  const d = state.decoy;
  if (!d || !decoyShowing(state)) return;
  const t = (state.phaseTime - d.at) / 0.7;
  if (d.kind === 'bulb') {
    ctx.globalAlpha = 0.5 * Math.sin(t * Math.PI);
    ctx.fillStyle = view.theme.star;
    ctx.beginPath();
    ctx.arc(state.lanternX + 150, state.lanternY + 10, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    view.sprites.draw(ctx, 'light-bulb', state.lanternX + 150, state.lanternY + 10, 70, { alpha: Math.sin(t * Math.PI) });
  } else {
    const x = state.childX - 80 + t * (state.catX - state.childX + 160);
    const y = state.lanternY + 60 + Math.sin(t * 14) * 30;
    view.sprites.draw(ctx, 'butterfly', x, y, 70, { rotate: Math.sin(t * 20) * 0.3 });
  }
}

function paintRoundMarks(ctx: CanvasRenderingContext2D, view: DrawView, state: QuickDrawState): void {
  const { theme, arena, sprites } = view;
  const gap = Math.min(66, (arena.width - 60) / ROUNDS);
  const y = Math.max(state.groundY + 62, (state.groundY + view.arena.height) / 2);
  const left = arena.width / 2 - (gap * (ROUNDS - 1)) / 2;
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = theme.ink;
  roundRect(ctx, left - gap / 2 - 6, y - 30, gap * ROUNDS + 12, 60, 30);
  ctx.fill();
  ctx.globalAlpha = 1;
  for (let i = 0; i < ROUNDS; i += 1) {
    const x = left + i * gap;
    const result = state.results[i];
    if (result === 'win') {
      sprites.draw(ctx, 'star', x, y, 46);
      continue;
    }
    ctx.lineWidth = 4;
    ctx.strokeStyle = theme.light;
    ctx.fillStyle = result ? theme.stone : i === state.round - 1 ? theme.primary : theme.ink;
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

export function drawQuickDraw(ctx: CanvasRenderingContext2D, state: QuickDrawState, view: DrawView): void {
  const { theme, sprites } = view;
  const { groundY, childX, catX } = state;
  paintSky(ctx, view, groundY, 5);
  paintHills(ctx, view, groundY - 10, 200, 90, theme.leaf);
  paintGround(ctx, view, groundY);
  // The sky dims while they wait, so the light pops.
  if (state.phase !== 'lit') {
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = theme.ink;
    ctx.fillRect(0, 0, view.arena.width, groundY);
    ctx.globalAlpha = 1;
  }
  paintLantern(ctx, view, state);
  paintDecoy(ctx, view, state);

  const last = state.phase === 'result' ? state.results.at(-1) : undefined;
  const jump = (who: 'child' | 'cat'): number => {
    if (view.reducedMotion || !last) return 0;
    const winner = last === 'win' ? 'child' : 'cat';
    return who === winner ? Math.abs(Math.sin(state.phaseTime * 9)) * 40 : 0;
  };
  // Ready crouch while waiting: a slight squash.
  const crouch: [number, number] = state.phase === 'wait' && !view.reducedMotion ? [1.04, 0.96 + 0.02 * Math.sin(view.time * 5)] : [1, 1];
  paintShadow(ctx, view, childX, groundY + 6, 120, jump('child') / 100);
  sprites.draw(ctx, view.player, childX, groundY - 75 - jump('child'), 150, { squash: crouch });
  paintShadow(ctx, view, catX, groundY + 6, 120, jump('cat') / 100);
  sprites.draw(ctx, 'cat', catX, groundY - 70 - jump('cat') + bob(view, 4, 2), 150, { squash: crouch });

  const wordY = state.lanternY + 140;
  if (state.phase === 'wait') paintLabel(ctx, view, 'Chờ đèn sáng…', state.lanternX, wordY, 44);
  else if (state.phase === 'lit') paintLabel(ctx, view, 'CHẠM!', state.lanternX, wordY, 76, theme.star);
  else if (last) {
    const grow = view.reducedMotion ? 1 : Math.min(1, state.phaseTime / 0.15);
    paintLabel(ctx, view, WORDS[last], state.lanternX, wordY, 60 * grow, last === 'win' ? theme.star : theme.light);
    if (last === 'win' && state.reaction !== null) paintLabel(ctx, view, `${state.reaction.toFixed(2).replace('.', ',')} giây`, state.lanternX, wordY + 56, 36);
    if (last === 'win') sprites.draw(ctx, 'party-popper', childX, groundY - 190, 70, { alpha: 1 - state.phaseTime / 1.5 });
  }
  paintRoundMarks(ctx, view, state);
}
