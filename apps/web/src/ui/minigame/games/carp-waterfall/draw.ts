// Carp waterfall's picture: cliffs either side of a tall waterfall, rocks up the fall (zig-zagging, numbered every
// five), and the carp leaping from rock to rock in an arc. Calm water shows thin streaks; before a surge a band
// of foam rushes down from the top; the strong surge turns the whole fall white. A gate with a dragon spans the
// fall every fifteen rocks and shines when the carp gets there.
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { GATE_EVERY, LEAP_SECONDS, LEDGE_GAP, type CarpState } from './logic';

const anchorY = (view: DrawView): number => HUD_SAFE_TOP + (view.arena.height - HUD_SAFE_TOP) * 0.7;
const rockX = (view: DrawView, k: number): number => view.arena.width / 2 + (k % 2 === 0 ? -1 : 1) * Math.min(80, view.arena.width * 0.1);
const rockY = (state: CarpState, view: DrawView, k: number): number => anchorY(view) - (k - state.view) * LEDGE_GAP;

function paintFall(ctx: CanvasRenderingContext2D, state: CarpState, view: DrawView, left: number, right: number): void {
  const { arena, theme } = view;
  ctx.fillStyle = theme.water;
  ctx.fillRect(left, 0, right - left, arena.height);
  // Streaks sliding down; more of them, brighter, in a surge.
  const strong = state.flow === 'strong';
  const speed = view.reducedMotion ? 0 : strong ? 900 : 260;
  ctx.strokeStyle = theme.waterLight;
  ctx.lineWidth = strong ? 10 : 5;
  ctx.globalAlpha = strong ? 0.9 : 0.55;
  const count = strong ? 14 : 8;
  for (let i = 0; i < count; i += 1) {
    const x = left + ((i + 0.5) / count) * (right - left);
    const len = 70 + (i % 3) * 30;
    const y0 = ((view.time * speed + i * 137 + state.view * LEDGE_GAP) % (arena.height + len)) - len;
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y0 + len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Foam: a band rushing down before the surge, the whole fall during it.
  let foamTo = 0;
  if (state.flow === 'warning') foamTo = (state.flowTime / state.flowLength) * arena.height;
  if (strong) foamTo = arena.height;
  if (foamTo > 0) {
    ctx.fillStyle = theme.light;
    ctx.globalAlpha = strong ? 0.75 : 0.85;
    ctx.fillRect(left, 0, right - left, foamTo);
    ctx.globalAlpha = 1;
    // Bubbly front edge.
    for (let x = left; x < right; x += 26) {
      ctx.beginPath();
      ctx.arc(x + 13, foamTo, 15, 0, Math.PI * 2);
      ctx.fillStyle = theme.light;
      ctx.fill();
    }
  }
}

export function drawCarpWaterfall(ctx: CanvasRenderingContext2D, state: CarpState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, arena.height, 4);
  const half = Math.min(170, arena.width * 0.24);
  const left = arena.width / 2 - half;
  const right = arena.width / 2 + half;
  // Cliffs.
  ctx.fillStyle = theme.stone;
  ctx.fillRect(0, 0, left, arena.height);
  ctx.fillRect(right, 0, arena.width - right, arena.height);
  ctx.fillStyle = theme.stoneEdge;
  for (let k = Math.floor(state.view) - 6; k < state.view + 8; k += 1) {
    const y = rockY(state, view, k);
    ctx.fillRect(left - 40 - (k % 3) * 12, y, 40 + (k % 3) * 12, 8);
    ctx.fillRect(right, y + 50, 30 + (k % 2) * 18, 8);
    if (k % 2 === 0) sprites.draw(ctx, 'herb', left - 60, y - 20, 50);
    else sprites.draw(ctx, 'evergreen-tree', right + 70, y - 30, 90);
  }
  paintFall(ctx, state, view, left, right);

  // Rocks and gates.
  const first = Math.max(0, Math.floor(state.view) - 5);
  for (let k = first; k < state.view + 8; k += 1) {
    const x = rockX(view, k);
    const y = rockY(state, view, k);
    if (y < -80 || y > arena.height + 80) continue;
    if (k > 0 && k % GATE_EVERY === 0) {
      const glow = state.gateAgo < 2 && state.best === k;
      ctx.fillStyle = glow ? theme.star : theme.danger;
      ctx.fillRect(left - 10, y - 150, 22, 160);
      ctx.fillRect(right - 12, y - 150, 22, 160);
      roundRect(ctx, left - 30, y - 176, right - left + 60, 34, 14);
      ctx.fill();
      sprites.draw(ctx, 'dragon-face', arena.width / 2, y - 210, glow ? 110 : 80);
    }
    if (k === 0) {
      // The pool at the bottom.
      ctx.fillStyle = theme.waterLight;
      ctx.beginPath();
      ctx.ellipse(arena.width / 2, y + 30, half + 40, 40, 0, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    sprites.draw(ctx, 'rock', x, y + 8, 116);
    if (k % 5 === 0) paintLabel(ctx, view, String(k), k % 2 === 0 ? left - 34 : right + 34, y, 30);
  }

  // The carp.
  let cx: number;
  let cy: number;
  let angle = -Math.PI / 2;
  if (state.leap >= 0) {
    const t = Math.min(1, state.leap / LEAP_SECONDS);
    const x0 = rockX(view, state.from);
    const x1 = rockX(view, state.to);
    const y0 = rockY(state, view, state.from) - 40;
    const y1 = rockY(state, view, state.to) - 40;
    cx = x0 + (x1 - x0) * t;
    cy = y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * 60;
    angle = -Math.PI / 2 + (x1 > x0 ? 0.5 : -0.5) * (1 - 2 * t);
  } else {
    cx = rockX(view, state.ledge);
    cy = rockY(state, view, state.ledge) - 40;
    if (state.washedAgo < 0.5 && !view.reducedMotion) angle += state.washedAgo * 18;
    else angle += Math.sin(view.time * 6) * (view.reducedMotion ? 0 : 0.08);
  }
  sprites.draw(ctx, 'fish', cx, cy, 84, { rotate: angle + Math.PI / 2, flipX: true });
  if (state.dizzy > 0) sprites.draw(ctx, 'sparkles', cx + 30, cy - 40, 40, { rotate: view.time * 4 });
  if (state.gateAgo < 2) {
    sprites.draw(ctx, 'dragon-face', cx, cy - 10, 90 * (1 + 0.2 * Math.sin(view.time * 8)), { alpha: Math.max(0, 1 - state.gateAgo / 2) });
    paintLabel(ctx, view, 'Hóa rồng!', arena.width / 2, HUD_SAFE_TOP + 50, 46, theme.star);
  }
}
