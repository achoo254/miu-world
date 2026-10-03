// Kite fly's picture: the sky scrolls down as the kite climbs (clouds hang at their heights), the field with
// the child holding the string while it is in view, the wind stream as a pale ribbon with dashes and leaves
// rushing up it, branches reaching in from the sides and birds flapping across, the kite with a fluttering
// tail on a sagging string, and a height meter on the left with the goal marked by a star.
import { bob, paintGround, paintHills, paintLabel, paintSky, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { obstacleSpan, windCentre, type KiteState, type Obstacle } from './logic';

/** Screen y of a height (m), with the camera following the kite once it is high enough. */
function cameraFor(state: KiteState): (altitude: number) => number {
  const lift = Math.max(0, state.altitude * state.scale - (state.groundY - state.kiteScreenY));
  return (altitude) => state.groundY - altitude * state.scale + lift;
}

function paintStream(ctx: CanvasRenderingContext2D, view: DrawView, state: KiteState, screenY: (a: number) => number): void {
  const { arena, theme, sprites } = view;
  const top = HUD_SAFE_TOP - 40;
  const altAt = (y: number): number => state.altitude + (screenY(state.altitude) - y) / state.scale;
  const left: Array<[number, number]> = [];
  const right: Array<[number, number]> = [];
  for (let y = arena.height; y >= top; y -= 16) {
    const a = altAt(y);
    if (a < 0) continue;
    const cx = windCentre(state, a, view.time);
    left.push([cx - state.windHalf, y]);
    right.push([cx + state.windHalf, y]);
  }
  if (left.length < 2) return;
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = theme.light;
  ctx.beginPath();
  for (const [x, y] of left) ctx.lineTo(x, y);
  for (const [x, y] of [...right].reverse()) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
  // Dashes and a few leaves rushing up the middle of the stream.
  ctx.globalAlpha = 0.75;
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  const flow = view.reducedMotion ? 0 : view.time * 9;
  const step = 7;
  const first = Math.floor((altAt(arena.height) - flow) / step) * step;
  for (let k = first; k < altAt(top) - flow; k += step) {
    const a = k + flow;
    if (a < 1) continue;
    const y = screenY(a);
    const offset = ((Math.abs(Math.floor(k / step)) * 37) % 60) - 30;
    const x = windCentre(state, a, view.time) + offset;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 26);
    ctx.stroke();
    if (Math.abs(Math.floor(k / step)) % 4 === 0) sprites.draw(ctx, 'leaf', x + 24, y + 10, 30, { rotate: a });
  }
  ctx.globalAlpha = 1;
}

