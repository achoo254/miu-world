// Bánh xèo's picture: a market stove with three black pans, each with a ring that fills as the cake cooks
// (green while golden), the batter going pale → golden → brown → black, a folded half-moon cake with herbs on
// its second side, steam, a word over a pan that is ready ("Lật!", "Ra đĩa!"), smoke on a burnt one, and the
// plate below with a growing stack.
import { paintLabel, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { doneness, GOLDEN_SECONDS, type BanhXeoState, type Pan } from './logic';

function paintCake(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, r: number, pan: Pan): void {
  const { theme } = view;
  const folded = pan.phase === 'second' || pan.phase === 'served';
  const progress = Math.min(1, pan.t / pan.golden);
  const over = Math.max(0, (pan.t - pan.golden) / GOLDEN_SECONDS);
  ctx.beginPath();
  if (folded) ctx.arc(x, y, r, Math.PI * 0.1, Math.PI * 1.1, true);
  else ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = pan.phase === 'burnt' ? theme.ink : theme.light;
  ctx.fill();
  if (pan.phase !== 'burnt') {
    // Golden comes in as it cooks; brown creeps in once it is past golden.
    ctx.globalAlpha = folded ? 1 : progress;
    ctx.fillStyle = theme.star;
    ctx.fill();
    ctx.globalAlpha = Math.min(0.8, over * 0.9);
    ctx.fillStyle = theme.wood;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 3;
  ctx.stroke();
  if (folded && pan.phase !== 'burnt') view.sprites.draw(ctx, 'herb', x - r * 0.15, y - r * 0.35, r * 0.6, { rotate: -0.5 });
}

function paintPan(ctx: CanvasRenderingContext2D, view: DrawView, state: BanhXeoState, pan: Pan): void {
  const { theme } = view;
  const r = state.panRadius;
  const wiggle = pan.nudged < 0.3 && !view.reducedMotion ? Math.sin(pan.nudged * 60) * 6 : 0;
  const x = pan.x + wiggle;
  // Handle, pan, inner surface.
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, x - 14, pan.y + r - 6, 28, 70, 12);
  ctx.fill();
  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.arc(x, pan.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = theme.stoneEdge;
  ctx.lineWidth = 6;
  ctx.stroke();

  const cooking = pan.phase === 'first' || pan.phase === 'second';
  if (cooking || pan.phase === 'burnt') paintCake(ctx, view, x, pan.y, r * 0.78, pan);
  if (pan.phase === 'served') {
    const t = Math.min(1, pan.t / 0.6);
    const tx = x + (state.plate.x - x) * t;
    const ty = pan.y + (state.plate.y - pan.y) * t;
    paintCake(ctx, view, tx, ty, r * 0.78 * (1 - 0.3 * t), pan);
  }

  // The ring: how far this side has cooked; its golden part in green.
  if (cooking) {
    const total = pan.golden + GOLDEN_SECONDS;
    const start = -Math.PI / 2;
    ctx.lineWidth = 10;
    ctx.strokeStyle = theme.leaf;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.arc(x, pan.y, r + 14, start + (pan.golden / total) * Math.PI * 2, start + Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    const state3 = doneness(pan);
    ctx.strokeStyle = state3 === 'golden' ? theme.leaf : state3 === 'raw' ? theme.light : theme.danger;
    ctx.beginPath();
    ctx.arc(x, pan.y, r + 14, start, start + Math.min(1, pan.t / total) * Math.PI * 2);
    ctx.stroke();
    // Steam.
    for (let i = 0; i < 3; i += 1) {
      const p = (view.time * 0.8 + i / 3) % 1;
      ctx.globalAlpha = (1 - p) * 0.5;
      ctx.fillStyle = theme.light;
      ctx.beginPath();
      ctx.ellipse(x - 20 + i * 20 + Math.sin(view.time * 3 + i) * 6, pan.y - r * 0.4 - p * 80, 10, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (state3 === 'golden') paintLabel(ctx, view, pan.phase === 'first' ? 'Lật!' : 'Ra đĩa!', x, pan.y - r - 40, 34, theme.star);
  }
  if (pan.phase === 'burnt') {
    for (let i = 0; i < 4; i += 1) {
      const p = (pan.t * 1.2 + i / 4) % 1;
      ctx.globalAlpha = (1 - p) * 0.6;
      ctx.fillStyle = theme.stoneEdge;
      ctx.beginPath();
      ctx.arc(x - 25 + i * 16, pan.y - p * 110, 14 + p * 16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    paintLabel(ctx, view, 'Cháy rồi!', x, pan.y - r - 40, 30);
  }
  if (pan.raw && pan.phase !== 'empty' && pan.phase !== 'burnt') paintLabel(ctx, view, 'Còn sống!', x, pan.y - r - 40, 28);
  if (pan.phase === 'empty') paintLabel(ctx, view, 'Đổ bột', x, pan.y, 26, theme.light);
}

export function drawBanhXeo(ctx: CanvasRenderingContext2D, state: BanhXeoState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  // Tiled wall and the stove top.
  ctx.fillStyle = theme.light;
  ctx.fillRect(0, 0, arena.width, arena.height);
  const stoveTop = (state.pans[0]?.y ?? 300) - state.panRadius - 40;
  ctx.strokeStyle = theme.sky[0];
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x < arena.width; x += 56) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, stoveTop);
  }
  for (let y = 0; y < stoveTop; y += 56) {
    ctx.moveTo(0, y);
    ctx.lineTo(arena.width, y);
  }
  ctx.stroke();
  // A shelf of ingredients over the stove.
  const shelfY = Math.max(HUD_SAFE_TOP + 70, stoveTop - 60);
  ctx.fillStyle = theme.wood;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 4;
  roundRect(ctx, arena.width * 0.15, shelfY, arena.width * 0.7, 16, 6);
  ctx.fill();
  ctx.stroke();
  const goods = ['herb', 'egg', 'carrot', 'leaf', 'lemon'] as const;
  goods.forEach((name, i) => sprites.draw(ctx, name, arena.width * (0.22 + i * 0.14), shelfY - 26, 52));
  ctx.fillStyle = theme.stone;
  ctx.fillRect(0, stoveTop, arena.width, arena.height - stoveTop);
  ctx.fillStyle = theme.stoneEdge;
  ctx.fillRect(0, stoveTop, arena.width, 10);
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, state.plate.y - 40, arena.width, arena.height - state.plate.y + 40);

  for (const pan of state.pans) paintPan(ctx, view, state, pan);

  // The plate and its stack of cakes.
  const { plate } = state;
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = theme.stoneEdge;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(plate.x, plate.y + 20, 130, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const shown = Math.min(8, state.served);
  for (let i = 0; i < shown; i += 1) {
    ctx.fillStyle = theme.star;
    ctx.strokeStyle = theme.woodEdge;
    ctx.beginPath();
    ctx.ellipse(plate.x + ((i % 2) - 0.5) * 30, plate.y + 10 - i * 7, 80, 18, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  if (state.served > 0) sprites.draw(ctx, 'herb', plate.x + 100, plate.y - shown * 7, 48);
}
