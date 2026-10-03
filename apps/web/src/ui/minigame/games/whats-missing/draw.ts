// What's missing's picture: a cosy room, a wooden table with a tray of things, a countdown ring while she
// looks, the lamp going out (dark), then the tray with its gap ("?") and three big round choices below; the
// answer lights green (or the right one shows when she picks wrong). Eight round dots show how it goes.
import { bob, paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { ROUNDS, type WhatsMissingState } from './logic';

export function drawWhatsMissing(ctx: CanvasRenderingContext2D, state: WhatsMissingState, view: DrawView): void {
  const { arena, sprites, theme } = view;
  // Wall and floor.
  ctx.fillStyle = theme.waterLight;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, arena.height - 220, arena.width, 220);

  // The tray.
  const xs = state.slots.map((s) => s.x);
  const ys = state.slots.map((s) => s.y);
  const left = Math.min(...xs) - 80;
  const right = Math.max(...xs) + 80;
  const top = Math.min(...ys) - 70;
  const bottom = Math.max(...ys) + 70;
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, left - 10, top - 10, right - left + 20, bottom - top + 28, 30);
  ctx.fill();
  ctx.fillStyle = theme.light;
  roundRect(ctx, left, top, right - left, bottom - top, 24);
  ctx.fill();

  const showing = state.phase === 'look' ? state.tray : state.after;
  showing.forEach((thing, i) => {
    const slot = state.slots[i];
    if (!slot) return;
    if (thing) {
      sprites.draw(ctx, thing, slot.x, slot.y + bob(view, 2, 3, i), 96);
      return;
    }
    // The gap where the missing thing stood.
    if (state.phase === 'reveal') sprites.draw(ctx, state.missing, slot.x, slot.y, 96, { alpha: Math.min(1, state.phaseTime * 3) });
    else if (state.phase === 'pick') paintLabel(ctx, view, '?', slot.x, slot.y, 70, theme.secondary);
  });
  if (state.phase === 'reveal' && !state.after.includes(null)) {
    // Shuffled tray: the missing one floats in above it.
    sprites.draw(ctx, state.missing, arena.width / 2, top - 40, 90, { alpha: Math.min(1, state.phaseTime * 3) });
  }

  if (state.phase === 'look') {
    // Countdown ring around an eye-catching lamp.
    const left = Math.max(0, 1 - state.phaseTime / state.lookTime);
    const cx = arena.width / 2;
    const cy = arena.height - 130;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.arc(cx, cy, 56, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = theme.star;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, 56, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left);
    ctx.stroke();
    sprites.draw(ctx, 'light-bulb', cx, cy, 70);
  }

  if (state.phase === 'pick' || state.phase === 'reveal') {
    state.choices.forEach((thing, i) => {
      const slot = state.choiceSlots[i];
      if (!slot) return;
      const right = thing === state.missing;
      const picked = thing === state.picked;
      ctx.fillStyle = state.phase === 'reveal' && right ? theme.leaf : state.phase === 'reveal' && picked ? theme.danger : theme.light;
      ctx.strokeStyle = theme.ink;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(slot.x, slot.y, 70, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const pop = state.phase === 'reveal' && right && !view.reducedMotion ? 1 + 0.15 * Math.sin(Math.min(1, state.phaseTime * 4) * Math.PI) : 1;
      sprites.draw(ctx, thing, slot.x, slot.y, 92 * pop);
    });
  }

  // Round dots.
  for (let i = 0; i < ROUNDS; i += 1) {
    const x = arena.width / 2 + (i - (ROUNDS - 1) / 2) * 30;
    ctx.fillStyle = i < state.round ? theme.star : i === state.round ? theme.primary : theme.stone;
    ctx.beginPath();
    ctx.arc(x, arena.height - 22, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  if (state.phase === 'dark') {
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = theme.ink;
    ctx.fillRect(0, 0, arena.width, arena.height);
    ctx.globalAlpha = 1;
    sprites.draw(ctx, 'light-bulb', arena.width / 2, arena.height / 2, 110, { alpha: 0.35 });
    paintLabel(ctx, view, 'Tắt đèn!', arena.width / 2, arena.height / 2 + 100, 44);
  }
}
