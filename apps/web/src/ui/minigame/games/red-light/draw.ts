// Red light's picture: a path running up the field to a chequered finish line, the teddy bear behind it (seen
// from the back while it chants, turning, then facing the field inside a red glow), a coloured disc behind it
// that says walk / careful / stop, the chant in big words, the child on the middle lane and two friends on the
// side lanes, smaller as they get farther away.
import { bob, paintHills, paintLabel, paintShadow, paintSky } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import type { DrawView } from '../../types';
import { LAP_STEPS, type RedLightState, type Walker } from './logic';

/** The two friends; one that looks like the child's own character is skipped. */
const FRIENDS: readonly SpriteRef[] = ['rabbit', 'panda', 'monkey-face'];

const yOf = (state: RedLightState, steps: number): number => state.startY + (state.finishY - state.startY) * (steps / LAP_STEPS);
/** Farther up the path is smaller. */
const scaleAt = (steps: number): number => 1 - 0.3 * (steps / LAP_STEPS);

function paintPath(ctx: CanvasRenderingContext2D, view: DrawView, state: RedLightState): void {
  const { theme } = view;
  const near = state.laneGap + 90;
  const far = near * 0.7;
  const top = state.finishY - 20;
  const bottom = view.arena.height;
  ctx.fillStyle = theme.groundDeep;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(state.pathX - far, top);
  ctx.lineTo(state.pathX + far, top);
  ctx.lineTo(state.pathX + near, bottom);
  ctx.lineTo(state.pathX - near, bottom);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // A chalk tick every five steps.
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.4;
  for (let s = 5; s < LAP_STEPS; s += 5) {
    const y = yOf(state, s);
    const half = far + ((near - far) * (y - top)) / (bottom - top);
    ctx.beginPath();
    ctx.moveTo(state.pathX - half + 14, y);
    ctx.lineTo(state.pathX + half - 14, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // The chequered finish line.
  const cell = 18;
  const cells = Math.ceil((far * 2) / cell);
  for (let row = 0; row < 2; row += 1) {
    for (let i = 0; i < cells; i += 1) {
      ctx.fillStyle = (i + row) % 2 === 0 ? theme.ink : theme.light;
      ctx.fillRect(state.pathX - far + i * cell, state.finishY - cell + row * cell, cell, cell);
    }
  }
}

function paintTeddy(ctx: CanvasRenderingContext2D, view: DrawView, state: RedLightState): void {
  const { theme, sprites } = view;
  const x = state.pathX;
  const y = state.finishY - 78;
  const facing = state.phase === 'looking' || (state.phase === 'turning' && state.phaseTime > state.phaseLength * 0.6) || (state.phase === 'turning-back' && state.phaseTime < state.phaseLength * 0.5);
  // The signal behind it: green walk, yellow careful, red stop.
  const signal = state.phase === 'back' ? theme.leaf : state.phase === 'turning' ? theme.star : theme.danger;
  const pulse = state.phase === 'looking' && !view.reducedMotion ? 1 + 0.06 * Math.sin(view.time * 10) : 1;
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = signal;
  ctx.beginPath();
  ctx.arc(x, y, 84 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 6;
  ctx.strokeStyle = theme.light;
  ctx.stroke();
  // Turning: narrows to edge-on and widens again on the other side.
  const turnScale = state.phase === 'turning' || state.phase === 'turning-back' ? Math.max(0.15, Math.abs(Math.cos((state.phaseTime / state.phaseLength) * Math.PI))) : 1;
  if (facing) {
    sprites.draw(ctx, 'teddy-bear', x, y, 130, { squash: [turnScale, 1] });
    return;
  }
  // From the back: a round body, a head with two ears, no face.
  ctx.save();
  ctx.translate(x, y + bob(view, 3, 3));
  ctx.scale(turnScale, 1);
  ctx.fillStyle = theme.wood;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 5;
  for (const [cx, cy, r] of [
    [0, 28, 40],
    [-30, -42, 14],
    [30, -42, 14],
    [0, -22, 34],
  ] as const) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function paintWalker(ctx: CanvasRenderingContext2D, view: DrawView, state: RedLightState, w: Walker, x: number, sprite: SpriteRef, size: number): void {
  const s = scaleAt(w.steps);
  const y = yOf(state, w.steps);
  const stride = w.walking && !view.reducedMotion ? Math.abs(Math.sin(view.time * 12)) * 10 : 0;
  const shake = w.caughtAgo < 0.5 && !view.reducedMotion ? Math.sin(w.caughtAgo * 50) * 8 : 0;
  paintShadow(ctx, view, x, y + 4, 80 * s);
  view.sprites.draw(ctx, sprite, x + shake, y - (size * s) / 2 - stride, size * s, { rotate: w.walking && !view.reducedMotion ? Math.sin(view.time * 12) * 0.08 : 0 });
  if (w.caughtAgo < 0.9) paintLabel(ctx, view, '!', x + 40 * s, y - size * s - 10, 46, view.theme.danger);
}

export function drawRedLight(ctx: CanvasRenderingContext2D, state: RedLightState, view: DrawView): void {
  const { theme, sprites } = view;
  const horizon = state.finishY - 110;
  paintSky(ctx, view, horizon, 6);
  paintHills(ctx, view, horizon + 10, 140, 70, theme.leaf);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, horizon + 10, view.arena.width, view.arena.height - horizon - 10);
  paintPath(ctx, view, state);
  paintTeddy(ctx, view, state);

  // The chant: one more word every third of the back-turned time.
  const wordY = view.arena.height - 36;
  if (state.phase === 'back') {
    const words = ['Một…', 'hai…', 'ba…'];
    const said = Math.min(3, 1 + Math.floor((state.phaseTime / state.phaseLength) * 3));
    paintLabel(ctx, view, words.slice(0, said).join(' '), state.pathX, wordY, 42);
  } else if (state.phase === 'turning' || state.phase === 'looking') {
    paintLabel(ctx, view, 'Đứng im!', state.pathX, wordY, 50, theme.danger);
  }

  const friends = FRIENDS.filter((f) => f !== view.player);
  // Farther walkers first, so nearer ones overlap them.
  const walkers = [
    { w: state.npcs[0], x: -state.laneGap, sprite: friends[0] ?? 'rabbit', size: 100 },
    { w: state.npcs[1], x: state.laneGap, sprite: friends[1] ?? 'panda', size: 100 },
    { w: state.player, x: 0, sprite: view.player, size: 124 },
  ].flatMap((e) => (e.w ? [{ ...e, w: e.w }] : []));
  walkers.sort((a, b) => b.w.steps - a.w.steps);
  for (const e of walkers) paintWalker(ctx, view, state, e.w, state.pathX + e.x * scaleAt(e.w.steps), e.sprite, e.size);

  if (state.lapAgo < 1.3) {
    const grow = view.reducedMotion ? 1 : Math.min(1, state.lapAgo / 0.15);
    paintLabel(ctx, view, 'Về đích!', state.pathX, (state.finishY + state.startY) / 2, 70 * grow, theme.star);
    sprites.draw(ctx, 'party-popper', state.pathX + 150, (state.finishY + state.startY) / 2 - 60, 80, { alpha: 1 - state.lapAgo / 1.3 });
  }
}
