// Stone path memory's picture: a stream running across the screen between two grassy banks, round mossy
// stepping stones with ripples around them, each glowing gold while the path is shown, a stone that sinks a
// little with a splash when it is the wrong one, and the child hopping from stone to stone.
import { paintLabel, paintShadow } from '../../draw-kit';
import type { DrawView } from '../../types';
import { SHOW_STEP, type StoneState } from './logic';

export function drawStonePath(ctx: CanvasRenderingContext2D, state: StoneState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  // Water with drifting ripple lines.
  const water = ctx.createLinearGradient(0, state.farBank, 0, state.nearBank);
  water.addColorStop(0, theme.water);
  water.addColorStop(1, theme.waterLight);
  ctx.fillStyle = water;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 14; i += 1) {
    const y = state.farBank + 30 + ((i * 53) % Math.max(1, state.nearBank - state.farBank - 40));
    const x = ((i * 191 + view.time * (view.reducedMotion ? 0 : 40)) % (arena.width + 200)) - 100;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 30, y - 8, x + 60, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // The banks.
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, arena.width, state.farBank + 20);
  ctx.fillRect(0, state.nearBank - 20, arena.width, arena.height);
  ctx.fillStyle = theme.leaf;
  for (let x = 20; x < arena.width; x += 70) {
    ctx.beginPath();
    ctx.arc(x, state.farBank + 20, 16, 0, Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 35, state.nearBank - 20, 16, Math.PI, 0);
    ctx.fill();
  }

  for (const [i, s] of state.stones.entries()) {
    const sink = s.sankAgo < 0.9 ? Math.sin((s.sankAgo / 0.9) * Math.PI) * 12 : 0;
    ctx.strokeStyle = theme.light;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + 10, s.r * 1.15 + Math.sin(view.time * 2 + i) * 3, s.r * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    const lit = Math.max(0, 1 - s.litAgo / (state.phase === 'show' ? SHOW_STEP : 0.5));
    ctx.fillStyle = theme.stoneEdge;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + 8 + sink, s.r, s.r * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.stone;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + sink, s.r, s.r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    if (lit > 0) {
      ctx.globalAlpha = lit;
      ctx.fillStyle = theme.star;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = theme.leaf;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(s.x - s.r * 0.35, s.y - s.r * 0.2 + sink, s.r * 0.3, s.r * 0.14, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (s.sankAgo < 0.6) sprites.draw(ctx, 'droplet', s.x + 20, s.y - 30 - s.sankAgo * 40, 34, { alpha: 1 - s.sankAgo / 0.6 });
  }

  // The child, hopping.
  const at = state.stones[state.at];
  const to = at ?? { x: arena.width / 2, y: state.at === -2 ? state.farBank : state.nearBank };
  const t = Math.min(1, state.hopAgo / 0.3);
  const x = state.hopFrom.x + (to.x - state.hopFrom.x) * t;
  const y = state.hopFrom.y + (to.y - state.hopFrom.y) * t - (view.reducedMotion ? 0 : Math.sin(t * Math.PI) * 40);
  paintShadow(ctx, view, x, y + 18, 60, t < 1 ? 0.5 : 0);
  sprites.draw(ctx, view.player, x, y - 26, 78);

  const label = state.phase === 'show' ? 'Nhìn đường đá sáng…' : state.phase === 'play' ? 'Chạm lại đúng đường!' : state.phase === 'oops' ? 'Ối! Xem lại nhé' : 'Qua suối rồi!';
  paintLabel(ctx, view, label, arena.width / 2, state.nearBank + 32, 30, state.phase === 'cross' ? theme.star : theme.light);
}
