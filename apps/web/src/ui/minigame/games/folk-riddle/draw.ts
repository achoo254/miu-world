// Folk riddle's picture: a paper card under the sky with the riddle's lines (the newest fades in) and a wise owl
// reading it, then four round picture buttons with their names. The pictures wake up once they can be tapped;
// a right answer glows with sparkles, a wrong pick greys and shakes while the answer glows.
import { bob, paintGround, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { canAnswer, LINE_SECONDS, linesShown, type FolkRiddleState } from './logic';
import { RIDDLES } from './riddles';

function paintCard(ctx: CanvasRenderingContext2D, state: FolkRiddleState, view: DrawView): void {
  const { theme, sprites } = view;
  const { x, y, w, h } = state.card;
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.2;
  roundRect(ctx, x + 4, y + 8, w, h, 26);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.light;
  roundRect(ctx, x, y, w, h, 26);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = theme.woodEdge;
  ctx.stroke();
  sprites.draw(ctx, 'owl', x + w - 52, y + h - 44 + bob(view, 2, 3), 84);
  const riddle = RIDDLES[state.current];
  if (!riddle) return;
  const shown = linesShown(state);
  const lineH = (h - 30) / Math.max(4, riddle.lines.length);
  const maxW = w - 130;
  let size = Math.min(42, lineH * 0.8);
  ctx.font = `800 ${size}px ${theme.font}`;
  const widest = Math.max(...riddle.lines.map((l) => ctx.measureText(l).width));
  if (widest > maxW) size = Math.max(22, (size * maxW) / widest);
  ctx.font = `800 ${size}px ${theme.font}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = theme.ink;
  const startY = y + 15 + lineH / 2 + ((Math.max(4, riddle.lines.length) - riddle.lines.length) * lineH) / 2;
  riddle.lines.forEach((line, i) => {
    if (i >= shown) return;
    const age = state.phase === 'ask' ? state.phaseTime - i * LINE_SECONDS : 9;
    ctx.globalAlpha = view.reducedMotion ? 1 : Math.min(1, age / 0.35);
    ctx.fillText(line, x + 30, startY + i * lineH);
  });
  ctx.globalAlpha = 1;
}

export function drawFolkRiddle(ctx: CanvasRenderingContext2D, state: FolkRiddleState, view: DrawView): void {
  const { theme, sprites } = view;
  const horizon = state.card.y + state.card.h + 40;
  paintSky(ctx, view, horizon, 6);
  paintGround(ctx, view, horizon);
  paintCard(ctx, state, view);
  const live = canAnswer(state);
  state.choices.forEach((c, i) => {
    const riddle = RIDDLES[c.riddle];
    if (!riddle) return;
    const isAnswer = c.riddle === state.current;
    const settled = state.phase !== 'ask';
    const pickedWrong = state.phase === 'wrong' && i === state.picked;
    const shake = pickedWrong && !view.reducedMotion ? Math.sin(state.phaseTime * 40) * 7 * Math.max(0, 1 - state.phaseTime / 0.5) : 0;
    const cx = c.x + shake;
    paintShadow(ctx, view, cx, c.y + c.r * 0.95, c.r * 1.6);
    if (settled && isAnswer) {
      ctx.globalAlpha = 0.55 + (view.reducedMotion ? 0 : 0.3 * Math.sin(view.time * 9));
      ctx.fillStyle = state.phase === 'right' ? theme.leaf : theme.star;
      ctx.beginPath();
      ctx.arc(cx, c.y, c.r + 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = live || settled ? 1 : 0.6;
    ctx.fillStyle = pickedWrong ? theme.stone : theme.light;
    ctx.beginPath();
    ctx.arc(cx, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = theme.ink;
    ctx.stroke();
    const pop = settled && isAnswer && !view.reducedMotion ? 1 + 0.12 * Math.max(0, 1 - state.phaseTime / 0.4) : 1;
    sprites.draw(ctx, riddle.answer, cx, c.y - c.r * 0.05, c.r * 1.25 * pop);
    ctx.globalAlpha = 1;
    paintLabel(ctx, view, riddle.word, cx, c.y + c.r + 4, Math.max(24, Math.round(c.r * 0.32)));
    if (state.phase === 'right' && isAnswer) sprites.draw(ctx, 'sparkles', cx + c.r * 0.7, c.y - c.r * 0.8 - state.phaseTime * 40, 48);
  });
}