function paintObstacle(ctx: CanvasRenderingContext2D, view: DrawView, o: Obstacle, y: number): void {
  const { theme, sprites, arena } = view;
  const shake = o.hitAgo >= 0 && o.hitAgo < 0.5 && !view.reducedMotion ? Math.sin(o.hitAgo * 50) * 6 : 0;
  if (o.kind === 'bird') {
    sprites.draw(ctx, 'bird', o.x + shake, y + bob(view, 8, 6, o.altitude), 74, { flipX: o.speed > 0 });
    return;
  }
  const [left, right] = obstacleSpan(o, arena.width);
  const tip = o.side < 0 ? right : left;
  const root = o.side < 0 ? -20 : arena.width + 20;
  // The bough: thick at the trunk, thin at the tip, leaf clusters along it.
  ctx.fillStyle = theme.woodEdge;
  ctx.beginPath();
  ctx.moveTo(root, y - 16 + shake);
  ctx.lineTo(tip, y - 4 + shake);
  ctx.lineTo(tip, y + 4 + shake);
  ctx.lineTo(root, y + 20 + shake);
  ctx.closePath();
  ctx.fill();
  const n = Math.max(2, Math.round(Math.abs(tip - root) / 60));
  for (let i = 1; i <= n; i += 1) {
    const x = root + ((tip - root) * i) / n;
    const ly = y - 14 + shake + (i % 2) * 18;
    ctx.fillStyle = theme.leaf;
    ctx.beginPath();
    ctx.arc(x, ly, 26, 0, Math.PI * 2);
    ctx.fill();
    // A lit side on each clump.
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = theme.light;
    ctx.beginPath();
    ctx.arc(x - 8, ly - 9, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function paintKite(ctx: CanvasRenderingContext2D, view: DrawView, state: KiteState, y: number): void {
  const { theme, sprites } = view;
  const wobble = state.tangled > 0 && !view.reducedMotion ? Math.sin(state.tangled * 30) * 0.4 : 0;
  const lean = state.steerX === null ? 0 : Math.max(-0.35, Math.min(0.35, (state.steerX - state.kiteX) / 400));
  // The tail: bows on a wavy line below the kite.
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  const flutter = view.reducedMotion ? 0 : view.time * 9;
  for (let i = 0; i <= 6; i += 1) {
    const tx = state.kiteX + 12 + Math.sin(flutter + i * 0.9) * 14 * (i / 6);
    const ty = y + 40 + i * 16;
    if (i === 0) ctx.moveTo(tx, ty);
    else ctx.lineTo(tx, ty);
  }
  ctx.stroke();
  for (let i = 2; i <= 6; i += 2) {
    const tx = state.kiteX + 12 + Math.sin(flutter + i * 0.9) * 14 * (i / 6);
    ctx.fillStyle = i === 4 ? theme.secondary : theme.primary;
    ctx.beginPath();
    ctx.moveTo(tx - 12, y + 40 + i * 16 - 8);
    ctx.lineTo(tx + 12, y + 40 + i * 16 + 8);
    ctx.lineTo(tx + 12, y + 40 + i * 16 - 8);
    ctx.lineTo(tx - 12, y + 40 + i * 16 + 8);
    ctx.closePath();
    ctx.fill();
  }
  sprites.draw(ctx, 'kite', state.kiteX, y, 96, { rotate: lean + wobble });
}

function paintMeter(ctx: CanvasRenderingContext2D, view: DrawView, state: KiteState, goal: number): void {
  const { theme, sprites, arena } = view;
  const x = 22;
  const top = HUD_SAFE_TOP + 30;
  const bottom = arena.height - 120;
  const max = Math.max(goal * 1.8, state.best + 20);
  const yOf = (m: number): number => bottom - ((bottom - top) * Math.min(m, max)) / max;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, x, top - 10, 30, bottom - top + 20, 15);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.waterLight;
  roundRect(ctx, x + 6, yOf(state.best), 18, bottom - yOf(state.best) + 4, 9);
  ctx.fill();
  ctx.fillStyle = theme.primary;
  roundRect(ctx, x + 6, yOf(state.altitude), 18, bottom - yOf(state.altitude) + 4, 9);
  ctx.fill();
  sprites.draw(ctx, 'star', x + 15, yOf(goal), 40);
  paintLabel(ctx, view, `${Math.floor(state.altitude)} m`, x + 50, Math.max(top + 10, yOf(state.altitude)), 30);
}

export function drawKiteFly(ctx: CanvasRenderingContext2D, state: KiteState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const screenY = cameraFor(state);
  paintSky(ctx, view, arena.height, 10);
  // Clouds that hang at their own heights, so climbing feels like climbing.
  for (let a = 30; a < state.altitude + 120; a += 28) {
    const y = screenY(a);
    if (y < -60 || y > arena.height + 60) continue;
    const x = (((a * 97) % 1000) / 1000) * (arena.width - 120) + 60;
    sprites.draw(ctx, 'cloud', x, y, 110 + (a % 3) * 20, { alpha: 0.85 });
  }
  const ground = screenY(0);
  if (ground < arena.height + 200) {
    paintHills(ctx, view, ground - 20, 50, 90, theme.leaf);
    sprites.draw(ctx, 'deciduous-tree', 40, ground - 70, 150);
    sprites.draw(ctx, 'evergreen-tree', arena.width - 40, ground - 70, 150);
    paintGround(ctx, view, ground);
  }
  paintStream(ctx, view, state, screenY);
  for (const o of state.obstacles) {
    const y = screenY(o.altitude);
    if (y > -60 && y < arena.height + 60) paintObstacle(ctx, view, o, y);
  }
  // The string, from the child's hands (or from below the screen) to the kite, sagging a little.
  const kiteY = screenY(state.altitude);
  const handX = arena.width / 2 + 26;
  const handY = Math.min(arena.height + 20, ground - 56);
  ctx.strokeStyle = theme.ink;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(handX, handY);
  ctx.quadraticCurveTo((handX + state.kiteX) / 2 + 40, (handY + kiteY) / 2 + 40, state.kiteX, kiteY + 20);
  ctx.stroke();
  ctx.globalAlpha = 1;
  if (ground < arena.height + 100) sprites.draw(ctx, view.player, arena.width / 2, ground - 44 + bob(view, 5, 3), 92);
  paintKite(ctx, view, state, kiteY);
  paintMeter(ctx, view, state, 100);
}
