// Bird choir's picture: sky over hills, two wooden poles and the wire with five birds. On each chirp a bird
// hops and a note floats up from it: the higher the note, the higher it starts, so a bird singing another note
// (or singing late) stands out even with the sound off. A right pick makes every bird flap with sparkles; a
// wrong one gets a "?" while the off bird glows.
import { bob, paintGround, paintHills, paintLabel, paintSky } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { BirdChoirState } from './logic';

const NOTE_LIFE = 0.55;

export function drawBirdChoir(ctx: CanvasRenderingContext2D, state: BirdChoirState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const groundY = Math.max(state.wireY + 220, arena.height - 120);
  paintSky(ctx, view, groundY, 6);
  paintHills(ctx, view, groundY, 30, 90, theme.leaf);
  paintGround(ctx, view, groundY);
  // Poles and the wire, sagging a little.
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(4, state.wireY - 30, 18, groundY - state.wireY + 30);
  ctx.fillRect(arena.width - 22, state.wireY - 30, 18, groundY - state.wireY + 30);
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(10, state.wireY - 20);
  ctx.quadraticCurveTo(arena.width / 2, state.wireY + 30, arena.width - 10, state.wireY - 20);
  ctx.stroke();

  const size = state.birdRadius * 1.9;
  const cheer = state.nextIn > 0 && state.pickedRight;
  for (const [i, bird] of state.birds.entries()) {
    const since = state.time - (state.chirpAt[i] ?? -9);
    const hop = !view.reducedMotion && since >= 0 && since < 0.22 ? Math.sin((since / 0.22) * Math.PI) * 22 : 0;
    const flap = cheer && !view.reducedMotion ? Math.abs(Math.sin(view.time * 12 + i)) * 18 : 0;
    // The wire sags toward the middle: each bird sits on it.
    const t = (bird.x - 10) / (arena.width - 20);
    const sag = 4 * t * (1 - t) * 25 - 20;
    const y = state.wireY + sag - size * 0.42 - hop - flap + bob(view, 2, 1.5, i);
    const revealed = state.nextIn > 0 && i === state.odd;
    if (revealed) {
      ctx.globalAlpha = 0.45 + 0.2 * Math.sin(view.time * 10);
      ctx.fillStyle = theme.star;
      ctx.beginPath();
      ctx.arc(bird.x, y, size * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    sprites.draw(ctx, 'bird', bird.x, y, size, { flipX: i % 2 === 0, squash: hop > 0 ? [0.92, 1.08] : undefined });
    // The note it sang, floating up from a height set by its pitch.
    if (since >= 0 && since < NOTE_LIFE) {
      const pitch = (state.chirpNote[i] ?? 72) - 72;
      const ny = y - size * 0.75 - pitch * 9 - since * 60;
      sprites.draw(ctx, 'musical-note', bird.x + 8, ny, 44, { alpha: 1 - since / NOTE_LIFE });
    }
    if (i === state.picked && !state.pickedRight && state.nextIn > 0) paintLabel(ctx, view, 'chíp?', bird.x, y - size * 0.8, 30, theme.light);
    if (cheer && i === state.odd) sprites.draw(ctx, 'sparkles', bird.x + size * 0.3, y - size * 0.5, 50);
  }
  // The beat: a ring on the left pulses on every beat, for children who play without sound.
  const phase = ((state.time - state.songAt - 0.35) / state.beat) % 1;
  if (state.nextIn <= 0 && state.time - state.songAt > 0.35) {
    const pulse = phase < 0.2 ? 1 - phase / 0.2 : 0;
    ctx.globalAlpha = 0.5 + 0.5 * pulse;
    ctx.strokeStyle = theme.star;
    ctx.lineWidth = 6 + 6 * pulse;
    ctx.beginPath();
    ctx.arc(arena.width / 2, groundY - 50, 26 + 10 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
