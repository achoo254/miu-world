// Kangaroo hop's picture: a meadow with a number line drawn as a dirt path with ticks and numbers, three round
// stones with big numbers ahead of the kangaroo, the carrot on the chosen stone, the kangaroo hopping in an
// arc with its "+5" sign, and a ring that runs down to the next jump.
import { paintGround, paintHills, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { JUMP_SECONDS, numberX, STONE_RADIUS, stonePos, type KangarooState } from './logic';

function paintLine(ctx: CanvasRenderingContext2D, view: DrawView, state: KangarooState): void {
  const { theme, arena } = view;
  const y = state.lineY;
  ctx.fillStyle = theme.groundDeep;
  roundRect(ctx, -20, y - 10, arena.width + 40, 20, 10);
  ctx.fill();
  const perNumber = (state.lineRight - state.lineLeft) / (state.hi - state.lo);
  const labelEvery = perNumber >= 30 ? 1 : perNumber >= 14 ? 5 : 10;
  const first = Math.ceil(state.lo - 2);
  const last = Math.floor(state.hi + 2);
  for (let n = Math.max(0, first); n <= Math.min(100, last); n += 1) {
    const x = numberX(state, n);
    const major = n % 5 === 0;
    ctx.fillStyle = theme.ink;
    ctx.fillRect(x - 2, y - (major ? 22 : 14), 4, major ? 44 : 28);
    if (n % labelEvery === 0) paintLabel(ctx, view, String(n), x, y + 48, major ? 34 : 28);
  }
}

export function drawKangarooHop(ctx: CanvasRenderingContext2D, state: KangarooState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const groundY = state.lineY - 40;
  paintSky(ctx, view, groundY, 8);
  sprites.draw(ctx, 'sun', arena.width - 90, Math.max(170, groundY * 0.3), 110);
  paintHills(ctx, view, groundY, state.lo * 30, 90, theme.leaf);
  // Trees along the hills, drifting slowly as the line moves on.
  for (let i = 0; i < 6; i += 1) {
    const span = arena.width + 200;
    const x = ((((i * 211 - state.lo * 24) % span) + span) % span) - 100;
    sprites.draw(ctx, 'deciduous-tree', x, groundY - 60 - (i % 2) * 18, 96 + (i % 3) * 16);
  }
  paintGround(ctx, view, groundY, state.lo * 60);
  paintLine(ctx, view, state);

  // The stones ahead.
  const waiting = state.phase === 'wait';
  for (const n of state.stones) {
    const { x, y: sy } = stonePos(state, n);
    const chosen = state.carrot === n;
    ctx.globalAlpha = waiting ? 1 : 0.5;
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(x, sy + STONE_RADIUS);
    ctx.lineTo(x, state.lineY - 14);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = chosen ? theme.star : theme.stone;
    ctx.beginPath();
    ctx.arc(x, sy, STONE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = theme.ink;
    ctx.stroke();
    paintLabel(ctx, view, String(n), x, sy + 2, 40);
    if (chosen) sprites.draw(ctx, 'carrot', x + 26, sy - 40, 58, { rotate: 0.5 });
    ctx.globalAlpha = 1;
  }
  // The carrot waiting on the line where it was put, during the jump.
  if (!waiting && state.carrot !== null) sprites.draw(ctx, 'carrot', numberX(state, state.carrot), state.lineY - 30, 54, { rotate: 0.4 });

  // The kangaroo: on its number, or in the air between two.
  let kx = numberX(state, state.at);
  let lift = 0;
  if (state.phase === 'jump') {
    const t = 1 - state.timer / JUMP_SECONDS;
    kx = numberX(state, state.from + (state.at - state.from) * t);
    lift = Math.sin(t * Math.PI) * 140;
  }
  const landed = state.time - state.landedAt;
  const squash = !view.reducedMotion && landed < 0.2 ? 0.15 * (1 - landed / 0.2) : 0;
  paintShadow(ctx, view, kx, state.lineY - 6, 90, lift / 160);
  sprites.draw(ctx, 'kangaroo', kx, state.lineY - 58 - lift, 112, { squash: [1 + squash, 1 - squash] });
  if (state.lastLanding === 'ate' && landed < 0.7) sprites.draw(ctx, 'sparkles', kx + 40, state.lineY - 110 - landed * 40, 60, { alpha: 1 - landed / 0.7 });

  // Its sign: how far it jumps.
  const signX = Math.min(arena.width - 90, Math.max(90, numberX(state, state.phase === 'jump' ? state.from : state.at)));
  const signY = state.lineY - 210;
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(signX - 4, signY, 8, 60);
  ctx.fillStyle = theme.wood;
  roundRect(ctx, signX - 62, signY - 34, 124, 64, 14);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.ink;
  ctx.stroke();
  paintLabel(ctx, view, `+${state.step}`, signX, signY, 42, theme.star);

  // The ring running down to the jump.
  if (waiting) {
    const left = Math.max(0, state.timer / state.waitSeconds);
    ctx.lineWidth = 8;
    ctx.strokeStyle = left < 0.3 ? theme.danger : theme.light;
    ctx.beginPath();
    ctx.arc(kx, state.lineY - 58, 70, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2);
    ctx.stroke();
  }
}
