// Monkey bridge's picture: sky and hills, a bank on each side with trees, the stream below (waves, a fish
// jumping now and then), the bamboo pole with its crossed legs standing in the water and a hand rail, the
// child walking on it leaning by the tilt (falling into the water with a splash, wading back), and at the top a
// balance bar: a needle over green, yellow and red, with an arrow showing which way to drag when she leans.
import { bob, paintHills, paintLabel, paintSky, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { childX, MAX_TILT, type BridgeState } from './logic';

function paintBanks(ctx: CanvasRenderingContext2D, view: DrawView, state: BridgeState): void {
  const { arena, theme, sprites } = view;
  const { deck, water, left, right } = state;
  // Stream.
  const g = ctx.createLinearGradient(0, water, 0, arena.height);
  g.addColorStop(0, theme.waterLight);
  g.addColorStop(1, theme.water);
  ctx.fillStyle = g;
  ctx.fillRect(0, water, arena.width, arena.height - water);
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.5;
  const flow = view.reducedMotion ? 0 : view.time * 30;
  for (let row = 0; row < 4; row += 1) {
    const y = water + 24 + row * 34;
    ctx.beginPath();
    for (let x = -40; x < arena.width + 40; x += 16) ctx.lineTo(x, y + Math.sin((x + flow * (row % 2 ? 1 : -1)) / 40) * 5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // A fish jumping every few seconds.
  const jump = (view.time % 4.5) / 1.1;
  if (jump < 1 && !view.reducedMotion) {
    const fx = arena.width * (0.3 + 0.4 * ((Math.floor(view.time / 4.5) * 0.37) % 1));
    sprites.draw(ctx, 'fish', fx + jump * 80, water + 30 - Math.sin(jump * Math.PI) * 90, 54, { rotate: -1 + jump * 2 });
  }
  // The banks: earth slopes up to the deck on both sides.
  ctx.fillStyle = theme.groundDeep;
  for (const side of [-1, 1] as const) {
    const edge = side < 0 ? left + 10 : right - 10;
    const outer = side < 0 ? -10 : arena.width + 10;
    ctx.beginPath();
    ctx.moveTo(outer, deck - 4);
    ctx.lineTo(edge, deck - 4);
    ctx.quadraticCurveTo(edge - side * 10, (deck + water) / 2, edge - side * 60, arena.height + 10);
    ctx.lineTo(outer, arena.height + 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = theme.ground;
    ctx.fillRect(Math.min(outer, edge), deck - 14, Math.abs(edge - outer), 14);
    ctx.fillStyle = theme.groundDeep;
    sprites.draw(ctx, side < 0 ? 'deciduous-tree' : 'palm-tree', side < 0 ? left - 40 : right + 40, deck - 80, 150);
  }
}

function paintBridge(ctx: CanvasRenderingContext2D, view: DrawView, state: BridgeState): void {
  const { theme } = view;
  const { deck, water, left, right } = state;
  const sag = 14;
  const yAt = (x: number): number => deck + sag * Math.sin(((x - left) / (right - left)) * Math.PI);
  // Crossed legs into the stream at a third and two thirds.
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  for (const f of [0.33, 0.67]) {
    const x = left + (right - left) * f;
    const y = yAt(x);
    ctx.beginPath();
    ctx.moveTo(x - 40, water + 70);
    ctx.lineTo(x + 18, y - 70);
    ctx.moveTo(x + 40, water + 70);
    ctx.lineTo(x - 18, y - 70);
    ctx.stroke();
  }
  // The hand rail.
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (let x = left; x <= right; x += 10) ctx.lineTo(x, yAt(x) - 66 + 4 * Math.sin(((x - left) / (right - left)) * Math.PI));
  ctx.stroke();
  // The pole, outlined so it stands out from the hills, with its nodes.
  for (const [colour, width] of [
    [theme.ink, 20],
    [theme.wood, 13],
  ] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let x = left; x <= right; x += 10) ctx.lineTo(x, yAt(x));
    ctx.stroke();
  }
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 3;
  for (let x = left + 40; x < right; x += 70) {
    ctx.beginPath();
    ctx.moveTo(x, yAt(x) - 7);
    ctx.lineTo(x, yAt(x) + 7);
    ctx.stroke();
  }
}

function paintChild(ctx: CanvasRenderingContext2D, view: DrawView, state: BridgeState): void {
  const { sprites, theme } = view;
  const x = childX(state);
  const size = 100;
  if (state.phase === 'fall' || state.phase === 'wade') {
    // In the stream: dropping in, then wading back with ripples round the waist.
    const drop = state.phase === 'fall' ? Math.min(1, state.phaseTime / (state.phaseLength * 0.6)) : 1;
    const y = state.deck - size / 2 + (state.water + 10 - (state.deck - size / 2)) * drop * drop;
    sprites.draw(ctx, view.player, x, y + (state.phase === 'wade' ? bob(view, 7, 4) : 0), size, { rotate: state.phase === 'fall' ? state.tilt * (1 + drop) : 0 });
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(x, state.water + 34, 50, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (state.phase === 'fall' && drop >= 1) {
      const t = (state.phaseTime - state.phaseLength * 0.6) / (state.phaseLength * 0.4);
      for (let i = 0; i < 6; i += 1) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.45;
        sprites.draw(ctx, 'droplet', x + Math.cos(a) * 80 * t, state.water + Math.sin(a) * 90 * t + 80 * t * t, 30, { alpha: 1 - t });
      }
    }
    return;
  }
  // On the pole: rotate about the feet.
  const sag = 14 * Math.sin(state.along * Math.PI);
  const feetY = state.deck + sag + 2;
  const step = state.phase === 'walk' && !view.reducedMotion ? Math.abs(Math.sin(state.time * 7)) * 4 : 0;
  const cx = x + Math.sin(state.tilt) * (size / 2);
  const cy = feetY - Math.cos(state.tilt) * (size / 2) - step;
  sprites.draw(ctx, view.player, cx, cy, size, { rotate: state.tilt });
  if (state.phase === 'cheer') {
    sprites.draw(ctx, 'party-popper', x + 60, cy - 50, 60);
  }
}

function paintBalance(ctx: CanvasRenderingContext2D, view: DrawView, state: BridgeState): void {
  const { arena, theme } = view;
  const w = Math.min(arena.width * 0.7, 460);
  const x = arena.width / 2 - w / 2;
  // Above the child, but never under the HUD.
  const y = Math.max(HUD_SAFE_TOP + 22, state.deck - 250);
  const h = 30;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, x - 6, y - 6, w + 12, h + 12, 20);
  ctx.fill();
  ctx.stroke();
  const zone = (from: number, to: number, colour: string): void => {
    ctx.fillStyle = colour;
    ctx.fillRect(x + w / 2 + from * (w / 2), y, (to - from) * (w / 2), h);
  };
  zone(-1, -0.55, theme.danger);
  zone(0.55, 1, theme.danger);
  zone(-0.55, -0.25, theme.star);
  zone(0.25, 0.55, theme.star);
  zone(-0.25, 0.25, theme.leaf);
  const lean = Math.max(-1, Math.min(1, state.tilt / MAX_TILT));
  const nx = x + w / 2 + lean * (w / 2);
  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.moveTo(nx, y + h + 4);
  ctx.lineTo(nx - 12, y + h + 22);
  ctx.lineTo(nx + 12, y + h + 22);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(nx - 3, y - 6, 6, h + 10);
  // Which way to drag: an arrow pointing away from the lean, once it matters.
  if (state.phase === 'walk' && Math.abs(lean) > 0.3) {
    const dir = lean > 0 ? -1 : 1;
    const pulse = view.reducedMotion ? 0 : Math.sin(view.time * 10) * 6;
    const ax = arena.width / 2 + dir * (w / 2 + 50 + pulse);
    const ay = y + h / 2;
    ctx.fillStyle = theme.star;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(ax + dir * 30, ay);
    ctx.lineTo(ax - dir * 6, ay - 26);
    ctx.lineTo(ax - dir * 6, ay - 10);
    ctx.lineTo(ax - dir * 30, ay - 10);
    ctx.lineTo(ax - dir * 30, ay + 10);
    ctx.lineTo(ax - dir * 6, ay + 10);
    ctx.lineTo(ax - dir * 6, ay + 26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

export function drawMonkeyBridge(ctx: CanvasRenderingContext2D, state: BridgeState, view: DrawView): void {
  const { theme, arena } = view;
  paintSky(ctx, view, state.water, 8);
  paintHills(ctx, view, state.deck - 30, 200, 110, theme.leaf);
  paintBanks(ctx, view, state);
  paintBridge(ctx, view, state);
  paintChild(ctx, view, state);
  paintBalance(ctx, view, state);
  // A cheer for every bridge crossed.
  if (state.phase === 'cheer') paintLabel(ctx, view, `Cầu ${state.bridges}!`, arena.width / 2, state.deck - 170, 54, theme.star);
}
